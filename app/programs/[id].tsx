import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, Pressable, View } from 'react-native';
import { getProgramDays, getPrograms, Program, ProgramDay } from '../../src/api/programs';
import { Colors } from '../../src/utils/constants';

const DAY_FALLBACKS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const abbrev = (label: string | null | undefined, fallback: string) =>
  label ? label.slice(0, 3) : fallback;

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const [programs, programDays] = await Promise.all([
      getPrograms(),
      getProgramDays(id),
    ]);
    setProgram(programs.find((p) => p.id === id) ?? null);
    setDays(programDays);
  };

  const getDayForCell = (week: number, dayNum: number) =>
    days.find((d) => d.week_number === week && d.day_number === dayNum);

  if (!program) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.muted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>← Programs</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '700', flex: 1 }}>{program.name}</Text>
          {program.is_current && (
            <View style={{ backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
              <Text style={{ color: Colors.background, fontSize: 11, fontWeight: '800' }}>CURRENT</Text>
            </View>
          )}
        </View>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>
          {program.total_weeks} weeks · {program.days_per_week} days/week
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Setup hint for week 1 */}
        <View style={{ backgroundColor: `${Colors.primary}15`, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
          <Text style={{ color: Colors.muted, fontSize: 13, flex: 1 }}>
            Tap <Text style={{ color: Colors.primary, fontWeight: '700' }}>Week 1</Text> days to set up exercises — they'll repeat every week.
          </Text>
        </View>

        {/* Week rows */}
        {Array.from({ length: program.total_weeks }, (_, weekIdx) => {
          const week = weekIdx + 1;
          return (
            <View key={week} style={{ marginBottom: 12 }}>
              {/* Week label */}
              <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Week {week}
              </Text>

              {/* Day cells */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Array.from({ length: program.days_per_week }, (_, dayIdx) => {
                  const day = getDayForCell(week, dayIdx + 1);
                  const isCompleted = day?.completed ?? false;
                  const isWeek1 = week === 1;

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
                        backgroundColor: isCompleted
                          ? Colors.success
                          : isWeek1
                          ? Colors.surface
                          : Colors.background,
                        borderWidth: 1.5,
                        borderColor: isCompleted
                          ? Colors.success
                          : isWeek1
                          ? Colors.surface2
                          : '#1F2937',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {isCompleted ? (
                        <>
                          <MaterialCommunityIcons name="check" size={18} color={Colors.background} />
                          <Text style={{ color: Colors.background, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            {abbrev(day?.label, DAY_FALLBACKS[dayIdx])}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ color: isWeek1 ? Colors.text : Colors.muted, fontSize: 13, fontWeight: '700' }}>
                            {abbrev(day?.label, DAY_FALLBACKS[dayIdx])}
                          </Text>
                          {isWeek1 && (
                            <MaterialCommunityIcons name="pencil-outline" size={11} color={Colors.muted} style={{ marginTop: 3 }} />
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
