import { Exercise, WorkoutState } from '@/types/workout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { markDayComplete, skipProgramDay } from '../api/programs';
import { enqueueWorkout, isNetworkError } from '../api/pendingWorkouts';
import { getExerciseByName } from '../data/exerciseDatabase';
import { computeAndSaveProgressionTargets } from '../api/progression';
import { supabase } from '../api/supabase';
import { useProfileStore } from './useProfileStore';

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

function buildPayload(
  workoutId: string,
  userId: string | null,
  name: string,
  completedAt: string,
  state: Pick<WorkoutState, 'activeProgramName' | 'activeProgramDayId' | 'exercises' | 'pendingFeedback'>,
) {
  return {
    workoutId,
    userId: userId ?? '',
    name,
    programName: state.activeProgramName,
    programDayId: state.activeProgramDayId,
    completedAt,
    enqueuedAt: new Date().toISOString(),
    exercises: state.exercises.map((ex) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup ?? null,
      musclePriority: ex.musclePriority ?? null,
      equipment: ex.equipment ?? null,
      note: ex.note ?? null,
      sets: ex.sets.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        rir: s.rir ?? null,
        completed: s.completed,
      })),
    })),
    feedback: state.pendingFeedback.map((f) => ({
      muscleGroup: f.muscleGroup,
      jointPain: f.jointPain || null,
      pump: f.pump || null,
      volume: f.volume || null,
      soreness: f.soreness ?? null,
    })),
  };
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkoutId: null,
      activeProgramId: null,
      activeProgramDayId: null,
      activeProgramName: null,
      activeProgramWeek: null,
      activeProgramDayNumber: null,
      activeProgramDayLabel: null,
      dayNote: null,
      exercises: [],
      pendingFeedback: [],
      isSaving: false,

      setDayNote: (note) => set({ dayNote: note }),

      startWorkout: () =>
        set((state) => {
          if (state.activeWorkoutId && state.exercises.length > 0) return state;
          return {
            activeWorkoutId: Date.now().toString(),
            activeProgramId: null,
            activeProgramDayId: null,
            activeProgramName: null,
            activeProgramWeek: null,
            activeProgramDayNumber: null,
            activeProgramDayLabel: null,
            dayNote: null,
            exercises: [],
          };
        }),

      endWorkout: () =>
        set({
          activeWorkoutId: null,
          activeProgramId: null,
          activeProgramDayId: null,
          activeProgramName: null,
          activeProgramWeek: null,
          activeProgramDayNumber: null,
          activeProgramDayLabel: null,
          dayNote: null,
          exercises: [],
          pendingFeedback: [],
          isSaving: false,
        }),

      clearProgramState: () =>
        set({
          activeProgramId: null,
          activeProgramDayId: null,
          activeProgramName: null,
          activeProgramWeek: null,
          activeProgramDayNumber: null,
          activeProgramDayLabel: null,
          dayNote: null,
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

      updateExercisePriorities: (priorities) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.muscleGroup && priorities[ex.muscleGroup]
              ? { ...ex, musclePriority: priorities[ex.muscleGroup] }
              : ex,
          ),
        })),

      replaceExercise: (exerciseId, newName, newMuscleGroup, newEquipment) => {
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, name: newName, muscleGroup: newMuscleGroup, equipment: newEquipment }
              : ex,
          ),
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

      addSet: (exerciseId, defaultWeight = 0, defaultRir?) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: [
                    ...ex.sets,
                    {
                      reps: defaultRir !== undefined ? 0 : 8,
                      weight: defaultWeight,
                      completed: false,
                      ...(defaultRir !== undefined ? { rir: defaultRir } : {}),
                    },
                  ],
                }
              : ex,
          ),
        })),

      updateSet: (exerciseId, setIndex, data, autoMatchWeight = false) =>
        set((state) => ({
          exercises: state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const oldWeight = ex.sets[setIndex]?.weight;
            return {
              ...ex,
              sets: ex.sets.map((s, i) => {
                if (i === setIndex) return { ...s, ...data };
                if (autoMatchWeight && data.weight !== undefined && i > setIndex && s.weight === oldWeight)
                  return { ...s, weight: data.weight };
                return s;
              }),
            };
          }),
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

      skipAllSets: () =>
        set((state) => ({
          exercises: state.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) =>
              s.completed ? s : { ...s, skipped: true, completed: false },
            ),
          })),
        })),

      setExerciseNote: (exerciseId, note) =>
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === exerciseId ? { ...ex, note } : ex,
          ),
        })),

      startFromProgramDay: (dayId, programName, exerciseTemplates, weekNumber, dayNumber, dayLabel, programId) => {
        set((state) => {
          // Guard only when the user has already logged completed sets — don't block on a stale/unstarted workout
          const hasCompletedSets = state.exercises.some((ex) => ex.sets.some((s) => s.completed));
          if (state.activeWorkoutId && hasCompletedSets) return state;
          const { bodyWeight } = useProfileStore.getState();
          const isWeek2Plus = (weekNumber ?? 1) >= 2;
          return {
            activeWorkoutId: Date.now().toString(),
            activeProgramId: programId ?? null,
            activeProgramDayId: dayId,
            activeProgramName: programName,
            activeProgramWeek: weekNumber ?? null,
            activeProgramDayNumber: dayNumber ?? null,
            activeProgramDayLabel: dayLabel ?? null,
            exercises: exerciseTemplates.map((t) => ({
              id: uuidv4(),
              name: t.name,
              muscleGroup: t.muscleGroup,
              musclePriority: t.musclePriority,
              equipment: t.equipment,
              painWarning: t.painWarning,
              sets: t.targetSets
                ? Array.from({ length: t.targetSets }, () => {
                    const isBodyweight = t.equipment === 'Bodyweight';
                    const resolvedWeight = isBodyweight
                      ? (bodyWeight ?? t.targetWeight ?? 0)
                      : (t.targetWeight ?? 0);
                    const hasRir = t.rir !== undefined;
                    // Week 2+: pre-fill the prescribed rep count so users see their target.
                    // Week 1: leave RIR sets blank so the user discovers their starting weight.
                    const prescribedReps = t.targetRepsMin ?? 8;
                    return {
                      reps: (isWeek2Plus || !hasRir) ? prescribedReps : 0,
                      weight: resolvedWeight,
                      completed: false,
                      ...(hasRir ? { rir: t.rir } : {}),
                      targetReps: prescribedReps,
                    };
                  })
                : [],
            })),
          };
        });
      },

      skipDay: async (dayId: string) => {
        try {
          await skipProgramDay(dayId);
        } catch {
          // Non-fatal — still clear workout state so the user isn't stuck
        }
        set({
          activeWorkoutId: null,
          activeProgramId: null,
          activeProgramDayId: null,
          activeProgramName: null,
          activeProgramWeek: null,
          activeProgramDayNumber: null,
          activeProgramDayLabel: null,
          dayNote: null,
          exercises: [],
          pendingFeedback: [],
          isSaving: false,
        });
      },

      finishWorkout: async () => {
        const state = get();
        if (state.isSaving || state.exercises.length === 0) return { savedOffline: false };

        set({ isSaving: true });

        const workoutId = uuidv4();
        const completedAt = new Date().toISOString();
        const name = state.activeProgramName ?? 'Workout';

        const clearWorkoutState = () =>
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

        try {
          const userId = await getUserId();

          const { error: workoutError } = await supabase.from('workouts').insert({
            id: workoutId,
            user_id: userId,
            name,
            program_name: state.activeProgramName,
            program_day_id: state.activeProgramDayId,
            completed_at: completedAt,
          });

          if (workoutError) {
            if (isNetworkError(workoutError)) {
              await enqueueWorkout(buildPayload(workoutId, userId, name, completedAt, state));
              clearWorkoutState();
              return { savedOffline: true };
            }
            throw workoutError;
          }

          // Only save sets the user actually completed — skipped sets are not logged
          const workoutSets = state.exercises.flatMap((exercise) =>
            exercise.sets
              .filter((s) => s.completed)
              .map((s, index) => ({
                workout_id: workoutId,
                exercise_name: exercise.name,
                muscle_group: exercise.muscleGroup ?? null,
                muscle_priority: exercise.musclePriority ?? null,
                equipment: exercise.equipment ?? null,
                note: exercise.note ?? null,
                set_index: index,
                reps: s.reps,
                weight: s.weight,
                completed: true,
                rir: s.rir ?? null,
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

          // Mark program day complete or skipped depending on whether any sets were logged
          if (state.activeProgramDayId) {
            if (workoutSets.length > 0) {
              await markDayComplete(state.activeProgramDayId).catch(() => {});
              const { experienceLevel } = useProfileStore.getState();
              computeAndSaveProgressionTargets(state.activeProgramDayId, experienceLevel).catch((e) => {
                Sentry.captureException(e, { tags: { context: 'progressionEngine' } });
              });
            } else {
              // All sets were skipped — mark the day as skipped, not complete
              await skipProgramDay(state.activeProgramDayId).catch(() => {});
            }
          }

          clearWorkoutState();
          return { savedOffline: false };
        } catch (error) {
          Sentry.captureException(error, { tags: { context: 'finishWorkout' } });
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
        activeProgramId: state.activeProgramId,
        activeProgramDayId: state.activeProgramDayId,
        activeProgramName: state.activeProgramName,
        activeProgramWeek: state.activeProgramWeek,
        activeProgramDayNumber: state.activeProgramDayNumber,
        activeProgramDayLabel: state.activeProgramDayLabel,
        dayNote: state.dayNote,
        exercises: state.exercises,
        pendingFeedback: state.pendingFeedback,
      }),
    },
  ),
);
