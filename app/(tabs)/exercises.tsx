import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getExercises } from '../../src/api/exercises';
import { Colors, MuscleGroupColors } from '../../src/utils/constants';

const MUSCLE_ORDER = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Forearms', 'Traps',
];

export default function Exercises() {
  const router = useRouter();
  const [allExercises, setAllExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExercises()
      .then(setAllExercises)
      .catch(() => setAllExercises([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allExercises.filter((ex) => {
    const matchSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.muscle_group ?? '').toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !selectedMuscle || ex.muscle_group === selectedMuscle;
    return matchSearch && matchMuscle;
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Exercises</Text>
        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises..."
            placeholderTextColor={Colors.muted}
            style={{ flex: 1, color: Colors.text, paddingVertical: 11, paddingHorizontal: 8, fontSize: 15 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Muscle group filter chips */}
      <FlatList
        horizontal
        data={[null, ...MUSCLE_ORDER]}
        keyExtractor={(item) => item ?? 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        style={{ maxHeight: 56, flexGrow: 0 }}
        renderItem={({ item }) => {
          const active = selectedMuscle === item;
          const color = item ? (MuscleGroupColors[item] ?? Colors.primary) : Colors.primary;
          return (
            <Pressable
              onPress={() => setSelectedMuscle(active ? null : item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: active ? `${color}22` : Colors.surface,
                borderWidth: 1.5,
                borderColor: active ? color : Colors.surface2,
              }}
            >
              <Text style={{ color: active ? color : Colors.muted, fontSize: 13, fontWeight: '700' }}>
                {item ?? 'All'}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 16 }}>
              {loading ? 'Loading...' : 'No exercises found'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badgeColor = item.muscle_group
            ? (MuscleGroupColors[item.muscle_group] ?? Colors.muted)
            : Colors.muted;
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/exercise/[id]', params: { id: item.id } })
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: Colors.surface2,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>{item.equipment}</Text>
              </View>
              <View style={{ backgroundColor: `${badgeColor}28`, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 5, marginRight: 10 }}>
                <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '700' }}>{item.muscle_group}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.surface2} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}
