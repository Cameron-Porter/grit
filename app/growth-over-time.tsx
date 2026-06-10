import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercises } from '../src/api/exercises';
import { getExerciseProgress } from '../src/api/personalRecords';
import LineChart from '../src/components/LineChart';
import { MuscleGroupColors } from '../src/utils/constants';
import { useColors } from '../src/utils/useColors';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Forearms', 'Traps',
];

type Range = 'all' | 'ytd' | '1y' | '6m' | '3m' | '1m';

const RANGES: { key: Range; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'ytd', label: 'Year to Date' },
  { key: '1y', label: '1 Year' },
  { key: '6m', label: '6 Months' },
  { key: '3m', label: '3 Months' },
  { key: '1m', label: '1 Month' },
];

function getCutoff(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case 'all': return null;
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '1m': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}

type OpenDropdown = 'muscle' | 'exercise' | 'range' | null;

function DropdownButton({ label, value, onPress, colors }: {
  label: string;
  value: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.8 : 1 })}
      >
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>{value}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

export default function GrowthOverTime() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const chartWidth = width - 32;

  const [selectedMuscle, setSelectedMuscle] = useState('Chest');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  const [allData, setAllData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [exercisesByMuscle, setExercisesByMuscle] = useState<Record<string, string[]>>({});
  const [equipmentMap, setEquipmentMap] = useState<Record<string, string>>({});

  // Load all exercises from DB once
  useEffect(() => {
    getExercises().then((all) => {
      const byMuscle: Record<string, string[]> = {};
      const eqMap: Record<string, string> = {};
      all.forEach((ex) => {
        eqMap[ex.name] = ex.equipment;
        if (!byMuscle[ex.muscle_group]) byMuscle[ex.muscle_group] = [];
        byMuscle[ex.muscle_group].push(ex.name);
      });
      setEquipmentMap(eqMap);
      setExercisesByMuscle(byMuscle);
      // Set initial exercise for default muscle
      const chestExercises = byMuscle['Chest'] ?? [];
      if (chestExercises.length > 0) setSelectedExercise(chestExercises[0]);
    }).catch(() => {});
  }, []);

  // Reload chart when exercise changes
  useEffect(() => {
    if (!selectedExercise) return;
    let cancelled = false;
    setChartLoading(true);
    getExerciseProgress(selectedExercise)
      .then((data) => { if (!cancelled) setAllData(data); })
      .catch(() => { if (!cancelled) setAllData([]); })
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [selectedExercise]);

  const muscleExercises = exercisesByMuscle[selectedMuscle] ?? [];
  const isBodyweightExercise = equipmentMap[selectedExercise] === 'Bodyweight';
  const muscleColor = MuscleGroupColors[selectedMuscle] ?? colors.primary;

  const chartData = useMemo(() => {
    const cutoff = getCutoff(range);
    if (!cutoff) return allData;
    return allData.filter((d) => new Date(d.date) >= cutoff);
  }, [allData, range]);

  const handleSelectMuscle = (muscle: string) => {
    setSelectedMuscle(muscle);
    const exs = exercisesByMuscle[muscle] ?? [];
    if (exs.length > 0) setSelectedExercise(exs[0]);
  };

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? 'All Time';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>← Profile</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Growth Over Time</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ── Selectors ── */}
        <DropdownButton
          label="Muscle Group"
          value={selectedMuscle}
          onPress={() => setOpenDropdown('muscle')}
          colors={colors}
        />
        <DropdownButton
          label="Exercise"
          value={selectedExercise || 'Loading…'}
          onPress={() => setOpenDropdown('exercise')}
          colors={colors}
        />
        <DropdownButton
          label="Time Frame"
          value={rangeLabel}
          onPress={() => setOpenDropdown('range')}
          colors={colors}
        />

        {/* ── Chart card ── */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: muscleColor }} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{selectedExercise}</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14 }}>
            {isBodyweightExercise ? 'Max reps per session' : 'Max weight per session (lbs)'}
          </Text>

          {chartLoading ? (
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chart-line" size={32} color={colors.surface2} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>Loading...</Text>
            </View>
          ) : chartData.length === 0 ? (
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chart-line" size={32} color={colors.surface2} />
              <Text style={{ color: colors.muted, marginTop: 8 }}>No data for this period</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                {allData.length > 0 ? 'Try a wider time frame' : 'Log this exercise to see your progress'}
              </Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={chartWidth - 32}
              height={200}
              metric={isBodyweightExercise ? 'reps' : 'weight'}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Dropdown modals ── */}
      <Modal visible={openDropdown === 'muscle'} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setOpenDropdown(null)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 40 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 20 }}>Muscle Group</Text>
            <ScrollView>
              {MUSCLE_GROUPS.map((muscle, i, arr) => {
                const active = muscle === selectedMuscle;
                const color = MuscleGroupColors[muscle] ?? colors.primary;
                return (
                  <Pressable
                    key={muscle}
                    onPress={() => { handleSelectMuscle(muscle); setOpenDropdown(null); }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.surface2, opacity: pressed ? 0.7 : 1 })}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 14 }} />
                    <Text style={{ color: active ? color : colors.text, fontSize: 15, fontWeight: active ? '700' : '400', flex: 1 }}>{muscle}</Text>
                    {active && <MaterialCommunityIcons name="check" size={18} color={color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={openDropdown === 'exercise'} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setOpenDropdown(null)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '70%' }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 20 }}>
              {selectedMuscle} Exercises
            </Text>
            <ScrollView>
              {muscleExercises.map((ex, i, arr) => {
                const active = ex === selectedExercise;
                return (
                  <Pressable
                    key={ex}
                    onPress={() => { setSelectedExercise(ex); setOpenDropdown(null); }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.surface2, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? '700' : '400' }}>{ex}</Text>
                    {active && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={openDropdown === 'range'} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setOpenDropdown(null)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 40 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 20 }}>Time Frame</Text>
            {RANGES.map((r, i, arr) => {
              const active = r.key === range;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => { setRange(r.key); setOpenDropdown(null); }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.surface2, opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? '700' : '400' }}>{r.label}</Text>
                  {active && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
