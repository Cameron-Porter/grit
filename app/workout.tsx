import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { confirm } from '../src/utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { BOTTOM_TAB_HEIGHT } from '../src/utils/constants';
import { useColors } from '../src/utils/useColors';

const MIN_EXERCISES = 4;

interface PRState {
  exerciseName: string;
  weight: number;
  reps: number | null;
  isBodyweight?: boolean;
}

export default function ActiveWorkout() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    startWorkout,
    startFromProgramDay,
    skipAllSets,
    skipDay,
    endWorkout,
    activeProgramDayId,
    activeProgramName,
    activeProgramWeek,
    activeProgramDayNumber,
    activeProgramDayLabel,
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
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replacePending, setReplacePending] = useState<{ targetId: string; name: string; muscle: string; equipment: string } | null>(null);
  const [replacePersist, setReplacePersist] = useState(false);

  // Idle state
  const [nextWorkout, setNextWorkout] = useState<Awaited<ReturnType<typeof getNextProgramWorkout>>>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const feedbackShownFor = useRef<Set<string>>(new Set());
  const sorenessShownFor = useRef<Set<string>>(new Set());
  const prCache = useRef<Map<string, number>>(new Map());

  const hasWorkoutSession = !!activeWorkoutId;
  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);

  // Auto-load next workout when no session is active
  useEffect(() => {
    if (hasWorkoutSession) {
      setNextWorkout(null);
      return;
    }
    let cancelled = false;
    setLoadingNext(true);
    getNextProgramWorkout()
      .then((n) => {
        if (cancelled) return;
        if (n && n.exercises.length > 0) {
          startFromProgramDay(
            n.day.id,
            n.program.name,
            n.exercises.map((e) => ({
              name: e.exercise_name,
              muscleGroup: e.muscle_group ?? '',
              equipment: e.equipment ?? 'Bodyweight',
              targetSets: e.target_sets,
              targetRepsMin: e.target_reps_min ?? 8,
              targetRepsMax: e.target_reps_max ?? 12,
              targetWeight: e.target_weight ?? 0,
              rir: e.rir ?? undefined,
            })),
            n.day.week_number,
            n.day.day_number,
            n.day.label,
          );
        } else {
          setNextWorkout(n);
        }
      })
      .catch(() => { if (!cancelled) setNextWorkout(null); })
      .finally(() => { if (!cancelled) setLoadingNext(false); });
    return () => { cancelled = true; };
  }, [hasWorkoutSession]);

  // Load PRs when exercises change â€” runs before any conditional return (hooks rule)
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

  // â”€â”€ Idle view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!hasWorkoutSession) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            GRIT
          </Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Today's Workout</Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Guided Results &amp; Intelligent Training</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {loadingNext && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}
          {!loadingNext && !nextWorkout && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 18, alignItems: 'center' }}>
              <MaterialCommunityIcons name="trophy-outline" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>All caught up!</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                All scheduled workouts are complete, or no program is active yet.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <Pressable
                  onPress={() => router.push('/(tabs)/programs')}
                  style={{ flex: 1, backgroundColor: `${colors.primary}22`, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Programs</Text>
                </Pressable>
                <Pressable
                  onPress={() => startWorkout()}
                  style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.surface2 }}
                >
                  <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 14 }}>Free Workout</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // â”€â”€ Active workout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // Next workout auto-loads via the useEffect watching hasWorkoutSession
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
    confirm(
      'Skip Workout',
      'All remaining sets will be marked as skipped and this day will be noted as skipped in your program.',
      () => {
        if (activeProgramDayId) {
          skipDay(activeProgramDayId);
        } else {
          endWorkout();
        }
      },
      'Skip Day',
      true,
    );
  };

  const handleConfirmReplace = async () => {
    if (!replacePending) return;

    const { targetId, ...pending } = replacePending;
    const oldExercise = exercises.find((ex) => ex.id === targetId);
    const persist = replacePersist;

    setReplaceTargetId(null);
    setReplacePending(null);
    setReplacePersist(false);

    replaceExercise(targetId, pending.name, pending.muscle, pending.equipment);

    if (persist && activeProgramDayId && oldExercise) {
      try {
        await replaceExerciseInTemplate(
          activeProgramDayId,
          oldExercise.name,
          pending.name,
          pending.muscle,
          pending.equipment,
        );
      } catch {
        Alert.alert('Could not save', 'The exercise was replaced this session but failed to save to the program template.');
      }
    }
  };

  const exerciseDone = (ex: Exercise) =>
    ex.sets.length === 0 || ex.sets.every((s) => s.completed || s.skipped);

  const allSkipped =
    exercises.length > 0 &&
    exercises.every(exerciseDone) &&
    exercises.some((ex) => ex.sets.length > 0) &&
    exercises.every((ex) => ex.sets.length === 0 || ex.sets.every((s) => s.skipped && !s.completed));

  const canFinish =
    exercises.length > 0 &&
    exercises.every(exerciseDone) &&
    (exercises.some((ex) => ex.sets.some((s) => s.completed)) || allSkipped);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: colors.surface2, width: '100%' }}>
        <View style={{ height: 3, backgroundColor: colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>
            {activeProgramDayLabel ?? (activeProgramDayNumber ? `Day ${activeProgramDayNumber}` : 'Workout')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {totalSets > 0 && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {doneSets}/{totalSets} sets
              </Text>
            )}
            <Pressable
              onPress={handleSkipWorkout}
              style={{ backgroundColor: `${colors.warning}22`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            >
              <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>Skip Workout</Text>
            </Pressable>
          </View>
        </View>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
          {activeProgramName
            ? `${activeProgramName}${activeProgramDayLabel ? ` · ${activeProgramDayLabel}` : activeProgramDayNumber != null ? ` · Day ${activeProgramDayNumber}` : ''}`
            : 'Free Workout'}
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 24 }}>
        {tooFewExercises && exercises.length > 0 && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={{ backgroundColor: `${colors.primary}15`, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: `${colors.primary}40` }}
          >
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', flex: 1 }}>
              Add {MIN_EXERCISES - exercises.length} more exercise{MIN_EXERCISES - exercises.length !== 1 ? 's' : ''} for an effective workout
            </Text>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
          </Pressable>
        )}

        {exercises.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>No exercises yet</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
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
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.surface2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>
            Add Exercise
          </Text>
        </Pressable>
      </ScrollView>

      {/* Pinned Finish Workout button */}
      <View style={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 16, borderTopWidth: 1, borderTopColor: colors.surface2, backgroundColor: colors.background }}>
        <Pressable
          onPress={onFinishWorkout}
          disabled={!canFinish || isSaving}
          style={{
            backgroundColor: canFinish ? colors.primary : colors.surface2,
            padding: 17,
            borderRadius: 14,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: canFinish ? colors.background : colors.muted,
              textAlign: 'center',
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            {isSaving ? 'Saving...' : allSkipped ? 'Skip Day & Continue' : 'Finish Workout'}
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
          if (!replaceTargetId) return;
          setReplacePending({ targetId: replaceTargetId, name, muscle, equipment });
          setReplacePersist(false);
        }}
      />

      {/* Replace persist confirm */}
      <Modal visible={!!replacePending} transparent animationType="fade" onRequestClose={() => { setReplacePending(null); setReplaceTargetId(null); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#252525', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
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
                  borderColor: replacePersist ? colors.primary : '#555',
                  backgroundColor: replacePersist ? colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {replacePersist && <MaterialCommunityIcons name="check" size={14} color={colors.background} />}
                </View>
                <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>
                  Apply to all{activeProgramDayLabel ? ` ${activeProgramDayLabel}` : ''} workouts in this program
                </Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => { setReplacePending(null); setReplaceTargetId(null); }}
                style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmReplace}
                style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}
              >
                <Text style={{ color: colors.background, fontWeight: '700' }}>Replace</Text>
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
