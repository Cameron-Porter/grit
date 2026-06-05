import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { Colors } from '../../src/utils/constants';

export default function Home() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const { activeWorkoutId, exercises } = useWorkoutStore();

  const hasActiveWorkout = activeWorkoutId && exercises.length > 0;

  const handleStart = () => {
    startWorkout();
    router.push('/workout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          GRIT
        </Text>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>
          Today's Workout
        </Text>
        <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 4 }}>
          Guided Results & Intelligent Training
        </Text>
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        {/* Resume Active Workout */}
        {hasActiveWorkout && (
          <Pressable
            onPress={() => router.push('/workout')}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 14,
              padding: 18,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: Colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                IN PROGRESS
              </Text>
              <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>
                Resume your workout
              </Text>
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} logged
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
          </Pressable>
        )}

        {/* Start New Workout */}
        <Pressable
          onPress={handleStart}
          style={{
            backgroundColor: Colors.primary,
            borderRadius: 14,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <MaterialCommunityIcons name="play" size={22} color={Colors.background} />
          <Text style={{ color: Colors.background, fontSize: 17, fontWeight: '700' }}>
            {hasActiveWorkout ? 'Start New Workout' : 'Start Workout'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
