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
import { Colors } from '../../utils/constants';

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
      <View style={{ marginBottom: 6, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', opacity: 0.4 }}>
        <View style={{ width: 40 }} />
        <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 13, fontStyle: 'italic' }}>—</Text>
        <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 13, fontStyle: 'italic' }}>—</Text>
        <View style={{ width: 60, alignItems: 'center' }}>
          <Text style={{ color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SKIP</Text>
        </View>
      </View>
    );
  }

  // Border styling: active = green, completed = none, future = subtle
  const borderColor = set.completed
    ? 'transparent'
    : isActive
    ? Colors.primary
    : Colors.surface2;
  const borderWidth = set.completed ? 0 : isActive ? 2 : 1;

  return (
    <View style={{ position: 'relative', marginBottom: 6, overflow: 'hidden' }}>
      {/* Delete background */}
      <Animated.View
        style={[deleteStyle, {
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: Colors.error,
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
          backgroundColor: Colors.primary,
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
              backgroundColor: set.completed ? `${Colors.primary}18` : Colors.surface,
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
            <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.muted} />
          </Pressable>

          {/* Weight Input */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <TextInput
              value={String(set.weight || '')}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.muted}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                onWeightChange(parseFloat(clean) || 0);
              }}
              style={{
                backgroundColor: '#1E1E1E',
                color: Colors.text,
                width: '100%',
                maxWidth: 90,
                paddingVertical: 8,
                borderRadius: 6,
                textAlign: 'center',
                fontSize: 16,
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
                  ? Colors.error
                  : set.rir !== undefined || set.targetReps
                  ? Colors.primary
                  : Colors.muted
              }
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, '');
                onRepsChange(parseInt(clean, 10) || 0);
              }}
              style={{
                backgroundColor: '#1E1E1E',
                color: Colors.text,
                width: '100%',
                maxWidth: 90,
                paddingVertical: 8,
                borderRadius: 6,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600',
                borderWidth: rirError ? 1 : 0,
                borderColor: rirError ? Colors.error : 'transparent',
              }}
            />
          </View>

          {/* Log Checkbox */}
          <View style={{ width: 60, alignItems: 'center' }}>
            <Pressable onPress={handleComplete}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: set.completed ? Colors.primary : '#1E1E1E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: set.completed ? 0 : isActive ? 2 : 1,
                  borderColor: isActive ? Colors.primary : '#3A3A3A',
                }}
              >
                {set.completed && (
                  <MaterialCommunityIcons name="check" size={18} color="white" />
                )}
                {!set.completed && isActive && (
                  <MaterialCommunityIcons name="circle-medium" size={14} color={Colors.primary} />
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
