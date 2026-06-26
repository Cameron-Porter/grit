import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Platform } from 'react-native';
import { User } from '@supabase/supabase-js';

import {
  fetchWorkoutsForExport,
  fetchSetsForExport,
} from './queries';
import {
  setVolume,
  durationMinutes,
  priorityLabel,
  priorityLevel,
} from './calculations';
import { buildCSV } from './csvBuilder';
import { WorkoutRecord, SetRecord } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ── CSV builders ──────────────────────────────────────────────────────────────

function buildSummaryCSV(workouts: WorkoutRecord[], sets: SetRecord[]): string {
  const completedSets = sets.filter((s) => s.completed);
  const totalReps = completedSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalVolume = completedSets.reduce((sum, s) => sum + (setVolume(s.weight, s.reps) ?? 0), 0);

  const sorted = [...workouts].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstDate = fmt(sorted[0]?.created_at);
  const lastDate = fmt(sorted[sorted.length - 1]?.created_at);

  let avgPerWeek = '';
  if (sorted.length >= 2) {
    const spanMs = new Date(sorted[sorted.length - 1].created_at).getTime()
      - new Date(sorted[0].created_at).getTime();
    const spanWeeks = spanMs / (7 * 24 * 60 * 60 * 1000);
    if (spanWeeks > 0) avgPerWeek = (sorted.length / spanWeeks).toFixed(1);
  }

  const exerciseCounts = new Map<string, number>();
  const exerciseVolumes = new Map<string, number>();
  const exerciseMaxWeight = new Map<string, number>();
  for (const s of completedSets) {
    if (!s.exercise_name) continue;
    exerciseCounts.set(s.exercise_name, (exerciseCounts.get(s.exercise_name) ?? 0) + 1);
    exerciseVolumes.set(s.exercise_name, (exerciseVolumes.get(s.exercise_name) ?? 0) + (setVolume(s.weight, s.reps) ?? 0));
    if (s.weight != null && s.weight > (exerciseMaxWeight.get(s.exercise_name) ?? 0)) {
      exerciseMaxWeight.set(s.exercise_name, s.weight);
    }
  }

  const mostPerformed = [...exerciseCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const highestVolumeEx = [...exerciseVolumes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const topLift = [...exerciseMaxWeight.entries()].sort((a, b) => b[1] - a[1])[0];

  const rows: [string, string][] = [
    ['Export Date', exportDate()],
    ['Export Version', '1.0'],
    ['App', 'GRIT'],
    ['', ''],
    ['Total Workouts', String(workouts.length)],
    ['Total Sets Completed', String(completedSets.length)],
    ['Total Reps Completed', String(totalReps)],
    ['Total Training Volume (lbs)', String(Math.round(totalVolume))],
    ['', ''],
    ['First Workout Date', firstDate],
    ['Most Recent Workout Date', lastDate],
    ['Average Workouts Per Week', avgPerWeek],
    ['', ''],
    ['Most Performed Exercise', mostPerformed],
    ['Highest Volume Exercise', highestVolumeEx],
    ['Heaviest Lift', topLift ? `${topLift[0]} - ${topLift[1]} lbs` : ''],
  ];

  return buildCSV(['Field', 'Value'], rows);
}

function buildWorkoutsCSV(workouts: WorkoutRecord[], sets: SetRecord[]): string {
  const setsByWorkout = new Map<string, SetRecord[]>();
  for (const s of sets) {
    const arr = setsByWorkout.get(s.workout_id) ?? [];
    arr.push(s);
    setsByWorkout.set(s.workout_id, arr);
  }

  const rows = workouts.map((w) => {
    const wSets = setsByWorkout.get(w.id) ?? [];
    const completed = wSets.filter((s) => s.completed);
    const totalVol = completed.reduce((sum, s) => sum + (setVolume(s.weight, s.reps) ?? 0), 0);
    const exercises = new Set(wSets.map((s) => s.exercise_name).filter(Boolean));
    const duration = durationMinutes(w.created_at, w.completed_at);

    return [
      w.name ?? '',
      fmt(w.created_at),
      w.completed_at ? fmt(w.completed_at) : '',
      duration ?? '',
      completed.length,
      exercises.size,
      Math.round(totalVol),
    ];
  });

  return buildCSV(
    ['Workout Name', 'Date', 'Completed At', 'Duration (min)', 'Sets Completed', 'Exercises', 'Total Volume (lbs)'],
    rows,
  );
}

function buildSetsCSV(sets: SetRecord[], workoutMap: Map<string, WorkoutRecord>): string {
  // Max weight per exercise across all completed sets — used to flag PRs
  const maxWeightPerExercise = new Map<string, number>();
  for (const s of sets) {
    if (s.completed && s.exercise_name && s.weight != null) {
      if (s.weight > (maxWeightPerExercise.get(s.exercise_name) ?? 0)) {
        maxWeightPerExercise.set(s.exercise_name, s.weight);
      }
    }
  }

  const rows = sets.map((s) => {
    const workout = workoutMap.get(s.workout_id);
    const vol = setVolume(s.weight, s.reps);
    const isPR =
      s.completed &&
      s.exercise_name != null &&
      s.weight != null &&
      s.weight === maxWeightPerExercise.get(s.exercise_name)
        ? 'Yes'
        : '';

    return [
      workout?.name ?? '',
      fmt(workout?.created_at),
      s.exercise_name ?? '',
      s.muscle_group ?? '',
      s.muscle_priority ? priorityLabel(s.muscle_priority) : '',
      s.set_index != null ? s.set_index + 1 : '',
      s.reps ?? '',
      s.weight ?? '',
      s.rir ?? '',
      s.completed ? 'Yes' : 'No',
      isPR,
      s.note ?? '',
      vol != null ? Math.round(vol) : '',
    ];
  });

  return buildCSV(
    [
      'Workout Name', 'Workout Date',
      'Exercise', 'Muscle Group', 'Muscle Priority',
      'Set #', 'Reps', 'Weight (lbs)', 'RIR', 'Completed', 'PR',
      'Note', 'Set Volume (lbs)',
    ],
    rows,
  );
}

function buildProgramsCSV(programs: ProgramRecord[]): string {
  const rows = programs.map((p) => [
    p.name,
    p.focus ?? '',
    p.total_weeks,
    p.days_per_week,
    p.is_current ? 'Yes' : 'No',
    fmt(p.created_at),
  ]);

  return buildCSV(
    ['Program Name', 'Training Focus', 'Total Weeks', 'Days Per Week', 'Is Active', 'Created At'],
    rows,
  );
}

function buildMusclePrioritiesCSV(programs: ProgramRecord[]): string {
  const rows: (string | number)[][] = [];
  for (const p of programs) {
    if (!p.muscle_priorities) continue;
    for (const [muscle, priority] of Object.entries(p.muscle_priorities)) {
      rows.push([p.name, muscle, priorityLabel(String(priority)), priorityLevel(String(priority))]);
    }
  }
  return buildCSV(
    ['Program Name', 'Muscle Group', 'Priority', 'Priority Level (1-3)'],
    rows,
  );
}

function buildPersonalRecordsCSV(prs: PersonalRecordRecord[]): string {
  const rows = prs.map((pr) => [pr.exercise_name, pr.weight, pr.reps ?? '', fmt(pr.achieved_at)]);
  return buildCSV(
    ['Exercise Name', 'Weight (lbs)', 'Reps', 'Achieved At'],
    rows,
  );
}

// ── Main export orchestration ─────────────────────────────────────────────────

export interface ExportCallbacks {
  onProgress: (message: string, progress: number) => void;
}

export async function runWorkoutExport(user: User, { onProgress }: ExportCallbacks): Promise<void> {
  onProgress('Fetching workouts…', 0.05);
  const workouts = await fetchWorkoutsForExport(user.id);

  onProgress('Fetching sets…', 0.15);
  const sets = await fetchSetsForExport((loaded) => {
    onProgress(`Fetching sets (${loaded.toLocaleString()})…`, Math.min(0.15 + loaded / 60000, 0.50));
  });

  onProgress('Building CSV files…', 0.60);

  const workoutMap = new Map<string, WorkoutRecord>(workouts.map((w) => [w.id, w]));
  const summaryCSV = buildSummaryCSV(workouts, sets);
  const setsCSV    = buildSetsCSV(sets, workoutMap);

  onProgress('Packaging ZIP…', 0.80);
  const zip = new JSZip();
  zip.file('summary.csv', summaryCSV);
  zip.file('sets.csv',    setsCSV);

  const fileName = `GRIT-Workout-Export-${exportDate()}.zip`;

  if (Platform.OS === 'web') {
    onProgress('Downloading…', 0.92);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    onProgress('Writing file…', 0.90);
    const base64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    onProgress('Opening share sheet…', 0.97);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('Sharing is not available on this device.');
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: 'Export Workout Data',
      UTI: 'com.pkware.zip-archive',
    });
  }

  onProgress('Done', 1);
}
