import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addProgramExercise,
  createProgram,
  getProgramDays,
  getNextProgramWorkout,
  setCurrentProgram,
} from '../../src/api/programs';
import { buildProgram } from '../../src/rules/programBuilder';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import type { DayPlan, ExerciseSlot, ExperienceLevel, MuscleGroup, ProgramFocus, SlotRole } from '../../src/types/program';
import { BOTTOM_TAB_HEIGHT, MuscleGroupColors } from '../../src/utils/constants';
import { useColors } from '../../src/utils/useColors';
import SlotExercisePicker from '../../src/components/workout/SlotExercisePicker';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

const FOCUS_OPTIONS: { value: ProgramFocus; label: string; desc: string }[] = [
  { value: 'hypertrophy',   label: 'Hypertrophy',    desc: 'Maximum muscle growth' },
  { value: 'strength',      label: 'Strength',        desc: 'Heavy lifts, low reps' },
  { value: 'general',       label: 'General Fitness', desc: 'Balanced strength & cardio' },
  { value: 'powerbuilding', label: 'Powerbuilding',   desc: 'Strength + hypertrophy mix' },
  { value: 'maintenance',   label: 'Maintenance',     desc: 'Preserve muscle, low volume' },
];

const PRIORITY_MUSCLES: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
];

type Priority = 'emphasize' | 'grow' | 'maintain';

// Steps: 0 = settings, 1 = focus/priorities, 2..N+1 = exercises per day
const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: 'Beginner',     desc: '0–2 yrs · linear gains, machine-friendly' },
  { value: 'intermediate', label: 'Intermediate', desc: '2–5 yrs · double progression' },
  { value: 'advanced',     label: 'Advanced',     desc: '5+ yrs · periodized loading' },
];

