import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import { createCustomExercise, getExercises } from '../../api/exercises';
import type { ExerciseRow } from '../../api/exercises';
import { useProfileStore } from '../../store/useProfileStore';
import type { ExerciseSlot, ExperienceLevel, MuscleGroup, SlotRole } from '../../types/program';
import { MuscleGroupColors } from '../../utils/constants';
import { useColors } from '../../utils/useColors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotExercisePickerProps {
  visible: boolean;
  slot: ExerciseSlot | null;
  experienceLevel?: ExperienceLevel;
  currentSelection?: string;
  alreadySelected?: string[];
  onSelect: (name: string) => void;
  onMuscleChange?: (muscle: MuscleGroup) => void;
  onClose: () => void;
  // HV-007: When set, only exercises with this movement_pattern are shown (with fallback).
  requiredMovementPattern?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_MUSCLES: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps',
];

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight',
  'Bodyweight Loadable', 'Smith Machine', 'Freemotion',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlotExercisePicker({
  visible,
  slot,
  currentSelection,
  onSelect,
  onMuscleChange,
  onClose,
  requiredMovementPattern,
}: SlotExercisePickerProps) {
  const colors = useColors();
  const ROLE_COLORS: Record<SlotRole, string> = {
    Primary:   colors.primary,
    Secondary: '#A78BFA',
    Accessory: '#9CA3AF',
  };
  const { preferredEquipment, usePreferredEquipment } = useProfileStore();

  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState<MuscleGroup>(slot?.muscle ?? 'Chest');
  const [musclePickerOpen, setMusclePickerOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEquipment, setCreateEquipment] = useState(preferredEquipment[0] ?? 'Dumbbell');
  const [creating, setCreating] = useState(false);

  // Load from Supabase once per open
  useEffect(() => {
    if (visible && allExercises.length === 0) {
      setLoading(true);
      getExercises()
        .then(setAllExercises)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  // Reset state when slot changes
  useEffect(() => {
    if (slot) {
      setSearch('');
      setActiveMuscle(slot.muscle);
      setMusclePickerOpen(false);
      setShowCreate(false);
    }
  }, [slot?.id]);

  const isPreferred = (equipment: string) =>
    equipment === 'Bodyweight' ||
    preferredEquipment.some((p) => p.toLowerCase() === equipment.toLowerCase());

  // Single prefiltered list — preferred equipment if set, else everything
  const filtered: ExerciseRow[] = (() => {
    let result = allExercises.filter((ex) => ex.muscle_group === activeMuscle);

    if (usePreferredEquipment && preferredEquipment.length > 0) {
      const pref = result.filter((ex) => isPreferred(ex.equipment ?? ''));
      if (pref.length > 0) result = pref;
    }

    // HV-007: Filter to required movement pattern (with fallback to full pool).
    // Normalizes both sides to lowercase-hyphen to bridge TS ('hip-extension')
    // and DB ('Hip Extension') naming conventions.
    if (requiredMovementPattern) {
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '-');
      const reqNorm = normalize(requiredMovementPattern);
      const strict = result.filter(
        (ex) => ex.movement_category && normalize(ex.movement_category) === reqNorm,
      );
      if (strict.length > 0) result = strict;
    }

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((ex) => ex.name.toLowerCase().includes(q));

    return result;
  })();

  const handleMuscleSelect = (muscle: MuscleGroup) => {
    setActiveMuscle(muscle);
    setMusclePickerOpen(false);
    setSearch('');
    onMuscleChange?.(muscle);
  };

  const handleCreate = async () => {
    if (!createName.trim() || creating) return;
    setCreating(true);
    try {
      await createCustomExercise(createName.trim(), activeMuscle, createEquipment);
      const updated = await getExercises();
      setAllExercises(updated);
    } catch {}
    onSelect(createName.trim());
    setCreating(false);
    setShowCreate(false);
    onClose();
  };

  if (!slot) return null;

  const muscleColor = MuscleGroupColors[activeMuscle] ?? colors.primary;
  const roleColor = ROLE_COLORS[slot.role];

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
          if (musclePickerOpen) setMusclePickerOpen(false);
          else if (showCreate) setShowCreate(false);
          else onClose();
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>

          {/* ── Header ── */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>

              {/* Tappable muscle badge */}
              <Pressable
                onPress={() => setMusclePickerOpen((prev) => !prev)}
                style={({ pressed }) => ({
                  paddingVertical: 3, paddingHorizontal: 9, borderRadius: 6,
                  backgroundColor: `${muscleColor}50`,
                  borderWidth: 1,
                  borderColor: `${muscleColor}50`,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {activeMuscle}
                </Text>
                {onMuscleChange && (
                  <MaterialCommunityIcons
                    name={musclePickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>

              {/* Role badge */}
              <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: `${roleColor}22` }}>
                <Text style={{ color: roleColor, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
                  {slot.role.toUpperCase()}
                </Text>
              </View>

              <Pressable onPress={onClose} style={{ marginLeft: 'auto', padding: 4 }} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
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
                  const mc = MuscleGroupColors[m] ?? colors.primary;
                  const isActive = m === activeMuscle;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => handleMuscleSelect(m)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                        backgroundColor: isActive ? mc : `${mc}20`,
                        borderWidth: 1, borderColor: isActive ? mc : `${mc}60`,
                      }}
                    >
                      <Text style={{ color: isActive ? colors.background : mc, fontSize: 12, fontWeight: '700' }}>
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {showCreate ? (
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Create Exercise</Text>
            ) : (
              <>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Select Exercise</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                  {slot.sets} sets · {slot.repsMin}–{slot.repsMax} reps · RIR {slot.rir}
                </Text>
              </>
            )}
          </View>

          {/* ── Create form ── */}
          {showCreate ? (
            <View style={{ padding: 16, gap: 16 }}>
              <TextInput
                value={createName}
                onChangeText={setCreateName}
                placeholder="Exercise name..."
                placeholderTextColor={colors.muted}
                autoFocus
                style={{ backgroundColor: colors.background, color: colors.text, padding: 14, borderRadius: 10, fontSize: 15 }}
              />

              <View>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Equipment
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                  {EQUIPMENT_OPTIONS.map((e) => {
                    const active = createEquipment === e;
                    return (
                      <Pressable
                        key={e}
                        onPress={() => setCreateEquipment(e)}
                        style={{
                          paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16,
                          backgroundColor: active ? `${colors.primary}22` : colors.background,
                          borderWidth: 1, borderColor: active ? colors.primary : colors.surface2,
                        }}
                      >
                        <Text style={{ color: active ? colors.primary : colors.muted, fontSize: 12, fontWeight: '600' }}>
                          {e}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowCreate(false)}
                  style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.surface2, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
                  disabled={!createName.trim() || creating}
                  style={{ flex: 2, padding: 14, borderRadius: 10, backgroundColor: createName.trim() ? colors.primary : colors.surface2, alignItems: 'center' }}
                >
                  <Text style={{ color: createName.trim() ? colors.background : colors.muted, fontWeight: '700' }}>
                    {creating ? 'Adding...' : 'Add Exercise'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {/* ── Search ── */}
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12 }}>
                  <MaterialCommunityIcons name="magnify" size={18} color={colors.muted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search exercises..."
                    placeholderTextColor={colors.muted}
                    style={{ flex: 1, color: colors.text, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 }}
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={8}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* ── Exercise list ── */}
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, maxHeight: 380 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                renderItem={({ item }) => {
                  const isSelected = item.name === currentSelection;
                  const preferred = isPreferred(item.equipment ?? '');
                  const equipColor = preferred ? colors.primary : colors.muted;
                  return (
                    <Pressable
                      onPress={() => { onSelect(item.name); onClose(); }}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.surface2,
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                        borderColor: isSelected ? colors.primary : colors.surface2,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginRight: 12,
                      }}>
                        {isSelected && <MaterialCommunityIcons name="check" size={13} color={colors.background} />}
                      </View>

                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: isSelected ? '700' : '500', flex: 1 }}>
                        {item.name}
                      </Text>

                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: `${equipColor}20` }}>
                        <Text style={{ color: equipColor, fontSize: 11, fontWeight: '700' }}>
                          {item.equipment}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <MaterialCommunityIcons name="dumbbell" size={36} color={colors.surface2} />
                    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>
                      {loading ? 'Loading...' : 'No exercises match'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  filtered.length > 0 ? (
                    <Pressable
                      onPress={() => { setCreateName(search); setShowCreate(true); }}
                      style={{ marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.muted} />
                      <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
                        Create Custom Exercise
                      </Text>
                    </Pressable>
                  ) : null
                }
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
