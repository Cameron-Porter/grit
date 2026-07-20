import { Platform } from 'react-native';

const GROUP = 'group.com.gritfitness.app';

// Lazy-require so Android/web never loads the iOS-only native module
function getPrefs() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-shared-group-preferences').default;
  } catch {
    return null;
  }
}

export interface ActiveWorkoutPayload {
  programName: string;
  dayName: string;
  exerciseCount: number;
  setsCompleted: number;
  setsTotal: number;
}

export interface WeekStatsPayload {
  setsCompleted: number;
  setsTarget: number;
  workoutsCompleted: number;
  workoutsTarget: number;
}

export async function writeActiveWorkout(payload: ActiveWorkoutPayload): Promise<void> {
  const prefs = getPrefs();
  if (!prefs) return;
  try {
    await prefs.setItem('grit_active_workout', JSON.stringify(payload), GROUP);
  } catch {
    // Widget data is best-effort — never crash the app
  }
}

export async function clearActiveWorkout(): Promise<void> {
  const prefs = getPrefs();
  if (!prefs) return;
  try {
    await prefs.setItem('grit_active_workout', '', GROUP);
  } catch {}
}

export async function writeWeekStats(payload: WeekStatsPayload): Promise<void> {
  const prefs = getPrefs();
  if (!prefs) return;
  try {
    await prefs.setItem('grit_week_stats', JSON.stringify(payload), GROUP);
  } catch {}
}
