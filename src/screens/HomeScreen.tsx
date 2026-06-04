import { View, Text } from "react-native";
import { useWorkoutStore } from "../store/useWorkoutStore";
import { Colors } from "../utils/constants";

export default function HomeScreen() {
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 16 }}>
      <Text style={{ color: Colors.text, fontSize: 28, fontWeight: "700" }}>
        GRIT
      </Text>

      <Text style={{ color: Colors.muted, marginTop: 8 }}>
        Guided Results & Intelligent Training
      </Text>

      <View style={{ marginTop: 40 }}>
        <Text
          onPress={startWorkout}
          style={{
            backgroundColor: Colors.primary,
            padding: 16,
            borderRadius: 12,
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Start Workout
        </Text>
      </View>
    </View>
  );
}