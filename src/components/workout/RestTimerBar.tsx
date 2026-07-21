import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RestTimerControls, RestTimerState } from '../../hooks/useRestTimer';
import { useColors } from '../../utils/useColors';
import { FontFamily, TypeScale, Space, Radius } from '../../utils/tokens';
import { BOTTOM_TAB_HEIGHT } from '../../utils/constants';

interface Props {
  timer: RestTimerState;
  controls: RestTimerControls;
  defaultSeconds?: number;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function RestTimerBar({ timer, controls, defaultSeconds = 90 }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(80)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Slide in / out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: timer.active ? 0 : 80,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [timer.active]);

  // Progress bar width (0→1)
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: timer.progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [timer.progress]);

  const bottom = BOTTOM_TAB_HEIGHT + insets.bottom + Space[1];

  return (
    <Animated.View
      pointerEvents={timer.active ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          bottom,
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Progress fill */}
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.restTimer,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />

      <View style={styles.inner}>
        {/* Time */}
        <Text style={[styles.time, { color: colors.text }]}>
          {fmt(timer.remaining)}
        </Text>

        {/* Label */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>REST</Text>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => controls.addTime(15)}
            hitSlop={8}
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.btnText, { color: colors.restTimer }]}>+15s</Text>
          </Pressable>
          <Pressable
            onPress={controls.stop}
            hitSlop={8}
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.btnText, { color: colors.textTertiary }]}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Space[2],
    right: Space[2],
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    opacity: 0.15,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[1],
    paddingHorizontal: Space[2],
    gap: Space[1],
  },
  time: {
    ...TypeScale.d3,
    fontFamily: FontFamily.display,
    minWidth: 52,
  },
  label: {
    ...TypeScale.cap,
    flex: 1,
    letterSpacing: 1.5,
  },
  controls: {
    flexDirection: 'row',
    gap: Space[1],
  },
  btn: {
    paddingHorizontal: Space[1],
    paddingVertical: Space['0.5'],
  },
  btnText: {
    ...TypeScale.l1,
    fontFamily: FontFamily.bodySemi,
  },
});
