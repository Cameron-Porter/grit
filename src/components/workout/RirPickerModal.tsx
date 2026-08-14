import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet from '../BottomSheet';
import { useColors } from '../../utils/useColors';
import { FontFamily, Radius, Space, TypeScale } from '../../utils/tokens';

interface Props {
  visible: boolean;
  value?: number;
  prescribedRir?: number;
  onSelect: (value: number) => void;
  onClose: () => void;
}

const OPTIONS = [
  { value: 0, label: 'None', detail: 'Reached failure' },
  { value: 1, label: '1 rep', detail: 'One clean rep left' },
  { value: 2, label: '2 reps', detail: 'Two clean reps left' },
  { value: 3, label: '3 reps', detail: 'Three clean reps left' },
  { value: 4, label: '4 reps', detail: 'Four clean reps left' },
  { value: 5, label: '5+ reps', detail: 'Five or more left' },
] as const;

export default function RirPickerModal({ visible, value, prescribedRir, onSelect, onClose }: Props) {
  const colors = useColors();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={[TypeScale.h2, { color: colors.text, fontFamily: FontFamily.displayMed }]}>How hard was that set?</Text>
        <Text style={[TypeScale.b2, { color: colors.textSecondary, marginTop: 3 }]}>How many clean reps could you still have done?</Text>
        {prescribedRir !== undefined && (
          <Text style={[TypeScale.l1, { color: colors.primary, marginTop: Space[1] }]}>Target: about {prescribedRir} reps left</Text>
        )}
      </View>

      <View style={[styles.options, { borderTopColor: colors.separator }]}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => { onSelect(option.value); onClose(); }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? `${colors.primary}18` : 'transparent',
                  borderColor: selected ? colors.primary : colors.separator,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.valueBubble, { backgroundColor: selected ? colors.primary : colors.inputBg }]}>
                <Text style={[TypeScale.l1, { color: selected ? colors.background : colors.text, fontFamily: FontFamily.bodyBold }]}>{option.value}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[TypeScale.b1, { color: colors.text, fontFamily: FontFamily.bodySemi }]}>{option.label}</Text>
                <Text style={[TypeScale.l2, { color: colors.textSecondary }]}>{option.detail}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space[2], paddingBottom: Space[2] },
  options: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Space[1], gap: Space['0.5'] },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[1.5],
    marginHorizontal: Space[1],
    paddingHorizontal: Space[1.5],
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  valueBubble: { width: 32, height: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
