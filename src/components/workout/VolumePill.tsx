import { StyleSheet, Text, View } from 'react-native';
import { VolumeStatus } from '../../utils/volumeLandmarks';
import { useColors } from '../../utils/useColors';
import { FontFamily, Radius, TypeScale } from '../../utils/tokens';

interface Props {
  status: VolumeStatus;
  label: string;
}

export default function VolumePill({ status, label }: Props) {
  const colors = useColors();

  const color = {
    below_mev:  colors.warning,
    mev_to_mav: colors.success,
    mav_to_mrv: colors.accent,
    above_mrv:  colors.error,
  }[status];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[TypeScale.cap, styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontFamily: FontFamily.bodySemi,
    letterSpacing: 0.6,
  },
});
