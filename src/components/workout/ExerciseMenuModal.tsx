import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColors } from '../../utils/useColors';

interface ExerciseMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSkipSets: () => void;
  onNewNote: () => void;
  onJointPain: () => void;
  onReplace: () => void;
}

function MenuButton({ icon, text, color, onPress }: { icon: string; text: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} style={{ width: 28 }} />
      <Text style={{ color, fontSize: 16, fontWeight: '500' }}>{text}</Text>
    </Pressable>
  );
}

export default function ExerciseMenuModal({
  visible,
  onClose,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSkipSets,
  onNewNote,
  onJointPain,
  onReplace,
}: ExerciseMenuModalProps) {
  const colors = useColors();
  const handle = (cb: () => void) => () => {
    cb();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        onPress={onClose}
      >
        <View style={{ width: '100%', maxWidth: 300, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
            Exercise
          </Text>

          <MenuButton icon="arrow-up" text="Move up" color={colors.text} onPress={handle(onMoveUp)} />
          <MenuButton icon="arrow-down" text="Move down" color={colors.text} onPress={handle(onMoveDown)} />
          <MenuButton icon="swap-horizontal" text="Replace exercise" color={colors.text} onPress={handle(onReplace)} />
          <MenuButton icon="note-plus-outline" text="New note" color={colors.text} onPress={handle(onNewNote)} />
          <MenuButton icon="fast-forward-outline" text="Skip sets" color={colors.text} onPress={handle(onSkipSets)} />
          <MenuButton icon="medical-bag" text="Exercise feedback" color={colors.text} onPress={handle(onJointPain)} />

          <View style={{ height: 1, backgroundColor: colors.surface2, marginVertical: 4 }} />

          <MenuButton
            icon="trash-can-outline"
            text="Remove exercise"
            color={colors.error}
            onPress={handle(onRemove)}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
