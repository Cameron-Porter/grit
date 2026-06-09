import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_HEIGHT, Colors } from '../../utils/constants';

type TabName = 'workout' | 'programs' | 'templates' | 'exercises' | 'more';

const TABS: { name: TabName; label: string; icon: string; route: string }[] = [
  { name: 'workout',   label: 'Workout',   icon: 'dumbbell',             route: '/workout' },
  { name: 'programs',  label: 'Programs',  icon: 'calendar-multiselect', route: '/(tabs)/programs' },
  { name: 'templates', label: 'Templates', icon: 'clipboard-list-outline', route: '/(tabs)/templates' },
  { name: 'exercises', label: 'Exercises', icon: 'lightning-bolt',        route: '/(tabs)/exercises' },
  { name: 'more',      label: 'More',      icon: 'dots-horizontal',       route: '/(tabs)/more' },
];

function getActiveTab(segments: string[]): TabName | null {
  const s0 = segments[0];
  const s1 = segments[1];
  if (s0 === 'workout' || (s0 === '(tabs)' && s1 === 'home')) return 'workout';
  if (s0 === 'programs' || (s0 === '(tabs)' && s1 === 'programs')) return 'programs';
  if (s0 === '(tabs)' && s1 === 'templates') return 'templates';
  if (s0 === 'exercise' || (s0 === '(tabs)' && s1 === 'exercises')) return 'exercises';
  if (s0 === 'profile' || (s0 === '(tabs)' && (s1 === 'more' || s1 === 'log'))) return 'more';
  return null;
}

export default function PersistentTabBar() {
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
      backgroundColor: Colors.background,
      borderTopWidth: 1,
      borderTopColor: Colors.surface2,
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
              color={active ? Colors.primary : Colors.muted}
            />
            <Text style={{
              color: active ? Colors.primary : Colors.muted,
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
