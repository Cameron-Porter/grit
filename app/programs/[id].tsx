import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, Pressable, View } from 'react-native';
import { getProgramDays, getPrograms, Program, ProgramDay } from '../../src/api/programs';
import { Colors } from '../../src/utils/constants';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        {/* Week/Day Grid */}
        <View>
          {/* Column headers */}
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <View style={{ width: 52 }} />
            {Array.from({ length: program.days_per_week }, (_, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: Colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                  {DAY_LABELS[i]}
                </Text>
              </View>
            ))}
          </View>

          {/* Week rows */}
          {Array.from({ length: program.total_weeks }, (_, weekIdx) => {
            const week = weekIdx + 1;
            return (
              <View key={week} style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'center' }}>
                <View style={{ width: 52 }}>
                  <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700' }}>WK {week}</Text>
                </View>
                {Array.from({ length: program.days_per_week }, (_, dayIdx) => {
                  const day = getDayForCell(week, dayIdx + 1);
                  const isCompleted = day?.completed ?? false;
                  return (
                    <Pressable
                      key={dayIdx}
                      onPress={() =>
                        day && router.push({
                          pathname: '/programs/[id]/day/[dayId]',
                          params: { id: program.id, dayId: day.id },
                        })
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        marginHorizontal: 3,
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: isCompleted ? Colors.primary : Colors.surface,
                        borderWidth: 1,
                        borderColor: isCompleted ? Colors.primary : Colors.surface2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {isCompleted ? (
                        <MaterialCommunityIcons name="check" size={18} color={Colors.background} />
                      ) : (
                        <MaterialCommunityIcons name="plus" size={16} color={Colors.muted} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={{ height: 1, backgroundColor: Colors.surface2, marginVertical: 20 }} />
        <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center' }}>
          Tap a day to view or edit its exercises
        </Text>
      </ScrollView>
    </View>
  );
}
