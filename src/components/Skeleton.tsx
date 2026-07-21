import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '../utils/useColors';
import { Radius } from '../utils/tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surface2, opacity },
        style,
      ]}
    />
  );
}

// Pre-built exercise card skeleton
export function ExerciseCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={styles.cardInner}>
        <Skeleton width="55%" height={20} radius={Radius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="35%" height={13} radius={Radius.sm} style={{ marginBottom: 16 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.setRow}>
            <Skeleton width={32} height={32} radius={Radius.sm} />
            <Skeleton width={72} height={44} radius={Radius.md} />
            <Skeleton width={72} height={44} radius={Radius.md} />
            <Skeleton width={40} height={40} radius={Radius.md} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Compact row skeleton (for history, program lists)
export function RowSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? '65%' : '40%'} height={i === 0 ? 16 : 12} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardInner: {
    padding: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
