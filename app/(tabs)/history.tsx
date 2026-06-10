import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkouts } from '../../src/api/history';
import { BOTTOM_TAB_HEIGHT } from '../../src/utils/constants';
import { useColors } from '../../src/utils/useColors';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function computeStreak(workouts: any[]): number {
  if (workouts.length === 0) return 0;
  const days = new Set(
    workouts.map((w) => {
      const d = new Date(w.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today.getTime();
  while (days.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }
  // If today isn't a workout day, check if yesterday starts the streak
  if (streak === 0) {
    cursor = today.getTime() - 86400000;
    while (days.has(cursor)) {
      streak++;
      cursor -= 86400000;
    }
  }
  return streak;
}

export default function Progress() {
  const colors = useColors();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWorkouts();
      setWorkouts(data || []);
    } catch {
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now).getTime();
    const thisWeek = workouts.filter((w) => new Date(w.created_at).getTime() >= weekStart).length;
    const streak = computeStreak(workouts);
    return { thisWeek, streak, total: workouts.length };
  }, [workouts]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Progress</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 24 }}>

          {/* ── Stats row ── */}
          {workouts.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <StatCard label="This week" value={String(stats.thisWeek)} unit="sessions" />
              <StatCard label="Streak" value={String(stats.streak)} unit={stats.streak === 1 ? 'day' : 'days'} />
              <StatCard label="All time" value={String(stats.total)} unit="workouts" />
            </View>
          )}

          {/* ── Workout list ── */}
          {workouts.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <MaterialCommunityIcons name="chart-line" size={48} color={colors.surface2} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>No workouts yet</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Completed workouts will appear here</Text>
            </View>
          )}

          {workouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                  {w.name ?? 'Workout'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>
                  {formatDate(w.created_at)}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 2 }}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 32 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>{unit}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
