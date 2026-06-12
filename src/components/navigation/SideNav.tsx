import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { confirm } from '../../utils/confirm';
import { useColors } from '../../utils/useColors';
import GritWordmark from '../GritWordmark';

export const SIDE_NAV_WIDTH = 220;

const NAV_ITEMS = [
  { key: 'today',   label: 'Workout',          icon: 'dumbbell',             route: '/workout' },
  { key: 'programs',label: 'Programs',          icon: 'calendar-multiselect', route: '/(tabs)/programs' },
  { key: 'history', label: 'History',           icon: 'history',              route: '/(tabs)/history' },
  { key: 'log',     label: 'Personal Records',  icon: 'trophy-outline',       route: '/(tabs)/personal-records' },
];

function getActiveKey(segments: string[]): string | null {
  const s0 = segments[0];
  const s1 = segments[1];
  if (s0 === 'workout') return 'today';
  if (s0 === 'programs' || (s0 === '(tabs)' && s1 === 'programs')) return 'programs';
  if (s0 === '(tabs)' && s1 === 'history') return 'history';
  if (s0 === '(tabs)' && (s1 === 'log' || s1 === 'personal-records')) return 'log';
  if (s0 === 'growth-over-time') return 'growth';
  if (s0 === '(tabs)' && s1 === 'more') return 'more';
  if (s0 === 'subscription') return 'membership';
  return null;
}

export default function SideNav() {
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();

  const activeKey = getActiveKey(segments);

  const handleSignOut = () => {
    confirm(
      'Log Out',
      'Are you sure you want to log out?',
      () => { signOut().catch(() => {}); },
      'Log Out',
      true,
    );
  };

  const NavItem = ({
    navKey, label, icon, route,
  }: { navKey: string; label: string; icon: string; route: string }) => {
    const active = activeKey === navKey;
    return (
      <Pressable
        onPress={() => router.push(route as any)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 13,
          paddingHorizontal: 16,
          borderRadius: 10,
          marginHorizontal: 8,
          backgroundColor: active ? `${colors.primary}18` : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {active && (
          <View style={{
            position: 'absolute', left: 0, top: 6, bottom: 6,
            width: 3, backgroundColor: colors.primary, borderRadius: 2,
          }} />
        )}
        <MaterialCommunityIcons name={icon as any} size={20} color={active ? colors.primary : colors.muted} />
        <Text style={{ color: active ? colors.primary : colors.text, fontSize: 15, fontWeight: active ? '700' : '500' }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{
      width: SIDE_NAV_WIDTH,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.surface2,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }}>
      {/* Wordmark */}
      <View style={{ paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8, alignItems: 'center' }}>
        <GritWordmark size="sm" showTagline={false} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4 }} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.key} navKey={item.key} label={item.label} icon={item.icon} route={item.route} />
        ))}

        <View style={{ height: 1, backgroundColor: colors.surface2, marginHorizontal: 16, marginVertical: 8 }} />

        <NavItem navKey="more" label="Profile & Settings" icon="account-circle-outline" route="/(tabs)/more" />
        <NavItem navKey="membership" label="Membership" icon="crown-outline" route="/subscription" />
      </ScrollView>

      {/* Sign out pinned at bottom */}
      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderTopWidth: 1,
          borderTopColor: colors.surface2,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
        <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
      </Pressable>
    </View>
  );
}
