import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../src/api/supabase';
import ReadOnlyExerciseCard, { ReadOnlyExercise } from '../../src/components/workout/ReadOnlyExerciseCard';
import { Colors } from '../../src/utils/constants';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exercises, setExercises] = useState<ReadOnlyExercise[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const [{ data: sets }, { data: workoutRows }] = await Promise.all([
      supabase
        .from('workout_sets')
        .select('exercise_name, muscle_group, equipment, note, weight, reps, set_index, completed')
        .eq('workout_id', id)
        .order('exercise_name')
        .order('set_index'),
      supabase
        .from('workouts')
        .select('completed_at')
        .eq('id', id)
        .single(),
    ]);

    setCompletedAt(workoutRows?.completed_at ?? null);

    // Group sets by exercise, carrying metadata from first row
    const map = new Map<string, ReadOnlyExercise>();
    (sets ?? []).forEach((s) => {
      if (!map.has(s.exercise_name)) {
        map.set(s.exercise_name, {
          name: s.exercise_name,
          muscleGroup: s.muscle_group ?? null,
          equipment: s.equipment ?? null,
          note: s.note ?? null,
          sets: [],
        });
      }
      map.get(s.exercise_name)!.sets.push({
        weight: s.weight,
        reps: s.reps,
        completed: s.completed,
      });
    });

    setExercises(Array.from(map.values()));
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
          <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>History</Text>
        </Pressable>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700' }}>Workout</Text>
        {completedAt && (
          <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
            {new Date(completedAt).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {exercises.map((ex) => (
            <ReadOnlyExerciseCard key={ex.name} exercise={ex} />
          ))}
          {exercises.length === 0 && (
            <Text style={{ color: Colors.muted, textAlign: 'center', marginTop: 40 }}>No sets recorded.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