export default function CreateProgram() {
  const colors = useColors();
  const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
    { value: 'emphasize', label: 'Emphasize', color: '#2DD4BF' },
    { value: 'grow',      label: 'Grow',      color: colors.primary },
    { value: 'maintain',  label: 'Maintain',  color: colors.muted },
  ];
  const ROLE_COLORS: Record<SlotRole, string> = {
    Primary:   colors.primary,
    Secondary: '#A78BFA',
    Accessory: colors.muted,
  };
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);
  const endWorkout = useWorkoutStore((s) => s.endWorkout);
  const profileLevel = useProfileStore((s) => s.experienceLevel);
  const setProfileLevel = useProfileStore((s) => s.setExperienceLevel);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [selectedDays, setSelectedDays] = useState<number[]>(DEFAULT_DAYS[4]);
  const [focus, setFocus] = useState<ProgramFocus>('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profileLevel ?? 'intermediate');
  const [musclePriorities, setMusclePriorities] = useState<Partial<Record<MuscleGroup, Priority>>>({});
  const [programDays, setProgramDays] = useState<DayPlan[]>([]);

  // Exercise picker state
  const [pickerTarget, setPickerTarget] = useState<{ dayIdx: number; slotIdx: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');

  useEffect(() => {
    setSelectedDays(DEFAULT_DAYS[daysPerWeek] ?? [0]);
  }, [daysPerWeek]);

  const sortedSelected = [...selectedDays].sort((a, b) => a - b);
  const exerciseStepIndex = step - 2;
  const currentDay: DayPlan | undefined = step >= 2 ? programDays[exerciseStepIndex] : undefined;

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

  const setPriority = (muscle: MuscleGroup, p: Priority) => {
    setMusclePriorities((prev) => ({ ...prev, [muscle]: p }));
  };

  // ── Navigation ──

  const handleNextFromSettings = () => {
    if (!name.trim() || selectedDays.length !== daysPerWeek) return;
    setStep(1);
  };

  const handleNextFromFocus = () => {
    const dayLabels = sortedSelected.map((d) => WEEKDAYS_FULL[d]);
    const generated = buildProgram({
      name: name.trim(),
      focus,
      experienceLevel,
      daysPerWeek,
      selectedDays: dayLabels,
      musclePriorities,
      totalWeeks,
    });
    // Persist the chosen level to the user profile for future programs
    setProfileLevel(experienceLevel);
    setProgramDays(generated.days);
    setStep(2);
  };

  const handleSelectExercise = (exerciseName: string) => {
    if (!pickerTarget) return;
    const { dayIdx, slotIdx } = pickerTarget;
    setProgramDays((prev) =>
      prev.map((d, di) => {
        if (di !== dayIdx) return d;
        const slots = d.slots.map((slot, si) => {
          if (si !== slotIdx) return slot;
          return { ...slot, selectedExercise: exerciseName };
        });
        return { ...d, slots };
      }),
    );
    // Note: setPickerTarget(null) is handled by SlotExercisePicker's onClose
  };

  const handleMuscleChange = (newMuscle: MuscleGroup) => {
    if (!pickerTarget) return;
    const { dayIdx, slotIdx } = pickerTarget;
    setProgramDays((prev) =>
      prev.map((d, di) => {
        if (di !== dayIdx) return d;
        const slots = d.slots.map((slot, si) => {
          if (si !== slotIdx) return slot;
          return { ...slot, muscle: newMuscle, selectedExercise: undefined };
        });
        return { ...d, slots };
      }),
    );
  };

  const handleNext = () => {
    if (step < daysPerWeek + 1) setStep(step + 1);
    else handleCreate();
  };

  // ── Create ──

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const dayLabels = sortedSelected.map((d) => WEEKDAYS_FULL[d]);

      setSavingStatus('Creating program…');
      const program = await createProgram(name.trim(), totalWeeks, daysPerWeek, dayLabels, focus, musclePriorities as Record<string, string>);
      await setCurrentProgram(program.id);

      const allDays = await getProgramDays(program.id);
      const week1Days = allDays
        .filter((d) => d.week_number === 1)
        .sort((a, b) => a.day_number - b.day_number);

      setSavingStatus('Saving exercises…');
      for (let i = 0; i < daysPerWeek; i++) {
        const dbDay = week1Days[i];
        const planDay = programDays[i];
        if (!dbDay || !planDay) continue;
        for (const slot of planDay.slots) {
          if (!slot.selectedExercise) continue; // skip unselected slots
          await addProgramExercise(
            dbDay.id,
            slot.selectedExercise,
            slot.muscle,
            '',   // equipment unknown until exercise picked
            slot.sortOrder,
            slot.sets,
            slot.repsMin,
            slot.repsMax,
            slot.rir,
          );
        }
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
            targetSets: e.target_sets ?? undefined,
            targetRepsMin: e.target_reps_min ?? undefined,
            targetRepsMax: e.target_reps_max ?? undefined,
            targetWeight: e.target_weight ?? undefined,
            rir: e.rir ?? undefined,
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
      setSaving(false);
      setSavingStatus('');
    }
  };

  const isLastStep = step === daysPerWeek + 1;
  const progressPct = step <= 1 ? 0 : (step - 1) / daysPerWeek;
  const canAdvanceSettings = !!name.trim() && selectedDays.length === daysPerWeek;
  const canAdvanceExercises = !!currentDay && currentDay.slots.every((s) => !!s.selectedExercise);
  const headerTitle =
    step === 0 ? 'New Program' :
    step === 1 ? 'Training Focus' :
    currentDay ? `${WEEKDAYS_FULL[sortedSelected[exerciseStepIndex]]} — ${currentDay.splitName}` :
    WEEKDAYS_FULL[sortedSelected[exerciseStepIndex]] ?? `Day ${exerciseStepIndex + 1}`;

  const pickerSlot: ExerciseSlot | null =
    pickerTarget ? (programDays[pickerTarget.dayIdx]?.slots[pickerTarget.slotIdx] ?? null) : null;

  // Names of exercises already selected in other slots of the same day (for variety rules)
  const pickerAlreadySelected: string[] = pickerTarget
    ? (programDays[pickerTarget.dayIdx]?.slots ?? [])
        .filter((_, i) => i !== pickerTarget.slotIdx)
        .map((s) => s.selectedExercise)
        .filter((s): s is string => !!s)
    : [];


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => { if (step === 0) router.back(); else setStep(step - 1); }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>{headerTitle}</Text>
          {step >= 2 && (
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              Day {exerciseStepIndex + 1} of {daysPerWeek} · Tap a slot to pick an exercise
            </Text>
          )}
        </View>
        {step >= 2 && (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{exerciseStepIndex + 1}/{daysPerWeek}</Text>
        )}
      </View>

      {step >= 2 && (
        <View style={{ height: 2, backgroundColor: colors.surface2 }}>
          <View style={{ height: 2, backgroundColor: colors.primary, width: `${progressPct * 100}%` }} />
        </View>
      )}

      {/* ── Step 0: Settings ── */}
      {step === 0 && (
        <><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_TAB_HEIGHT + 100 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Program Name</Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder="e.g. Push Pull Legs" placeholderTextColor={colors.muted}
            style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 28 }}
            autoFocus
          />

          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Total Weeks</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {[2, 3, 4, 5, 6, 7, 8].map((w) => (
              <Pressable key={w} onPress={() => setTotalWeeks(w)}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: totalWeeks === w ? colors.primary : colors.surface, borderWidth: 1, borderColor: totalWeeks === w ? colors.primary : colors.surface2 }}>
                <Text style={{ color: totalWeeks === w ? colors.background : colors.text, fontWeight: '700', fontSize: 15 }}>{w}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Days Per Week</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {[2, 3, 4, 5, 6].map((d) => (
              <Pressable key={d} onPress={() => setDaysPerWeek(d)}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: daysPerWeek === d ? colors.primary : colors.surface, borderWidth: 1, borderColor: daysPerWeek === d ? colors.primary : colors.surface2 }}>
                <Text style={{ color: daysPerWeek === d ? colors.background : colors.text, fontWeight: '700', fontSize: 15 }}>{d}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Training Days</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
            Select {daysPerWeek} day{daysPerWeek !== 1 ? 's' : ''} · {selectedDays.length}/{daysPerWeek} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
            {WEEKDAYS_SHORT.map((label, idx) => {
              const isSelected = selectedDays.includes(idx);
              const atMax = selectedDays.length >= daysPerWeek;
              return (
                <Pressable key={idx} onPress={() => toggleDay(idx)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isSelected ? colors.primary : colors.surface, borderWidth: 1.5, borderColor: isSelected ? colors.primary : colors.surface2, alignItems: 'center', opacity: (!isSelected && atMax) ? 0.4 : 1 }}>
                  <Text style={{ color: isSelected ? colors.background : colors.muted, fontSize: 11, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Experience Level</Text>
          <View style={{ gap: 8, marginBottom: 28 }}>
            {EXPERIENCE_LEVELS.map((opt) => {
              const active = experienceLevel === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => setExperienceLevel(opt.value)}
                  style={{ borderRadius: 12, borderWidth: 1.5, borderColor: active ? colors.primary : '#333', backgroundColor: active ? `${colors.primary}18` : 'transparent', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: active ? colors.primary : '#555', backgroundColor: active ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.background }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? '700' : '500' }}>{opt.label}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 28 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{totalWeeks} weeks</Text>
              {' · '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>{daysPerWeek} days/week</Text>
              {selectedDays.length === daysPerWeek && (
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {' · '}{sortedSelected.map((d) => WEEKDAYS_SHORT[d]).join(', ')}
                </Text>
              )}
            </Text>
          </View>

        </ScrollView>
          <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
            <Pressable onPress={handleNextFromSettings} disabled={!canAdvanceSettings}
              style={{ backgroundColor: canAdvanceSettings ? colors.primary : colors.surface2, borderRadius: 14, padding: 17 }}>
              <Text style={{ color: canAdvanceSettings ? colors.background : colors.muted, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
                Set Training Focus →
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── Step 1: Focus + Priorities ── */}
      {step === 1 && (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: BOTTOM_TAB_HEIGHT + 100 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Program Focus</Text>
            <View style={{ gap: 8, marginBottom: 32 }}>
              {FOCUS_OPTIONS.map((opt) => {
                const active = focus === opt.value;
                return (
                  <Pressable key={opt.value} onPress={() => setFocus(opt.value)}
                    style={{ borderRadius: 12, borderWidth: 1.5, borderColor: active ? colors.primary : '#333', backgroundColor: active ? `${colors.primary}18` : 'transparent', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: active ? colors.primary : '#555', backgroundColor: active ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.background }} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? '700' : '500' }}>{opt.label}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Muscle Priorities</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
              <Text style={{ color: '#2DD4BF', fontWeight: '700' }}>Emphasize</Text> — max growth, high volume{'\n'}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Grow</Text> — steady growth at moderate volume{'\n'}
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Maintain</Text> — preserve size, minimal volume
            </Text>

            {PRIORITY_MUSCLES.map((muscle) => {
              const current = musclePriorities[muscle] ?? 'grow';
              const badgeColor = MuscleGroupColors[muscle] ?? colors.primary;
              return (
                <View key={muscle} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialCommunityIcons name="blur-linear" size={11} color={badgeColor} style={{ marginRight: 5 }} />
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{muscle}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {PRIORITY_OPTIONS.map((p) => {
                      const active = current === p.value;
                      return (
                        <Pressable key={p.value} onPress={() => setPriority(muscle, p.value)}
                          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: active ? p.color : '#333', backgroundColor: active ? `${p.color}22` : 'transparent', alignItems: 'center' }}>
                          <Text style={{ color: active ? p.color : colors.muted, fontSize: 11, fontWeight: active ? '800' : '500' }}>{p.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
            <Pressable onPress={handleNextFromFocus}
              style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>Build Plan →</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── Steps 2..N+1: Review & customize each day ── */}
      {step >= 2 && currentDay && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 100 }}>
            {/* Day summary header */}
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 14, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
                  {currentDay.splitName}
                </Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  {currentDay.slots.length} slots · {currentDay.totalSets} sets · ~{currentDay.estimatedMinutes} min
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                {currentDay.primaryMuscles.map((m) => {
                  const c = MuscleGroupColors[m] ?? colors.primary;
                  return (
                    <View key={m} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: `${c}22` }}>
                      <Text style={{ color: c, fontSize: 10, fontWeight: '800' }}>{m}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {currentDay.slots.map((slot, slotIdx) => {
              const badgeColor = MuscleGroupColors[slot.muscle] ?? colors.primary;
              const roleColor = ROLE_COLORS[slot.role];
              const hasExercise = !!slot.selectedExercise;
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => setPickerTarget({ dayIdx: exerciseStepIndex, slotIdx })}
                  style={{ backgroundColor: colors.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}
                >
                  {/* Muscle + role header */}
                  <View style={{ paddingHorizontal: 12, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 5, backgroundColor: `${badgeColor}28` }}>
                      <Text style={{ color: badgeColor, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' }}>{slot.muscle}</Text>
                    </View>
                    <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, backgroundColor: `${roleColor}22` }}>
                      <Text style={{ color: roleColor, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>{slot.role.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Exercise name or prompt */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={{ flex: 1 }}>
                      {hasExercise ? (
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{slot.selectedExercise}</Text>
                      ) : (
                        <Text style={{ color: colors.muted, fontSize: 14, fontStyle: 'italic' }}>Tap to select exercise</Text>
                      )}
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        {slot.sets} sets · {slot.repsMin}–{slot.repsMax} reps · RIR {slot.rir}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={hasExercise ? 'swap-horizontal' : 'chevron-right'}
                      size={20}
                      color={hasExercise ? colors.primary : colors.muted}
                    />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
            {saving ? (
              <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.muted, fontSize: 14 }}>{savingStatus}</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleNext}
                disabled={!canAdvanceExercises}
                style={{ backgroundColor: canAdvanceExercises ? colors.primary : colors.surface2, borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: canAdvanceExercises ? colors.background : colors.muted, fontWeight: '700', fontSize: 16 }}>
                  {isLastStep
                    ? 'Create & Start →'
                    : `Next: ${WEEKDAYS_FULL[sortedSelected[exerciseStepIndex + 1]] ?? `Day ${exerciseStepIndex + 2}`} →`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── Exercise picker ── */}
      <SlotExercisePicker
        visible={!!pickerTarget}
        slot={pickerSlot}
        experienceLevel={experienceLevel}
        currentSelection={pickerSlot?.selectedExercise}
        alreadySelected={pickerAlreadySelected}
        onSelect={handleSelectExercise}
        onMuscleChange={handleMuscleChange}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
}
