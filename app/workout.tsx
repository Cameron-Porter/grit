import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ExerciseCard from '../src/components/workout/ExerciseCard';
import ExerciseMenuModal from '../src/components/workout/ExerciseMenuModal';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import SetMenuModal from '../src/components/workout/SetMenuModal';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { Exercise } from '../src/types/workout';
import { Colors } from '../src/utils/constants';

export default function ActiveWorkout() {
  const router = useRouter();
  const {
    exercises,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    finishWorkout,
    isSaving,
    removeSet,
  } = useWorkoutStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeSetData, setActiveSetData] = useState<{
    exerciseId: string;
    setIndex: number;
  } | null>(null);

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  const onFinishWorkout = async () => {
    try {
      await finishWorkout();
      router.replace('/log');
    } catch (e) {
      console.error(e);
    }
  };

  const canFinish =
    exercises.length > 0 &&
    exercises.every((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed));

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

  const activeSetType = activeSetData
    ? exercises.find((ex) => ex.id === activeSetData.exerciseId)?.sets[activeSetData.setIndex]?.type
    : 'Regular';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Progress bar — absolute top */}
      <View style={{ height: 3, backgroundColor: Colors.surface2, width: '100%' }}>
        <View
          style={{
            height: 3,
            backgroundColor: Colors.primary,
            width: `${progress * 100}%`,
          }}
        />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.replace('/home')} style={{ marginBottom: 6 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>← Home</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700' }}>
            Active Workout
          </Text>
          {totalSets > 0 && (
            <Text style={{ color: Colors.muted, fontSize: 13 }}>
              {completedSets}/{totalSets} sets
            </Text>
          )}
        </View>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>Today's session</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {exercises.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: Colors.muted, fontSize: 16 }}>No exercises yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Tap "+ Add Exercise" to get started</Text>
          </View>
        )}

        {chunkedExercises.map((group, idx) => (
          <ExerciseCard
            key={`chunk-${idx}-${group[0]?.id}`}
            exerciseGroup={group}
            onUpdateSet={updateSet}
            onRemoveSet={removeSet}
            onAddSet={addSet}
            onExerciseMenuPress={(id) => setActiveExerciseId(id)}
            onSetMenuPress={(id, index) =>
              setActiveSetData({ exerciseId: id, setIndex: index })
            }
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
        onSelect={(name, muscleGroup, equipment) => {
          addExercise(name, muscleGroup, equipment);
        }}
      />

      <ExerciseMenuModal
        visible={!!activeExerciseId}
        onClose={() => setActiveExerciseId(null)}
        onRemove={() => activeExerciseId && removeExercise(activeExerciseId)}
      />

      <SetMenuModal
        visible={!!activeSetData}
        currentType={activeSetType as 'Regular' | 'M' | 'MM'}
        onClose={() => setActiveSetData(null)}
        onDelete={() =>
          activeSetData && removeSet(activeSetData.exerciseId, activeSetData.setIndex)
        }
        onUpdateType={(newType) =>
          activeSetData &&
          updateSet(activeSetData.exerciseId, activeSetData.setIndex, { type: newType })
        }
      />
    </View>
  );
}
