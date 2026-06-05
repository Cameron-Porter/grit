import { Exercise, WorkoutState } from '@/types/workout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
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

      addExercise: (
        name: string,
        muscleGroup?: string,
        equipment: string = 'Bodyweight',
      ) => {
        set((state) => ({
          exercises: [
            ...state.exercises,
            {
              id: uuidv4(),
              name,
              muscleGroup,
              equipment,
              sets: [],
            } as Exercise,
          ],
        }));
      },

      removeExercise: (exerciseId: string) => {
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== exerciseId),
        }));
      },

      moveExerciseUp: (exerciseId: string) => {
        set((state) => {
          const idx = state.exercises.findIndex((ex) => ex.id === exerciseId);
          if (idx <= 0) return state;
          const next = [...state.exercises];
          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
          return { exercises: next };
        });
      },

      moveExerciseDown: (exerciseId: string) => {
        set((state) => {
          const idx = state.exercises.findIndex((ex) => ex.id === exerciseId);
          if (idx < 0 || idx >= state.exercises.length - 1) return state;
          const next = [...state.exercises];
          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
          return { exercises: next };
        });
      },

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
                  sets: ex.sets.map((s, i) =>
                    i === setIndex ? { ...s, ...data } : s,
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

      skipSet: (exerciseId, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s, i) =>
                    i === setIndex ? { ...s, skipped: true, completed: false } : s,
                  ),
                }
              : ex,
          ),
        })),

      skipSets: (exerciseId) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((s) =>
                    s.completed ? s : { ...s, skipped: true, completed: false },
                  ),
                }
              : ex,
          ),
        })),

      setExerciseNote: (exerciseId, note) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, note } : ex,
          ),
        })),

      startFromProgramDay: (exerciseTemplates) => {
        set((state) => {
          if (state.activeWorkoutId && state.exercises.length > 0) return state;
          return {
            activeWorkoutId: Date.now().toString(),
            exercises: exerciseTemplates.map((t) => ({
              id: uuidv4(),
              name: t.name,
              muscleGroup: t.muscleGroup,
              equipment: t.equipment,
              sets: [],
            })),
          };
        });
      },

      finishWorkout: async () => {
        const state = get();

        if (state.isSaving) return;

        if (state.exercises.length === 0) {
          return;
        }

        set({ isSaving: true });

        try {
          const workoutId = crypto.randomUUID();

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

          const workoutSets = state.exercises.flatMap((exercise) =>
            exercise.sets.map((s, index) => ({
              workout_id: workoutId,
              exercise_name: exercise.name,
              set_index: index,
              reps: s.reps,
              weight: s.weight,
              completed: s.completed,
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

          set({
            activeWorkoutId: null,
            exercises: [],
            isSaving: false,
          });
        } catch (error) {
          console.error('Failed to save workout:', error);
          set({ isSaving: false });
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
