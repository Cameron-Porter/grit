export type WorkoutSet = {
  reps: number;
  weight: number;
  completed: boolean;
  skipped?: boolean;
  type?: 'Regular' | 'M' | 'MM';
};

export type WorkoutSetRow = {
  workout_id: string;
  exercise_name: string;
  reps: number;
  weight: number;
  set_index: number;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup?: string;
  sets: WorkoutSet[];
  equipment: string;
  note?: string;
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

export type WorkoutState = {
  activeWorkoutId: string | null;
  activeProgramDayId: string | null;
  activeProgramName: string | null;
  activeProgramWeek: number | null;
  activeProgramDayNumber: number | null;
  activeProgramDayLabel: string | null;
  exercises: Exercise[];
  isSaving: boolean;

  startWorkout: () => void;
  endWorkout: () => void;

  addExercise: (name: string, muscleGroup?: string, equipment?: string) => void;
  addSet: (exerciseId: string, defaultWeight?: number) => void;

  updateSet: (
    exerciseId: string,
    setIndex: number,
    data: Partial<WorkoutSet>,
  ) => void;

  removeSet: (exerciseId: string, setIndex: number) => void;
  removeExercise: (exerciseId: string) => void;
  moveExerciseUp: (exerciseId: string) => void;
  moveExerciseDown: (exerciseId: string) => void;
  skipSet: (exerciseId: string, setIndex: number) => void;
  skipSets: (exerciseId: string) => void;
  setExerciseNote: (exerciseId: string, note: string) => void;
  finishWorkout: () => Promise<void>;
  startFromProgramDay: (
    dayId: string | null,
    programName: string | null,
    exercises: { name: string; muscleGroup: string; equipment: string }[],
    weekNumber?: number | null,
    dayNumber?: number | null,
    dayLabel?: string | null,
  ) => void;
};
