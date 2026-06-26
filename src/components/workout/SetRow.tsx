import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { WorkoutSet } from '../../types/workout';
import { useColors } from '../../utils/useColors';

interface SetRowProps {
  set: WorkoutSet;
  isActive: boolean;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  // autoReps provided when set should be completed with auto-filled reps
  onComplete: (autoReps?: number) => void;
  onRemove: () => void;
  onMenuPress: () => void;
}

export default function SetRow({
  set,
  isActive,
  onWeightChange,
  onRepsChange,
  onComplete,
  onRemove,
  onMenuPress,
}: SetRowProps) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const [rirError, setRirError] = useState(false);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value > 100) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        handleComplete();
      }
      if (translateX.value < -100) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onRemove();
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + shakeX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -8 ? 1 : 0,
  }));

  const completeStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 8 ? 1 : 0,
  }));

  function handleComplete() {
    if (set.completed) {
      onComplete(); // uncomplete — no auto-fill
      return;
    }

    // RIR sets require actual rep entry
    if (set.rir !== undefined && set.reps === 0) {
      setRirError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

    // Non-RIR sets: auto-fill target reps if blank
    if (set.reps === 0 && set.rir === undefined) {
      onComplete(set.targetReps ?? 8);
      return;
    }

    onComplete();
  }

  if (set.skipped) {
    return (
      <View style={{ marginBottom: 6, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', opacity: 0.45 }}>
        <View style={{ width: 40 }} />
        <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 16, textDecorationLine: 'line-through' }}>
          {set.weight > 0 ? String(set.weight) : '—'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 16, textDecorationLine: 'line-through' }}>
          {set.reps > 0 ? String(set.reps) : '—'}
        </Text>
        <Pressable
          onPress={() => onComplete()}
          hitSlop={8}
          style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="minus-circle-outline" size={28} color="#555" />
        </Pressable>
      </View>
    );
  }

  const borderColor = set.completed ? 'transparent' : colors.surface2;
  const borderWidth = set.completed ? 0 : 1;

  return (
    <View style={{ position: 'relative', marginBottom: 6, overflow: 'hidden' }}>
      {/* Delete background */}
      <Animated.View
        style={[deleteStyle, {
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: colors.error,
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 20,
          borderRadius: 8,
        }]}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Delete</Text>
      </Animated.View>

      {/* Complete background */}
      <Animated.View
        style={[completeStyle, {
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          paddingLeft: 20,
          borderRadius: 8,
        }]}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Complete</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: set.completed ? `${colors.primary}18` : colors.cardSurface,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth,
              borderColor,
            },
          ]}
        >
          {/* Row menu */}
          <Pressable
            onPress={onMenuPress}
            style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.muted} />
          </Pressable>

          {/* Weight Input */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <TextInput
              value={String(set.weight || '')}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                onWeightChange(parseFloat(clean) || 0);
              }}
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                width: '100%',
                maxWidth: 100,
                paddingVertical: 12,
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
              }}
            />
          </View>

          {/* Reps Input */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <TextInput
              value={String(set.reps || '')}
              keyboardType="number-pad"
              placeholder={
                set.rir !== undefined
                  ? `${set.rir} RIR`
                  : set.targetReps
                  ? String(set.targetReps)
                  : '0'
              }
              placeholderTextColor={
                rirError
                  ? colors.error
                  : set.rir !== undefined || set.targetReps
                  ? colors.primary
                  : colors.muted
              }
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, '');
                onRepsChange(parseInt(clean, 10) || 0);
              }}
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                width: '100%',
                maxWidth: 100,
                paddingVertical: 12,
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
                borderWidth: rirError ? 1 : 0,
                borderColor: rirError ? colors.error : 'transparent',
              }}
            />
          </View>

          {/* Log Checkbox */}
          <View style={{ width: 64, alignItems: 'center' }}>
            <Pressable onPress={handleComplete} hitSlop={8}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: set.completed ? colors.primary : colors.inputBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: set.completed ? 0 : isActive ? 2 : 1,
                  borderColor: isActive ? colors.primary : colors.surface2,
                }}
              >
                {set.completed && (
                  <MaterialCommunityIcons name="check" size={22} color="white" />
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
