import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../utils/constants';

interface ExerciseMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onRemove: () => void;
  // Add other callbacks (onMoveDown, onReplace, etc.) as you build those features
}

export default function ExerciseMenuModal({
  visible,
  onClose,
  onRemove,
}: ExerciseMenuModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <Text style={styles.header}>Exercise</Text>

          <MenuButton
            icon='note-plus-outline'
            text='New note'
            onPress={onClose}
          />
          <MenuButton
            icon='arrow-down'
            text='Move down'
            onPress={onClose}
          />
          <MenuButton
            icon='swap-horizontal'
            text='Replace'
            onPress={onClose}
          />
          <MenuButton
            icon='medical-bag'
            text='Joint pain'
            onPress={onClose}
          />
          <MenuButton
            icon='plus'
            text='Add set'
            onPress={onClose}
          />
          <MenuButton
            icon='fast-forward-outline'
            text='Skip sets'
            onPress={onClose}
          />

          <MenuButton
            icon='trash-can-outline'
            text='Remove exercise'
            color={Colors.error || '#FF4A4A'}
            onPress={() => {
              onRemove();
              onClose();
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

// Reusable button for the menu list
const MenuButton = ({ icon, text, color = Colors.text, onPress }: any) => (
  <Pressable
    style={styles.menuButton}
    onPress={onPress}
  >
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={color}
      style={{ width: 28 }}
    />
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
});
