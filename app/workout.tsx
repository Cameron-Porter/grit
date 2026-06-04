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
    removeExercise, // ✅ Make sure this is in your Zustand store
    addSet,
    updateSet,
    finishWorkout,
    isSaving,
    removeSet,
  } = useWorkoutStore();

  const [pickerOpen, setPickerOpen] = useState(false);

  // 🔥 Modal States
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeSetData, setActiveSetData] = useState<{
    exerciseId: string;
    setIndex: number;
  } | null>(null);

  const onFinishWorkout = async () => {
    try {
      await finishWorkout();
      router.replace('/history');
    } catch (e) {
      console.error(e);
    }
  };

  const canFinish =
    exercises.length > 0 &&
    exercises.every(
      (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed),
    );

  // Group adjacent exercises that share the same muscle group
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

  // Determine the current 'type' of the set we are editing (for the radio buttons)
  const activeSetType = activeSetData
    ? exercises.find((ex) => ex.id === activeSetData.exerciseId)?.sets[
        activeSetData.setIndex
      ]?.type
    : 'Regular';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER */}
        <Text
          style={{
            color: Colors.text,
            fontSize: 22,
            marginBottom: 16,
            fontWeight: 'bold',
          }}
        >
          Active Workout
        </Text>

        {/* EXERCISE CARDS */}
        {chunkedExercises.map((group, idx) => (
          <ExerciseCard
            key={`chunk-${idx}-${group[0]?.id}`}
            exerciseGroup={group}
            onUpdateSet={updateSet}
            onRemoveSet={removeSet}
            onAddSet={addSet}
            onExerciseMenuPress={(id) => setActiveExerciseId(id)} // ✅ Opens Exercise Menu
            onSetMenuPress={(id, index) =>
              setActiveSetData({ exerciseId: id, setIndex: index })
            } // ✅ Opens Set Menu
          />
        ))}

        {/* ADD EXERCISE BUTTON */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{
            marginTop: 12,
            padding: 14,
            backgroundColor: Colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.surface2 || '#2D2D2D',
          }}
        >
          <Text
            style={{
              color: Colors.accent || Colors.primary,
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            + Add Exercise
          </Text>
        </Pressable>

        {/* FINISH WORKOUT BUTTON */}
        <Pressable
          onPress={onFinishWorkout}
          disabled={!canFinish || isSaving}
          style={{
            backgroundColor: canFinish ? Colors.primary : Colors.muted,
            padding: 16,
            borderRadius: 12,
            marginTop: 24,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: Colors.text,
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            {isSaving ? 'Saving...' : 'Finish Workout'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* EXERCISE PICKER MODAL */}
      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(name, muscleGroup, equipment) => {
          addExercise(name, muscleGroup, equipment);
        }}
      />

      {/* 🚀 EXERCISE MENU MODAL */}
      <ExerciseMenuModal
        visible={!!activeExerciseId}
        onClose={() => setActiveExerciseId(null)}
        onRemove={() => activeExerciseId && removeExercise(activeExerciseId)}
      />

      {/* 🚀 SET MENU MODAL */}
      <SetMenuModal
        visible={!!activeSetData}
        currentType={activeSetType as 'Regular' | 'M' | 'MM'}
        onClose={() => setActiveSetData(null)}
        onDelete={() =>
          activeSetData &&
          removeSet(activeSetData.exerciseId, activeSetData.setIndex)
        }
        onUpdateType={(newType) =>
          activeSetData &&
          updateSet(activeSetData.exerciseId, activeSetData.setIndex, {
            type: newType,
          })
        }
      />
    </View>
  );
}
