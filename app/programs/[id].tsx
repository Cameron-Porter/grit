import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backfillWeek1ExerciseRoles, getProgramDays, getPrograms, Program, ProgramDay } from '../../src/api/programs';
import { refreshUpcomingProgressionTargets } from '../../src/api/progression';
import { Badge } from '../../src/components/Badge';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { confirm } from '../../src/utils/confirm';
import { useColors } from '../../src/utils/useColors';

const DAY_FALLBACKS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const abbrev = (label: string | null | undefined, fallback: string) =>
  label ? label.slice(0, 3) : fallback;

export default function ProgramDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activeProgramDayId = useWorkoutStore((s) => s.activeProgramDayId);
  const experienceLevel = useProfileStore((s) => s.experienceLevel);
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingRoles, setFixingRoles] = useState(false);
  const [refreshingTargets, setRefreshingTargets] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const [programs, programDays] = await Promise.all([
      getPrograms(),
      getProgramDays(id),
    ]);
    setProgram(programs.find((p) => p.id === id) ?? null);
    setDays(programDays);
    setLoading(false);
  };

  const getDayForCell = (week: number, dayNum: number) =>
    days.find((d) => d.week_number === week && d.day_number === dayNum);

  // TEMPORARY — one-time fix for programs created before program_exercises
  // retained each exercise's role. Infers a role from exercise movement type
  // (see backfillWeek1ExerciseRoles), writes it onto the Week 1 template,
  // then recomputes every already-completed day's saved next-week targets
  // so upcoming/current weeks pick up the corrected load-increment sizing.
  // Safe to remove once no program in use predates the role column.
  const handleFixExerciseRoles = () => {
    confirm(
      'Fix Exercise Roles',
      'This looks at each exercise\'s movement type to infer whether it\'s a Primary, Secondary, or Accessory slot, then recalculates upcoming weight/rep targets using that. Existing logged history is untouched. This may take a few seconds.',
      async () => {
        setFixingRoles(true);
        try {
          const updated = await backfillWeek1ExerciseRoles(program!.id);
          await refreshUpcomingProgressionTargets(program!.id, experienceLevel);
          Alert.alert(
            'Done',
            updated > 0
              ? `Tagged ${updated} exercise${updated === 1 ? '' : 's'} and refreshed upcoming targets. If you have a workout open for this program, back out and reopen it to see the corrected numbers.`
              : 'No Week 1 exercises found to tag.',
          );
        } catch {
          Alert.alert('Something went wrong', 'Could not fix exercise roles — please try again.');
        } finally {
          setFixingRoles(false);
        }
      },
      'Fix Now',
    );
  };

  // Recomputes every already-saved upcoming week's targets (e.g. Week 3)
  // using the current progression engine and your real logged history +
  // soreness feedback — without changing anything you've already logged.
  // Useful any time the progression logic itself changes (rep/load rules,
  // deload protocol, RIR taper, etc.) so already-generated future weeks
  // don't stay stuck on stale math.
  const handleRefreshProgressionTargets = () => {
    confirm(
      'Refresh Progression Targets',
      'Recalculates weight/set/rep targets for every upcoming week already saved for this program, using your logged workouts and soreness feedback with the current progression rules. Nothing you\'ve already logged is changed.',
      async () => {
        setRefreshingTargets(true);
        try {
          await refreshUpcomingProgressionTargets(program!.id, experienceLevel);
          Alert.alert('Done', 'Upcoming targets have been recalculated. If you have a workout open for this program, back out and reopen it to see the updated numbers.');
        } catch {
          Alert.alert('Something went wrong', 'Could not refresh progression targets — please try again.');
        } finally {
          setRefreshingTargets(false);
        }
      },
      'Refresh',
    );
  };

  if (loading || !program) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>← Programs</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>{program.name}</Text>
          {program.is_current && (
            <Badge label="CURRENT" color={colors.primary} variant="solid" size="sm" />
          )}
        </View>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
          {program.total_weeks} weeks · {program.days_per_week} days/week
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Setup hint for week 1 */}
        <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>
            Tap <Text style={{ color: colors.primary, fontWeight: '700' }}>Week 1</Text> days to set up exercises — they'll repeat every week.
          </Text>
        </View>

        {/* Week rows */}
        {Array.from({ length: program.total_weeks }, (_, weekIdx) => {
          const week = weekIdx + 1;
          return (
            <View key={week} style={{ marginBottom: 12 }}>
              {/* Week label */}
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Week {week}
              </Text>

              {/* Day cells */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Array.from({ length: program.days_per_week }, (_, dayIdx) => {
                  const day = getDayForCell(week, dayIdx + 1);
                  const isCompleted = day?.completed ?? false;
                  const isSkipped = day?.skipped ?? false;
                  const isCurrent = !!day && day.id === activeProgramDayId;
                  const isWeek1 = week === 1;

                  const bgColor = isSkipped
                    ? colors.warning
                    : isCompleted
                    ? colors.success
                    : isCurrent
                    ? colors.primary
                    : isWeek1
                    ? colors.surface
                    : colors.background;

                  const borderColor = isSkipped
                    ? colors.warning
                    : isCompleted
                    ? colors.success
                    : isCurrent
                    ? colors.primary
                    : isWeek1
                    ? colors.surface2
                    : '#1F2937';

                  const labelColor = (isCompleted || isSkipped || isCurrent) ? colors.background : isWeek1 ? colors.text : colors.muted;

                  return (
                    <Pressable
                      key={dayIdx}
                      onPress={() =>
                        day &&
                        router.push({
                          pathname: '/programs/[id]/day/[dayId]',
                          params: { id: program.id, dayId: day.id },
                        })
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 64,
                        borderRadius: 10,
                        backgroundColor: bgColor,
                        borderWidth: 1.5,
                        borderColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {isSkipped ? (
                        <>
                          <MaterialCommunityIcons name="minus-circle-outline" size={18} color={colors.background} />
                          <Text style={{ color: colors.background, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            {abbrev(day?.label, DAY_FALLBACKS[dayIdx])}
                          </Text>
                        </>
                      ) : isCompleted ? (
                        <>
                          <MaterialCommunityIcons name="check" size={18} color={colors.background} />
                          <Text style={{ color: colors.background, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            {abbrev(day?.label, DAY_FALLBACKS[dayIdx])}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: labelColor, fontSize: 13, fontWeight: '700' }}>
                            {abbrev(day?.label, DAY_FALLBACKS[dayIdx])}
                          </Text>
                          {isWeek1 && !isCurrent && (
                            <MaterialCommunityIcons name="pencil-outline" size={11} color={colors.muted} style={{ marginTop: 3 }} />
                          )}
                          {isCurrent && (
                            <MaterialCommunityIcons name="play" size={11} color={colors.background} style={{ marginTop: 3 }} />
                          )}
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* TEMPORARY — remove once no program in use predates the
            program_exercises.role column (see migration 20260730000001). */}
        <Pressable
          onPress={handleFixExerciseRoles}
          disabled={fixingRoles}
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.surface2,
            backgroundColor: colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: fixingRoles ? 0.6 : 1,
          }}
        >
          {fixingRoles ? (
            <ActivityIndicator color={colors.muted} size="small" />
          ) : (
            <MaterialCommunityIcons name="wrench-outline" size={16} color={colors.muted} />
          )}
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
            Fix Exercise Roles (one-time)
          </Text>
        </Pressable>

        <Pressable
          onPress={handleRefreshProgressionTargets}
          disabled={refreshingTargets}
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.surface2,
            backgroundColor: colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: refreshingTargets ? 0.6 : 1,
          }}
        >
          {refreshingTargets ? (
            <ActivityIndicator color={colors.muted} size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={16} color={colors.muted} />
          )}
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
            Refresh Progression Targets
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
