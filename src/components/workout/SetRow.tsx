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
import RirPickerModal from './RirPickerModal';

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
  const [rirPickerOpen, setRirPickerOpen] = useState(false);

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
        <View style={{ width: 44 }} />
        <Text style={[styles.skippedValue, { color: colors.setSkipped }]}>
          {set.weight > 0 ? String(set.weight) : '—'}
        </Text>
        <Text style={[styles.skippedValue, { color: colors.setSkipped }]}>
          {set.reps > 0 ? String(set.reps) : '—'}
        </Text>
        <View style={styles.rirCell} />
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
            accessibilityLabel="Weight"
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
              accessibilityLabel={set.rir !== undefined ? `Repetitions, target ${set.targetReps ?? ''}, prescribed ${set.rir} reps in reserve` : 'Repetitions'}
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

        {/* Effort — quiet until the set has been logged. */}
        <View style={styles.rirCell}>
          {set.completed && set.rir !== undefined && (
            <Pressable
              accessibilityLabel={set.reportedRir === undefined ? 'Report set effort' : `Reported effort ${set.reportedRir} reps in reserve`}
              onPress={() => setRirPickerOpen(true)}
              style={[
                styles.rirButton,
                {
                  backgroundColor: set.reportedRir === undefined ? 'transparent' : `${colors.primary}18`,
                  borderColor: set.reportedRir === undefined ? colors.border : colors.primary,
                },
              ]}
            >
              <Text style={[styles.rirButtonText, { color: set.reportedRir === undefined ? colors.textSecondary : colors.primary }]}>
                {set.reportedRir === undefined ? '—' : set.reportedRir}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Check */}
        <View style={styles.checkCell}>
          <Pressable
            onPress={handleComplete}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityLabel={set.completed ? 'Set completed' : 'Mark set complete'}
            accessibilityState={{ checked: set.completed }}
          >
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

      <RirPickerModal
        visible={rirPickerOpen}
        value={set.reportedRir}
        prescribedRir={set.rir}
        onSelect={onReportedRirChange}
        onClose={() => setRirPickerOpen(false)}
      />

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
    width: 44,
    minHeight: 44,
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
    width: 52,
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
  rirCell: { width: 44, alignItems: 'center', justifyContent: 'center' },
  rirButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirButtonText: { ...TypeScale.l1, fontFamily: FontFamily.bodyBold },
});
