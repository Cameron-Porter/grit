import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getPRForExercise, upsertPR } from '../src/api/personalRecords';
import { checkMuscleGroupPreviouslyTrained, getNextProgramWorkout } from '../src/api/programs';
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
import { Colors } from '../src/utils/constants';

interface PRState {
  exerciseName: string;
  weight: number;
  reps: number | null;
  isBodyweight?: boolean;
}

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
    activeProgramDayId,
    activeProgramName,
    activeProgramWeek,
    activeProgramDayNumber,
    activeProgramDayLabel,
  } = useWorkoutStore();

  const bodyWeight = useProfileStore((s) => s.bodyWeight);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [noteExerciseId, setNoteExerciseId] = useState<string | null>(null);
  const [feedbackMuscle, setFeedbackMuscle] = useState<string | null>(null);
  const [pendingFeedbackGroups, setPendingFeedbackGroups] = useState<string[]>([]);
  const [finishPending, setFinishPending] = useState(false);
  const [sorenessMuscle, setSorenessMuscle] = useState<string | null>(null);
  const [prPopup, setPrPopup] = useState<PRState | null>(null);
  const [activeSetData, setActiveSetData] = useState<{
    exerciseId: string;
    setIndex: number;
  } | null>(null);

  // Track which muscles have already received feedback / soreness check this session
  const feedbackShownFor = useRef<Set<string>>(new Set());
  const sorenessShownFor = useRef<Set<string>>(new Set());

  // Cache PRs locally: exerciseName → value (weight for weighted, reps for bodyweight)
  // Bodyweight exercises use key format: `${name}:reps`
  const prCache = useRef<Map<string, number>>(new Map());

  // Load PRs when exercises change (new exercise added)
  useEffect(() => {
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

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const doneSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed || s.skipped).length,
    0,
  );
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

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
          })),
          next.day.week_number,
          next.day.day_number,
          next.day.label,
        );
        router.replace('/workout');
      } else {
        router.replace('/home');
      }
    } catch (e) {
      console.error(e);
      router.replace('/home');
    }
  };

  const onFinishWorkout = async () => {
    // Collect muscle groups with at least one completed set
    const musclesWithSets = [...new Set(
      exercises
        .filter((ex) => ex.muscleGroup && ex.sets.some((s) => s.completed))
        .map((ex) => ex.muscleGroup!),
    )];
    // A muscle is "covered" only if full end-of-session feedback was collected (not just soreness)
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

  // Advances through the feedback queue; saves data if provided.
  // Called from both mid-workout natural completion and the finish-time collection flow.
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

  const canFinish =
    exercises.length > 0 &&
    exercises.some((ex) => ex.sets.some((s) => s.completed)) &&
    exercises.every((ex) => ex.sets.every((s) => s.completed || s.skipped));

  // Called instead of updateSet directly — checks for feedback trigger + PR
  const handleUpdateSet = (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => {
    updateSet(exerciseId, setIndex, data);

    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    // Soreness check: fire on the very first completed set of a muscle group in this session
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

    // PR check: if completing a set
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

    // Feedback trigger: check if all sets for this muscle group are done
    const isCompletionAction = data.completed === true || data.skipped === true;
    if (!isCompletionAction) return;

    const muscle = exercise.muscleGroup;
    if (!muscle || feedbackShownFor.current.has(muscle)) return;

    const muscleExercises = exercises.filter((ex) => ex.muscleGroup === muscle);

    // Simulate the update on the current state
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
      {/* Progress bar — absolute top */}
      <View style={{ height: 3, backgroundColor: Colors.surface2, width: '100%' }}>
        <View style={{ height: 3, backgroundColor: Colors.primary, width: `${progress * 100}%` }} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.replace('/home')} style={{ marginBottom: 6 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>← Home</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700' }}>
            {activeProgramDayLabel ?? (activeProgramDayNumber ? `Day ${activeProgramDayNumber}` : 'Workout')}
          </Text>
          {totalSets > 0 && (
            <Text style={{ color: Colors.muted, fontSize: 13 }}>
              {doneSets}/{totalSets} sets
            </Text>
          )}
        </View>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          {activeProgramName
            ? `${activeProgramName}${activeProgramWeek != null ? ` · Week ${activeProgramWeek}` : ''}`
            : 'Free Workout'}
        </Text>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
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
          <Text style={{ color: Colors.primary, textAlign: 'center', fontWeight: '700', fontSize: 15 }}>
            + Add Exercise
          </Text>
        </Pressable>
      </ScrollView>

      {/* Pinned Finish Workout button */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface2, backgroundColor: Colors.background }}>
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
      />

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

      {/* PR celebration popup */}
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
