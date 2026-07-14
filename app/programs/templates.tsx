import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addProgramExercise,
  createProgram,
  getProgramDays,
  getNextProgramWorkout,
  setCurrentProgram,
} from '../../src/api/programs';
import { PROGRAM_TEMPLATES, ProgramTemplate, getEquipmentForTemplateExercise } from '../../src/data/programTemplates';
import ExercisePicker from '../../src/components/workout/ExercisePicker';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { BOTTOM_TAB_HEIGHT, MuscleGroupColors } from '../../src/utils/constants';
import { useColors } from '../../src/utils/useColors';
import { getExerciseByName } from '../../src/data/exerciseDatabase';

const WEEK_OPTIONS = [4, 6, 8, 10, 12];

interface EditableExercise {
  uid: string;
  name: string;
  muscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
}

interface EditableDay {
  label: string;
  exercises: EditableExercise[];
}

type Screen = 'list' | 'customize';

export default function ProgramTemplates() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const startFromProgramDay = useWorkoutStore((s) => s.startFromProgramDay);
  const endWorkout = useWorkoutStore((s) => s.endWorkout);

  const [screen, setScreen] = useState<Screen>('list');
  const [selected, setSelected] = useState<ProgramTemplate | null>(null);
  const [editableDays, setEditableDays] = useState<EditableDay[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(8);
  const [swapTarget, setSwapTarget] = useState<{ dayIdx: number; exIdx: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');

  const handleSelectTemplate = (template: ProgramTemplate) => {
    setSelected(template);
    setWeeks(template.recommendedWeeks);
    setEditableDays(
      template.days.map((day, di) => ({
        label: day.label,
        exercises: day.exercises.map((ex, ei) => ({
          uid: `${di}-${ei}`,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          rir: ex.rir,
        })),
      })),
    );
    setScreen('customize');
  };

  const handleSwapExercise = (name: string, muscleGroup: string) => {
    if (!swapTarget) return;
    setEditableDays((prev) =>
      prev.map((day, di) => {
        if (di !== swapTarget.dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, ei) => {
            if (ei !== swapTarget.exIdx) return ex;
            return { ...ex, name, muscleGroup };
          }),
        };
      }),
    );
    setSwapTarget(null);
  };

  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    setEditableDays((prev) =>
      prev.map((day, di) => {
        if (di !== dayIdx) return day;
        return { ...day, exercises: day.exercises.filter((_, ei) => ei !== exIdx) };
      }),
    );
  };

  const handleCreate = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const dayLabels = editableDays.map((d) => d.label);

      setSavingStatus('Creating program…');
      const program = await createProgram(
        selected.name,
        weeks,
        selected.daysPerWeek,
        dayLabels,
        selected.focus,
        {},
      );
      await setCurrentProgram(program.id);

      const allDays = await getProgramDays(program.id);
      const week1Days = allDays
        .filter((d) => d.week_number === 1)
        .sort((a, b) => a.day_number - b.day_number);

      setSavingStatus('Adding exercises…');
      for (let i = 0; i < editableDays.length; i++) {
        const dbDay = week1Days[i];
        const editDay = editableDays[i];
        if (!dbDay || !editDay) continue;
        for (let j = 0; j < editDay.exercises.length; j++) {
          const ex = editDay.exercises[j];
          await addProgramExercise(
            dbDay.id,
            ex.name,
            ex.muscleGroup,
            getEquipmentForTemplateExercise(ex.name),
            j,
            ex.sets,
            ex.repsMin,
            ex.repsMax,
            ex.rir,
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
            musclePriority: undefined,
            equipment: getExerciseByName(e.exercise_name)?.equipment ?? 'Barbell',
            targetSets: e.target_sets ?? undefined,
            targetRepsMin: e.target_reps_min ?? undefined,
            targetRepsMax: e.target_reps_max ?? undefined,
            targetWeight: e.target_weight ?? undefined,
            rir: e.rir ?? undefined,
          })),
          next.day.week_number,
          next.day.day_number,
          next.day.label,
          next.program.id,
          undefined,
        );
        router.replace('/workout');
      } else {
        router.replace({ pathname: '/programs/[id]', params: { id: program.id } });
      }
    } catch {
      setSaving(false);
      setSavingStatus('');
    }
  };

  const handleBack = () => {
    if (screen === 'customize') {
      setScreen('list');
      setSelected(null);
    } else {
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface2,
      }}>
        <Pressable onPress={handleBack} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
            {screen === 'list' ? 'Program Templates' : selected?.name ?? ''}
          </Text>
          {screen === 'customize' && (
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 1 }}>
              {selected?.tagline} · Swap or remove exercises before starting
            </Text>
          )}
        </View>
      </View>

      {/* ── Browse list ── */}
      {screen === 'list' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 24 }}>
          <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
            Start with a proven program. Your copy is saved privately — customize exercises then run with it.
          </Text>

          {PROGRAM_TEMPLATES.map((template) => {
            const isExpanded = expandedId === template.id;
            return (
              <View key={template.id} style={{ backgroundColor: colors.surface, borderRadius: 20, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder }}>
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : template.id)}
                  style={{ padding: 16 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{template.name}</Text>
                        <View style={{ backgroundColor: `${colors.primary}22`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>{template.tagline}</Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>{template.bestFor}</Text>
                      {!isExpanded && (
                        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{template.description}</Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={colors.muted}
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                </Pressable>

                {isExpanded && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.surface2 }} />
                    {template.days.map((day, di) => (
                      <View key={di} style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: di > 0 ? 1 : 0, borderTopColor: colors.surface2 }}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>{day.label}</Text>
                        {day.exercises.map((ex, ei) => {
                          const badgeColor = MuscleGroupColors[ex.muscleGroup] ?? colors.muted;
                          return (
                            <View key={ei} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: badgeColor, marginRight: 8 }} />
                              <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{ex.name}</Text>
                              <Text style={{ color: colors.muted, fontSize: 12 }}>{ex.sets}×{ex.repsMin}–{ex.repsMax}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    <View style={{ height: 1, backgroundColor: colors.surface2 }} />
                    <Pressable
                      onPress={() => handleSelectTemplate(template)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>Customize & Start</Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Customize step ── */}
      {screen === 'customize' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 100 }}>

            {/* Weeks picker */}
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Program Length
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {WEEK_OPTIONS.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setWeeks(w)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: weeks === w ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: weeks === w ? colors.primary : colors.surface2,
                  }}
                >
                  <Text style={{ color: weeks === w ? colors.background : colors.text, fontWeight: '700', fontSize: 15 }}>
                    {w} wks
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Editable days */}
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Exercises — Tap to Swap · Long Press to Remove
            </Text>

            {editableDays.map((day, di) => (
              <View key={di} style={{ backgroundColor: colors.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder }}>
                <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{day.label}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: colors.surface2 }} />

                {day.exercises.map((ex, ei) => {
                  const badgeColor = MuscleGroupColors[ex.muscleGroup] ?? colors.muted;
                  return (
                    <View
                      key={ex.uid}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderTopWidth: ei > 0 ? 1 : 0,
                        borderTopColor: colors.surface2,
                      }}
                    >
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: badgeColor, marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{ex.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
                          {ex.sets} sets · {ex.repsMin}–{ex.repsMax} reps
                        </Text>
                      </View>
                      {/* Swap */}
                      <Pressable
                        onPress={() => setSwapTarget({ dayIdx: di, exIdx: ei })}
                        style={{ padding: 8, marginLeft: 4 }}
                        hitSlop={6}
                      >
                        <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.primary} />
                      </Pressable>
                      {/* Remove */}
                      <Pressable
                        onPress={() => handleRemoveExercise(di, ei)}
                        style={{ padding: 8 }}
                        hitSlop={6}
                      >
                        <MaterialCommunityIcons name="minus-circle-outline" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  );
                })}

                {day.exercises.length === 0 && (
                  <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 13, fontStyle: 'italic' }}>No exercises — all were removed</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Pinned Create button */}
          <View style={{ position: 'absolute', bottom: BOTTOM_TAB_HEIGHT + insets.bottom, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
            {saving ? (
              <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.muted, fontSize: 14 }}>{savingStatus}</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleCreate}
                style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>
                  Create & Start ({weeks} weeks) →
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Exercise picker for swapping */}
      <ExercisePicker
        visible={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        onSelect={(name, muscleGroup) => handleSwapExercise(name, muscleGroup)}
      />
    </View>
  );
}
