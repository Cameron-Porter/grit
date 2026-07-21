import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../BottomSheet';
import { useColors } from '../../utils/useColors';
import { Space } from '../../utils/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSkipSets: () => void;
  onNewNote: () => void;
  onJointPain: () => void;
  onReplace: () => void;
  onViewHistory?: () => void;
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

export default function ExerciseMenuModal({
  visible, onClose,
  onRemove, onMoveUp, onMoveDown, onSkipSets, onNewNote, onJointPain, onReplace, onViewHistory,
}: Props) {
  const colors = useColors();
  const handle = (cb: () => void) => () => { cb(); onClose(); };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.textTertiary }]}>EXERCISE</Text>

      {onViewHistory && <Row icon="history"        label="View history"       color={colors.text}  onPress={handle(onViewHistory)} border={false} />}
      <Row icon="arrow-up"           label="Move up"            color={colors.text}  onPress={handle(onMoveUp)}    border={!onViewHistory} />
      <Row icon="arrow-down"         label="Move down"          color={colors.text}  onPress={handle(onMoveDown)} />
      <Row icon="swap-horizontal"    label="Replace exercise"   color={colors.text}  onPress={handle(onReplace)} />
      <Row icon="note-plus-outline"  label="Add note"           color={colors.text}  onPress={handle(onNewNote)} />
      <Row icon="fast-forward-outline" label="Skip remaining sets" color={colors.text} onPress={handle(onSkipSets)} />
      <Row icon="medical-bag"        label="Exercise feedback"  color={colors.text}  onPress={handle(onJointPain)} />
      <Row icon="trash-can-outline"  label="Remove exercise"    color={colors.error} onPress={handle(onRemove)} />
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
