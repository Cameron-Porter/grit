import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useColors } from '../../utils/useColors';

interface PRPopupProps {
  exerciseName: string;
  weight: number;
  reps: number | null;
  isBodyweight?: boolean;
  onDismiss: () => void;
}

export default function PRPopup({ exerciseName, weight, reps, isBodyweight, onDismiss }: PRPopupProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 3s
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        transform: [{ translateY }],
        opacity,
        zIndex: 999,
      }}
    >
      <Pressable onPress={dismiss}>
        <View style={{
          backgroundColor: '#1A2E1A',
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: colors.success,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.success}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.success, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
              New Personal Record!
            </Text>
            <Text style={{ color: '#E5E7EB', fontSize: 15, fontWeight: '700' }}>{exerciseName}</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>
              {isBodyweight ? `${reps} reps` : `${weight} lbs${reps ? ` × ${reps} reps` : ''}`}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
