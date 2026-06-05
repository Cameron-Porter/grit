import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { getExercises } from '../src/api/exercises';
import {
  createManualPR,
  getAllPRs,
  getExerciseProgress,
  PersonalRecord,
} from '../src/api/personalRecords';
import LineChart from '../src/components/LineChart';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import { useProfileStore } from '../src/store/useProfileStore';
import { Colors, MuscleGroupColors } from '../src/utils/constants';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Forearms', 'Traps',
];

const MUSCLE_EXERCISES: Record<string, string[]> = {
  Chest: ['Barbell Bench Press', 'Incline Barbell Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Cable Crossover', 'Pec Deck Fly'],
  Back: ['Barbell Row (Bent Over)', 'Pull-Up (Wide Grip)', 'Seated Cable Row', 'Wide-Grip Lat Pulldown', 'Deadlift', 'Dumbbell Row (Single-Arm)'],
  Shoulders: ['Barbell Overhead Press', 'Seated Dumbbell Press', 'Dumbbell Lateral Raise', 'Arnold Press', 'Face Pull'],
  Biceps: ['Barbell Curl', 'EZ-Bar Curl', 'Hammer Curl', 'Preacher Curl (Barbell)', 'Incline Dumbbell Curl'],
  Triceps: ['Close-Grip Bench Press', 'Skull Crusher (Barbell)', 'Tricep Pushdown (Rope)', 'Overhead Tricep Extension (Dumbbell)'],
  Quads: ['Barbell Back Squat', 'Leg Press', 'Hack Squat', 'Leg Extension', 'Bulgarian Split Squat'],
  Hamstrings: ['Romanian Deadlift (Barbell)', 'Lying Leg Curl', 'Seated Leg Curl', 'Nordic Hamstring Curl'],
  Glutes: ['Barbell Hip Thrust', 'Cable Kickback', 'Hip Abduction Machine'],
  Calves: ['Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise'],
  Abs: ['Cable Crunch', 'Hanging Leg Raise', 'Ab Wheel Rollout', 'Plank'],
  Forearms: ['Barbell Wrist Curl', 'Reverse Barbell Curl', "Farmer's Walk"],
  Traps: ['Barbell Shrug', 'Dumbbell Shrug', 'Cable Shrug'],
};

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bodyWeight, bodyWeightLog, setBodyWeight } = useProfileStore();

  const [selectedMuscle, setSelectedMuscle] = useState('Chest');
  const [selectedExercise, setSelectedExercise] = useState(MUSCLE_EXERCISES['Chest'][0]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, string>>({});

  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [addPRVisible, setAddPRVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [prExerciseName, setPRExerciseName] = useState('');
  const [prWeight, setPRWeight] = useState('');
  const [prReps, setPRReps] = useState('');
  const [prSaving, setPRSaving] = useState(false);

  // Body weight input
  const [bwInput, setBwInput] = useState(bodyWeight != null ? String(bodyWeight) : '');
  const [bwSaved, setBwSaved] = useState(false);

  useEffect(() => { loadPRs(); }, []);
  useEffect(() => { loadChart(); }, [selectedExercise]);
  useEffect(() => {
    getExercises().then((all) => {
      const map: Record<string, string> = {};
      all.forEach((ex) => { map[ex.name] = ex.equipment; });
      setEquipmentMap(map);
    });
  }, []);

  const isBodyweightExercise = equipmentMap[selectedExercise] === 'Bodyweight';

  const loadPRs = async () => {
    try { setPRs(await getAllPRs()); } catch { setPRs([]); }
  };

  const loadChart = async () => {
    setChartLoading(true);
    try { setChartData(await getExerciseProgress(selectedExercise)); }
    catch { setChartData([]); }
    finally { setChartLoading(false); }
  };

  const handleSelectMuscle = (muscle: string) => {
    setSelectedMuscle(muscle);
    const exs = MUSCLE_EXERCISES[muscle] ?? [];
    if (exs.length > 0) setSelectedExercise(exs[0]);
  };

  const handleSaveBW = () => {
    const val = parseFloat(bwInput);
    if (isNaN(val) || val <= 0) return;
    setBodyWeight(val);
    setBwSaved(true);
    setTimeout(() => setBwSaved(false), 2000);
  };

  const handleSavePR = async () => {
    if (!prExerciseName.trim() || !prWeight.trim() || prSaving) return;
    setPRSaving(true);
    try {
      await createManualPR(prExerciseName.trim(), parseFloat(prWeight), prReps ? parseInt(prReps) : null);
      setPRExerciseName('');
      setPRWeight('');
      setPRReps('');
      setAddPRVisible(false);
      loadPRs();
    } catch (e) { console.error(e); }
    finally { setPRSaving(false); }
  };

  const chartWidth = width - 32;

  // Build body weight chart data from log
  const bwChartData = bodyWeightLog.map(({ date, weight }) => ({
    label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    maxWeight: weight,
    maxReps: 0,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700' }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── BODY WEIGHT ── */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
            Body Weight
          </Text>

          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Current Weight (lbs)
                </Text>
                <TextInput
                  value={bwInput}
                  onChangeText={setBwInput}
                  placeholder="e.g. 175"
                  placeholderTextColor={Colors.muted}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: '#0B0F14', color: Colors.text, borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700' }}
                />
              </View>
              <Pressable
                onPress={handleSaveBW}
                style={{ marginTop: 22, paddingHorizontal: 18, paddingVertical: 13, backgroundColor: bwSaved ? Colors.success : Colors.primary, borderRadius: 10 }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 14 }}>
                  {bwSaved ? '✓ Saved' : 'Save'}
                </Text>
              </Pressable>
            </View>

            {bodyWeight != null && (
              <Text style={{ color: Colors.muted, fontSize: 13 }}>
                Current: <Text style={{ color: Colors.text, fontWeight: '700' }}>{bodyWeight} lbs</Text>
                {' · '}used as default weight for bodyweight exercises
              </Text>
            )}
          </View>

          {bwChartData.length >= 2 && (
            <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>Weight Trend</Text>
              <Text style={{ color: Colors.muted, fontSize: 12, marginBottom: 16 }}>Body weight over time (lbs)</Text>
              <LineChart data={bwChartData} width={chartWidth - 32} height={160} metric="weight" />
            </View>
          )}
        </View>

        {/* ── PROGRESS ── */}
        <View style={{ padding: 16 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
            Progress Over Time
          </Text>

          {/* Muscle tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {MUSCLE_GROUPS.map((muscle) => {
              const active = muscle === selectedMuscle;
              const color = MuscleGroupColors[muscle] ?? Colors.primary;
              return (
                <Pressable
                  key={muscle}
                  onPress={() => handleSelectMuscle(muscle)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: active ? `${color}22` : Colors.surface, borderWidth: 1.5, borderColor: active ? color : Colors.surface2 }}
                >
                  <Text style={{ color: active ? color : Colors.muted, fontSize: 13, fontWeight: '700' }}>{muscle}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Exercise selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {(MUSCLE_EXERCISES[selectedMuscle] ?? []).map((ex) => {
              const active = ex === selectedExercise;
              return (
                <Pressable
                  key={ex}
                  onPress={() => setSelectedExercise(ex)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderRadius: 8, backgroundColor: active ? Colors.primary : Colors.surface, borderWidth: 1, borderColor: active ? Colors.primary : Colors.surface2 }}
                >
                  <Text style={{ color: active ? Colors.background : Colors.muted, fontSize: 12, fontWeight: active ? '700' : '500' }}>{ex}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>{selectedExercise}</Text>
            <Text style={{ color: Colors.muted, fontSize: 12, marginBottom: 16 }}>
              {isBodyweightExercise ? 'Max reps per session' : 'Max weight per session (lbs)'}
            </Text>
            {chartLoading ? (
              <View style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: Colors.muted }}>Loading...</Text>
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
        </View>

        {/* ── PERSONAL RECORDS ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Personal Records
            </Text>
            <Pressable
              onPress={() => setAddPRVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '700' }}>Add PR</Text>
            </Pressable>
          </View>

          {prs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 8 }}>No PRs recorded yet</Text>
              <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 4 }}>Add one, or they auto-track during workouts</Text>
            </View>
          ) : (
            prs.map((pr) => {
              const isBodyweightPR = equipmentMap[pr.exercise_name] === 'Bodyweight';
              return (
                <View
                  key={pr.id}
                  style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>{pr.exercise_name}</Text>
                    <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 2 }}>
                      {new Date(pr.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {isBodyweightPR ? (
                      <>
                        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '800' }}>{pr.reps ?? '—'}</Text>
                        <Text style={{ color: Colors.muted, fontSize: 12 }}>reps</Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '800' }}>{pr.weight}</Text>
                        <Text style={{ color: Colors.muted, fontSize: 12 }}>lbs{pr.reps ? ` × ${pr.reps}` : ''}</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add PR Modal */}
      <Modal visible={addPRVisible} transparent animationType="slide" onRequestClose={() => setAddPRVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ backgroundColor: '#1A1F26', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 20 }}>Add Personal Record</Text>

            <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Exercise</Text>
            <Pressable
              onPress={() => setExercisePickerVisible(true)}
              style={{ backgroundColor: '#252525', borderRadius: 10, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: prExerciseName ? Colors.text : Colors.muted, fontSize: 15, flex: 1 }}>
                {prExerciseName || 'Select exercise...'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.muted} />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Weight (lbs)</Text>
                <TextInput
                  value={prWeight}
                  onChangeText={setPRWeight}
                  placeholder="225"
                  placeholderTextColor={Colors.muted}
                  keyboardType="numeric"
                  style={{ backgroundColor: '#252525', color: Colors.text, borderRadius: 10, padding: 14, fontSize: 15 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Reps</Text>
                <TextInput
                  value={prReps}
                  onChangeText={setPRReps}
                  placeholder="1"
                  placeholderTextColor={Colors.muted}
                  keyboardType="numeric"
                  style={{ backgroundColor: '#252525', color: Colors.text, borderRadius: 10, padding: 14, fontSize: 15 }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setAddPRVisible(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#252525', alignItems: 'center' }}
              >
                <Text style={{ color: Colors.muted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePR}
                disabled={!prExerciseName || !prWeight || prSaving}
                style={{ flex: 2, padding: 14, borderRadius: 12, backgroundColor: prExerciseName && prWeight ? Colors.primary : Colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: prExerciseName && prWeight ? Colors.background : Colors.muted, fontWeight: '700', fontSize: 15 }}>
                  {prSaving ? 'Saving...' : 'Save PR'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ExercisePicker
        visible={exercisePickerVisible}
        onClose={() => setExercisePickerVisible(false)}
        onSelect={(name) => {
          setPRExerciseName(name);
          setExercisePickerVisible(false);
        }}
      />
    </View>
  );
}
