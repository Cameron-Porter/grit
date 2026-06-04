import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { EXERCISES } from "../../data/exercises";
import { Colors } from "../../utils/constants";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

export default function ExercisePicker({
  visible,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: Colors.background, padding: 16 }}>

        <Text style={{ color: Colors.text, fontSize: 22, marginBottom: 12 }}>
          Add Exercise
        </Text>

        <ScrollView>
          {EXERCISES.map((ex) => (
            <Pressable
              key={ex}
              onPress={() => {
                onSelect(ex);
                onClose();
              }}
              style={{
                padding: 14,
                backgroundColor: Colors.surface,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: Colors.text }}>{ex}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={onClose}>
          <Text style={{ color: Colors.muted, textAlign: "center", marginTop: 10 }}>
            Close
          </Text>
        </Pressable>

      </View>
    </Modal>
  );
}