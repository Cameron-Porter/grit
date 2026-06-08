import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getExercises } from '../../api/exercises';
import { useProfileStore } from '../../store/useProfileStore';
import { Colors, MuscleGroupColors } from '../../utils/constants';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string, muscleGroup: string, equipment: string) => void;
}

export default function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const { usePreferredEquipment, preferredEquipment } = useProfileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && allExercises.length === 0) {
      loadExercises();
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
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscle_group?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment =
      !usePreferredEquipment ||
      preferredEquipment.length === 0 ||
      preferredEquipment.some((e) => e.toLowerCase() === (ex.equipment ?? '').toLowerCase());
    return matchesSearch && matchesEquipment;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>
            Select Exercise
          </Text>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12 }}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises or muscle groups..."
              placeholderTextColor={Colors.muted}
              style={{ flex: 1, color: Colors.text, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 }}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const badgeColor = MuscleGroupColors[item.muscle_group] ?? Colors.muted;
            return (
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.surface2,
                  opacity: pressed ? 0.6 : 1,
                })}
                onPress={() => {
                  onSelect(item.name, item.muscle_group ?? '', item.equipment ?? 'Bodyweight');
                  setSearchQuery('');
                  onClose();
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>
                    {item.equipment}
                  </Text>
                </View>
                <View style={{ backgroundColor: `${badgeColor}28`, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 5 }}>
                  <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '700' }}>
                    {item.muscle_group}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons name="dumbbell" size={48} color={Colors.surface2} />
              <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 15 }}>
                {loading ? 'Loading exercises...' : 'No exercises found.'}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
