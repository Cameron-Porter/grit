import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteProgram, duplicateProgram, getPrograms, setCurrentProgram, type Program } from '../../src/api/programs';
import { Badge } from '../../src/components/Badge';
import { confirm } from '../../src/utils/confirm';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';
import GradientBackground from '../../src/components/GradientBackground';
import { Skeleton } from '../../src/components/Skeleton';
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
  const [copying, setCopying] = useState(false);

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
      Alert.alert('Could not load programs', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id: string) => {
    const previous = programs;
    setPrograms((prev) => prev.map((p) => ({ ...p, is_current: p.id === id })));
    setMenuOpen(null);
    try {
      await setCurrentProgram(id);
      await load();
    } catch {
      setPrograms(previous);
      Alert.alert('Could not update program', 'Your current program was not changed. Please try again.');
    }
  };

  const handleDelete = (id: string, name: string, isCurrent: boolean) => {
    confirm(
      'Delete Program',
      `Delete "${name}"? This cannot be undone.`,
      async () => {
        setMenuOpen(null);
        try {
          await deleteProgram(id);
          if (isCurrent) clearProgramState();
          await load();
        } catch {
          Alert.alert('Could not delete program', 'The program was not deleted. Please try again.');
        }
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
    if (!copyTarget || copying) return;
    const { id } = copyTarget;
    setCopying(true);
    try {
      const copy = await duplicateProgram(id, copyName.trim());
      await setCurrentProgram(copy.id);
      clearProgramState();
      setCopyTarget(null);
      await load();
    } catch {
      Alert.alert('Could not copy program', 'No copy was activated. Please try again.');
    } finally {
      setCopying(false);
    }
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
        <View style={{ padding: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Skeleton width="50%" height={18} radius={6} />
                <Skeleton width={52} height={20} radius={4} />
              </View>
              <Skeleton width="38%" height={13} radius={4} />
            </View>
          ))}
        </View>
      ) : (
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 32 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder }}>
              <MaterialCommunityIcons name="calendar-multiselect" size={36} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>No programs yet</Text>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
              Build your first program to get started with structured, progressive training.
            </Text>
            <Pressable
              onPress={() => router.push('/programs/create')}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
            >
              <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>Create Program</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/programs/templates')}
              style={{ marginTop: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Browse templates →</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/programs/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: 24,
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
                    if (status === 'active') return <Badge label="ACTIVE" color={colors.primary} variant="solid" size="sm" />;
                    if (status === 'complete') return <Badge label="COMPLETE" color={colors.success} variant="solid" size="sm" />;
                    return <Badge label="PAUSED" color={colors.muted} variant="ghost" size="sm" />;
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
                    <Pressable onPress={(e) => { e.stopPropagation(); handleSetCurrent(item.id); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                      <MaterialCommunityIcons name="play-circle-outline" size={18} color={colors.primary} />
                      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
                    </Pressable>
                  );
                })()}
                <Pressable onPress={(e) => { e.stopPropagation(); handleRestart(item.id, item.name); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.surface }}>
                  <MaterialCommunityIcons name="content-copy" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 15 }}>Copy program</Text>
                </Pressable>
                <Pressable onPress={(e) => { e.stopPropagation(); handleDelete(item.id, item.name, item.is_current); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: colors.surface }}>
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
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => { if (!copying) setCopyTarget(null); }}>
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
                disabled={copying}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmCopy}
                disabled={!copyName.trim() || copying}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: copyName.trim() && !copying ? colors.primary : colors.surface2, alignItems: 'center' }}
              >
                <Text style={{ color: copyName.trim() && !copying ? colors.background : colors.muted, fontWeight: '700', fontSize: 15 }}>{copying ? 'Creating…' : 'Create Copy'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GradientBackground>
  );
}
