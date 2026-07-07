import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { useRouter, useSegments } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '../../store/useProfileStore';
import { useColors } from '../../utils/useColors';

type TabName = 'today' | 'programs' | 'progress' | 'profile';

const TABS: { name: TabName; label: string; icon: string; route: string }[] = [
  { name: 'today',    label: 'Workout',  icon: 'dumbbell',             route: '/workout' },
  { name: 'programs', label: 'Programs', icon: 'calendar-multiselect', route: '/(tabs)/programs' },
  { name: 'progress', label: 'History',  icon: 'history',              route: '/(tabs)/history' },
  { name: 'profile',  label: 'Profile',  icon: 'account-circle',       route: '/(tabs)/more' },
];

const PILL_HEIGHT = 64;
const PILL_MARGIN = 16;
const PILL_GAP = 12;

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
  const theme = useProfileStore((s) => s.theme);
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();

  if (segments[0] === 'login' || segments[0] === 'subscription' || segments.length === 0) return null;

  const activeTab = getActiveTab(segments);
  const pillBottom = (insets.bottom > 0 ? insets.bottom : 8) + PILL_GAP;

  const tabButtons = (
    <>
      {TABS.map((tab) => {
        const active = activeTab === tab.name;
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.replace(tab.route as any)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
          >
            <View style={{
              width: 48,
              height: 32,
              borderRadius: 16,
              backgroundColor: active ? `${colors.primary}20` : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={22}
                color={active ? colors.primary : colors.muted}
              />
            </View>
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
    </>
  );

  const shadowStyle = {
    position: 'absolute' as const,
    bottom: pillBottom,
    left: PILL_MARGIN,
    right: PILL_MARGIN,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 14,
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={shadowStyle}>
        <GlassView
          style={{ flex: 1, borderRadius: PILL_HEIGHT / 2, flexDirection: 'row', overflow: 'hidden' }}
          glassEffectStyle="regular"
          colorScheme={theme === 'dark' ? 'dark' : 'light'}
        >
          {tabButtons}
        </GlassView>
      </View>
    );
  }

  // Android + web: solid semi-opaque pill
  return (
    <View style={[shadowStyle, {
      backgroundColor: theme === 'dark' ? 'rgba(20,20,26,0.96)' : 'rgba(242,242,247,0.97)',
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
      flexDirection: 'row',
    }]}>
      {tabButtons}
    </View>
  );
}
