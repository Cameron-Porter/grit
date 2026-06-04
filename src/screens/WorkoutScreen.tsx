import { View, Text, ScrollView } from "react-native";
import { useWorkoutStore } from "../store/useWorkoutStore";
import { Colors } from "../utils/constants";

export default function WorkoutScreen() {
  const { exercises, addExercise, addSet, updateSet } =
    useWorkoutStore();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.text, fontSize: 22, margin: 16 }}>
        Active Workout
      </Text>

      {exercises.map((ex, exIndex) => (
        <View
          key={ex.id}
          style={{
            margin: 12,
            padding: 12,
            backgroundColor: Colors.surface,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: Colors.text, fontSize: 18 }}>
            {ex.name}
          </Text>

          {ex.sets.map((set, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Text style={{ color: Colors.muted }}>
                {set.weight} lb x {set.reps}
              </Text>

              <Text style={{ color: Colors.primary }}>
                {set.completed ? "Done" : "Log"}
              </Text>
            </View>
          ))}

          <Text
            onPress={() => addSet(ex.id)}
            style={{
              marginTop: 10,
              color: Colors.accent,
            }}
          >
            + Add Set
          </Text>
        </View>
      ))}

      <Text
        onPress={() => addExercise("New Exercise")}
        style={{
          margin: 16,
          color: Colors.primary,
        }}
      >
        + Add Exercise
      </Text>
    </ScrollView>
  );
}