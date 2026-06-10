import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useColors } from '../../utils/useColors';

interface SetMenuModalProps {
  visible: boolean;
  currentType?: 'Regular' | 'M' | 'MM';
  onClose: () => void;
  onDelete: () => void;
  onSkip: () => void;
  onUpdateType: (type: 'Regular' | 'M' | 'MM') => void;
}

function MenuAction({ icon, text, color, onPress }: { icon: string; text: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} style={{ width: 28 }} />
      <Text style={{ color, fontSize: 16, fontWeight: '500' }}>{text}</Text>
    </Pressable>
  );
}

function SetTypeOption({ active, title, subtitle, textColor, mutedColor, onPress }: { active: boolean; title: string; subtitle: string; textColor: string; mutedColor: string; onPress: () => void }) {
  return (
    <Pressable style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }} onPress={onPress}>
      <View style={{ width: 28, justifyContent: 'center' }}>
        {active && <MaterialCommunityIcons name="check" size={20} color={textColor} />}
      </View>
      <View>
        <Text style={{ color: active ? textColor : mutedColor, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: mutedColor, fontSize: 12 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function SetMenuModal({
  visible,
  currentType = 'Regular',
  onClose,
  onDelete,
  onSkip,
  onUpdateType,
}: SetMenuModalProps) {
  const colors = useColors();

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
        <View style={{ width: '100%', maxWidth: 300, backgroundColor: '#252525', borderRadius: 12, paddingVertical: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 }}>
            Set
          </Text>

          <MenuAction icon="plus" text="Add set below" color={colors.text} onPress={onClose} />
          <MenuAction icon="fast-forward-outline" text="Skip set" color={colors.text} onPress={() => { onSkip(); onClose(); }} />
          <MenuAction
            icon="trash-can-outline"
            text="Delete set"
            color={colors.error}
            onPress={() => { onDelete(); onClose(); }}
          />

          <View style={{ height: 1, backgroundColor: '#333', marginVertical: 8 }} />
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: 'bold', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 }}>
            Set Type
          </Text>

          <SetTypeOption
            active={currentType === 'Regular'}
            title="Regular"
            subtitle="Straight, down, ascending"
            textColor={colors.text}
            mutedColor={colors.muted}
            onPress={() => { onUpdateType('Regular'); onClose(); }}
          />
          <SetTypeOption
            active={currentType === 'M'}
            title="M"
            subtitle="Myorep"
            textColor={colors.text}
            mutedColor={colors.muted}
            onPress={() => { onUpdateType('M'); onClose(); }}
          />
          <SetTypeOption
            active={currentType === 'MM'}
            title="MM"
            subtitle="Myorep Match"
            textColor={colors.text}
            mutedColor={colors.muted}
            onPress={() => { onUpdateType('MM'); onClose(); }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
