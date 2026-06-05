import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { supabase } from '../../src/api/supabase';
import { WorkoutSetRow } from '../../src/types/workout';
import { Colors } from '../../src/utils/constants';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
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

  // Group by exercise
  const grouped = sets.reduce((acc: Record<string, WorkoutSetRow[]>, set) => {
    if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
    acc[set.exercise_name].push(set);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Text style={{ color: Colors.text, padding: 16 }}>
          Loading workout...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={{ color: Colors.text, fontSize: 22, marginBottom: 16 }}>
        Workout Details
      </Text>

      {Object.keys(grouped).map((exerciseName) => {
        const exerciseSets = grouped[exerciseName];

        return (
          <View
            key={exerciseName}
            style={{
              backgroundColor: Colors.surface,
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            {/* Exercise Name */}
            <Text
              style={{
                color: Colors.text,
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              {exerciseName}
            </Text>

            {/* Sets */}
            {exerciseSets.map((s, i) => (
              <Text
                key={i}
                style={{
                  color: Colors.muted,
                  marginBottom: 4,
                }}
              >
                Set {s.set_index + 1}: {s.weight} lb × {s.reps}
              </Text>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
