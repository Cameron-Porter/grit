import { Props } from '@/types/workout';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../utils/constants';

export default function SetRow({
  weight,
  reps,
  completed,
  onWeightChange,
  onRepsChange,
  onToggleComplete,
  onRemove,
}: Props) {
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
        onRemove?.();
      }

      translateX.value = withSpring(0, {
        damping: 18,
        stiffness: 180,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{
        position: 'relative',
        marginBottom: 8,
        overflow: 'hidden',
        borderRadius: 12,
      }}
    >
      {/* DELETE BACKGROUND */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: Colors.error,
          justifyContent: 'center',
          paddingRight: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'right' }}>Delete</Text>
      </View>

      {/* COMPLETE BACKGROUND */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: Colors.primary,
          justifyContent: 'center',
          paddingLeft: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: 'white' }}>Complete</Text>
      </View>

      {/* FOREGROUND */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: Colors.surface,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          ]}
        >
          {/* WEIGHT INPUT */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: Colors.muted, fontSize: 12 }}>weight</Text>

            <TextInput
              value={String(weight)}
              keyboardType='numeric'
              onChangeText={(text) => onWeightChange(Number(text || 0))}
              style={{
                color: Colors.text,
                width: 60,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
              }}
            />
          </View>

          {/* REPS INPUT */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: Colors.muted, fontSize: 12 }}>reps</Text>

            <TextInput
              value={String(reps)}
              keyboardType='numeric'
              onChangeText={(text) => onRepsChange(Number(text || 0))}
              style={{
                color: Colors.text,
                width: 40,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
              }}
            />
          </View>

          {/* CHECKBOX */}
          <Pressable onPress={onToggleComplete}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: completed ? Colors.primary : Colors.muted,
                backgroundColor: completed ? Colors.primary : 'transparent',
              }}
            />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
