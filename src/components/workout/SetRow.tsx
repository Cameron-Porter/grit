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

  return (
    <View style={{ position: 'relative', marginBottom: 6, overflow: 'hidden' }}>
      {/* Swipe Left Action Reveal (Delete) */}
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
          borderRadius: 6,
        }}
      >
        <Text
          style={{ color: 'white', textAlign: 'right', fontWeight: 'bold' }}
        >
          Delete
        </Text>
      </View>

      {/* Swipe Right Action Reveal (Complete) */}
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
          borderRadius: 6,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Complete</Text>
      </View>

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
            style={{
              width: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name='dots-vertical'
              size={22}
              color={Colors.muted || '#A0A0A0'}
            />
          </Pressable>

          {/* Weight Input Box */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <TextInput
              value={String(set.weight || '')}
              keyboardType='numeric'
              placeholder='0'
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

          {/* Reps Input Box */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
            <TextInput
              value={String(set.reps || '')}
              keyboardType='numeric'
              placeholder='0'
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

          {/* Log Checkbox Column */}
          <View style={{ width: 60, alignItems: 'center' }}>
            <Pressable onPress={onToggleComplete}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: set.completed
                    ? Colors.primary || '#00A896'
                    : '#1E1E1E',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {set.completed && (
                  <MaterialCommunityIcons
                    name='check'
                    size={18}
                    color='white'
                  />
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
