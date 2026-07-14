import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteProgram, duplicateProgram, getPrograms, setCurrentProgram, type Program } from '../../src/api/programs';
import { confirm } from '../../src/utils/confirm';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import GradientBackground from '../../src/components/GradientBackground';
import { BOTTOM_TAB_HEIGHT } from '../../src/utils/constants';
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
  const [copyTarget, setCopyTarget] = useState<{ id: string; name: string } | null>(null);
  const [copyName, setCopyName] = useState('');

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

  const handleRestart = (id: string, name: string) => {
    setMenuOpen(null);
    setCopyName(name);
    setCopyTarget({ id, name });
  };

  const handleConfirmCopy = async () => {
    if (!copyTarget) return;
    const { id } = copyTarget;
    setCopyTarget(null);
    const copy = await duplicateProgram(id, copyName);
    await setCurrentProgram(copy.id);
    clearProgramState();
    load();
  };

  return (
    <GradientBackground>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 }}>Programs</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <Pressable
            onPress={() => router.push('/programs/templates')}
            style={{ height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 12, flexDirection: 'row', gap: 5 }}
          >
            <MaterialCommunityIcons name="view-grid-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Templates</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/programs/create')}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder }}
          >
            <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 16 }}
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
              borderRadius: 20,
              padding: 16,
              marginBottom: 10,
              opacity: pressed ? 0.8 : 1,
              borderWidth: 1,
              borderColor: colors.glassBorder,
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
                <Pressable onPress={() => handleRestart(item.id, item.name)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.surface }}>
                  <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 15 }}>Copy program</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(item.id, item.name, item.is_current)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.surface }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 15 }}>Delete program</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />
      )}

      {/* Copy-program name modal */}
      <Modal visible={copyTarget !== null} transparent animationType="fade" onRequestClose={() => setCopyTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setCopyTarget(null)}>
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', gap: 16 }} onPress={() => {}}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Copy Program</Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
              A fresh copy will be created starting from Week 1. Your completed history is preserved.
            </Text>
            <TextInput
              value={copyName}
              onChangeText={setCopyName}
              placeholder="Program name"
              placeholderTextColor={colors.muted}
              autoFocus
              selectTextOnFocus
              style={{ backgroundColor: colors.surface2, color: colors.text, borderRadius: 12, padding: 14, fontSize: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setCopyTarget(null)}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCopy}
                disabled={!copyName.trim()}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: copyName.trim() ? colors.primary : colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: copyName.trim() ? colors.background : colors.muted, fontWeight: '700', fontSize: 15 }}>Create Copy</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}
