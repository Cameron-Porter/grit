export type WorkoutSet = {
  reps: number;
  weight: number;
  completed: boolean;
  skipped?: boolean;
  type?: 'Regular' | 'M' | 'MM';
  rir?: number;
  // Target rep count for this set — used to auto-fill reps on completion for non-RIR sets.
  targetReps?: number;
};

export type WorkoutSetRow = {
  workout_id: string;
  exercise_name: string;
  reps: number;
  weight: number;
  set_index: number;
  rir?: number | null;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup?: string;
  musclePriority?: 'emphasize' | 'grow' | 'maintain';
  sets: WorkoutSet[];
  equipment: string;
  note?: string;
  painWarning?: string;
};

export type Props = {
  weight: number;
  reps: number;
  completed: boolean;

  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;

  onToggleComplete: () => void;
  onRemove?: () => void;
  onMenuPress?: () => void;
};

export type PendingFeedback = {
  muscleGroup: string;
  jointPain: string;
  pump: string;
  volume: string;
  soreness?: string;
};

export type WorkoutState = {
  activeWorkoutId: string | null;
  activeProgramId: string | null;
  activeProgramDayId: string | null;
  activeProgramName: string | null;
  activeProgramWeek: number | null;
  activeProgramDayNumber: number | null;
  activeProgramDayLabel: string | null;
  dayNote: string | null;
  exercises: Exercise[];
  pendingFeedback: PendingFeedback[];
  isSaving: boolean;

  startWorkout: () => void;
  endWorkout: () => void;
  clearProgramState: () => void;
  queueFeedback: (muscleGroup: string, jointPain: string, pump: string, volume: string) => void;
  queueSoreness: (muscleGroup: string, soreness: string) => void;

  addExercise: (name: string, muscleGroup?: string, equipment?: string) => void;
  addSet: (exerciseId: string, defaultWeight?: number, defaultRir?: number) => void;

  updateSet: (
    exerciseId: string,
    setIndex: number,
    data: Partial<WorkoutSet>,
    autoMatchWeight?: boolean,
  ) => void;

  removeSet: (exerciseId: string, setIndex: number) => void;
  removeExercise: (exerciseId: string) => void;
  moveExerciseUp: (exerciseId: string) => void;
  moveExerciseDown: (exerciseId: string) => void;
  skipSet: (exerciseId: string, setIndex: number) => void;
  skipSets: (exerciseId: string) => void;
  skipAllSets: () => void;
  setExerciseNote: (exerciseId: string, note: string) => void;
  finishWorkout: () => Promise<{ savedOffline: boolean }>;
  setDayNote: (note: string | null) => void;
  skipDay: (dayId: string) => Promise<void>;
  startFromProgramDay: (
    dayId: string | null,
    programName: string | null,
    exercises: {
      name: string;
      muscleGroup: string;
      equipment: string;
      musclePriority?: 'emphasize' | 'grow' | 'maintain';
      targetSets?: number;
      targetRepsMin?: number;
      targetRepsMax?: number;
      targetWeight?: number;
      rir?: number;
      painWarning?: string;
    }[],
    weekNumber?: number | null,
    dayNumber?: number | null,
    dayLabel?: string | null,
    programId?: string | null,
  ) => void;
  replaceExercise: (exerciseId: string, newName: string, newMuscleGroup: string, newEquipment: string) => void;
  updateExercisePriorities: (priorities: Record<string, 'emphasize' | 'grow' | 'maintain'>) => void;
};
