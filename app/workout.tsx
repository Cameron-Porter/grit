import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { confirm } from '../src/utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPRForExercise, upsertPR } from '../src/api/personalRecords';
import { getExerciseByName } from '../src/data/exerciseDatabase';
import { checkMuscleGroupPreviouslyTrained, endCurrentProgram, getNextProgramWorkout, renameProgram, replaceExerciseInTemplate, updateProgramMusclePriorities } from '../src/api/programs';
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
    activeProgramId,
    activeProgramDayId,
    activeProgramName,
    activeProgramWeek,
    activeProgramDayNumber,
    activeProgramDayLabel,
    dayNote,
    setDayNote,
    replaceExercise,
    updateExercisePriorities,
  } = useWorkoutStore();

  const bodyWeight = useProfileStore((s) => s.bodyWeight);
  const setBodyWeight = useProfileStore((s) => s.setBodyWeight);
  const autoMatchWeight = useProfileStore((s) => s.autoMatchWeight);

  const [pickerOpen, setPickerOpen] = useState(false);
  // Program menu
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [bwOpen, setBwOpen] = useState(false);
  const [bwText, setBwText] = useState('');
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [editPriorities, setEditPriorities] = useState<Record<string, 'emphasize' | 'grow' | 'maintain'>>({});
  const [dayNoteOpen, setDayNoteOpen] = useState(false);
  const [dayNoteText, setDayNoteText] = useState('');
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
  const feedbackMuscleRef = useRef<string | null>(null);

  const hasWorkoutSession = !!activeWorkoutId;
  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);

  // Keep ref in sync so exercise-deletion handler can read current value without stale closure
  useEffect(() => { feedbackMuscleRef.current = feedbackMuscle; }, [feedbackMuscle]);

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
              musclePriority: e.muscle_group
                ? (n.program.muscle_priorities as Record<string, 'emphasize' | 'grow' | 'maintain'> | null)?.[e.muscle_group]
                : undefined,
              equipment: getExerciseByName(e.exercise_name)?.equipment ?? 'Barbell',
              targetSets: e.target_sets,
              targetRepsMin: e.target_reps_min ?? 8,
              targetRepsMax: e.target_reps_max ?? 12,
              targetWeight: e.target_weight ?? 0,
              rir: e.rir ?? undefined,
            })),
            n.day.week_number,
            n.day.day_number,
            n.day.label,
            n.program.id,
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
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Today's Workout</Text>
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
                  <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 14 }}>Quick Workout</Text>
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
    const uncovered = musclesWithSets.filter(
      (mg) => !covered.has(mg) && !feedbackShownFor.current.has(mg),
    );

    if (uncovered.length > 0) {
      setPendingFeedbackGroups(uncovered.slice(1));
      setFeedbackMuscle(uncovered[0]);
      setFinishPending(true);
      return;
    }

    await doFinish();
  };

  const handleFeedbackAdvance = (data?: { jointPain: string | null; pump: string | null; volume: string | null }) => {
    if (data && feedbackMuscle) {
      queueFeedback(feedbackMuscle, data.jointPain ?? '', data.pump ?? '', data.volume ?? '');
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

  const handleOpenRename = () => {
    setRenameText(activeProgramName ?? '');
    setProgramMenuOpen(false);
    setRenameOpen(true);
  };

  const handleSaveRename = async () => {
    const trimmed = renameText.trim();
    if (!trimmed || !activeProgramId) return;
    try {
      await renameProgram(activeProgramId, trimmed);
      useWorkoutStore.setState({ activeProgramName: trimmed });
    } catch {
      Alert.alert('Error', 'Could not rename the program.');
    }
    setRenameOpen(false);
  };

  const handleOpenBodyweight = () => {
    setBwText(bodyWeight != null ? String(bodyWeight) : '');
    setProgramMenuOpen(false);
    setBwOpen(true);
  };

  const handleSaveBodyweight = () => {
    const val = parseFloat(bwText);
    if (!isNaN(val) && val > 0) setBodyWeight(val);
    setBwOpen(false);
  };

  const handleOpenPriorities = async () => {
    if (!activeProgramId) return;
    // Load current priorities from the program (already stored in store via startFromProgramDay,
    // but simplest source of truth is re-fetching so edits made since launch are reflected)
    const { getProgram } = await import('../src/api/programs');
    const prog = await getProgram(activeProgramId);
    setEditPriorities((prog?.muscle_priorities as Record<string, 'emphasize' | 'grow' | 'maintain'>) ?? {});
    setProgramMenuOpen(false);
    setPriorityOpen(true);
  };

  const handleSavePriorities = async () => {
    if (!activeProgramId) return;
    try {
      await updateProgramMusclePriorities(activeProgramId, editPriorities);
      updateExercisePriorities(editPriorities);
    } catch {
      Alert.alert('Error', 'Could not save priorities.');
    }
    setPriorityOpen(false);
  };

  const handleEndProgram = () => {
    setProgramMenuOpen(false);
    confirm(
      'End Program',
      `This will deactivate "${activeProgramName}" and return you to the programs list. Your workout history is kept.`,
      async () => {
        try { await endCurrentProgram(); } catch { /* non-fatal */ }
        endWorkout();
        router.replace('/(tabs)/programs');
      },
      'End Program',
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: colors.surface2, width: '100%' }}>
        <View style={{ height: 3, backgroundColor: colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            {activeProgramWeek != null && activeProgramDayNumber != null ? (
              <Text style={{ fontSize: 26, fontWeight: '800', lineHeight: 32 }}>
                <Text style={{ color: colors.text }}>Week {activeProgramWeek} </Text>
                <Text style={{ color: colors.muted }}>Day {activeProgramDayNumber}</Text>
              </Text>
            ) : (
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>Workout</Text>
            )}
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              {activeProgramName
                ? `${activeProgramName}${activeProgramDayLabel ? ` · ${activeProgramDayLabel}` : ''}`
                : 'Quick Workout'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {totalSets > 0 && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>{doneSets}/{totalSets}</Text>
            )}
            <Pressable
              onPress={() => setProgramMenuOpen(true)}
              style={{ padding: 6 }}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 24 }}>
        {/* Day note card */}
        {dayNote ? (
          <Pressable
            onPress={() => { setDayNoteText(dayNote); setDayNoteOpen(true); }}
            style={{ backgroundColor: `${colors.primary}15`, borderRadius: 12, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: `${colors.primary}30` }}
          >
            <MaterialCommunityIcons name="note-text-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={{ color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 }}>{dayNote}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.muted} />
          </Pressable>
        ) : null}

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
      <View style={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 16, borderTopWidth: 1, borderTopColor: colors.surface2, backgroundColor: colors.background }}>
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
        onRemove={() => {
          if (!activeExerciseId) return;
          const removedExercise = exercises.find((ex) => ex.id === activeExerciseId);
          removeExercise(activeExerciseId);
          // After removal, check if that muscle group now has no remaining sets
          const muscle = removedExercise?.muscleGroup;
          if (muscle && !feedbackShownFor.current.has(muscle)) {
            const remaining = exercises.filter((ex) => ex.id !== activeExerciseId && ex.muscleGroup === muscle);
            const hasCompleted = exercises.some((ex) => ex.muscleGroup === muscle && ex.sets.some((s) => s.completed));
            const hasRemaining = remaining.some((ex) => ex.sets.some((s) => !s.completed && !s.skipped));
            if (hasCompleted && !hasRemaining) {
              feedbackShownFor.current.add(muscle);
              if (feedbackMuscleRef.current) {
                setPendingFeedbackGroups((prev) => [...prev, muscle]);
              } else {
                setFeedbackMuscle(muscle);
              }
            }
          }
        }}
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
            feedbackShownFor.current.add(activeExercise.muscleGroup);
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
        onClose={() => setActiveSetData(null)}
        onDelete={() =>
          activeSetData && removeSet(activeSetData.exerciseId, activeSetData.setIndex)
        }
        onSkip={() =>
          activeSetData && skipSet(activeSetData.exerciseId, activeSetData.setIndex)
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
        initialFeedback={feedbackMuscle ? pendingFeedback.find((f) => f.muscleGroup === feedbackMuscle) ?? undefined : undefined}
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

      {/* ── Program menu bottom sheet ── */}
      <Modal visible={programMenuOpen} transparent animationType="slide" onRequestClose={() => setProgramMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setProgramMenuOpen(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 12 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surface2, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>
            {activeProgramName ?? 'Program'}
          </Text>

          {[
            activeProgramId && { icon: 'pencil-outline',     label: 'Rename Program',           onPress: handleOpenRename },
            activeProgramId && { icon: 'tune-vertical',      label: 'Update Muscle Priorities', onPress: handleOpenPriorities },
            { icon: 'note-text-outline',                     label: dayNote ? 'Edit Day Note' : 'Add Day Note', onPress: () => { setDayNoteText(dayNote ?? ''); setProgramMenuOpen(false); setDayNoteOpen(true); } },
            { icon: 'plus-circle-outline',                   label: 'Add Exercise',             onPress: () => { setProgramMenuOpen(false); setPickerOpen(true); } },
            { icon: 'weight',                                label: 'Update Bodyweight',        onPress: handleOpenBodyweight },
            { icon: 'skip-next-outline',                     label: 'Skip Workout',             onPress: () => { setProgramMenuOpen(false); handleSkipWorkout(); } },
            activeProgramId && { icon: 'stop-circle-outline', label: 'End Program',             onPress: handleEndProgram, destructive: true },
          ].filter(Boolean).map(({ icon, label, onPress, destructive }: any) => (
            <Pressable key={label} onPress={onPress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
              <MaterialCommunityIcons name={icon as any} size={20} color={destructive ? colors.error : colors.text} />
              <Text style={{ color: destructive ? colors.error : colors.text, fontSize: 15, fontWeight: '500' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* ── Day note modal ── */}
      <Modal visible={dayNoteOpen} transparent animationType="fade" onRequestClose={() => setDayNoteOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>Day Note</Text>
            <TextInput
              value={dayNoteText}
              onChangeText={setDayNoteText}
              autoFocus
              multiline
              numberOfLines={4}
              placeholder="Notes for today's session…"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.surface2, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16, minHeight: 100, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setDayNoteOpen(false)} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              {dayNote && (
                <Pressable onPress={() => { setDayNote(null); setDayNoteOpen(false); }} style={{ padding: 13, borderRadius: 10, backgroundColor: `${colors.error}22`, alignItems: 'center', paddingHorizontal: 16 }}>
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Clear</Text>
                </Pressable>
              )}
              <Pressable onPress={() => { setDayNote(dayNoteText.trim() || null); setDayNoteOpen(false); }} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: colors.background, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>Rename Program</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              placeholder="Program name"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.surface2, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setRenameOpen(false)} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveRename} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: colors.background, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bodyweight modal ── */}
      <Modal visible={bwOpen} transparent animationType="fade" onRequestClose={() => setBwOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>Update Bodyweight</Text>
            <TextInput
              value={bwText}
              onChangeText={setBwText}
              autoFocus
              keyboardType="decimal-pad"
              placeholder="Weight (lbs)"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.surface2, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setBwOpen(false)} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveBodyweight} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: colors.background, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Muscle priorities modal ── */}
      <Modal visible={priorityOpen} transparent animationType="slide" onRequestClose={() => setPriorityOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: insets.bottom + 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surface2, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 12, paddingTop: 4 }}>Muscle Priorities</Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
              {(['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Abs'] as const).map((muscle) => {
                const cur = editPriorities[muscle] ?? 'grow';
                return (
                  <View key={muscle}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>{muscle}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {([
                        { value: 'emphasize', label: 'Emphasize', color: '#2DD4BF' },
                        { value: 'grow',      label: 'Grow',      color: colors.primary },
                        { value: 'maintain',  label: 'Maintain',  color: colors.muted },
                      ] as const).map((opt) => {
                        const active = cur === opt.value;
                        return (
                          <Pressable key={opt.value} onPress={() => setEditPriorities((p) => ({ ...p, [muscle]: opt.value }))}
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: active ? opt.color : '#333', backgroundColor: active ? `${opt.color}22` : 'transparent', alignItems: 'center' }}>
                            <Text style={{ color: active ? opt.color : colors.muted, fontSize: 11, fontWeight: active ? '800' : '500' }}>{opt.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
              <Pressable onPress={() => setPriorityOpen(false)} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSavePriorities} style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ color: colors.background, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
