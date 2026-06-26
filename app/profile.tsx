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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercises } from '../src/api/exercises';
import {
  createManualPR,
  getAllPRs,
  PersonalRecord,
} from '../src/api/personalRecords';
import { supabase } from '../src/api/supabase';
import LineChart from '../src/components/LineChart';
import ExercisePicker from '../src/components/workout/ExercisePicker';
import { EQUIPMENT_TYPES, useProfileStore } from '../src/store/useProfileStore';
import { useColors } from '../src/utils/useColors';

export default function Profile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    bodyWeight, bodyWeightLog, setBodyWeight,
    autoMatchWeight, setAutoMatchWeight,
    usePreferredEquipment, setUsePreferredEquipment,
    preferredEquipment, setPreferredEquipment,
  } = useProfileStore();

  const [userProfile, setUserProfile] = useState<{ name: string; email: string; createdAt: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setUserProfile({
        name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        email: user.email ?? '',
        createdAt: user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : '',
      });
    });
  }, []);

  const toggleEquipment = (type: string) => {
    if (preferredEquipment.includes(type)) {
      setPreferredEquipment(preferredEquipment.filter((e) => e !== type));
    } else {
      setPreferredEquipment([...preferredEquipment, type]);
    }
  };

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* â”€â”€ PROFILE INFO â”€â”€ */}
        {userProfile && (
          <View style={{ margin: 16, marginBottom: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Profile</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
              {[
                { label: 'Name', value: userProfile.name },
                { label: 'Email', value: userProfile.email },
                { label: 'Created', value: userProfile.createdAt },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.surface2 }}>
                  <Text style={{ color: colors.muted, fontSize: 14, width: 80 }}>{row.label}</Text>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* â”€â”€ SETTINGS â”€â”€ */}
        <View style={{ marginHorizontal: 16, marginBottom: 8, marginTop: 16 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Settings</Text>

          {/* Exercise Sets */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Sets</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Auto match weight updates</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                  When you change a weight value for a set, the app will automatically apply that value to all subsequent sets that match the original weight.
                </Text>
              </View>
              <Pressable
                onPress={() => setAutoMatchWeight(!autoMatchWeight)}
                style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: autoMatchWeight ? colors.primary : colors.surface2, justifyContent: 'center', paddingHorizontal: 2 }}
              >
                <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF', alignSelf: autoMatchWeight ? 'flex-end' : 'flex-start' }} />
              </Pressable>
            </View>
          </View>

          {/* Exercise Types */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Types</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Use preferred exercise types</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>By default, exercises are filtered to your saved preferences.</Text>
              </View>
              <Pressable
                onPress={() => setUsePreferredEquipment(!usePreferredEquipment)}
                style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: usePreferredEquipment ? colors.primary : colors.surface2, justifyContent: 'center', paddingHorizontal: 2 }}
              >
                <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF', alignSelf: usePreferredEquipment ? 'flex-end' : 'flex-start' }} />
              </Pressable>
            </View>
            {usePreferredEquipment && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Exercise type preferences</Text>
                {EQUIPMENT_TYPES.map((type) => {
                  const selected = preferredEquipment.includes(type);
                  return (
                    <Pressable key={type} onPress={() => toggleEquipment(type)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.surface2, backgroundColor: selected ? `${colors.primary}14` : 'transparent' }}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{type}</Text>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.surface2, backgroundColor: selected ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <MaterialCommunityIcons name="check" size={13} color={colors.background} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* â”€â”€ BODY WEIGHT â”€â”€ */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
            Body Weight
          </Text>

          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Current Weight (lbs)
                </Text>
                <TextInput
                  value={bwInput}
                  onChangeText={setBwInput}
                  placeholder="e.g. 175"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: '#0B0F14', color: colors.text, borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700' }}
                />
              </View>
              <Pressable
                onPress={handleSaveBW}
                style={{ marginTop: 22, paddingHorizontal: 18, paddingVertical: 13, backgroundColor: bwSaved ? colors.success : colors.primary, borderRadius: 10 }}
              >
                <Text style={{ color: colors.background, fontWeight: '700', fontSize: 14 }}>
                  {bwSaved ? 'âœ“ Saved' : 'Save'}
                </Text>
              </Pressable>
            </View>

            {bodyWeight != null && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Current: <Text style={{ color: colors.text, fontWeight: '700' }}>{bodyWeight} lbs</Text>
                {' Â· '}used as default weight for bodyweight exercises
              </Text>
            )}
          </View>

          {bwChartData.length >= 2 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>Weight Trend</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 16 }}>Body weight over time (lbs)</Text>
              <LineChart data={bwChartData} width={chartWidth - 32} height={160} metric="weight" />
            </View>
          )}
        </View>

        {/* â”€â”€ PERSONAL RECORDS â”€â”€ */}
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
              <Text style={{ fontSize: 32 }}>ðŸ†</Text>
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
                    <Text style={{ fontSize: 18 }}>ðŸ†</Text>
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
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{pr.reps ?? 'â€”'}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>reps</Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{pr.weight}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>lbs{pr.reps ? ` Ã— ${pr.reps}` : ''}</Text>
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
