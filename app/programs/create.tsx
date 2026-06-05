import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  addProgramExercise,
  createProgram,
  getProgramDays,
  getNextProgramWorkout,
  setCurrentProgram,
  updateProgramExerciseTargets,
} from '../../src/api/programs';
import { generateStarterSets } from '../../src/api/gemini';
import ExercisePicker from '../../src/components/workout/ExercisePicker';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { Colors, MuscleGroupColors } from '../../src/utils/constants';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

const FOCUS_OPTIONS = [
  { value: 'hypertrophy',    label: 'Hypertrophy',    desc: 'Maximum muscle growth' },
  { value: 'strength',       label: 'Strength',       desc: 'Heavy lifts, low reps' },
  { value: 'general',        label: 'General Fitness', desc: 'Balanced strength & cardio' },
  { value: 'powerbuilding',  label: 'Powerbuilding',   desc: 'Strength + hypertrophy mix' },
  { value: 'maintenance',    label: 'Maintenance',     desc: 'Preserve muscle, low volume' },
];

const PRIORITY_MUSCLES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
];

type Priority = 'emphasize' | 'grow' | 'maintain';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'emphasize', label: 'Emphasize', color: '#2DD4BF' },
  { value: 'grow',      label: 'Grow',      color: Colors.primary },
  { value: 'maintain',  label: 'Maintain',  color: Colors.muted },
];

interface DayExercise {
  name: string;
  muscleGroup: string;
  equipment: string;
}

