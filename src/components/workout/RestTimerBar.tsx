import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { RestTimerControls, RestTimerState } from '../../hooks/useRestTimer';
import { useColors } from '../../utils/useColors';
import { FontFamily, TypeScale, Space, Radius } from '../../utils/tokens';

const INLINE_HEIGHT = 52;

interface Props {
  timer: RestTimerState;
  controls: RestTimerControls;
  defaultSeconds?: number;
  inline?: boolean;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function RestTimerBar({ timer, controls, inline = false }: Props) {
  const colors = useColors();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Expand / collapse height
  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: timer.active ? INLINE_HEIGHT : 0,
      useNativeDriver: false,
      damping: 22,
      stiffness: 220,
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

  return (
    <Animated.View
      pointerEvents={timer.active ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          height: heightAnim,
          backgroundColor: colors.surface2,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.cardBorder,
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
