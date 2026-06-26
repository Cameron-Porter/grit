export type ExportStage = 'idle' | 'running' | 'done' | 'error';

export interface WorkoutRecord {
  id: string;
  name: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SetRecord {
  id: string;
  workout_id: string;
  exercise_name: string | null;
  set_index: number | null;
  reps: number | null;
  weight: number | null;
  completed: boolean | null;
  note: string | null;
  muscle_group: string | null;
  rir: number | null;
  muscle_priority: string | null;
}

export interface ProgramRecord {
  id: string;
  name: string;
  focus: string | null;
  total_weeks: number;
  days_per_week: number;
  is_current: boolean;
  created_at: string;
  muscle_priorities: Record<string, string> | null;
}

export interface PersonalRecordRecord {
  exercise_name: string;
  weight: number;
  reps: number | null;
  achieved_at: string;
}
