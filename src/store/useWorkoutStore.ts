import { Exercise, WorkoutState } from '@/types/workout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { markDayComplete, skipProgramDay } from '../api/programs';
import { drainPendingWorkouts, enqueueWorkout, isNetworkError } from '../api/pendingWorkouts';
import { getExerciseByName } from '../data/exerciseDatabase';
import { computeAndSaveProgressionTargets } from '../api/progression';
import { supabase } from '../api/supabase';
import { rescheduleWithStreak } from '../lib/notifications';
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
        reportedRir: s.reportedRir ?? null,
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
      activeProgramMusclePriorities: null,
      dayNote: null,
      exercises: [],
      pendingFeedback: [],
      isSaving: false,
      isSyncingWorkout: false,

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
            activeProgramMusclePriorities: null,
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
          activeProgramMusclePriorities: null,
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
          activeProgramMusclePriorities: null,
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

      addExercise: (name, muscleGroup, equipment = 'Bodyweight', logMode) => {
        set((state) => {
          // Prefer stored map; fall back to inferring from an existing exercise of the same muscle group
          const musclePriority: 'emphasize' | 'grow' | 'maintain' | undefined =
            (muscleGroup && state.activeProgramMusclePriorities?.[muscleGroup]) ||
            (muscleGroup
              ? state.exercises.find((ex) => ex.muscleGroup === muscleGroup && ex.musclePriority)?.musclePriority
              : undefined);
          return {
            exercises: [
              ...state.exercises,
              { id: uuidv4(), name, muscleGroup, equipment, musclePriority, logMode, sets: [] } as Exercise,
            ],
          };
        });
      },

      updateExercisePriorities: (priorities) =>
        set((state) => ({
          activeProgramMusclePriorities: priorities,
          exercises: state.exercises.map((ex) =>
            ex.muscleGroup && priorities[ex.muscleGroup]
              ? { ...ex, musclePriority: priorities[ex.muscleGroup] }
              : ex,
          ),
        })),

      replaceExercise: (exerciseId, newName, newMuscleGroup, newEquipment, newLogMode) => {
        set((state) => ({
          exercises: state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;

            // A different movement has a different strength curve and loading context.
            // Preserve the authored session prescription (set count, target reps, set
            // type, and prescribed RIR), but never attribute the old movement's
            // execution data to its replacement. Dr. Mike Israetel / RP exercise
            // selection guidance: establish performance on the new movement before
            // progressing it from that movement's own baseline.
            const sets = ex.sets.map((workSet) => ({
              ...(workSet.type !== undefined ? { type: workSet.type } : {}),
              ...(workSet.rir !== undefined ? { rir: workSet.rir } : {}),
              ...(workSet.targetReps !== undefined ? { targetReps: workSet.targetReps } : {}),
              reps: 0,
              weight: 0,
              completed: false,
            }));

            return {
              ...ex,
              name: newName,
              muscleGroup: newMuscleGroup,
              equipment: newEquipment,
              logMode: newLogMode,
              musclePriority: state.activeProgramMusclePriorities?.[newMuscleGroup],
              painWarning: undefined,
              sets,
            };
          }),
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

      startFromProgramDay: (dayId, programName, exerciseTemplates, weekNumber, dayNumber, dayLabel, programId, musclePriorities) => {
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
            activeProgramMusclePriorities: musclePriorities ?? null,
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
                    // Uses the top of the rep band (not the floor) — double progression's
                    // whole point is chasing the ceiling before adding load, and since the
                    // band itself doesn't move week to week, pre-filling the floor made the
                    // default look like a regression from whatever the user actually hit
                    // last week (which is usually already at or above the floor).
                    // Week 1: leave RIR sets blank so the user discovers their starting weight.
                    const prescribedReps = t.targetRepsMax ?? t.targetRepsMin ?? 8;
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

      // Sibling to startFromProgramDay for an ad-hoc, generated session with
      // no program/day linkage (activeProgramDayId stays null — this already
      // makes the existing replace-exercise "apply to all program workouts"
      // checkbox and the soreness-check gate no-op correctly, both of which
      // are conditioned on activeProgramDayId being truthy).
      //
      // Deliberately NOT a thin wrapper around startFromProgramDay: that
      // action's Week-1-vs-Week-2+ reps prefill is a single session-wide
      // flag, but a Quick Workout mixes exercises with and without history in
      // the same session — each needs its own independent blank-vs-prefilled
      // decision, so `isFirstSession` is tracked per exercise instead.
      startQuickWorkout: (label, exerciseTemplates) => {
        set((state) => {
          const hasCompletedSets = state.exercises.some((ex) => ex.sets.some((s) => s.completed));
          if (state.activeWorkoutId && hasCompletedSets) return state;
          const { bodyWeight } = useProfileStore.getState();
          return {
            activeWorkoutId: Date.now().toString(),
            activeProgramId: null,
            activeProgramDayId: null,
            activeProgramMusclePriorities: null,
            activeProgramName: 'Quick Workout',
            activeProgramWeek: null,
            activeProgramDayNumber: null,
            activeProgramDayLabel: label,
            exercises: exerciseTemplates.map((t) => {
              const isBodyweight = t.equipment === 'Bodyweight';
              const resolvedWeight = isBodyweight ? (bodyWeight ?? t.targetWeight) : t.targetWeight;
              const prescribedReps = t.targetRepsMax;
              return {
                id: uuidv4(),
                name: t.name,
                muscleGroup: t.muscleGroup,
                musclePriority: t.musclePriority,
                equipment: t.equipment,
                sets: Array.from({ length: t.targetSets }, () => ({
                  reps: t.isFirstSession ? 0 : prescribedReps,
                  weight: resolvedWeight,
                  completed: false,
                  rir: t.rir,
                  targetReps: prescribedReps,
                })),
              };
            }),
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

          // Offline-first: always write to the local queue before touching the network.
          // This guarantees the workout is safe even if the connection drops mid-save.
          await enqueueWorkout(buildPayload(workoutId, userId, name, completedAt, state));

          // Mark the program day complete/skipped *before* clearing UI state. The
          // workout screen's "auto-load next workout" effect fires the instant
          // activeWorkoutId goes null, and it picks the next day by querying
          // program_days.completed — normally only set later, inside
          // drainPendingWorkouts, once the full sync lands. If that flag hasn't
          // landed yet, the effect re-fetches the day we just finished instead of
          // advancing, and the screen "blanks out" into a fresh copy of it.
          // Best-effort: if this fails (e.g. offline), drainPendingWorkouts()
          // below will set it once the queue actually syncs.
          if (state.activeProgramDayId) {
            const hasCompletedSets = state.exercises.some((ex) => ex.sets.some((s) => s.completed));
            await (hasCompletedSets
              ? markDayComplete(state.activeProgramDayId)
              : skipProgramDay(state.activeProgramDayId)
            ).catch(() => {});
          }

          // Clear UI immediately — the data is safe locally.
          clearWorkoutState();

          // isSyncingWorkout: computeAndSaveProgressionTargets (called from inside
          // drainPendingWorkouts, below) writes next week's program_day_targets.
          // The workout screen's auto-load-next-workout effect fires the instant
          // activeWorkoutId went null just above — without this flag it can query
          // program_day_targets before that write lands and pre-fill the next
          // session with a zeroed-out weight. The effect waits for this to go
          // false before it fetches (see app/workout.tsx).
          set({ isSyncingWorkout: true });
          try {
            // Attempt to flush the queue in the background. On success the data
            // lands in Supabase and is removed from AsyncStorage. On failure it
            // stays queued and drainPendingWorkouts() will retry next foreground.
            const synced = await drainPendingWorkouts();

            // Refresh workout reminder content with the updated streak (fire-and-forget).
            const { workoutRemindersEnabled } = useProfileStore.getState();
            if (workoutRemindersEnabled) {
              rescheduleWithStreak().catch(() => {});
            }

            return { savedOffline: synced === 0 };
          } finally {
            set({ isSyncingWorkout: false });
          }
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
