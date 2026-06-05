import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Colors } from '../../src/utils/constants';

function MoreRow({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surface2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={Colors.muted} style={{ marginRight: 14 }} />
      <Text style={{ color: Colors.text, fontSize: 16, flex: 1 }}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.muted} />
    </Pressable>
  );
}

export default function More() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface2 }}>
        <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '700' }}>More</Text>
      </View>

      <ScrollView>
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, textTransform: 'uppercase' }}>
          Profile
        </Text>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <MoreRow
            icon="account-circle-outline"
            label="Profile & Progress"
            onPress={() => router.push('/profile')}
          />
          <MoreRow
            icon="trophy-outline"
            label="Personal Records"
            onPress={() => router.push('/profile')}
          />
        </View>

        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, textTransform: 'uppercase' }}>
          Account
        </Text>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <MoreRow icon="help-circle-outline" label="Help & FAQ" />
          <MoreRow icon="star-outline" label="Leave a Review" />
        </View>

        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, textTransform: 'uppercase' }}>
          App
        </Text>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: 16, overflow: 'hidden' }}>
          <MoreRow icon="information-outline" label="About GRIT" />
        </View>

        <Text style={{ color: Colors.muted, fontSize: 12, textAlign: 'center', marginTop: 40, marginBottom: 20 }}>
          GRIT · Guided Results & Intelligent Training
        </Text>
      </ScrollView>
    </View>
  );
}
