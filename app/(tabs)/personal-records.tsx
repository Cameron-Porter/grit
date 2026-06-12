import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercises } from '../../src/api/exercises';
import {
  createManualPR,
  getAllPRs,
  PersonalRecord,
} from '../../src/api/personalRecords';
import ExercisePicker from '../../src/components/workout/ExercisePicker';
import { useColors } from '../../src/utils/useColors';

export default function PRsAndProgress() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [equipmentMap, setEquipmentMap] = useState<Record<string, string>>({});

  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [addPRVisible, setAddPRVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [prExerciseName, setPRExerciseName] = useState('');
  const [prWeight, setPRWeight] = useState('');
  const [prReps, setPRReps] = useState('');
  const [prSaving, setPRSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadPRs(); }, []));

  useEffect(() => {
    getExercises().then((all) => {
      const map: Record<string, string> = {};
      all.forEach((ex) => { map[ex.name] = ex.equipment; });
      setEquipmentMap(map);
    });
  }, []);

  const loadPRs = async () => {
    try { setPRs(await getAllPRs()); } catch { setPRs([]); }
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
    } catch {}
    finally { setPRSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>PRs & Progress</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── PERSONAL RECORDS ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Personal Records
            </Text>
            <Pressable
              onPress={() => setAddPRVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Add PR</Text>
            </Pressable>
          </View>

          {prs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
              <Text style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>No PRs recorded yet</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Add one, or they auto-track during workouts</Text>
            </View>
          ) : (
            prs.map((pr) => {
              const isBodyweightPR = equipmentMap[pr.exercise_name] === 'Bodyweight';
              return (
                <View
                  key={pr.id}
                  style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 18 }}>🏆</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{pr.exercise_name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                      {new Date(pr.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {isBodyweightPR ? (
                      <>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{pr.reps ?? '—'}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>reps</Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{pr.weight}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>lbs{pr.reps ? ` × ${pr.reps}` : ''}</Text>
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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 20 }}>Add Personal Record</Text>

            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Exercise</Text>
            <Pressable
              onPress={() => setExercisePickerVisible(true)}
              style={{ backgroundColor: '#252525', borderRadius: 10, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: prExerciseName ? colors.text : colors.muted, fontSize: 15, flex: 1 }}>
                {prExerciseName || 'Select exercise...'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Weight (lbs)</Text>
                <TextInput
                  value={prWeight}
                  onChangeText={setPRWeight}
                  placeholder="225"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={{ backgroundColor: '#252525', color: colors.text, borderRadius: 10, padding: 14, fontSize: 15 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Reps</Text>
                <TextInput
                  value={prReps}
                  onChangeText={setPRReps}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={{ backgroundColor: '#252525', color: colors.text, borderRadius: 10, padding: 14, fontSize: 15 }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setAddPRVisible(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#252525', alignItems: 'center' }}
              >
                <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePR}
                disabled={!prExerciseName || !prWeight || prSaving}
                style={{ flex: 2, padding: 14, borderRadius: 12, backgroundColor: prExerciseName && prWeight ? colors.primary : colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: prExerciseName && prWeight ? colors.background : colors.muted, fontWeight: '700', fontSize: 15 }}>
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
