import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteProgram, getPrograms, setCurrentProgram, type Program } from '../../src/api/programs';
import { confirm } from '../../src/utils/confirm';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import { useColors } from '../../src/utils/useColors';

type ProgramStatus = 'active' | 'complete' | 'paused';

function getProgramStatus(program: Program): ProgramStatus {
  if (program.is_current) return 'active';
  if (program.totalDays > 0 && program.completedDays >= program.totalDays) return 'complete';
  return 'paused';
}

export default function Programs() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clearProgramState = useWorkoutStore((s) => s.clearProgramState);
  const [programs, setPrograms] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPrograms();
      setPrograms(data || []);
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id: string) => {
    setPrograms((prev) => prev.map((p) => ({ ...p, is_current: p.id === id })));
    setMenuOpen(null);
    await setCurrentProgram(id);
    load();
  };

  const handleDelete = (id: string, name: string, isCurrent: boolean) => {
    confirm(
      'Delete Program',
      `Delete "${name}"? This cannot be undone.`,
      async () => {
        setMenuOpen(null);
        await deleteProgram(id);
        if (isCurrent) clearProgramState();
        load();
      },
      'Delete',
      true,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Programs</Text>
        <Pressable
          onPress={() => router.push('/programs/create')}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="calendar-multiselect" size={48} color={colors.surface2} />
            <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>No programs yet</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Tap + to create your first program</Text>
            <Pressable
              onPress={() => router.push('/programs/create')}
              style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            >
              <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>Create Program</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/programs/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              marginBottom: 10,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{item.name}</Text>
                  {(() => {
                    const status = getProgramStatus(item as Program);
                    if (status === 'active') {
                      return (
                        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: colors.background, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>ACTIVE</Text>
                        </View>
                      );
                    }
                    if (status === 'complete') {
                      return (
                        <View style={{ backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>COMPLETE</Text>
                        </View>
                      );
                    }
                    return (
                      <View style={{ backgroundColor: colors.surface2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>PAUSED</Text>
                      </View>
                    );
                  })()}
                </View>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {item.total_weeks} weeks · {item.days_per_week} days/week
                  {item.completedDays > 0 && ` · ${item.completedDays}/${item.totalDays} days done`}
                </Text>
              </View>
              <Pressable
                onPress={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}
                style={{ padding: 6 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Inline context menu */}
            {menuOpen === item.id && (
              <View style={{ marginTop: 12, backgroundColor: colors.surface2, borderRadius: 10, overflow: 'hidden' }}>
                {!item.is_current && (() => {
                  const status = getProgramStatus(item as Program);
                  const label = status === 'complete' ? 'Set as Current' : 'Resume Program';
                  return (
                    <Pressable onPress={() => handleSetCurrent(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                      <MaterialCommunityIcons name="play-circle-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
                    </Pressable>
                  );
                })()}
                <Pressable onPress={() => handleDelete(item.id, item.name, item.is_current)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 15 }}>Delete program</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />
      )}
    </View>
  );
}
