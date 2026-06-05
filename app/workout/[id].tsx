import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../src/api/supabase';
import { WorkoutSetRow } from '../../src/types/workout';
import { Colors } from '../../src/utils/constants';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sets, setSets] = useState<WorkoutSetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkout();
  }, []);

  const loadWorkout = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workout_sets')
      .select('*')
      .eq('workout_id', id);

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    setSets(data || []);
    setLoading(false);
  };

  const grouped = sets.reduce((acc: Record<string, WorkoutSetRow[]>, set) => {
    if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
    acc[set.exercise_name].push(set);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 }}>
          <Pressable onPress={() => router.replace('/log')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>History</Text>
          </Pressable>
        </View>
        <Text style={{ color: Colors.muted, padding: 16 }}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header with back */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.replace('/log')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
          <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>History</Text>
        </Pressable>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700' }}>Workout Details</Text>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          {Object.keys(grouped).length} exercise{Object.keys(grouped).length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        {Object.keys(grouped).map((exerciseName) => {
          const exerciseSets = grouped[exerciseName].sort((a, b) => a.set_index - b.set_index);
          return (
            <View
              key={exerciseName}
              style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}
            >
              <View style={{ padding: 14 }}>
                <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                  {exerciseName}
                </Text>
                {/* Column headers */}
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ width: 40, color: Colors.muted, fontSize: 11, fontWeight: '700' }}>#</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>WEIGHT</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>REPS</Text>
                </View>
                {exerciseSets.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.surface2 }}>
                    <Text style={{ width: 40, color: Colors.muted, fontSize: 14 }}>{s.set_index + 1}</Text>
                    <Text style={{ flex: 1, textAlign: 'center', color: Colors.text, fontSize: 15, fontWeight: '600' }}>{s.weight}</Text>
                    <Text style={{ flex: 1, textAlign: 'center', color: Colors.text, fontSize: 15, fontWeight: '600' }}>{s.reps}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
