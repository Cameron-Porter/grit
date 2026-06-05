import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  addProgramExercise,
  getProgramDay,
  getProgramExercises,
  getTemplateDayExercises,
  ProgramDay,
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

  const [day, setDay] = useState<ProgramDay | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isTemplate = !day || day.week_number === 1;

  useEffect(() => {
    load();
  }, [dayId]);

  const load = async () => {
    const dayData = await getProgramDay(dayId);
    setDay(dayData);

    if (!dayData) return;

    if (dayData.week_number === 1) {
      // Week 1: load exercises for this specific day
      const data = await getProgramExercises(dayId);
      setExercises(data);
    } else {
      // Week 2+: load from the Week 1 template
      const data = await getTemplateDayExercises(id, dayData.day_number);
      setExercises(data);
    }
  };

  const handleAddExercise = async (name: string, muscleGroup: string, equipment: string) => {
    // Always write to the week 1 day (template)
    const templateDayId = isTemplate ? dayId : null;
    if (!templateDayId) return; // shouldn't be reachable (picker hidden for week > 1)
    await addProgramExercise(templateDayId, name, muscleGroup, equipment, exercises.length);
    load();
  };

  const handleRemove = async (exerciseId: string) => {
    await removeProgramExercise(exerciseId);
    load();
  };

  const handleStartWorkout = () => {
    // Read program name from the program list in the parent screen id param
    startFromProgramDay(
      dayId,
      null,
      exercises.map((e) => ({
        name: e.exercise_name,
        muscleGroup: e.muscle_group ?? '',
        equipment: e.equipment ?? 'Bodyweight',
      })),
      day?.week_number ?? null,
      day?.day_number ?? null,
      day?.label ?? null,
    );
    router.push('/workout');
  };

  const dayLabel = day ? (day.label ?? DAY_LABELS[(day.day_number - 1) % 7]) : 'Day';
  const weekLabel = day ? `Week ${day.week_number}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>← Program</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '700' }}>{dayLabel}</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
              {weekLabel}
              {!isTemplate && ' · Using Week 1 template'}
            </Text>
          </View>
          {day?.completed && (
            <View style={{ backgroundColor: `${Colors.success}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>Completed</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialCommunityIcons name="dumbbell" size={40} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 10, fontSize: 15 }}>No exercises yet</Text>
            {isTemplate && (
              <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
                Tap + to add — these will repeat every week
              </Text>
            )}
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
                    {item.equipment ?? 'Bodyweight'}
                  </Text>
                </View>
                {isTemplate && (
                  <Pressable onPress={() => handleRemove(item.id)} style={{ padding: 6 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.error} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Footer actions */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surface2, gap: 10 }}>
        {isTemplate && (
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.surface2, alignItems: 'center' }}
          >
            <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>+ Add Exercise</Text>
          </Pressable>
        )}

        {exercises.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!day?.completed && (
              <Pressable
                onPress={handleStartWorkout}
                style={{ flex: 2, backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>Start Workout</Text>
              </Pressable>
            )}
            {day?.completed && (
              <View style={{ flex: 1, backgroundColor: `${Colors.success}22`, borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.success} />
                <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 15 }}>Completed</Text>
              </View>
            )}
          </View>
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
