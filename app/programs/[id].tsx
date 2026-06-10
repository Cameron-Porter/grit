import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProgramDays, getPrograms, Program, ProgramDay } from '../../src/api/programs';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
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
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [loading, setLoading] = useState(true);

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
            <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
              <Text style={{ color: colors.background, fontSize: 11, fontWeight: '800' }}>CURRENT</Text>
            </View>
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
      </ScrollView>
    </View>
  );
}
