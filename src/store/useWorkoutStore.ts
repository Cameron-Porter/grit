import { WorkoutState } from '@/types/workout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../api/supabase';

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      exercises: [],
      isSaving: false,

      startWorkout: () =>
        set((state) => {
          // Prevent wiping out an existing workout
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
          isSaving: false,
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
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: [
                    ...ex.sets,
                    {
                      reps: 8,
                      weight: 0,
                      completed: false,
                    },
                  ],
                }
              : ex,
          ),
        })),

      updateSet: (exerciseId, setIndex, data) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((set, i) =>
                    i === setIndex ? { ...set, ...data } : set,
                  ),
                }
              : ex,
          ),
        })),

      removeSet: (exerciseId, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.filter((_, i) => i !== setIndex),
                }
              : ex,
          ),
        })),

      finishWorkout: async () => {
        const state = get();

        if (state.isSaving) return;

        if (state.exercises.length === 0) {
          return;
        }

        set({ isSaving: true });

        try {
          const workoutId = crypto.randomUUID();

          // Save workout header
          const { error: workoutError } = await supabase
            .from('workouts')
            .insert({
              id: workoutId,
              name: 'Workout',
              completed_at: new Date().toISOString(),
            });

          if (workoutError) {
            throw workoutError;
          }

          // Flatten exercise sets
          const workoutSets = state.exercises.flatMap((exercise) =>
            exercise.sets.map((set, index) => ({
              workout_id: workoutId,
              exercise_name: exercise.name,
              set_index: index,
              reps: set.reps,
              weight: set.weight,
              completed: set.completed,
            })),
          );

          if (workoutSets.length > 0) {
            const { error: setsError } = await supabase
              .from('workout_sets')
              .insert(workoutSets);

            if (setsError) {
              throw setsError;
            }
          }

          // Clear local draft after successful save
          set({
            activeWorkoutId: null,
            exercises: [],
            isSaving: false,
          });
        } catch (error) {
          console.error('Failed to save workout:', error);

          set({
            isSaving: false,
          });

          throw error;
        }
      },
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
