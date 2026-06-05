import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { createProgram } from '../../src/api/programs';
import { Colors } from '../../src/utils/constants';

export default function CreateProgram() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [saving, setSaving] = useState(false);

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    try {
      const program = await createProgram(name.trim(), totalWeeks, daysPerWeek);
      router.replace({ pathname: '/programs/[id]', params: { id: program.id } });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '700' }}>New Program</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Name */}
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Program Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Pull Legs"
          placeholderTextColor={Colors.muted}
          style={{
            backgroundColor: Colors.surface,
            color: Colors.text,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            marginBottom: 28,
          }}
          autoFocus
        />

        {/* Weeks */}
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          Total Weeks
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {[2, 3, 4, 5, 6, 7, 8].map((w) => (
            <Pressable
              key={w}
              onPress={() => setTotalWeeks(w)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: totalWeeks === w ? Colors.primary : Colors.surface,
                borderWidth: 1,
                borderColor: totalWeeks === w ? Colors.primary : Colors.surface2,
              }}
            >
              <Text style={{ color: totalWeeks === w ? Colors.background : Colors.text, fontWeight: '700', fontSize: 15 }}>
                {w}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Days per week */}
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          Days Per Week
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {[2, 3, 4, 5, 6].map((d) => (
            <Pressable
              key={d}
              onPress={() => setDaysPerWeek(d)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: daysPerWeek === d ? Colors.primary : Colors.surface,
                borderWidth: 1,
                borderColor: daysPerWeek === d ? Colors.primary : Colors.surface2,
              }}
            >
              <Text style={{ color: daysPerWeek === d ? Colors.background : Colors.text, fontWeight: '700', fontSize: 15 }}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 28 }}>
          <Text style={{ color: Colors.muted, fontSize: 13 }}>
            This will create a <Text style={{ color: Colors.text, fontWeight: '700' }}>{totalWeeks}-week</Text> program with{' '}
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{daysPerWeek} training days</Text> per week ({totalWeeks * daysPerWeek} total sessions).
          </Text>
        </View>

        {/* Create button */}
        <Pressable
          onPress={handleCreate}
          disabled={!canCreate || saving}
          style={{
            backgroundColor: canCreate ? Colors.primary : Colors.surface2,
            borderRadius: 14,
            padding: 17,
          }}
        >
          <Text style={{ color: canCreate ? Colors.background : Colors.muted, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
            {saving ? 'Creating...' : 'Create Program'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
