import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_HEIGHT, Colors } from '../../src/utils/constants';

const BUILT_IN_TEMPLATES = [
  { id: 'ppl', name: 'Push / Pull / Legs', weeks: 4, daysPerWeek: 6, description: 'Classic PPL split targeting all major muscle groups' },
  { id: 'ul', name: 'Upper / Lower', weeks: 4, daysPerWeek: 4, description: 'Balanced upper-lower split, great for intermediate lifters' },
  { id: 'fbw', name: 'Full Body', weeks: 4, daysPerWeek: 3, description: 'Total-body sessions, ideal for beginners or busy schedules' },
  { id: 'bro', name: 'Bro Split', weeks: 4, daysPerWeek: 5, description: 'One major muscle group per day: chest, back, shoulders, arms, legs' },
];

export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '700' }}>Templates</Text>
        <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }}>
          Start a new program from a pre-built template
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_TAB_HEIGHT + 24 }}>
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
          Built-in
        </Text>

        {BUILT_IN_TEMPLATES.map((t) => (
          <View
            key={t.id}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: Colors.surface2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{t.name}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.muted} />
            </View>
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 4 }}>{t.description}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: `${Colors.primary}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>{t.weeks} weeks</Text>
              </View>
              <View style={{ backgroundColor: `${Colors.primary}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>{t.daysPerWeek}×/week</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={{ marginTop: 12, backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.surface2, borderStyle: 'dashed', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color={Colors.muted} />
          <Text style={{ color: Colors.muted, fontSize: 14 }}>Custom templates coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
}
