import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { WorkoutSet } from '../../types/workout';
import { useColors } from '../../utils/useColors';
import { haptic } from '../../utils/haptics';
import { FontFamily, Radius, Space, TypeScale } from '../../utils/tokens';

interface SetRowProps {
  set: WorkoutSet;
  isActive: boolean;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onReportedRirChange: (val: number) => void;
  onComplete: (autoReps?: number) => void;
  onMenuPress: () => void;
  onTimerPress?: () => void;
}

function MenuIcon({ color }: { color: string }) {
  return <MaterialCommunityIcons name="dots-vertical" size={22} color={color} />;
}

function CheckIcon({ color }: { color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name="checkmark" size={16} tintColor={color} weight="bold" />;
  }
  return <MaterialCommunityIcons name="check" size={18} color={color} />;
}

function SkipIcon({ color }: { color: string }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name="minus.circle" size={26} tintColor={color} />;
  }
  return <MaterialCommunityIcons name="minus-circle-outline" size={28} color={color} />;
}

export default function SetRow({
  set,
  isActive,
  onWeightChange,
  onRepsChange,
  onReportedRirChange,
  onComplete,
  onMenuPress,
  onTimerPress,
}: SetRowProps) {
  const colors = useColors();
  const shakeX = useSharedValue(0);
  const checkScale = useSharedValue(1);
  const [rirError, setRirError] = useState(false);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  function springPop() {
    checkScale.value = withSequence(
      withSpring(1.35, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
  }

  function handleComplete() {
    if (set.completed) {
      onComplete();
      return;
    }
    if (set.rir !== undefined && set.reps === 0) {
      setRirError(true);
      haptic.error();
      shakeX.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      setTimeout(() => setRirError(false), 1500);
      return;
    }
    springPop();
    haptic.setLogged();
    if (set.reps === 0 && set.rir === undefined) {
      onComplete(set.targetReps ?? 8);
      return;
    }
    onComplete();
  }

  if (set.skipped) {
    return (
      <View style={[styles.skippedRow]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.skippedValue, { color: colors.setSkipped }]}>
          {set.weight > 0 ? String(set.weight) : '—'}
        </Text>
        <Text style={[styles.skippedValue, { color: colors.setSkipped }]}>
          {set.reps > 0 ? String(set.reps) : '—'}
        </Text>
        <Pressable
          onPress={() => onComplete()}
          hitSlop={8}
          style={styles.checkCell}
        >
          <SkipIcon color={colors.textTertiary} />
        </Pressable>
      </View>
    );
  }

  const completedBg = set.completed ? `${colors.setComplete}18` : 'transparent';

  return (
    <Animated.View style={[{ backgroundColor: completedBg }, rowStyle]}>
      <View style={styles.row}>
        {/* Menu */}
        <Pressable onPress={onMenuPress} style={styles.menuCell} hitSlop={8}>
          <MenuIcon color={colors.muted} />
        </Pressable>

        {/* Weight */}
        <View style={styles.inputCell}>
          <TextInput
            value={String(set.weight || '')}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
            onChangeText={(t) => {
              const clean = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
              onWeightChange(parseFloat(clean) || 0);
            }}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
          />
        </View>

        {/* Reps */}
        <View style={styles.inputCell}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!!onTimerPress && (
              isActive && !set.completed && !set.skipped ? (
                <Pressable onPress={onTimerPress} hitSlop={12} style={{ marginRight: 4 }}>
                  <MaterialCommunityIcons name="timer-outline" size={19} color={colors.primary} />
                </Pressable>
              ) : (
                <View style={{ width: 23 }} />
              )
            )}
            <TextInput
              value={String(set.reps || '')}
              keyboardType="number-pad"
              placeholder={
                set.rir !== undefined
                  ? `${set.rir} RIR`
                  : set.targetReps ? String(set.targetReps) : '0'
              }
              placeholderTextColor={
                rirError
                  ? colors.error
                  : set.rir !== undefined || set.targetReps
                  ? colors.primary
                  : colors.placeholder
              }
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, '');
                onRepsChange(parseInt(clean, 10) || 0);
              }}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderWidth: rirError ? 1 : 0,
                  borderColor: rirError ? colors.error : 'transparent',
                },
              ]}
            />
          </View>
        </View>

        {/* Check */}
        <View style={styles.checkCell}>
          <Pressable onPress={handleComplete} hitSlop={8}>
            <Animated.View
              style={[
                styles.checkBox,
                {
                  backgroundColor: set.completed ? colors.setComplete : colors.inputBg,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: set.completed ? 0 : isActive ? 2 : StyleSheet.hairlineWidth,
                },
                checkStyle,
              ]}
            >
              {set.completed && <CheckIcon color="#fff" />}
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {set.completed && set.rir !== undefined && (
        <View style={styles.actualRirRow}>
          <Text style={[TypeScale.l2, { color: colors.textSecondary }]}>Actual RIR</Text>
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              onPress={() => onReportedRirChange(value)}
              style={[
                styles.rirChip,
                {
                  backgroundColor: set.reportedRir === value ? colors.primary : colors.inputBg,
                  borderColor: set.reportedRir === value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[TypeScale.l2, { color: set.reportedRir === value ? colors.background : colors.text }]}>{value}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!set.completed && (
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[1],
  },
  skippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[1],
    paddingHorizontal: Space[2],
    opacity: 0.45,
  },
  skippedValue: {
    flex: 1,
    textAlign: 'center',
    ...TypeScale.b1,
    textDecorationLine: 'line-through',
  },
  menuCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Space['0.5'],
  },
  input: {
    width: '100%',
    maxWidth: 100,
    paddingVertical: 12,
    borderRadius: Radius.md,
    textAlign: 'center',
    ...TypeScale.h2,
    fontFamily: FontFamily.bodySemi,
  },
  checkCell: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Space[2],
  },
  actualRirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Space[2],
    paddingBottom: Space[1],
  },
  rirChip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
