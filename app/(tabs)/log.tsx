import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getWorkouts } from '../../src/api/history';
import { Colors } from '../../src/utils/constants';

export default function History() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const load = async () => {
    try {
      const data = await getWorkouts();
      setWorkouts(data || []);
    } catch {
      setWorkouts([]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>History</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {workouts.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="history" size={48} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 16 }}>No workouts yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Completed workouts will appear here</Text>
          </View>
        )}
        {workouts.map((w) => {
          const title = w.program_name ?? w.name ?? 'Workout';
          const isProgramWorkout = !!w.program_name;
          return (
            <Pressable
              key={w.id}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({
                backgroundColor: Colors.surface,
                padding: 16,
                borderRadius: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  {isProgramWorkout && (
                    <MaterialCommunityIcons name="calendar-check" size={14} color={Colors.primary} />
                  )}
                  <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
                </View>
                <Text style={{ color: Colors.muted, fontSize: 13 }}>
                  {new Date(w.completed_at ?? w.created_at).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
