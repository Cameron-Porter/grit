import { supabase } from '../../api/supabase';
import { WorkoutRecord, SetRecord, ProgramRecord, PersonalRecordRecord } from './types';

const PAGE_SIZE = 500;

export async function fetchWorkoutsForExport(userId: string): Promise<WorkoutRecord[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch workouts: ${error.message}`);
  return (data ?? []) as WorkoutRecord[];
}

// Paginated — RLS scopes to the authenticated user automatically.
export async function fetchSetsForExport(
  onPageLoaded?: (totalLoaded: number) => void,
): Promise<SetRecord[]> {
  const all: SetRecord[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('workout_sets')
      .select('id, workout_id, exercise_name, set_index, reps, weight, completed, note, muscle_group, rir, muscle_priority')
      .order('workout_id', { ascending: true })
      .order('set_index', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch sets: ${error.message}`);
    const rows = (data ?? []) as SetRecord[];
    all.push(...rows);
    onPageLoaded?.(all.length);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function fetchProgramsForExport(userId: string): Promise<ProgramRecord[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, focus, total_weeks, days_per_week, is_current, created_at, muscle_priorities')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch programs: ${error.message}`);
  return (data ?? []) as ProgramRecord[];
}

export async function fetchPersonalRecordsForExport(userId: string): Promise<PersonalRecordRecord[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_name, weight, reps, achieved_at')
    .eq('user_id', userId)
    .order('exercise_name', { ascending: true });
  if (error) throw new Error(`Failed to fetch personal records: ${error.message}`);
  return (data ?? []) as PersonalRecordRecord[];
}
