import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkouts } from '../../src/api/history';
import GradientBackground from '../../src/components/GradientBackground';
import { Skeleton } from '../../src/components/Skeleton';
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
    <GradientBackground>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: 8 }}>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 }}>Progress</Text>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 24 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.glassBorder }}>
                <Skeleton width={40} height={28} radius={6} />
                <Skeleton width="70%" height={10} radius={4} />
                <Skeleton width="50%" height={10} radius={4} />
              </View>
            ))}
          </View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.glassBorder, gap: 8 }}>
              <Skeleton width="55%" height={16} radius={5} />
              <Skeleton width="30%" height={12} radius={4} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 24 }}>

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
            <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder }}>
                <MaterialCommunityIcons name="dumbbell" size={36} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>No workouts logged</Text>
              <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
                Complete your first workout to see your training history and progress here.
              </Text>
              <Pressable
                onPress={() => router.push('/workout')}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
              >
                <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>Start a Workout</Text>
              </Pressable>
            </View>
          )}

          {workouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 20,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1,
                borderWidth: 1,
                borderColor: colors.glassBorder,
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
    </GradientBackground>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 14, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.glassBorder }}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 32 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>{unit}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
