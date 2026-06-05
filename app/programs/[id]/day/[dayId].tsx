import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { getWorkoutForProgramDay, WorkoutDayHistory } from '../../../../src/api/history';
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
import ReadOnlyExerciseCard from '../../../../src/components/workout/ReadOnlyExerciseCard';
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

function FeedbackTag({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: `${color}44` }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function ProgramDayScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);

  const [day, setDay] = useState<ProgramDay | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [history, setHistory] = useState<WorkoutDayHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const isTemplate = !day || day.week_number === 1;

  useEffect(() => {
    load();
  }, [dayId]);

  const load = async () => {
    setLoading(true);
    const dayData = await getProgramDay(dayId);
    setDay(dayData);

    if (!dayData) { setLoading(false); return; }

    const exerciseData = dayData.week_number === 1
      ? await getProgramExercises(dayId)
      : await getTemplateDayExercises(id, dayData.day_number);
    setExercises(exerciseData);

    if (dayData.completed) {
      const h = await getWorkoutForProgramDay(dayId).catch(() => null);
      setHistory(h);
    }

    setLoading(false);
  };

  const handleAddExercise = async (name: string, muscleGroup: string, equipment: string) => {
    if (!isTemplate) return;
    await addProgramExercise(dayId, name, muscleGroup, equipment, exercises.length);
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
      exercises.map((e) => ({ name: e.exercise_name, muscleGroup: e.muscle_group ?? '', equipment: e.equipment ?? 'Bodyweight' })),
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
              {weekLabel}{!isTemplate && ' · Using Week 1 template'}
            </Text>
          </View>
          {day?.completed && (
            <View style={{ backgroundColor: `${Colors.success}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>Completed</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : day?.completed ? (
        /* ── COMPLETED VIEW — read-only, mirrors workout screen ── */
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {history ? (
            <>
              <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 20 }}>
                {new Date(history.completedAt).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </Text>

              {history.exercises.map((ex) => (
                <ReadOnlyExerciseCard key={ex.name} exercise={ex} />
              ))}

              {/* Feedback tags */}
              {history.feedback.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                    Session Feedback
                  </Text>
                  {history.feedback.map((fb, i) => {
                    const badgeColor = MuscleGroupColors[fb.muscleGroup] ?? Colors.primary;
                    return (
                      <View key={i} style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                        <View style={{ backgroundColor: `${badgeColor}22`, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 }}>
                          <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {fb.muscleGroup}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {fb.pump && <FeedbackTag label={`Pump: ${fb.pump}`} color={pumpColor(fb.pump)} />}
                          {fb.jointPain && fb.jointPain !== 'None' && <FeedbackTag label={`Pain: ${fb.jointPain}`} color={painColor(fb.jointPain)} />}
                          {fb.volume && <FeedbackTag label={`Vol: ${fb.volume}`} color={volumeColor(fb.volume)} />}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 20 }}>No workout log found for this day.</Text>
          )}
        </ScrollView>
      ) : (
        /* ── TEMPLATE / UPCOMING VIEW — editable ── */
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
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
              const badgeColor = item.muscle_group ? (MuscleGroupColors[item.muscle_group] ?? Colors.primary) : Colors.primary;
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
                      <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>{item.equipment ?? 'Bodyweight'}</Text>
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
        </ScrollView>
      )}

      {/* Footer — only for upcoming days */}
      {!loading && !day?.completed && (
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
            <Pressable
              onPress={handleStartWorkout}
              style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>Start Workout</Text>
            </Pressable>
          )}
        </View>
      )}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </View>
  );
}
