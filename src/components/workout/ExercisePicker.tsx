import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { useProfileStore } from '../../store/useProfileStore';
import { MuscleGroupColors } from '../../utils/constants';
import { useColors } from '../../utils/useColors';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string, muscleGroup: string, equipment: string) => void;
}

const MUSCLE_FILTERS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs',
];

// ─── Custom Exercise Form ─────────────────────────────────────────────────────

interface CustomFormProps {
  prefillName: string;
  onSubmit: (ex: { name: string; muscle: string; equipment: string }) => void;
  onCancel: () => void;
}

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight',
  'Bodyweight Loadable', 'Smith Machine', 'Freemotion',
];

const MUSCLE_OPTIONS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Forearms',
];

function CustomExerciseForm({ prefillName, onSubmit, onCancel }: CustomFormProps) {
  const colors = useColors();
  const [name, setName] = useState(prefillName);
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('Barbell');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 1 && muscle.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createCustomExercise(name.trim(), muscle, equipment);
    } catch {
      // Non-fatal — the exercise is still passed to the workout below
    }
    onSubmit({ name: name.trim(), muscle, equipment });
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
          <Pressable onPress={onCancel} style={{ marginRight: 12, padding: 4 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>
            Custom Exercise
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: 10, padding: 12, flexDirection: 'row', gap: 10 }}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={{ color: colors.muted, fontSize: 13, flex: 1, lineHeight: 19 }}>
              Custom exercises are added to your personal library immediately. They're also submitted for review to be added to the main database.
            </Text>
          </View>

          {/* Name */}
          <View>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
              Exercise Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Incline Hammer Curl"
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.surface, color: colors.text, padding: 14, borderRadius: 10, fontSize: 15 }}
            />
          </View>

          {/* Primary Muscle */}
          <View>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
              Primary Muscle *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MUSCLE_OPTIONS.map((m) => {
                const selected = muscle === m;
                const c = MuscleGroupColors[m] ?? colors.primary;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMuscle(m)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      backgroundColor: selected ? `${c}30` : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? c : colors.surface2,
                    }}
                  >
                    <Text style={{ color: selected ? c : colors.muted, fontSize: 13, fontWeight: '600' }}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Equipment */}
          <View>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>
              Equipment
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EQUIPMENT_OPTIONS.map((e) => {
                const selected = equipment === e;
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEquipment(e)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      backgroundColor: selected ? `${colors.primary}22` : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.surface2,
                    }}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.muted, fontSize: 13, fontWeight: '600' }}>
                      {e}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              backgroundColor: canSubmit ? colors.primary : colors.surface2,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <Text style={{ color: canSubmit ? colors.background : colors.muted, fontWeight: '700', fontSize: 15 }}>
              {submitting ? 'Adding...' : 'Add to Workout'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main Picker ─────────────────────────────────────────────────────────────

export default function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const colors = useColors();
  const { usePreferredEquipment, preferredEquipment } = useProfileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && allExercises.length === 0) {
      loadExercises();
    }
    if (visible) {
      setShowCustomForm(false);
      setSearchQuery('');
      setMuscleFilter('All');
    }
  }, [visible]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const data = await getExercises();
      setAllExercises(data);
    } catch {
      setAllExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch =
      !searchQuery ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscle_group?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle =
      muscleFilter === 'All' || ex.muscle_group === muscleFilter;
    const matchesEquipment =
      !usePreferredEquipment ||
      preferredEquipment.length === 0 ||
      preferredEquipment.some((e) => e.toLowerCase() === (ex.equipment ?? '').toLowerCase()) ||
      ex.equipment === 'Bodyweight';
    return matchesSearch && matchesMuscle && matchesEquipment;
  });

  const noResults = filteredExercises.length === 0 && !loading && searchQuery.length > 1;

  if (showCustomForm) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowCustomForm(false)}>
        <CustomExerciseForm
          prefillName={searchQuery}
          onSubmit={({ name, muscle, equipment }) => {
            onSelect(name, muscle, equipment);
            setShowCustomForm(false);
            setSearchQuery('');
            onClose();
          }}
          onCancel={() => setShowCustomForm(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', flex: 1 }}>
              Add Exercise
            </Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <MaterialCommunityIcons name="close" size={26} color={colors.muted} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, height: 46 }}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={colors.muted}
              style={{ flex: 1, color: colors.text, fontSize: 16 }}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Muscle filter chips */}
        <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {MUSCLE_FILTERS.map((m) => {
              const isSelected = muscleFilter === m;
              const color = m === 'All' ? colors.primary : (MuscleGroupColors[m] ?? colors.primary);
              return (
                <Pressable
                  key={m}
                  onPress={() => setMuscleFilter(m)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: isSelected ? `${color}28` : colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? color : colors.surface2,
                  }}
                >
                  <Text style={{ color: isSelected ? color : colors.muted, fontSize: 13, fontWeight: '600' }}>
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const badgeColor = MuscleGroupColors[item.muscle_group] ?? colors.muted;
            return (
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.surface2,
                  opacity: pressed ? 0.6 : 1,
                })}
                onPress={() => {
                  onSelect(item.name, item.muscle_group ?? '', item.equipment ?? 'Bodyweight');
                  setSearchQuery('');
                  onClose();
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                    {item.equipment}
                  </Text>
                </View>
                <View style={{ backgroundColor: `${badgeColor}28`, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }}>
                  <Text style={{ color: badgeColor, fontSize: 12, fontWeight: '700' }}>
                    {item.muscle_group}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.surface2} style={{ marginLeft: 8 }} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
              <MaterialCommunityIcons name="dumbbell" size={52} color={colors.surface2} />
              {loading ? (
                <Text style={{ color: colors.muted, marginTop: 16, fontSize: 15 }}>Loading exercises...</Text>
              ) : noResults ? (
                <>
                  <Text style={{ color: colors.text, marginTop: 16, fontSize: 17, fontWeight: '600' }}>
                    No results for "{searchQuery}"
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                    Can't find what you're looking for? Add it as a custom exercise.
                  </Text>
                  <Pressable
                    onPress={() => setShowCustomForm(true)}
                    style={{ marginTop: 20, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}
                  >
                    <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>
                      + Create Custom Exercise
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={{ color: colors.muted, marginTop: 16, fontSize: 15 }}>No exercises found.</Text>
              )}
            </View>
          }
          ListFooterComponent={
            filteredExercises.length > 0 ? (
              <Pressable
                onPress={() => setShowCustomForm(true)}
                style={{ marginHorizontal: 16, marginTop: 20, marginBottom: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>
                  Can't find your exercise? Create custom
                </Text>
              </Pressable>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
