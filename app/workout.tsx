import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import SetRow from '../src/components/workout/SetRow';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { Colors } from '../src/utils/constants';

export default function Workout() {
  const router = useRouter();
  const {
    exercises,
    addExercise,
    addSet,
    updateSet,
    finishWorkout,
    isSaving,
    removeSet,
  } = useWorkoutStore();
  const [pickerOpen, setPickerOpen] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER */}
        <Text style={{ color: Colors.text, fontSize: 22, marginBottom: 16 }}>
          Active Workout
        </Text>

        {/* EXERCISE CARDS */}
        {exercises.map((ex) => (
          <View
            key={ex.id}
            style={{
              backgroundColor: Colors.surface,
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: Colors.text, fontSize: 18 }}>{ex.name}</Text>

            {ex.sets.map((set, i) => (
              <SetRow
                key={`${ex.id}-${i}-${set.completed}`} // 🔥 FIXS SWIPE + STATE BUGS
                weight={set.weight}
                reps={set.reps}
                completed={set.completed}
                onWeightChange={(val) => updateSet(ex.id, i, { weight: val })}
                onRepsChange={(val) => updateSet(ex.id, i, { reps: val })}
                onToggleComplete={() =>
                  updateSet(ex.id, i, { completed: !set.completed })
                }
                onRemove={() => removeSet(ex.id, i)}
              />
            ))}

            <Pressable onPress={() => addSet(ex.id)}>
              <Text style={{ color: Colors.primary, marginTop: 8 }}>
                + Add Set
              </Text>
            </Pressable>
          </View>
        ))}

        {/* ADD EXERCISE BUTTON */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{
            marginTop: 20,
            padding: 14,
            backgroundColor: Colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.surface2,
          }}
        >
          <Text style={{ color: Colors.accent, textAlign: 'center' }}>
            + Add Exercise
          </Text>
        </Pressable>
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
        onSelect={(name) => addExercise(name)}
      />
    </View>
  );
}
