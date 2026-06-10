import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExercises } from '../../src/api/exercises';
import { getExerciseAllSessions } from '../../src/api/history';
import { MuscleGroupColors } from '../../src/utils/constants';
import { useColors } from '../../src/utils/useColors';

type Tab = 'overview' | 'history';

const FALLBACK_DESCRIPTION = 'Perform this exercise through its full range of motion with controlled tempo. Focus on the target muscle with a strong mind-muscle connection and aim for progressive overload over time.';

export default function ExerciseDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [exercise, setExercise] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  useEffect(() => {
    getExercises().then((all) => {
      const found = all.find((e) => e.id === id);
      setExercise(found ?? null);
    });
  }, [id]);

  useEffect(() => {
    if (tab === 'history' && !sessionsLoaded && exercise) {
      getExerciseAllSessions(exercise.name)
        .then((data) => { setSessions(data); setSessionsLoaded(true); })
        .catch(() => setSessionsLoaded(true));
    }
  }, [tab, exercise]);

  if (!exercise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>Loading...</Text>
      </View>
    );
  }

  const badgeColor = exercise.muscle_group ? (MuscleGroupColors[exercise.muscle_group] ?? colors.primary) : colors.primary;
  const description = exercise.description ?? FALLBACK_DESCRIPTION;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>← Exercises</Text>
        </Pressable>

        {exercise.muscle_group && (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: `${badgeColor}28`, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="blur-linear" size={12} color={badgeColor} style={{ marginRight: 5 }} />
            <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {exercise.muscle_group}
            </Text>
          </View>
        )}

        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
          {exercise.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>
          {exercise.equipment}
        </Text>

        <View style={{ flexDirection: 'row', gap: 0 }}>
          {(['overview', 'history'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? colors.primary : 'transparent',
              }}
            >
              <Text style={{ color: tab === t ? colors.primary : colors.muted, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Overview tab */}
      {tab === 'overview' && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <MaterialCommunityIcons name="arm-flex" size={22} color={badgeColor} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 6 }}>
                {exercise.muscle_group ?? '—'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Muscle</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <MaterialCommunityIcons name="weight-lifter" size={22} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 6 }}>
                {exercise.equipment ?? '—'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Equipment</Text>
            </View>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                How to perform
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>{description}</Text>
          </View>

          <View style={{ backgroundColor: `${colors.primary}12`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: `${colors.primary}30` }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Pro Tip
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
              Track progress by increasing weight or reps each week. Even small jumps compound into significant strength gains over a mesocycle.
            </Text>
          </View>

          <Pressable
            onPress={() => setTab('history')}
            style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>View My History</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {!sessionsLoaded && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: colors.muted }}>Loading history...</Text>
            </View>
          )}
          {sessionsLoaded && sessions.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons name="history" size={40} color={colors.surface2} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>No history yet</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                Log this exercise to see your progress here
              </Text>
            </View>
          )}
          {sessions.map((session, i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                  {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                {session.programName && (
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{session.programName}</Text>
                )}
              </View>
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ width: 36, color: colors.muted, fontSize: 11, fontWeight: '700' }}>#</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>WEIGHT</Text>
                  <Text style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>REPS</Text>
                </View>
                {session.sets.map((s: any, j: number) => (
                  <View key={j} style={{ flexDirection: 'row', paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
                    <Text style={{ width: 36, color: colors.muted, fontSize: 13 }}>{j + 1}</Text>
                    <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: '600' }}>{s.weight}</Text>
                    <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: '600' }}>{s.reps}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
