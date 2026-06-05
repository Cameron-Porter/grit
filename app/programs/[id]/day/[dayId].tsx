import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  addProgramExercise,
  getProgramExercises,
  ProgramExercise,
  removeProgramExercise,
} from '../../../../src/api/programs';
import ExercisePicker from '../../../../src/components/workout/ExercisePicker';
import { useWorkoutStore } from '../../../../src/store/useWorkoutStore';
import { Colors, MuscleGroupColors } from '../../../../src/utils/constants';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProgramDayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);

  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    load();
  }, [dayId]);

  const load = async () => {
    const data = await getProgramExercises(dayId);
    setExercises(data);
  };

  const handleAddExercise = async (name: string, muscleGroup: string, equipment: string) => {
    await addProgramExercise(dayId, name, muscleGroup, equipment, exercises.length);
    load();
  };

  const handleRemove = async (exerciseId: string) => {
    await removeProgramExercise(exerciseId);
    load();
  };

  const handleStartWorkout = () => {
    startFromProgramDay(
      exercises.map((e) => ({
        name: e.exercise_name,
        muscleGroup: e.muscle_group ?? '',
        equipment: e.equipment ?? 'Bodyweight',
      })),
    );
    router.push('/workout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>← Program</Text>
        </Pressable>
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '700' }}>
          Day Exercises
        </Text>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} planned
        </Text>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialCommunityIcons name="dumbbell" size={40} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 10, fontSize: 15 }}>No exercises yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Tap + to add exercises to this day</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badgeColor = item.muscle_group
            ? (MuscleGroupColors[item.muscle_group] ?? Colors.primary)
            : Colors.primary;
          return (
            <View style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
              {item.muscle_group && (
                <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: `${badgeColor}28`, flexDirection: 'row', alignItems: 'center', borderBottomRightRadius: 6 }}>
                  <MaterialCommunityIcons name="blur-linear" size={10} color={badgeColor} style={{ marginRight: 4 }} />
                  <Text style={{ color: badgeColor, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {item.muscle_group}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '600' }}>{item.exercise_name}</Text>
                  <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
                    {item.equipment ?? 'Bodyweight'} · {item.target_sets} sets
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(item.id)} style={{ padding: 6 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.error} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* Footer actions */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surface2, gap: 10 }}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.surface2, alignItems: 'center' }}
        >
          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>+ Add Exercise</Text>
        </Pressable>
        {exercises.length > 0 && (
          <Pressable
            onPress={handleStartWorkout}
            style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>Start Workout</Text>
          </Pressable>
        )}
      </View>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </View>
  );
}
