import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_HEIGHT } from '../../utils/constants';
import { useColors } from '../../utils/useColors';

type TabName = 'today' | 'programs' | 'progress' | 'profile';

const TABS: { name: TabName; label: string; icon: string; route: string }[] = [
  { name: 'today',    label: 'Workout',  icon: 'dumbbell',             route: '/workout' },
  { name: 'programs', label: 'Programs', icon: 'calendar-multiselect', route: '/(tabs)/programs' },
  { name: 'progress', label: 'History',  icon: 'history',              route: '/(tabs)/history' },
  { name: 'profile',  label: 'Profile',  icon: 'account-circle',       route: '/(tabs)/more' },
];

function getActiveTab(segments: string[]): TabName | null {
  const s0 = segments[0];
  const s1 = segments[1];
  if (s0 === 'workout') return 'today';
  if (s0 === 'programs' || (s0 === '(tabs)' && s1 === 'programs')) return 'programs';
  if (s0 === '(tabs)' && (s1 === 'history' || s1 === 'log' || s1 === 'personal-records')) return 'progress';
  if (s0 === 'profile' || (s0 === '(tabs)' && s1 === 'more')) return 'profile';
  return null;
}

export default function PersistentTabBar() {
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();

  // Hide on login screen and before auth initialises
  if (segments[0] === 'login' || segments.length === 0) return null;

  const activeTab = getActiveTab(segments);
  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: BOTTOM_TAB_HEIGHT + bottomPad,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.surface2,
      flexDirection: 'row',
      paddingBottom: bottomPad,
    }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, gap: 3 }}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={22}
              color={active ? colors.primary : colors.muted}
            />
            <Text style={{
              color: active ? colors.primary : colors.muted,
              fontSize: 10,
              fontWeight: active ? '700' : '500',
            }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