// Steps: 0 = settings, 1 = focus/priorities, 2..N+1 = exercises per day
export default function CreateProgram() {
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);
  const endWorkout = useWorkoutStore((s) => s.endWorkout);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [selectedDays, setSelectedDays] = useState<number[]>(DEFAULT_DAYS[4]);
  const [focus, setFocus] = useState<string>('hypertrophy');
  const [musclePriorities, setMusclePriorities] = useState<Record<string, Priority>>({});
  const [dayExercises, setDayExercises] = useState<DayExercise[][]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');

  useEffect(() => {
    setSelectedDays(DEFAULT_DAYS[daysPerWeek] ?? [0]);
  }, [daysPerWeek]);

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(idx)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== idx);
      }
      if (prev.length >= daysPerWeek) return prev;
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const setPriority = (muscle: string, p: Priority) => {
    setMusclePriorities((prev) => ({ ...prev, [muscle]: p }));
  };

  // Exercise steps start at step 2 (index = step - 2)
  const exerciseStepIndex = step - 2;
  const currentDayExercises = step >= 2 ? (dayExercises[exerciseStepIndex] ?? []) : [];

  const handleNextFromSettings = () => {
    if (!name.trim() || selectedDays.length !== daysPerWeek) return;
    setStep(1);
  };

  const handleNextFromFocus = () => {
    setDayExercises(Array.from({ length: daysPerWeek }, () => []));
    setStep(2);
  };

  const handleAddExercise = (exName: string, muscleGroup: string, equipment: string) => {
    setDayExercises((prev) => {
      const updated = [...prev];
      updated[exerciseStepIndex] = [...(updated[exerciseStepIndex] ?? []), { name: exName, muscleGroup, equipment }];
      return updated;
    });
  };

  const handleRemoveExercise = (idx: number) => {
    setDayExercises((prev) => {
      const updated = [...prev];
      updated[exerciseStepIndex] = updated[exerciseStepIndex].filter((_, i) => i !== idx);
      return updated;
    });
  };

  const handleNext = () => {
    if (step < daysPerWeek + 1) {
      setStep(step + 1);
    } else {
      handleCreate();
    }
  };

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const sortedDays = [...selectedDays].sort((a, b) => a - b);
      const dayLabels = sortedDays.map((d) => WEEKDAYS_FULL[d]);

      setSavingStatus('Creating program…');
      const program = await createProgram(name.trim(), totalWeeks, daysPerWeek, dayLabels, focus, musclePriorities);
      await setCurrentProgram(program.id);

      const allDays = await getProgramDays(program.id);
      const week1Days = allDays
        .filter((d) => d.week_number === 1)
        .sort((a, b) => a.day_number - b.day_number);

      // Add exercises to each day
      for (let i = 0; i < daysPerWeek; i++) {
        const day = week1Days[i];
        if (!day) continue;
        for (let j = 0; j < (dayExercises[i] ?? []).length; j++) {
          const ex = dayExercises[i][j];
          await addProgramExercise(day.id, ex.name, ex.muscleGroup, ex.equipment, j);
        }
      }

      // Generate AI starter sets for each day in parallel
      setSavingStatus('Generating AI training plan…');
      const { data: allExerciseRows } = await import('../../src/api/supabase').then(({ supabase }) =>
        supabase
          .from('program_exercises')
          .select('id, program_day_id, exercise_name, muscle_group, equipment')
          .in('program_day_id', week1Days.map((d) => d.id))
      );

      if (allExerciseRows && allExerciseRows.length > 0) {
        const aiCalls = week1Days.map(async (day, i) => {
          const dayExs = (allExerciseRows as any[]).filter((r: any) => r.program_day_id === day.id);
          if (!dayExs.length) return;
          const targets = await generateStarterSets(
            focus,
            musclePriorities,
            dayExs.map((r: any) => ({ name: r.exercise_name, muscleGroup: r.muscle_group ?? '', equipment: r.equipment ?? '' })),
          );
          for (const t of targets) {
            const row = dayExs.find((r: any) => r.exercise_name === t.exerciseName);
            if (row) {
              await updateProgramExerciseTargets(row.id, {
                target_sets: t.sets,
                target_reps_min: t.repsMin,
                target_reps_max: t.repsMax,
                target_weight: t.weightLbs,
                rir: t.rir,
              });
            }
          }
        });
        await Promise.all(aiCalls);
      }

      setSavingStatus('Starting first workout…');
      endWorkout();

      const next = await getNextProgramWorkout();
      if (next && next.exercises.length > 0) {
        startFromProgramDay(
          next.day.id,
          next.program.name,
          next.exercises.map((e) => ({
            name: e.exercise_name,
            muscleGroup: e.muscle_group ?? '',
            equipment: e.equipment ?? 'Bodyweight',
            targetSets: (e as any).target_sets ?? undefined,
            targetRepsMin: (e as any).target_reps_min ?? undefined,
            targetRepsMax: (e as any).target_reps_max ?? undefined,
            targetWeight: (e as any).target_weight ?? undefined,
            rir: (e as any).rir ?? undefined,
          })),
          next.day.week_number,
          next.day.day_number,
          next.day.label,
        );
        router.replace('/workout');
      } else {
        router.replace({ pathname: '/programs/[id]', params: { id: program.id } });
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
      setSavingStatus('');
    }
  };

  const sortedSelected = [...selectedDays].sort((a, b) => a - b);
  const currentDayLabel = step >= 2 ? (WEEKDAYS_FULL[sortedSelected[exerciseStepIndex]] ?? `Day ${exerciseStepIndex + 1}`) : '';
  const isLastStep = step === daysPerWeek + 1;
  const progressPct = step <= 1 ? 0 : (step - 1) / daysPerWeek;
  const canAdvanceSettings = !!name.trim() && selectedDays.length === daysPerWeek;

  const headerTitle =
    step === 0 ? 'New Program' :
    step === 1 ? 'Training Focus' :
    currentDayLabel;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => { if (step === 0) router.back(); else setStep(step - 1); }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>{headerTitle}</Text>
          {step >= 2 && (
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
              Day {exerciseStepIndex + 1} of {daysPerWeek} · Add exercises
            </Text>
          )}
        </View>
        {step >= 2 && (
          <Text style={{ color: Colors.muted, fontSize: 13 }}>{exerciseStepIndex + 1}/{daysPerWeek}</Text>
        )}
      </View>

      {/* Progress bar */}
      {step >= 2 && (
        <View style={{ height: 2, backgroundColor: Colors.surface2 }}>
          <View style={{ height: 2, backgroundColor: Colors.primary, width: `${progressPct * 100}%` }} />
        </View>
      )}

      {/* ── Step 0: Settings ── */}
      {step === 0 && (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Program Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Pull Legs"
            placeholderTextColor={Colors.muted}
            style={{ backgroundColor: Colors.surface, color: Colors.text, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 28 }}
            autoFocus
          />

          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Total Weeks</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {[2, 3, 4, 5, 6, 7, 8].map((w) => (
              <Pressable key={w} onPress={() => setTotalWeeks(w)}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: totalWeeks === w ? Colors.primary : Colors.surface, borderWidth: 1, borderColor: totalWeeks === w ? Colors.primary : Colors.surface2 }}>
                <Text style={{ color: totalWeeks === w ? Colors.background : Colors.text, fontWeight: '700', fontSize: 15 }}>{w}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Days Per Week</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {[2, 3, 4, 5, 6].map((d) => (
              <Pressable key={d} onPress={() => setDaysPerWeek(d)}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: daysPerWeek === d ? Colors.primary : Colors.surface, borderWidth: 1, borderColor: daysPerWeek === d ? Colors.primary : Colors.surface2 }}>
                <Text style={{ color: daysPerWeek === d ? Colors.background : Colors.text, fontWeight: '700', fontSize: 15 }}>{d}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Training Days</Text>
          <Text style={{ color: Colors.muted, fontSize: 12, marginBottom: 12 }}>
            Select {daysPerWeek} day{daysPerWeek !== 1 ? 's' : ''} · {selectedDays.length}/{daysPerWeek} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
            {WEEKDAYS_SHORT.map((label, idx) => {
              const isSelected = selectedDays.includes(idx);
              const atMax = selectedDays.length >= daysPerWeek;
              return (
                <Pressable key={idx} onPress={() => toggleDay(idx)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isSelected ? Colors.primary : Colors.surface, borderWidth: 1.5, borderColor: isSelected ? Colors.primary : Colors.surface2, alignItems: 'center', opacity: (!isSelected && atMax) ? 0.4 : 1 }}>
                  <Text style={{ color: isSelected ? Colors.background : Colors.muted, fontSize: 11, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 28 }}>
            <Text style={{ color: Colors.muted, fontSize: 13 }}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{totalWeeks} weeks</Text>
              {' · '}
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{daysPerWeek} days/week</Text>
              {selectedDays.length === daysPerWeek && (
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                  {' · '}{sortedSelected.map((d) => WEEKDAYS_SHORT[d]).join(', ')}
                </Text>
              )}
            </Text>
          </View>

          <Pressable onPress={handleNextFromSettings} disabled={!canAdvanceSettings}
            style={{ backgroundColor: canAdvanceSettings ? Colors.primary : Colors.surface2, borderRadius: 14, padding: 17 }}>
            <Text style={{ color: canAdvanceSettings ? Colors.background : Colors.muted, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
              Set Training Focus →
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── Step 1: Focus + Muscle Priorities ── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
            Program Focus
          </Text>
          <View style={{ gap: 8, marginBottom: 32 }}>
            {FOCUS_OPTIONS.map((opt) => {
              const active = focus === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => setFocus(opt.value)}
                  style={{ borderRadius: 12, borderWidth: 1.5, borderColor: active ? Colors.primary : '#333', backgroundColor: active ? `${Colors.primary}18` : 'transparent', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: active ? Colors.primary : '#555', backgroundColor: active ? Colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.background }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: active ? Colors.primary : Colors.text, fontSize: 15, fontWeight: active ? '700' : '500' }}>{opt.label}</Text>
                    <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Muscle Priorities
          </Text>
          <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
            <Text style={{ color: '#2DD4BF', fontWeight: '700' }}>Emphasize</Text> — max growth, high volume when recovering well{'\n'}
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>Grow</Text> — steady growth at minimum effective volume{'\n'}
            <Text style={{ color: Colors.muted, fontWeight: '700' }}>Maintain</Text> — preserve size, free recovery for other priorities
          </Text>

          {PRIORITY_MUSCLES.map((muscle) => {
            const current = musclePriorities[muscle] ?? 'grow';
            const badgeColor = MuscleGroupColors[muscle] ?? Colors.primary;
            return (
              <View key={muscle} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name="blur-linear" size={11} color={badgeColor} style={{ marginRight: 5 }} />
                  <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '600' }}>{muscle}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = current === p.value;
                    return (
                      <Pressable key={p.value} onPress={() => setPriority(muscle, p.value)}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: active ? p.color : '#333', backgroundColor: active ? `${p.color}22` : 'transparent', alignItems: 'center' }}>
                        <Text style={{ color: active ? p.color : Colors.muted, fontSize: 11, fontWeight: active ? '800' : '500' }}>{p.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      {step === 1 && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surface2 }}>
          <Pressable onPress={handleNextFromFocus}
            style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}>
            <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>
              Set Up Training Days →
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Steps 2..N+1: Exercises per day ── */}
      {step >= 2 && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
            {currentDayExercises.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 32 }}>
                <MaterialCommunityIcons name="dumbbell" size={40} color={Colors.surface2} />
                <Text style={{ color: Colors.muted, marginTop: 10, fontSize: 15 }}>No exercises added</Text>
                <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Tap below to add. These repeat every week.</Text>
              </View>
            )}
            {currentDayExercises.map((ex, idx) => {
              const badgeColor = MuscleGroupColors[ex.muscleGroup] ?? Colors.primary;
              return (
                <View key={idx} style={{ backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                  {ex.muscleGroup && (
                    <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: `${badgeColor}28`, flexDirection: 'row', alignItems: 'center', borderBottomRightRadius: 6 }}>
                      <MaterialCommunityIcons name="blur-linear" size={10} color={badgeColor} style={{ marginRight: 4 }} />
                      <Text style={{ color: badgeColor, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' }}>{ex.muscleGroup}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600' }}>{ex.name}</Text>
                      <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>{ex.equipment}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveExercise(idx)} style={{ padding: 6 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surface2, gap: 10 }}>
            {saving ? (
              <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ color: Colors.muted, fontSize: 14 }}>{savingStatus}</Text>
              </View>
            ) : (
              <>
                <Pressable onPress={() => setPickerOpen(true)}
                  style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.surface2, alignItems: 'center' }}>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>+ Add Exercise</Text>
                </Pressable>
                <Pressable onPress={handleNext}
                  style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>
                    {isLastStep ? 'Create & Generate AI Plan →' : `Next: ${WEEKDAYS_FULL[sortedSelected[exerciseStepIndex + 1]] ?? `Day ${exerciseStepIndex + 2}`} →`}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAddExercise} />
    </View>
  );
}
