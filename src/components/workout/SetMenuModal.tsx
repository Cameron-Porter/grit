import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../utils/constants';

interface SetMenuModalProps {
  visible: boolean;
  currentType?: 'Regular' | 'M' | 'MM';
  onClose: () => void;
  onDelete: () => void;
  onUpdateType: (type: 'Regular' | 'M' | 'MM') => void;
}

export default function SetMenuModal({
  visible,
  currentType = 'Regular',
  onClose,
  onDelete,
  onUpdateType,
}: SetMenuModalProps) {
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
          <Text style={styles.header}>Set</Text>

          <MenuAction
            icon='plus'
            text='Add set below'
            onPress={onClose}
          />
          <MenuAction
            icon='fast-forward-outline'
            text='Skip set'
            onPress={onClose}
          />
          <MenuAction
            icon='trash-can-outline'
            text='Delete set'
            color={Colors.error || '#FF4A4A'}
            onPress={() => {
              onDelete();
              onClose();
            }}
          />

          <View style={styles.divider} />
          <Text style={styles.header}>Set Type</Text>

          <SetTypeOption
            active={currentType === 'Regular'}
            title='Regular'
            subtitle='Straight, down, ascending'
            onPress={() => {
              onUpdateType('Regular');
              onClose();
            }}
          />
          <SetTypeOption
            active={currentType === 'M'}
            title='M'
            subtitle='Myorep'
            onPress={() => {
              onUpdateType('M');
              onClose();
            }}
          />
          <SetTypeOption
            active={currentType === 'MM'}
            title='MM'
            subtitle='Myorep Match'
            onPress={() => {
              onUpdateType('MM');
              onClose();
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const MenuAction = ({ icon, text, color = Colors.text, onPress }: any) => (
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

const SetTypeOption = ({ active, title, subtitle, onPress }: any) => (
  <Pressable
    style={styles.menuButton}
    onPress={onPress}
  >
    <View style={{ width: 28, justifyContent: 'center' }}>
      {active && (
        <MaterialCommunityIcons
          name='check'
          size={20}
          color={Colors.text}
        />
      )}
    </View>
    <View>
      <Text
        style={{
          color: active ? Colors.text : Colors.muted,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
      <Text style={{ color: Colors.muted, fontSize: 12 }}>{subtitle}</Text>
    </View>
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
    paddingTop: 8,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 8 },
});
