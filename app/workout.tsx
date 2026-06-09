import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { getPRForExercise, upsertPR } from '../src/api/personalRecords';
import { checkMuscleGroupPreviouslyTrained, getNextProgramWorkout, replaceExerciseInTemplate } from '../src/api/programs';
import ExerciseCard from '../src/components/workout/ExerciseCard';
import ExerciseMenuModal from '../src/components/workout/ExerciseMenuModal';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import FeedbackModal from '../src/components/workout/FeedbackModal';
import SorenessModal from '../src/components/workout/SorenessModal';
import NoteModal from '../src/components/workout/NoteModal';
import PRPopup from '../src/components/workout/PRPopup';
import SetMenuModal from '../src/components/workout/SetMenuModal';
import { useProfileStore } from '../src/store/useProfileStore';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { Exercise, WorkoutSet } from '../src/types/workout';
import { BOTTOM_TAB_HEIGHT, Colors, MuscleGroupColors } from '../src/utils/constants';

const MIN_EXERCISES = 4;

interface PRState {
  exerciseName: string;
  weight: number;
  reps: number | null;
  isBodyweight?: boolean;
}

// ─── Idle State (no active workout) ──────────────────────────────────────────

function IdleScreen() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);
  const skipDay = useWorkoutStore((s) => s.skipDay);

  const [nextWorkout, setNextWorkout] = useState<Awaited<ReturnType<typeof getNextProgramWorkout>>>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getNextProgramWorkout()
        .then(setNextWorkout)
        .catch(() => setNextWorkout(null))
        .finally(() => setLoading(false));
    }, []),
  );

  const handleStart = () => {
    if (!nextWorkout) return;
    startFromProgramDay(
      nextWorkout.day.id,
      nextWorkout.program.name,
      nextWorkout.exercises.map((e) => ({
        name: e.exercise_name,
        muscleGroup: e.muscle_group ?? '',
        equipment: e.equipment ?? 'Bodyweight',
        targetSets: e.target_sets,
        targetRepsMin: e.target_reps_min ?? 8,
        targetRepsMax: e.target_reps_max ?? 12,
        targetWeight: e.target_weight ?? 0,
        rir: e.rir ?? undefined,
      })),
      nextWorkout.day.week_number,
      nextWorkout.day.day_number,
      nextWorkout.day.label,
    );
    // State update is synchronous — the active workout will render on next frame
  };

  const handleSkip = () => {
    if (!nextWorkout) return;
    const confirm = () => {
      setSkipping(true);
      skipDay(nextWorkout.day.id)
        .then(() => getNextProgramWorkout())
        .then(setNextWorkout)
        .catch(() => setNextWorkout(null))
        .finally(() => setSkipping(false));
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Skip Workout', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          message: `Skip ${nextWorkout.day.label ?? `Day ${nextWorkout.day.day_number}`}? It will be marked as missed and the program will advance.`,
        },
        (index) => { if (index === 0) confirm(); },
      );
    } else {
      Alert.alert(
        'Skip Workout',
        `Skip ${nextWorkout.day.label ?? `Day ${nextWorkout.day.day_number}`}? It will be marked as missed and the program will advance.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Skip', style: 'destructive', onPress: confirm },
        ],
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.muted, fontSize: 15 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          GRIT
        </Text>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>
          {nextWorkout ? 'Next Workout' : "All Caught Up"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {nextWorkout ? (
          <>
            {/* Up Next card */}
            <View style={{ backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' }}>
              <View style={{ backgroundColor: `${Colors.primary}18`, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {nextWorkout.program.name} · Week {nextWorkout.day.week_number}
                </Text>
                <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginTop: 3 }}>
                  {nextWorkout.day.label ?? `Day ${nextWorkout.day.day_number}`}
                </Text>
              </View>

              <View style={{ padding: 12, gap: 8 }}>
                {nextWorkout.exercises.map((ex, i) => {
                  const color = ex.muscle_group ? (MuscleGroupColors[ex.muscle_group] ?? Colors.muted) : Colors.muted;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                      <Text style={{ color: Colors.text, fontSize: 15, flex: 1, fontWeight: '500' }}>{ex.exercise_name}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 12 }}>
                        {ex.target_sets} × {ex.target_reps_min ?? 8}–{ex.target_reps_max ?? 12}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Start button */}
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => ({
                  margin: 12,
                  marginTop: 4,
                  backgroundColor: Colors.primary,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <MaterialCommunityIcons name="play" size={22} color={Colors.background} />
                <Text style={{ color: Colors.background, fontSize: 17, fontWeight: '700' }}>Start Workout</Text>
              </Pressable>

              {/* Skip */}
              <Pressable
                onPress={handleSkip}
                disabled={skipping}
                style={{ paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.muted, fontSize: 13, fontWeight: '600' }}>
                  {skipping ? 'Skipping...' : 'Skip This Workout'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          /* No program or all complete */
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 24, alignItems: 'center' }}>
            <MaterialCommunityIcons name="trophy-outline" size={40} color={Colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>All caught up!</Text>
            <Text style={{ color: Colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
              No scheduled workouts remaining. Create a new program to keep progressing.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <Pressable
                onPress={() => router.push('/programs')}
                style={{ flex: 1, backgroundColor: `${Colors.primary}22`, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary }}
              >
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 14 }}>Programs</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  startWorkout();
                }}
                style={{ flex: 1, backgroundColor: Colors.surface2, borderRadius: 10, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.muted, fontWeight: '700', fontSize: 14 }}>Free Workout</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Active Workout ───────────────────────────────────────────────────────────

export default function ActiveWorkout() {
  const router = useRouter();
  const {
    activeWorkoutId,
    exercises,
    addExercise,
    removeExercise,
    moveExerciseUp,
    moveExerciseDown,
    addSet,
    updateSet,
    finishWorkout,
    isSaving,
    removeSet,
    skipSet,
    skipSets,
    setExerciseNote,
    queueFeedback,
    queueSoreness,
    pendingFeedback,
    startFromProgramDay,
    skipDay,
    activeProgramDayId,
    activeProgramName,
    activeProgramWeek,
    activeProgramDayNumber,
    activeProgramDayLabel,
    endWorkout,
    replaceExercise,
  } = useWorkoutStore();

  const bodyWeight = useProfileStore((s) => s.bodyWeight);
  const autoMatchWeight = useProfileStore((s) => s.autoMatchWeight);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [noteExerciseId, setNoteExerciseId] = useState<string | null>(null);
  const [feedbackMuscle, setFeedbackMuscle] = useState<string | null>(null);
  const [pendingFeedbackGroups, setPendingFeedbackGroups] = useState<string[]>([]);
  const [finishPending, setFinishPending] = useState(false);
  const [sorenessMuscle, setSorenessMuscle] = useState<string | null>(null);
  const [prPopup, setPrPopup] = useState<PRState | null>(null);
  const [activeSetData, setActiveSetData] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  // Exercise replacement state
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacePending, setReplacePending] = useState<{ name: string; muscle: string; equipment: string } | null>(null);
  const [replacePersist, setReplacePersist] = useState(false);

  const feedbackShownFor = useRef<Set<string>>(new Set());
  const sorenessShownFor = useRef<Set<string>>(new Set());
  const prCache = useRef<Map<string, number>>(new Map());

  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);

  // Load PRs when exercises change — runs before any conditional return (hooks rule)
  useEffect(() => {
    if (!hasActiveWorkout) return;
    exercises.forEach((ex) => {
      const isBodyweight = ex.equipment === 'Bodyweight';
      const cacheKey = isBodyweight ? `${ex.name}:reps` : ex.name;
      if (!prCache.current.has(cacheKey)) {
        getPRForExercise(ex.name).then((pr) => {
          if (pr) {
            prCache.current.set(cacheKey, isBodyweight ? (pr.reps ?? 0) : pr.weight);
          }
        });
      }
    });
  }, [exercises.length]);

  // Render idle screen when no active workout
  if (!hasActiveWorkout) {
    return <IdleScreen />;
  }

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const doneSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed || s.skipped).length,
    0,
  );
  const progress = totalSets > 0 ? doneSets / totalSets : 0;
  const tooFewExercises = exercises.length < MIN_EXERCISES;

  const doFinish = async () => {
    try {
      await finishWorkout();
      const next = await getNextProgramWorkout();
      if (next && next.exercises.length > 0) {
        startFromProgramDay(
          next.day.id,
          next.program.name,
          next.exercises.map((e) => ({
            name: e.exercise_name,
            muscleGroup: e.muscle_group ?? '',
            equipment: e.equipment ?? 'Bodyweight',
            targetSets: e.target_sets,
            targetRepsMin: e.target_reps_min ?? 8,
            targetRepsMax: e.target_reps_max ?? 12,
            targetWeight: e.target_weight ?? 0,
            rir: e.rir ?? undefined,
          })),
          next.day.week_number,
          next.day.day_number,
          next.day.label,
        );
      }
      // Stay on /workout — it will show either the next workout or the idle state
    } catch (e) {
      console.error(e);
    }
  };

  const onFinishWorkout = async () => {
    const musclesWithSets = [...new Set(
      exercises
        .filter((ex) => ex.muscleGroup && ex.sets.some((s) => s.completed))
        .map((ex) => ex.muscleGroup!),
    )];
    const covered = new Set(
      pendingFeedback.filter((f) => f.pump && f.volume && f.jointPain).map((f) => f.muscleGroup),
    );
    const uncovered = musclesWithSets.filter((mg) => !covered.has(mg));

    if (uncovered.length > 0) {
      setPendingFeedbackGroups(uncovered.slice(1));
      setFeedbackMuscle(uncovered[0]);
      setFinishPending(true);
      return;
    }

    await doFinish();
  };

  const handleFeedbackAdvance = (data?: { jointPain: string; pump: string; volume: string }) => {
    if (data && feedbackMuscle) {
      queueFeedback(feedbackMuscle, data.jointPain, data.pump, data.volume);
    }

    if (pendingFeedbackGroups.length > 0) {
      const [next, ...rest] = pendingFeedbackGroups;
      setPendingFeedbackGroups(rest);
      setFeedbackMuscle(next);
    } else if (finishPending) {
      setFinishPending(false);
      setFeedbackMuscle(null);
      doFinish();
    } else {
      setFeedbackMuscle(null);
    }
  };

  const handleSkipWorkout = () => {
    const doSkip = () => {
      if (activeProgramDayId) {
        skipDay(activeProgramDayId);
      } else {
        endWorkout();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Skip Workout', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          message: 'Skip this workout? Progress will be discarded and the day marked as missed.',
        },
        (index) => { if (index === 0) doSkip(); },
      );
    } else {
      Alert.alert(
        'Skip Workout',
        'Skip this workout? Progress will be discarded and the day marked as missed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Skip', style: 'destructive', onPress: doSkip },
        ],
      );
    }
  };

  const handleConfirmReplace = async () => {
    if (!replaceTargetId || !replacePending) return;
    const oldExercise = exercises.find((ex) => ex.id === replaceTargetId);
    replaceExercise(replaceTargetId, replacePending.name, replacePending.muscle, replacePending.equipment);
    if (replacePersist && activeProgramDayId && oldExercise) {
      replaceExerciseInTemplate(
        activeProgramDayId,
        oldExercise.name,
        replacePending.name,
        replacePending.muscle,
        replacePending.equipment,
      ).catch(() => {});
    }
    setReplaceTargetId(null);
    setReplacePending(null);
    setReplacePersist(false);
  };

  const canFinish =
    exercises.length > 0 &&
    exercises.some((ex) => ex.sets.some((s) => s.completed)) &&
    exercises.every((ex) => ex.sets.every((s) => s.completed || s.skipped));

  const handleUpdateSet = (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => {
    updateSet(exerciseId, setIndex, data, data.weight !== undefined ? autoMatchWeight : false);

    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    if (data.completed === true) {
      const muscle = exercise.muscleGroup;
      if (muscle && activeProgramDayId && !sorenessShownFor.current.has(muscle)) {
        const isFirstSetForMuscle = !exercises
          .filter((ex) => ex.muscleGroup === muscle)
          .some((ex) =>
            ex.sets.some((s, i) => !(ex.id === exerciseId && i === setIndex) && s.completed),
          );
        if (isFirstSetForMuscle) {
          sorenessShownFor.current.add(muscle);
          const namesForMuscle = exercises
            .filter((ex) => ex.muscleGroup === muscle)
            .map((ex) => ex.name);
          checkMuscleGroupPreviouslyTrained(activeProgramDayId, namesForMuscle)
            .then((wasTrainedBefore) => {
              if (wasTrainedBefore) setSorenessMuscle(muscle);
            });
        }
      }
    }

    if (data.completed === true) {
      const isBodyweight = exercise.equipment === 'Bodyweight';
      if (isBodyweight) {
        const reps = data.reps ?? exercise.sets[setIndex]?.reps ?? 0;
        const cacheKey = `${exercise.name}:reps`;
        const currentPRReps = prCache.current.get(cacheKey) ?? 0;
        if (reps > currentPRReps) {
          prCache.current.set(cacheKey, reps);
          const weight = data.weight ?? exercise.sets[setIndex]?.weight ?? bodyWeight ?? 0;
          upsertPR(exercise.name, weight, reps, true);
          setPrPopup({ exerciseName: exercise.name, weight, reps, isBodyweight: true });
        }
      } else {
        const weight = data.weight ?? exercise.sets[setIndex]?.weight ?? 0;
        const reps = data.reps ?? exercise.sets[setIndex]?.reps ?? null;
        if (weight > 0) {
          const currentPR = prCache.current.get(exercise.name) ?? 0;
          if (weight > currentPR) {
            prCache.current.set(exercise.name, weight);
            upsertPR(exercise.name, weight, reps);
            setPrPopup({ exerciseName: exercise.name, weight, reps });
          }
        }
      }
    }

    const isCompletionAction = data.completed === true || data.skipped === true;
    if (!isCompletionAction) return;

    const muscle = exercise.muscleGroup;
    if (!muscle || feedbackShownFor.current.has(muscle)) return;

    const muscleExercises = exercises.filter((ex) => ex.muscleGroup === muscle);
    const allDone = muscleExercises.every((ex) =>
      ex.sets.length > 0 &&
      ex.sets.every((s, i) => {
        if (ex.id === exerciseId && i === setIndex) {
          return (data.completed || s.completed) || (data.skipped || s.skipped);
        }
        return s.completed || !!s.skipped;
      }),
    );
    const atLeastOneCompleted = muscleExercises.some((ex) =>
      ex.sets.some((s, i) => {
        if (ex.id === exerciseId && i === setIndex) return data.completed === true || s.completed;
        return s.completed;
      }),
    );

    if (allDone && atLeastOneCompleted) {
      feedbackShownFor.current.add(muscle);
      setFeedbackMuscle(muscle);
    }
  };

  const chunkedExercises = exercises.reduce((acc, current, index) => {
    if (index === 0) {
      acc.push([current]);
    } else {
      const previous = exercises[index - 1];
      if (
        current.muscleGroup &&
        previous.muscleGroup &&
        current.muscleGroup.toLowerCase() === previous.muscleGroup.toLowerCase()
      ) {
        acc[acc.length - 1].push(current);
      } else {
        acc.push([current]);
      }
    }
    return acc;
  }, [] as Exercise[][]);

  const activeExercise = activeExerciseId
    ? exercises.find((ex) => ex.id === activeExerciseId)
    : null;

  const noteExercise = noteExerciseId
    ? exercises.find((ex) => ex.id === noteExerciseId)
    : null;

  const activeSetType = activeSetData
    ? exercises.find((ex) => ex.id === activeSetData.exerciseId)?.sets[activeSetData.setIndex]?.type
    : 'Regular';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: Colors.surface2, width: '100%' }}>
        <View style={{ height: 3, backgroundColor: Colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>
            {activeProgramDayLabel ?? (activeProgramDayNumber ? `Day ${activeProgramDayNumber}` : 'Workout')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {totalSets > 0 && (
              <Text style={{ color: Colors.muted, fontSize: 13 }}>
                {doneSets}/{totalSets} sets
              </Text>
            )}
            {/* Skip workout button */}
            <Pressable onPress={handleSkipWorkout} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="skip-next" size={22} color={Colors.muted} />
            </Pressable>
          </View>
        </View>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          {activeProgramName
            ? `${activeProgramName}${activeProgramWeek != null ? ` · Week ${activeProgramWeek}` : ''}`
            : 'Free Workout'}
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 24 }}>
        {/* Minimum exercises warning */}
        {tooFewExercises && exercises.length > 0 && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={{ backgroundColor: `${Colors.primary}15`, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: `${Colors.primary}40` }}
          >
            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 }}>
              Add {MIN_EXERCISES - exercises.length} more exercise{MIN_EXERCISES - exercises.length !== 1 ? 's' : ''} for an effective workout
            </Text>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={Colors.primary} />
          </Pressable>
        )}

        {exercises.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 16 }}>No exercises yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
              Tap "+ Add Exercise" to get started
            </Text>
          </View>
        )}

        {chunkedExercises.map((group, idx) => (
          <ExerciseCard
            key={`chunk-${idx}-${group[0]?.id}`}
            exerciseGroup={group}
            onUpdateSet={handleUpdateSet}
            onRemoveSet={removeSet}
            onAddSet={addSet}
            onExerciseMenuPress={(id) => setActiveExerciseId(id)}
            onSetMenuPress={(id, index) =>
              setActiveSetData({ exerciseId: id, setIndex: index })
            }
            onSaveNote={(id, note) => setExerciseNote(id, note)}
            bodyWeight={bodyWeight ?? undefined}
          />
        ))}

        {/* Add Exercise */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => ({
            marginTop: 4,
            padding: 14,
            backgroundColor: Colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.surface2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialCommunityIcons name="plus" size={18} color={Colors.primary} />
          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>
            Add Exercise
          </Text>
        </Pressable>
      </ScrollView>

      {/* Pinned Finish Workout button */}
      <View style={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 16, borderTopWidth: 1, borderTopColor: Colors.surface2, backgroundColor: Colors.background }}>
        <Pressable
          onPress={onFinishWorkout}
          disabled={!canFinish || isSaving}
          style={{
            backgroundColor: canFinish ? Colors.primary : Colors.surface2,
            padding: 17,
            borderRadius: 14,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: canFinish ? Colors.background : Colors.muted,
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            {isSaving ? 'Saving...' : 'Finish Workout'}
          </Text>
        </Pressable>
      </View>

      {/* Modals */}
      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(name, muscleGroup, equipment) => addExercise(name, muscleGroup, equipment)}
      />

      <ExerciseMenuModal
        visible={!!activeExerciseId}
        onClose={() => setActiveExerciseId(null)}
        onRemove={() => activeExerciseId && removeExercise(activeExerciseId)}
        onMoveUp={() => activeExerciseId && moveExerciseUp(activeExerciseId)}
        onMoveDown={() => activeExerciseId && moveExerciseDown(activeExerciseId)}
        onSkipSets={() => activeExerciseId && skipSets(activeExerciseId)}
        onNewNote={() => {
          if (activeExerciseId) {
            setNoteExerciseId(activeExerciseId);
            setActiveExerciseId(null);
          }
        }}
        onJointPain={() => {
          if (activeExercise?.muscleGroup) {
            setFeedbackMuscle(activeExercise.muscleGroup);
            setActiveExerciseId(null);
          }
        }}
        onReplace={() => {
          setReplaceTargetId(activeExerciseId);
          setActiveExerciseId(null);
        }}
      />

      {/* Replace-exercise picker */}
      <ExercisePicker
        visible={!!replaceTargetId && !replacePending}
        onClose={() => setReplaceTargetId(null)}
        onSelect={(name, muscle, equipment) => {
          setReplacePending({ name, muscle, equipment });
          setReplacePersist(false);
        }}
      />

      {/* Replace persist confirm */}
      <Modal visible={!!replacePending} transparent animationType="fade" onRequestClose={() => { setReplacePending(null); setReplaceTargetId(null); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#252525', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
              Replace with {replacePending?.name}?
            </Text>
            {activeProgramDayId && (
              <Pressable
                onPress={() => setReplacePersist((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14, padding: 4 }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 5,
                  borderWidth: 2,
                  borderColor: replacePersist ? Colors.primary : '#555',
                  backgroundColor: replacePersist ? Colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {replacePersist && <MaterialCommunityIcons name="check" size={14} color={Colors.background} />}
                </View>
                <Text style={{ color: Colors.text, fontSize: 14, flex: 1 }}>
                  Apply to all{activeProgramDayLabel ? ` ${activeProgramDayLabel}` : ''} workouts in this program
                </Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => { setReplacePending(null); setReplaceTargetId(null); }}
                style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmReplace}
                style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700' }}>Replace</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SetMenuModal
        visible={!!activeSetData}
        currentType={activeSetType as 'Regular' | 'M' | 'MM'}
        onClose={() => setActiveSetData(null)}
        onDelete={() =>
          activeSetData && removeSet(activeSetData.exerciseId, activeSetData.setIndex)
        }
        onSkip={() =>
          activeSetData && skipSet(activeSetData.exerciseId, activeSetData.setIndex)
        }
        onUpdateType={(newType) =>
          activeSetData &&
          updateSet(activeSetData.exerciseId, activeSetData.setIndex, { type: newType })
        }
      />

      {noteExercise && (
        <NoteModal
          visible={!!noteExerciseId}
          exerciseName={noteExercise.name}
          initialNote={noteExercise.note ?? ''}
          onClose={() => setNoteExerciseId(null)}
          onSave={(note) => {
            setExerciseNote(noteExercise.id, note);
            setNoteExerciseId(null);
          }}
        />
      )}

      <SorenessModal
        visible={!!sorenessMuscle}
        muscleGroup={sorenessMuscle ?? ''}
        onSave={(soreness) => {
          if (sorenessMuscle) queueSoreness(sorenessMuscle, soreness);
          setSorenessMuscle(null);
        }}
      />

      <FeedbackModal
        visible={!!feedbackMuscle}
        muscleGroup={feedbackMuscle ?? ''}
        onClose={() => handleFeedbackAdvance()}
        onSave={(data) => handleFeedbackAdvance(data)}
      />

      {prPopup && (
        <PRPopup
          exerciseName={prPopup.exerciseName}
          weight={prPopup.weight}
          reps={prPopup.reps}
          isBodyweight={prPopup.isBodyweight}
          onDismiss={() => setPrPopup(null)}
        />
      )}
    </View>
  );
}
