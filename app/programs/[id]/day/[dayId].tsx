import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkoutForProgramDay, WorkoutDayHistory } from '../../../../src/api/history';
import {
  addProgramExercise,
  getProgramDay,
  getProgramDayTargets,
  getProgramExercises,
  getProgramWeekCompletedDays,
  getTemplateDayExercises,
  ProgramDay,
  ProgramDayTarget,
  ProgramExercise,
  removeProgramExercise,
  saveProgramDayTargets,
  unskipProgramDay,
} from '../../../../src/api/programs';
import { ExerciseWeeklyData, generateProgressiveOverload } from '../../../../src/api/gemini';
import ExercisePicker from '../../../../src/components/workout/ExercisePicker';
import ReadOnlyExerciseCard from '../../../../src/components/workout/ReadOnlyExerciseCard';
import { useWorkoutStore } from '../../../../src/store/useWorkoutStore';
import { BOTTOM_TAB_HEIGHT, MuscleGroupColors } from '../../../../src/utils/constants';
import { useColors } from '../../../../src/utils/useColors';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pumpColor = (v: string, primary: string, muted: string) => {
  if (v === 'Amazing') return '#2DD4BF';
  if (v === 'Moderate') return primary;
  return muted;
};
const painColor = (v: string) => {
  if (v === 'None') return '#22C55E';
  if (v === 'Low') return '#84CC16';
  if (v === 'Moderate') return '#F59E0B';
  return '#EF4444';
};
const volumeColor = (v: string, primary: string) => {
  if (v === 'Just right') return '#22C55E';
  if (v === 'Pushed limits') return primary;
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);

  const [day, setDay] = useState<ProgramDay | null>(null);
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [dayTargets, setDayTargets] = useState<ProgramDayTarget[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [history, setHistory] = useState<WorkoutDayHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);

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

    // For week 2+ upcoming (not completed, not skipped) days, load or generate progressive overload targets
    if (!dayData.completed && !dayData.skipped && dayData.week_number > 1) {
      const existing = await getProgramDayTargets(dayId);
      if (existing.length > 0) {
        setDayTargets(existing);
      } else {
        generateAITargets(dayData, exerciseData);
      }
    }

    setLoading(false);
  };

  const generateAITargets = async (dayData: ProgramDay, exerciseData: ProgramExercise[]) => {
    setGeneratingAI(true);
    try {
      // Fetch program context (focus, priorities, total_weeks)
      const { supabase } = await import('../../../../src/api/supabase');
      const { data: programRow } = await supabase
        .from('programs')
        .select('focus, muscle_priorities, total_weeks')
        .eq('id', id)
        .single();
      const focus = (programRow as any)?.focus ?? 'hypertrophy';
      const musclePriorities = (programRow as any)?.muscle_priorities ?? {};
      const totalWeeks = (programRow as any)?.total_weeks ?? 0;

      // Fetch ALL completed days from the previous week
      const prevWeekDays = await getProgramWeekCompletedDays(id, dayData.week_number - 1);
      if (!prevWeekDays.length) { setGeneratingAI(false); return; }

      // Fetch workout history for every completed day last week
      const prevWeekHistories = await Promise.all(
        prevWeekDays.map(async (d) => ({
          dayId: d.id,
          dayLabel: d.label ?? `Day ${d.day_number}`,
          history: await getWorkoutForProgramDay(d.id).catch(() => null),
        })),
      );

      // For each exercise in today's plan, collect ALL last-week sessions
      // that trained the same muscle group (accounts for twice-a-week frequency)
      const exerciseWeeklyData: ExerciseWeeklyData[] = exerciseData.map((ex) => {
        const muscleGroup = ex.muscle_group ?? '';

        const sessions = prevWeekHistories
          .filter((h) =>
            h.history?.exercises.some(
              (e) => e.muscleGroup?.toLowerCase() === muscleGroup.toLowerCase(),
            ),
          )
          .map((h) => {
            // Collect sets for this specific exercise (or all sets for the muscle group if not found)
            const matchingExercise = h.history!.exercises.find(
              (e) => e.name === ex.exercise_name,
            );
            const muscleExercises = h.history!.exercises.filter(
              (e) => e.muscleGroup?.toLowerCase() === muscleGroup.toLowerCase(),
            );
            const sets = (matchingExercise ?? muscleExercises[0])?.sets.map((s) => ({
              weight: s.weight,
              reps: s.reps,
              completed: s.completed,
            })) ?? [];

            const fb = h.history!.feedback.find(
              (f) => f.muscleGroup?.toLowerCase() === muscleGroup.toLowerCase(),
            );
            return {
              dayLabel: h.dayLabel,
              sets,
              feedback: fb
                ? {
                    pump: fb.pump,
                    jointPain: fb.jointPain,
                    volume: fb.volume,
                    soreness: (fb as any).soreness ?? null,
                  }
                : null,
            };
          });

        return { exerciseName: ex.exercise_name, muscleGroup, sessions };
      });

      // Only generate for exercises that have at least one prior session
      const withHistory = exerciseWeeklyData.filter((e) => e.sessions.length > 0);
      if (!withHistory.length) { setGeneratingAI(false); return; }

      const targets = await generateProgressiveOverload(
        focus,
        musclePriorities,
        dayData.week_number,
        totalWeeks,
        withHistory,
      );

      if (targets.length > 0) {
        await saveProgramDayTargets(dayId, targets);
        const saved = await getProgramDayTargets(dayId);
        setDayTargets(saved);
      }
    } catch (e) {
      console.error('AI target generation failed:', e);
    } finally {
      setGeneratingAI(false);
    }
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

  const handleUnskip = async (andStart: boolean) => {
    try {
      await unskipProgramDay(dayId);
      if (andStart) {
        handleStartWorkout();
      } else {
        load();
      }
    } catch {
      Alert.alert('Error', 'Could not remove the skip. Please try again.');
    }
  };

  const handleStartWorkout = () => {
    startFromProgramDay(
      dayId,
      null,
      exercises.map((e) => {
        // Week 2+ uses program_day_targets; week 1 uses program_exercises targets
        const aiTarget = dayTargets.find((t) => t.exercise_name === e.exercise_name);
        return {
          name: e.exercise_name,
          muscleGroup: e.muscle_group ?? '',
          equipment: e.equipment ?? 'Bodyweight',
          targetSets: aiTarget?.target_sets ?? e.target_sets ?? undefined,
          targetRepsMin: aiTarget?.target_reps_min ?? e.target_reps_min ?? undefined,
          targetRepsMax: aiTarget?.target_reps_max ?? e.target_reps_max ?? undefined,
          targetWeight: aiTarget?.target_weight ?? e.target_weight ?? undefined,
          rir: aiTarget?.rir ?? e.rir ?? undefined,
        };
      }),
      day?.week_number ?? null,
      day?.day_number ?? null,
      day?.label ?? null,
    );
    router.push('/workout');
  };

  const dayLabel = day ? (day.label ?? DAY_LABELS[(day.day_number - 1) % 7]) : 'Day';
  const weekLabel = day ? `Week ${day.week_number}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>← Program</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{dayLabel}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              {weekLabel}{!isTemplate && ' · Using Week 1 template'}
            </Text>
          </View>
          {day?.completed && (
            <View style={{ backgroundColor: `${colors.success}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>Completed</Text>
            </View>
          )}
          {day?.skipped && (
            <View style={{ backgroundColor: `${colors.warning}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '700' }}>Skipped</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : day?.completed ? (
        /* ── COMPLETED VIEW — read-only, mirrors workout screen ── */
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {history ? (
            <>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
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
                  <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                    Session Feedback
                  </Text>
                  {history.feedback.map((fb, i) => {
                    const badgeColor = MuscleGroupColors[fb.muscleGroup] ?? colors.primary;
                    return (
                      <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                        <View style={{ backgroundColor: `${badgeColor}22`, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 }}>
                          <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {fb.muscleGroup}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {fb.pump && <FeedbackTag label={`Pump: ${fb.pump}`} color={pumpColor(fb.pump, colors.primary, colors.muted)} />}
                          {fb.jointPain && fb.jointPain !== 'None' && <FeedbackTag label={`Pain: ${fb.jointPain}`} color={painColor(fb.jointPain)} />}
                          {fb.volume && <FeedbackTag label={`Vol: ${fb.volume}`} color={volumeColor(fb.volume, colors.primary)} />}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 20 }}>No workout log found for this day.</Text>
          )}
        </ScrollView>
      ) : day?.skipped ? (
        /* ── SKIPPED VIEW ── */
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
            {/* Skipped notice */}
            <View style={{ backgroundColor: `${colors.warning}18`, borderRadius: 12, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: `${colors.warning}40` }}>
              <MaterialCommunityIcons name="minus-circle-outline" size={22} color={colors.warning} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.warning, fontSize: 15, fontWeight: '700', marginBottom: 3 }}>This workout was skipped</Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                  The sets below were planned but not completed. You can make up this session whenever you're ready.
                </Text>
              </View>
            </View>

            {/* Planned exercises — read-only */}
            {exercises.map((item) => {
              const badgeColor = item.muscle_group ? (MuscleGroupColors[item.muscle_group] ?? colors.primary) : colors.primary;
              return (
                <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  {item.muscle_group && (
                    <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: `${badgeColor}28`, flexDirection: 'row', alignItems: 'center', borderBottomRightRadius: 6 }}>
                      <MaterialCommunityIcons name="blur-linear" size={10} color={badgeColor} style={{ marginRight: 4 }} />
                      <Text style={{ color: badgeColor, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        {item.muscle_group}
                      </Text>
                    </View>
                  )}
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.exercise_name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{item.equipment ?? 'Bodyweight'}</Text>
                    </View>
                    {item.target_sets != null && (item.target_reps_min ?? 0) > 0 && (
                      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
                        {item.target_sets}×{item.target_reps_min}–{item.target_reps_max}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Unskip footer */}
          <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2, gap: 10 }}>
            <Pressable
              onPress={() => handleUnskip(true)}
              style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>Make Up This Workout</Text>
            </Pressable>
            <Pressable
              onPress={() => handleUnskip(false)}
              style={{ alignItems: 'center', padding: 10 }}
            >
              <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 14 }}>Remove skip without starting</Text>
            </Pressable>
          </View>
        </>
      ) : (
        /* ── TEMPLATE / UPCOMING VIEW — editable ── */
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={{ padding: 16 }}>
            {exercises.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialCommunityIcons name="dumbbell" size={40} color={colors.surface2} />
                <Text style={{ color: colors.muted, marginTop: 10, fontSize: 15 }}>No exercises yet</Text>
                {isTemplate && (
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    Tap + to add — these will repeat every week
                  </Text>
                )}
              </View>
            )}

            {/* AI generating indicator */}
            {generatingAI && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 12, backgroundColor: `${colors.primary}18`, borderRadius: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Generating progressive overload plan…</Text>
              </View>
            )}

            {exercises.map((item) => {
              const badgeColor = item.muscle_group ? (MuscleGroupColors[item.muscle_group] ?? colors.primary) : colors.primary;
              const aiTarget = dayTargets.find((t) => t.exercise_name === item.exercise_name);
              const hasAI = !!aiTarget;
              return (
                <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  {item.muscle_group && (
                    <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: `${badgeColor}28`, flexDirection: 'row', alignItems: 'center', borderBottomRightRadius: 6 }}>
                      <MaterialCommunityIcons name="blur-linear" size={10} color={badgeColor} style={{ marginRight: 4 }} />
                      <Text style={{ color: badgeColor, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        {item.muscle_group}
                      </Text>
                    </View>
                  )}
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.exercise_name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{item.equipment ?? 'Bodyweight'}</Text>
                      </View>
                      {isTemplate && (
                        <Pressable onPress={() => handleRemove(item.id)} style={{ padding: 6 }}>
                          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                    {/* AI target summary */}
                    {hasAI && (
                      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ backgroundColor: `${colors.primary}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons name="lightning-bolt" size={10} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                            {aiTarget.target_sets}×{aiTarget.target_reps_min}–{aiTarget.target_reps_max} @ {aiTarget.rir} RIR
                            {aiTarget.target_weight > 0 ? `  ·  ${aiTarget.target_weight} lbs` : ''}
                          </Text>
                        </View>
                        {aiTarget.ai_rationale ? (
                          <Text style={{ color: colors.muted, fontSize: 11, flex: 1, marginTop: 2 }} numberOfLines={2}>
                            {aiTarget.ai_rationale}
                          </Text>
                        ) : null}
                      </View>
                    )}
                    {/* Week-1 AI target summary (from program_exercises) */}
                    {!hasAI && item.target_sets != null && (item.target_reps_min ?? 0) > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ backgroundColor: `${colors.primary}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialCommunityIcons name="lightning-bolt" size={10} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                            {item.target_sets}×{item.target_reps_min}–{item.target_reps_max} @ {item.rir ?? 3} RIR
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Footer — only for upcoming (not completed, not skipped) days */}
      {!loading && !day?.completed && !day?.skipped && (
        <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2, gap: 10 }}>
          {isTemplate && (
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.surface2, alignItems: 'center' }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>+ Add Exercise</Text>
            </Pressable>
          )}
          {exercises.length > 0 && (
            <Pressable
              onPress={handleStartWorkout}
              style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>Start Workout</Text>
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
