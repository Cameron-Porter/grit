import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../BottomSheet';
import { useColors } from '../../utils/useColors';
import { Space } from '../../utils/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSkip: () => void;
}

function Row({
  icon,
  label,
  color,
  onPress,
  border = true,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  border?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        border && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function SetMenuModal({ visible, onClose, onDelete, onSkip }: Props) {
  const colors = useColors();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.textTertiary }]}>SET</Text>

      <Row icon="fast-forward-outline" label="Skip set"    color={colors.text}  onPress={() => { onSkip();   onClose(); }} border={false} />
      <Row icon="trash-can-outline"    label="Delete set"  color={colors.error} onPress={() => { onDelete(); onClose(); }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: Space[2],
    paddingBottom: Space[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Space[2],
    gap: Space[2],
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});
