import { View, Text, Pressable } from "react-native";
import { Colors } from "../../utils/constants";

type Props = {
  weight: number;
  reps: number;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onComplete: () => void;
};

export default function SetRow({
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  onComplete,
}: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
      }}
    >
      {/* Weight control */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => onWeightChange(weight - 5)}>
          <Text style={{ color: Colors.primary, fontSize: 18 }}>-</Text>
        </Pressable>

        <Text style={{ color: Colors.text, width: 60, textAlign: "center" }}>
          {weight} lb
        </Text>

        <Pressable onPress={() => onWeightChange(weight + 5)}>
          <Text style={{ color: Colors.primary, fontSize: 18 }}>+</Text>
        </Pressable>
      </View>

      {/* Reps control */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => onRepsChange(reps - 1)}>
          <Text style={{ color: Colors.primary, fontSize: 18 }}>-</Text>
        </Pressable>

        <Text style={{ color: Colors.text, width: 40, textAlign: "center" }}>
          {reps}
        </Text>

        <Pressable onPress={() => onRepsChange(reps + 1)}>
          <Text style={{ color: Colors.primary, fontSize: 18 }}>+</Text>
        </Pressable>
      </View>

      {/* Complete */}
      <Pressable onPress={onComplete}>
        <Text style={{ color: Colors.accent, fontWeight: "600" }}>✓</Text>
      </Pressable>
    </View>
  );
}