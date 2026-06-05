import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import {
  addProgramExercise,
  getProgramDay,
  getProgramExercises,
  getTemplateDayExercises,
  ProgramDay,
  ProgramExercise,
  removeProgramExercise,
} from '../../../../src/api/programs';
import { getWorkoutForProgramDay, WorkoutDayHistory } from '../../../../src/api/history';
import ExercisePicker from '../../../../src/components/workout/ExercisePicker';
import { useWorkoutStore } from '../../../../src/store/useWorkoutStore';
import { Colors, MuscleGroupColors } from '../../../../src/utils/constants';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pumpColor = (v: string) => {
  if (v === 'Amazing') return '#2DD4BF';
  if (v === 'Moderate') return Colors.primary;
  return Colors.muted;
};
const painColor = (v: string) => {
  if (v === 'None') return '#22C55E';
  if (v === 'Low') return '#84CC16';
  if (v === 'Moderate') return '#F59E0B';
  return '#EF4444';
};
const volumeColor = (v: string) => {
  if (v === 'Just right') return '#22C55E';
  if (v === 'Pushed limits') return Colors.primary;
  if (v === 'Not enough') return '#F97316';
  return '#EF4444';
};

export default function ProgramDayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);

  const [day, setDay] = useState<ProgramDay | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [history, setHistory] = useState<WorkoutDayHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isTemplate = !day || day.week_number === 1;

  useEffect(() => {
    load();
  }, [dayId]);

  const load = async () => {
    const dayData = await getProgramDay(dayId);
    setDay(dayData);

    if (!dayData) return;

    if (dayData.week_number === 1) {
      const data = await getProgramExercises(dayId);
      setExercises(data);
    } else {
      const data = await getTemplateDayExercises(id, dayData.day_number);
      setExercises(data);
    }

    if (dayData.completed) {
      setHistoryLoading(true);
      getWorkoutForProgramDay(dayId)
        .then((h) => setHistory(h))
        .catch(() => setHistory(null))
        .finally(() => setHistoryLoading(false));
    }
  };

  const handleAddExercise = async (name: string, muscleGroup: string, equipment: string) => {
    const templateDayId = isTemplate ? dayId : null;
    if (!templateDayId) return;
    await addProgramExercise(templateDayId, name, muscleGroup, equipment, exercises.length);
    load();
  };

  const handleRemove = async (exerciseId: string) => {
    await removeProgramExercise(exerciseId);
    load();
  };

  const handleStartWorkout = () => {
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

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Exercise list */}
        <View style={{ padding: 16 }}>
          {exercises.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons name="dumbbell" size={40} color={Colors.surface2} />
              <Text style={{ color: Colors.muted, marginTop: 10, fontSize: 15 }}>No exercises yet</Text>
              {isTemplate && (
                <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
                  Tap + to add — these will repeat every week
                </Text>
              )}
            </View>
          )}

          {exercises.map((item) => {
            const badgeColor = item.muscle_group
              ? (MuscleGroupColors[item.muscle_group] ?? Colors.primary)
              : Colors.primary;
            return (
              <View key={item.id} style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
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
          })}
        </View>

        {/* Completed workout history */}
        {day?.completed && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              Workout Log
            </Text>

            {historyLoading && (
              <Text style={{ color: Colors.muted, fontSize: 14 }}>Loading...</Text>
            )}

            {!historyLoading && history && (
              <>
                <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 12 }}>
                  Completed {new Date(history.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>

                {/* Sets per exercise */}
                {history.exercises.map((ex) => (
                  <View key={ex.name} style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
                      <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>{ex.name}</Text>
                    </View>
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <Text style={{ width: 36, color: Colors.muted, fontSize: 11, fontWeight: '700' }}>#</Text>
                        <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>WEIGHT</Text>
                        <Text style={{ flex: 1, textAlign: 'center', color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>REPS</Text>
                      </View>
                      {ex.sets.filter((s) => s.completed).map((s, j) => (
                        <View key={j} style={{ flexDirection: 'row', paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.surface2 }}>
                          <Text style={{ width: 36, color: Colors.muted, fontSize: 13 }}>{j + 1}</Text>
                          <Text style={{ flex: 1, textAlign: 'center', color: Colors.text, fontSize: 14, fontWeight: '600' }}>{s.weight}</Text>
                          <Text style={{ flex: 1, textAlign: 'center', color: Colors.text, fontSize: 14, fontWeight: '600' }}>{s.reps}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                {/* Feedback tags per muscle group */}
                {history.feedback.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                      Session Feedback
                    </Text>
                    {history.feedback.map((fb, i) => {
                      const badgeColor = MuscleGroupColors[fb.muscleGroup] ?? Colors.primary;
                      return (
                        <View key={i} style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <View style={{ backgroundColor: `${badgeColor}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                                {fb.muscleGroup}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            {fb.pump && (
                              <View style={{ backgroundColor: `${pumpColor(fb.pump)}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: `${pumpColor(fb.pump)}44` }}>
                                <Text style={{ color: pumpColor(fb.pump), fontSize: 12, fontWeight: '700' }}>
                                  Pump: {fb.pump}
                                </Text>
                              </View>
                            )}
                            {fb.jointPain && fb.jointPain !== 'None' && (
                              <View style={{ backgroundColor: `${painColor(fb.jointPain)}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: `${painColor(fb.jointPain)}44` }}>
                                <Text style={{ color: painColor(fb.jointPain), fontSize: 12, fontWeight: '700' }}>
                                  Pain: {fb.jointPain}
                                </Text>
                              </View>
                            )}
                            {fb.volume && (
                              <View style={{ backgroundColor: `${volumeColor(fb.volume)}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: `${volumeColor(fb.volume)}44` }}>
                                <Text style={{ color: volumeColor(fb.volume), fontSize: 12, fontWeight: '700' }}>
                                  Vol: {fb.volume}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {!historyLoading && !history && (
              <Text style={{ color: Colors.muted, fontSize: 13 }}>No workout log found for this day.</Text>
            )}
          </View>
        )}
      </ScrollView>

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
