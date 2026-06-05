import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors } from '../../src/utils/constants';

function MoreRow({ icon, label, onPress, destructive }: { icon: string; label: string; onPress?: () => void; destructive?: boolean }) {
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
      <MaterialCommunityIcons name={icon as any} size={20} color={destructive ? '#EF4444' : Colors.muted} style={{ marginRight: 14 }} />
      <Text style={{ color: destructive ? '#EF4444' : Colors.text, fontSize: 16, flex: 1 }}>{label}</Text>
      {!destructive && <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.muted} />}
    </Pressable>
  );
}

export default function More() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const meta = user?.user_metadata ?? {};
  const displayName: string | null = meta.full_name?.split(' ')[0] ?? meta.name?.split(' ')[0] ?? null;
  const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;

  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header with user identity */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* Avatar */}
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surface2 }}
          />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${Colors.primary}22`, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.primary} />
          </View>
        )}

        {/* Name + email */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>
            {displayName ?? 'Athlete'}
          </Text>
          {user?.email && (
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
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

        <View style={{ backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: 16, marginTop: 24, overflow: 'hidden' }}>
          <MoreRow icon="logout" label="Log Out" onPress={handleSignOut} destructive />
        </View>

        <Text style={{ color: Colors.muted, fontSize: 12, textAlign: 'center', marginTop: 40, marginBottom: 20 }}>
          GRIT · Guided Results &amp; Intelligent Training
        </Text>
      </ScrollView>
    </View>
  );
}
