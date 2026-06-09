import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../utils/constants';

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
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menuContainer}>
          <Text style={styles.header}>Exercise</Text>

          <MenuButton icon="arrow-up" text="Move up" onPress={handle(onMoveUp)} />
          <MenuButton icon="arrow-down" text="Move down" onPress={handle(onMoveDown)} />
          <MenuButton icon="swap-horizontal" text="Replace exercise" onPress={handle(onReplace)} />
          <MenuButton icon="note-plus-outline" text="New note" onPress={handle(onNewNote)} />
          <MenuButton icon="fast-forward-outline" text="Skip sets" onPress={handle(onSkipSets)} />
          <MenuButton icon="medical-bag" text="Joint pain" onPress={handle(onJointPain)} />

          <View style={styles.divider} />

          <MenuButton
            icon="trash-can-outline"
            text="Remove exercise"
            color={Colors.error || '#FF4A4A'}
            onPress={handle(onRemove)}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const MenuButton = ({ icon, text, color = Colors.text, onPress }: any) => (
  <Pressable style={styles.menuButton} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={20} color={color} style={{ width: 28 }} />
    <Text style={{ color, fontSize: 16, fontWeight: '500' }}>{text}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#252525',
    borderRadius: 12,
    paddingVertical: 12,
  },
  header: {
    color: Colors.muted,
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 4 },
});
