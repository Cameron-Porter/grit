import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { getWorkouts } from '../../src/api/history';
import { Colors } from '../../src/utils/constants';

export default function History() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWorkouts();
      setWorkouts(data || []);
    } catch {
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>History</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {workouts.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="history" size={48} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 16 }}>No workouts yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Completed workouts will appear here</Text>
          </View>
        )}
        {workouts.map((w) => (
          <Pressable
            key={w.id}
            onPress={() =>
              router.push({
                pathname: '/workout/[id]',
                params: { id: w.id },
              })
            }
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
            <View>
              <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>
                {w.name ?? 'Workout'}
              </Text>
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 3 }}>
                {new Date(w.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
      )}
    </View>
  );
}
