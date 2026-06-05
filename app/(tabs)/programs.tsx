import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { deleteProgram, getPrograms, setCurrentProgram } from '../../src/api/programs';
import { Colors } from '../../src/utils/constants';

export default function Programs() {
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await getPrograms();
      setPrograms(data || []);
    } catch {
      setPrograms([]);
    }
  };

  const handleSetCurrent = async (id: string) => {
    await setCurrentProgram(id);
    setMenuOpen(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteProgram(id);
    setMenuOpen(null);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>Programs</Text>
        <Pressable
          onPress={() => router.push('/programs/create')}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="plus" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="calendar-multiselect" size={48} color={Colors.surface2} />
            <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 16 }}>No programs yet</Text>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>Tap + to create your first program</Text>
            <Pressable
              onPress={() => router.push('/programs/create')}
              style={{ marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            >
              <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 15 }}>Create Program</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/programs/[id]', params: { id: item.id } })}
            style={({ pressed }) => ({
              backgroundColor: Colors.surface,
              borderRadius: 14,
              padding: 16,
              marginBottom: 10,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '700' }}>{item.name}</Text>
                  {item.is_current && (
                    <View style={{ backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: Colors.background, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>CURRENT</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: Colors.muted, fontSize: 13 }}>
                  {item.total_weeks} weeks · {item.days_per_week} days/week
                </Text>
              </View>
              <Pressable
                onPress={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === item.id ? null : item.id); }}
                style={{ padding: 6 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.muted} />
              </Pressable>
            </View>

            {/* Inline context menu */}
            {menuOpen === item.id && (
              <View style={{ marginTop: 12, backgroundColor: Colors.surface2, borderRadius: 10, overflow: 'hidden' }}>
                {!item.is_current && (
                  <Pressable onPress={() => handleSetCurrent(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.primary} />
                    <Text style={{ color: Colors.text, fontSize: 15 }}>Set as current</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => handleDelete(item.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.error} />
                  <Text style={{ color: Colors.error, fontSize: 15 }}>Delete program</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}
