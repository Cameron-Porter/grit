import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getRecommendedExercises } from '../../rules/exerciseRecommender';
import { useProfileStore } from '../../store/useProfileStore';
import type { ExerciseSlot, ExperienceLevel, MuscleGroup, SlotRole, SfrTier } from '../../types/program';
import { Colors, MuscleGroupColors } from '../../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseOption {
  name: string;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPreferred: boolean;
  isVarietyConflict: boolean;
  sfrTier: SfrTier;
  score: number;
}

interface SlotExercisePickerProps {
  visible: boolean;
  slot: ExerciseSlot | null;
  experienceLevel?: ExperienceLevel;
  currentSelection?: string;
  alreadySelected?: string[];
  onSelect: (name: string) => void;
  onMuscleChange?: (muscle: MuscleGroup) => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<SlotRole, string> = {
  Primary:   Colors.primary,
  Secondary: '#A78BFA',
  Accessory: '#9CA3AF',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

const ALL_MUSCLES: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlotExercisePicker({
  visible,
  slot,
  experienceLevel = 'intermediate',
  currentSelection,
  alreadySelected = [],
  onSelect,
  onMuscleChange,
  onClose,
}: SlotExercisePickerProps) {
  const { preferredEquipment, usePreferredEquipment } = useProfileStore();
  const [search, setSearch] = useState('');
  const [equipFilter, setEquipFilter] = useState<string | null>(null);
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup>(slot?.muscle ?? 'Chest');
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);

  // Reset local state when the target slot changes
  useEffect(() => {
    if (slot) {
      setSearch('');
      setEquipFilter(null);
      setActiveMuscle(slot.muscle);
      setMusclePickerOpen(false);
    }
  }, [slot?.id]);

  // Build ranked exercise options via the recommendation engine
  const allOptions: ExerciseOption[] = useMemo(() => {
    if (!slot) return [];
    const ranked = getRecommendedExercises({
      muscle: activeMuscle,
      role: slot.role,
      experienceLevel,
      preferredEquipment,
      alreadySelectedInSession: alreadySelected,
    });
    return ranked.map(({ exercise, isPreferred, isVarietyConflict, score }) => ({
      name: exercise.name,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      sfrTier: exercise.sfrTier,
      isPreferred,
      isVarietyConflict,
      score,
    }));
  }, [activeMuscle, slot, experienceLevel, preferredEquipment, alreadySelected]);

  // Unique equipment types sorted: preferred first
  const equipmentTypes: string[] = useMemo(() => {
    const types = [...new Set(allOptions.map((e) => e.equipment))];
    return types.sort((a, b) => {
      const aP = preferredEquipment.some((p) => p.toLowerCase() === a.toLowerCase());
      const bP = preferredEquipment.some((p) => p.toLowerCase() === b.toLowerCase());
      if (aP !== bP) return aP ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [allOptions, preferredEquipment]);

  const filtered: ExerciseOption[] = useMemo(() => {
    let result = allOptions;

    // Equipment chip filter (explicit tap — overrides preferred-only setting)
    if (equipFilter && equipFilter !== '__all__') {
      result = result.filter((e) => e.equipment === equipFilter);
    } else if (!equipFilter && usePreferredEquipment && preferredEquipment.length > 0) {
      result = result.filter((e) => e.isPreferred);
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    // Sort by recommender score; name as tiebreaker
    return [...result].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [allOptions, equipFilter, usePreferredEquipment, preferredEquipment, search]);

  const hasNonPreferred = allOptions.some((e) => !e.isPreferred);
  const preferredOnlyActive = !equipFilter && usePreferredEquipment && preferredEquipment.length > 0;

  if (!slot) return null;

  const muscleColor = MuscleGroupColors[activeMuscle] ?? Colors.primary;
  const roleColor = ROLE_COLORS[slot.role];

  const handleMuscleSelect = (muscle: MuscleGroup) => {
    setActiveMuscle(muscle);
    setMusclePickerOpen(false);
    setSearch('');
    setEquipFilter(null);
    onMuscleChange?.(muscle);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dim overlay — tap to close */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        onPress={() => {
          if (musclePickerOpen) {
            setMusclePickerOpen(false);
          } else {
            onClose();
          }
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%',
          }}
        >
          {/* ── Header ── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.surface2,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              {/* Tappable muscle badge — opens muscle picker */}
              <Pressable
                onPress={() => setMusclePickerOpen((prev) => !prev)}
                style={({ pressed }) => ({
                  paddingVertical: 3,
                  paddingHorizontal: 9,
                  borderRadius: 6,
                  backgroundColor: `${muscleColor}28`,
                  borderWidth: musclePickerOpen ? 1 : 0,
                  borderColor: musclePickerOpen ? muscleColor : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: muscleColor,
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  {activeMuscle}
                </Text>
                {onMuscleChange && (
                  <MaterialCommunityIcons
                    name={musclePickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={muscleColor}
                  />
                )}
              </Pressable>

              {/* Role badge */}
              <View
                style={{
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: `${roleColor}22`,
                }}
              >
                <Text
                  style={{
                    color: roleColor,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1,
                  }}
                >
                  {slot.role.toUpperCase()}
                </Text>
              </View>

              {/* Close */}
              <Pressable
                onPress={onClose}
                style={{ marginLeft: 'auto', padding: 4 }}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={20} color={Colors.muted} />
              </Pressable>
            </View>

            {/* Muscle picker expansion */}
            {musclePickerOpen && onMuscleChange && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, flexDirection: 'row', paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {ALL_MUSCLES.map((m) => {
                  const mc = MuscleGroupColors[m] ?? Colors.primary;
                  const isActive = m === activeMuscle;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => handleMuscleSelect(m)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 14,
                        backgroundColor: isActive ? mc : `${mc}20`,
                        borderWidth: 1,
                        borderColor: isActive ? mc : `${mc}60`,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive ? Colors.background : mc,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>
              Select Exercise
            </Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
              {slot.sets} sets · {slot.repsMin}–{slot.repsMax} reps · RIR {slot.rir}
            </Text>
          </View>

          {/* ── Search ── */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.background,
                borderRadius: 10,
                paddingHorizontal: 12,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={18} color={Colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search exercises..."
                placeholderTextColor={Colors.muted}
                style={{
                  flex: 1,
                  color: Colors.text,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  fontSize: 15,
                }}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={16}
                    color={Colors.muted}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* ── Equipment chips ── */}
          {equipmentTypes.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 10,
                gap: 6,
                flexDirection: 'row',
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* "All" chip */}
              <Pressable
                onPress={() => setEquipFilter(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor:
                    equipFilter === null && !preferredOnlyActive
                      ? Colors.primary
                      : Colors.background,
                  borderWidth: 1,
                  borderColor:
                    equipFilter === null && !preferredOnlyActive
                      ? Colors.primary
                      : Colors.surface2,
                }}
              >
                <Text
                  style={{
                    color:
                      equipFilter === null && !preferredOnlyActive
                        ? Colors.background
                        : Colors.muted,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  All
                </Text>
              </Pressable>

              {equipmentTypes.map((equip) => {
                const isActive = equipFilter === equip;
                const isPref = preferredEquipment.some(
                  (p) => p.toLowerCase() === equip.toLowerCase(),
                );
                return (
                  <Pressable
                    key={equip}
                    onPress={() => setEquipFilter(isActive ? null : equip)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: isActive ? Colors.primary : Colors.background,
                      borderWidth: 1,
                      borderColor: isActive
                        ? Colors.primary
                        : isPref
                          ? `${Colors.primary}80`
                          : Colors.surface2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isPref && !isActive && (
                      <MaterialCommunityIcons
                        name="star"
                        size={10}
                        color={Colors.primary}
                      />
                    )}
                    <Text
                      style={{
                        color: isActive
                          ? Colors.background
                          : isPref
                            ? Colors.primary
                            : Colors.muted,
                        fontSize: 12,
                        fontWeight: isPref || isActive ? '700' : '500',
                      }}
                    >
                      {equip}
                    </Text>
                  </Pressable>
                );
              })}

              {/* "More" chip — only visible when preferred filter is hiding options */}
              {preferredOnlyActive && hasNonPreferred && !equipFilter && (
                <Pressable
                  onPress={() => setEquipFilter('__all__')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: Colors.background,
                    borderWidth: 1,
                    borderColor: Colors.surface2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={12} color={Colors.muted} />
                  <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '500' }}>
                    More
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          )}

          {/* ── Exercise list ── */}
          <FlatList
            data={
              equipFilter === '__all__'
                ? allOptions.filter((e) => {
                    const q = search.trim().toLowerCase();
                    return !q || e.name.toLowerCase().includes(q);
                  })
                : filtered
            }
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0, maxHeight: 380 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            renderItem={({ item }) => {
              const isSelected = item.name === currentSelection;
              const equipColor = item.isPreferred ? Colors.primary : Colors.muted;
              const dimmed = !item.isPreferred && equipFilter !== '__all__' && !equipFilter;

              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.name);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.surface2,
                    opacity: pressed ? 0.5 : dimmed ? 0.5 : 1,
                  })}
                >
                  {/* Selection circle */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected ? Colors.primary : Colors.surface2,
                      backgroundColor: isSelected ? Colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={13}
                        color={Colors.background}
                      />
                    )}
                  </View>

                  {/* Name + difficulty hint */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text
                        style={{
                          color: Colors.text,
                          fontSize: 15,
                          fontWeight: isSelected ? '700' : '500',
                        }}
                      >
                        {item.name}
                      </Text>
                      {item.sfrTier === 'tier1' && (
                        <MaterialCommunityIcons
                          name="star-four-points"
                          size={10}
                          color={Colors.primary}
                        />
                      )}
                    </View>
                    {DIFFICULTY_LABEL[item.difficulty] && (
                      <Text
                        style={{ color: Colors.muted, fontSize: 11, marginTop: 1 }}
                      >
                        {DIFFICULTY_LABEL[item.difficulty]}
                      </Text>
                    )}
                  </View>

                  {/* Equipment badge */}
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 5,
                      backgroundColor: `${equipColor}20`,
                    }}
                  >
                    <Text
                      style={{ color: equipColor, fontSize: 11, fontWeight: '700' }}
                    >
                      {item.equipment}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={36}
                  color={Colors.surface2}
                />
                <Text
                  style={{ color: Colors.muted, fontSize: 14, marginTop: 12 }}
                >
                  No exercises match
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
