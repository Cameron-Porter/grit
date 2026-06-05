import { Exercise, WorkoutState } from '@/types/workout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { markDayComplete } from '../api/programs';
import { supabase } from '../api/supabase';

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      activeProgramDayId: null,
      activeProgramName: null,
      activeProgramWeek: null,
      activeProgramDayNumber: null,
      activeProgramDayLabel: null,
      exercises: [],
      pendingFeedback: [],
      isSaving: false,

      startWorkout: () =>
        set((state) => {
          if (state.activeWorkoutId && state.exercises.length > 0) return state;
          return {
            activeWorkoutId: Date.now().toString(),
            activeProgramDayId: null,
            activeProgramName: null,
            activeProgramWeek: null,
            activeProgramDayNumber: null,
            activeProgramDayLabel: null,
            exercises: [],
          };
        }),

      endWorkout: () =>
        set({
          activeWorkoutId: null,
          activeProgramDayId: null,
          activeProgramName: null,
          activeProgramWeek: null,
          activeProgramDayNumber: null,
          activeProgramDayLabel: null,
          exercises: [],
          pendingFeedback: [],
          isSaving: false,
        }),

      queueFeedback: (muscleGroup, jointPain, pump, volume) =>
        set((state) => ({
          pendingFeedback: [
            ...state.pendingFeedback.filter((f) => f.muscleGroup !== muscleGroup),
            {
              ...(state.pendingFeedback.find((f) => f.muscleGroup === muscleGroup) ?? {}),
              muscleGroup, jointPain, pump, volume,
            },
          ],
        })),

      queueSoreness: (muscleGroup, soreness) =>
        set((state) => ({
          pendingFeedback: [
            ...state.pendingFeedback.filter((f) => f.muscleGroup !== muscleGroup),
            {
              ...(state.pendingFeedback.find((f) => f.muscleGroup === muscleGroup) ?? {
                muscleGroup, jointPain: '', pump: '', volume: '',
              }),
              soreness,
            },
          ],
        })),

      addExercise: (name, muscleGroup, equipment = 'Bodyweight') => {
        set((state) => ({
          exercises: [
            ...state.exercises,
            { id: uuidv4(), name, muscleGroup, equipment, sets: [] } as Exercise,
          ],
        }));
      },

      removeExercise: (exerciseId) => {
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== exerciseId),
        }));
      },

      moveExerciseUp: (exerciseId) => {
        set((state) => {
          const idx = state.exercises.findIndex((ex) => ex.id === exerciseId);
          if (idx <= 0) return state;
          const next = [...state.exercises];
          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
          return { exercises: next };
        });
      },

      moveExerciseDown: (exerciseId) => {
        set((state) => {
          const idx = state.exercises.findIndex((ex) => ex.id === exerciseId);
          if (idx < 0 || idx >= state.exercises.length - 1) return state;
          const next = [...state.exercises];
          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
          return { exercises: next };
        });
      },

      addSet: (exerciseId, defaultWeight = 0) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: [...ex.sets, { reps: 8, weight: defaultWeight, completed: false }] }
              : ex,
          ),
        })),

      updateSet: (exerciseId, setIndex, data) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, ...data } : s)) }
              : ex,
          ),
        })),

      removeSet: (exerciseId, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }
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

      startFromProgramDay: (dayId, programName, exerciseTemplates, weekNumber, dayNumber, dayLabel) => {
        set((state) => {
          if (state.activeWorkoutId && state.exercises.length > 0) return state;
          return {
            activeWorkoutId: Date.now().toString(),
            activeProgramDayId: dayId,
            activeProgramName: programName,
            activeProgramWeek: weekNumber ?? null,
            activeProgramDayNumber: dayNumber ?? null,
            activeProgramDayLabel: dayLabel ?? null,
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
        if (state.isSaving || state.exercises.length === 0) return;

        set({ isSaving: true });

        try {
          const workoutId = crypto.randomUUID();

          const userId = await getUserId();

          const { error: workoutError } = await supabase.from('workouts').insert({
            id: workoutId,
            user_id: userId,
            name: state.activeProgramName ?? 'Workout',
            program_name: state.activeProgramName,
            program_day_id: state.activeProgramDayId,
            completed_at: new Date().toISOString(),
          });

          if (workoutError) throw workoutError;

          const workoutSets = state.exercises.flatMap((exercise) =>
            exercise.sets.map((s, index) => ({
              workout_id: workoutId,
              exercise_name: exercise.name,
              muscle_group: exercise.muscleGroup ?? null,
              equipment: exercise.equipment ?? null,
              note: exercise.note ?? null,
              set_index: index,
              reps: s.reps,
              weight: s.weight,
              completed: s.completed,
            })),
          );

          if (workoutSets.length > 0) {
            const { error: setsError } = await supabase.from('workout_sets').insert(workoutSets);
            if (setsError) throw setsError;
          }

          // Flush feedback collected during the session — must happen after workout row exists
          if (state.pendingFeedback.length > 0) {
            const feedbackRows = state.pendingFeedback.map((f) => ({
              workout_id: workoutId,
              muscle_group: f.muscleGroup,
              joint_pain: f.jointPain || null,
              pump: f.pump || null,
              volume: f.volume || null,
              soreness: f.soreness ?? null,
            }));
            await supabase.from('workout_feedback').insert(feedbackRows).then(null, () => {});
          }

          // Mark program day complete
          if (state.activeProgramDayId) {
            await markDayComplete(state.activeProgramDayId).then(null, () => {});
          }

          set({
            activeWorkoutId: null,
            activeProgramDayId: null,
            activeProgramName: null,
            activeProgramWeek: null,
            activeProgramDayNumber: null,
            activeProgramDayLabel: null,
            exercises: [],
            pendingFeedback: [],
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
        activeProgramDayId: state.activeProgramDayId,
        activeProgramName: state.activeProgramName,
        activeProgramWeek: state.activeProgramWeek,
        activeProgramDayNumber: state.activeProgramDayNumber,
        activeProgramDayLabel: state.activeProgramDayLabel,
        exercises: state.exercises,
        pendingFeedback: state.pendingFeedback,
      }),
    },
  ),
);
