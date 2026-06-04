import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { Colors } from '../src/utils/constants';

export default function Home() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const handleStart = () => {
    startWorkout();
    router.push('./workout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 16 }}>
      <Text style={{ color: Colors.text, fontSize: 32, fontWeight: '700' }}>
        GRIT
      </Text>

      <Text style={{ color: Colors.muted, marginTop: 8 }}>
        Guided Results & Intelligent Training
      </Text>

      <Pressable
        onPress={handleStart}
        style={{
          marginTop: 40,
          backgroundColor: Colors.primary,
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text style={{ textAlign: 'center', fontWeight: '600' }}>
          Start Workout
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/history')}>
        <Text style={{ color: Colors.muted, marginTop: 20 }}>View History</Text>
      </Pressable>
    </View>
  );
}
