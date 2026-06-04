import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getWorkouts } from '../src/api/history';
import { Colors } from '../src/utils/constants';

export default function History() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getWorkouts();
    setWorkouts(data || []);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, padding: 16 }}>
      <Text style={{ color: Colors.text, fontSize: 22, marginBottom: 16 }}>
        Workout History
      </Text>

      <ScrollView>
        {workouts.map((w) => (
          <Pressable
            key={w.id}
            onPress={() =>
              router.push({
                pathname: '/workout/[id]',
                params: { id: w.id },
              })
            }
            style={{
              backgroundColor: Colors.surface,
              padding: 14,
              borderRadius: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: Colors.text }}>{w.name ?? 'Workout'}</Text>

            <Text style={{ color: Colors.muted, marginTop: 4 }}>
              {new Date(w.created_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
