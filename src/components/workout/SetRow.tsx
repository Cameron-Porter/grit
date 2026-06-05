import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { WorkoutSet } from '../../types/workout';
import { Colors } from '../../utils/constants';

interface SetRowProps {
  set: WorkoutSet;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  onMenuPress: () => void;
}

export default function SetRow({
  set,
  onWeightChange,
  onRepsChange,
  onToggleComplete,
  onRemove,
  onMenuPress,
}: SetRowProps) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value > 100) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onToggleComplete();
      }
      if (translateX.value < -100) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onRemove();
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Only show each background on the correct swipe side
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -8 ? 1 : 0,
  }));

  const completeStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 8 ? 1 : 0,
  }));

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

  return (
    <View style={{ position: 'relative', marginBottom: 6, overflow: 'hidden' }}>
      {/* Delete background — only visible on left swipe */}
      <Animated.View
        style={[deleteStyle, {
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: Colors.error,
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 20,
          borderRadius: 6,
        }]}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Delete</Text>
      </Animated.View>

      {/* Complete background — only visible on right swipe */}
      <Animated.View
        style={[completeStyle, {
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: Colors.primary,
          justifyContent: 'center',
          paddingLeft: 20,
          borderRadius: 6,
        }]}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Complete</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: Colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 6,
            },
          ]}
        >
          {/* Row Options Menu Trigger */}
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
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.muted}
              onChangeText={(text) => onWeightChange(Number(text || 0))}
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
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.muted}
              onChangeText={(text) => onRepsChange(Number(text || 0))}
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

          {/* Log Checkbox */}
          <View style={{ width: 60, alignItems: 'center' }}>
            <Pressable onPress={onToggleComplete}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: set.completed ? Colors.primary : '#1E1E1E',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {set.completed && (
                  <MaterialCommunityIcons name="check" size={18} color="white" />
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
