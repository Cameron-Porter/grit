import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { saveWorkout } from '../src/api/workouts';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import SetRow from '../src/components/workout/SetRow';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { Colors } from '../src/utils/constants';

export default function Workout() {
  const router = useRouter();
  const { exercises, addExercise, addSet, updateSet, endWorkout } =
    useWorkoutStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const finishWorkout = async () => {
  if (isSaving) return;

  setIsSaving(true);

  try {
    const workoutId = await saveWorkout();

    // 1. Clear local state FIRST
    endWorkout();

    // 2. Small safety yield (lets AsyncStorage persist flush)
    await new Promise((r) => setTimeout(r, 50));

    // 3. Navigate after state is clean
    router.replace("/history");
  } catch (e) {
    console.log("Failed to save workout:", e);
  } finally {
    setIsSaving(false);
  }
};

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
            {/* EXERCISE TITLE */}
            <Text style={{ color: Colors.text, fontSize: 18, marginBottom: 8 }}>
              {ex.name}
            </Text>

            {/* SETS */}
            {ex.sets.map((set, i) => (
              <SetRow
                key={i}
                weight={set.weight}
                reps={set.reps}
                onWeightChange={(val) => updateSet(ex.id, i, { weight: val })}
                onRepsChange={(val) => updateSet(ex.id, i, { reps: val })}
                onComplete={() => updateSet(ex.id, i, { completed: true })}
              />
            ))}

            {/* ADD SET */}
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
          onPress={finishWorkout}
          disabled={isSaving}
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: isSaving ? '#555' : Colors.primary,
            borderRadius: 12,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '600' }}>
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
