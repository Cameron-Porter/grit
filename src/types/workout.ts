export type WorkoutSet = {
  reps: number;
  weight: number;
  completed: boolean;
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
  exercises: Exercise[];
  isSaving: boolean;

  startWorkout: () => void;
  endWorkout: () => void;

  addExercise: (name: string, muscleGroup?: string, equipment?: string) => void;
  addSet: (exerciseId: string) => void;

  updateSet: (
    exerciseId: string,
    setIndex: number,
    data: Partial<WorkoutSet>,
  ) => void;

  removeSet: (exerciseId: string, setIndex: number) => void;
  removeExercise: (exerciseId: string) => void;
  finishWorkout: () => Promise<void>;
};
