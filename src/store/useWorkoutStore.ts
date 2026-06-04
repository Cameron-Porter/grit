import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Set = {
  reps: number;
  weight: number;
  completed: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets: Set[];
};

type WorkoutState = {
  activeWorkoutId: string | null;
  exercises: Exercise[];

  startWorkout: () => void;
  endWorkout: () => void;

  addExercise: (name: string) => void;
  addSet: (exerciseId: string) => void;

  updateSet: (exerciseId: string, setIndex: number, data: Partial<Set>) => void;
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      exercises: [],

      startWorkout: () =>
        set((state) => {
          // if already has active workout → DO NOT overwrite
          if (state.activeWorkoutId && state.exercises.length > 0) {
            return state;
          }

          return {
            activeWorkoutId: Date.now().toString(),
            exercises: [],
          };
        }),

      endWorkout: () =>
        set({
          activeWorkoutId: null,
          exercises: [],
        }),

      addExercise: (name) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            {
              id: Date.now().toString(),
              name,
              sets: [],
            },
          ],
        })),

      addSet: (exerciseId) =>
        set((state) => {
          const exercise = state.exercises.find((ex) => ex.id === exerciseId);

          const lastSet = exercise?.sets.at(-1);

          return {
            exercises: state.exercises.map((ex) =>
              ex.id === exerciseId
                ? {
                    ...ex,
                    sets: [
                      ...ex.sets,
                      {
                        reps: lastSet?.reps ?? 8,
                        weight: lastSet?.weight ?? 0,
                        completed: false,
                      },
                    ],
                  }
                : ex,
            ),
          };
        }),

      updateSet: (exerciseId, setIndex, data) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s, i) =>
                    i === setIndex ? { ...s, ...data } : s,
                  ),
                }
              : ex,
          ),
        })),
    }),
    {
      name: 'grit-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeWorkoutId: state.activeWorkoutId,
        exercises: state.exercises,
      }),
    },
  ),
);
