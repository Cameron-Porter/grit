import { GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { useRouter, useSegments } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProfileStore } from '../../store/useProfileStore';
import { useColors } from '../../utils/useColors';
import { haptic } from '../../utils/haptics';
import { Radius, Space } from '../../utils/tokens';

type TabName = 'today' | 'programs' | 'progress' | 'profile';

const TABS: { name: TabName; ios: string; android: string; route: string }[] = [
  { name: 'today',    ios: 'dumbbell.fill',       android: 'dumbbell',           route: '/workout' },
  { name: 'programs', ios: 'calendar.badge.clock', android: 'calendar-multiselect', route: '/(tabs)/programs' },
  { name: 'progress', ios: 'chart.line.uptrend.xyaxis', android: 'chart-line', route: '/(tabs)/history' },
  { name: 'profile',  ios: 'person.circle.fill',  android: 'account-circle',    route: '/(tabs)/more' },
];

const PILL_HEIGHT = 56;
const PILL_MARGIN = Space[3];
const PILL_GAP = Space[1.5];

function getActiveTab(segments: string[]): TabName | null {
  const s0 = segments[0];
  const s1 = segments[1];
  if (s0 === 'workout') return 'today';
  if (s0 === 'programs' || (s0 === '(tabs)' && s1 === 'programs')) return 'programs';
  if (s0 === '(tabs)' && (s1 === 'history' || s1 === 'log' || s1 === 'personal-records')) return 'progress';
  if (s0 === 'profile' || (s0 === '(tabs)' && s1 === 'more')) return 'profile';
  return null;
}

function TabButton({ tab, active, onPress }: { tab: typeof TABS[0]; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(0.82, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    });
    haptic.tap();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabBtn}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityLabel={tab.name === 'progress' ? 'Progress' : tab.name === 'profile' ? 'Profile' : tab.name[0].toUpperCase() + tab.name.slice(1)}
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.iconWrap, animStyle]}>
        {Platform.OS === 'ios' ? (
          <SymbolView
            name={tab.ios as any}
            size={22}
            tintColor={active ? colors.tabActive : colors.tabInactive}
            weight={active ? 'bold' : 'regular'}
          />
        ) : (
          <MaterialCommunityIcons
            name={tab.android as any}
            size={22}
            color={active ? colors.tabActive : colors.tabInactive}
          />
        )}
        {/* Active dot */}
        {active && (
          <View style={[styles.activeDot, { backgroundColor: colors.tabActive }]} />
        )}
      </Animated.View>
    </Pressable>
  );
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
      {TABS.map((tab) => (
        <TabButton
          key={tab.name}
          tab={tab}
          active={activeTab === tab.name}
          onPress={() => router.replace(tab.route as any)}
        />
      ))}
    </>
  );

  const containerStyle = [
    styles.pill,
    { bottom: pillBottom, left: PILL_MARGIN, right: PILL_MARGIN },
  ];

  if (Platform.OS === 'ios') {
    return (
      <View style={containerStyle}>
        <GlassView
          style={styles.pillInner}
          glassEffectStyle="regular"
          colorScheme={theme === 'dark' ? 'dark' : 'light'}
        >
          {tabButtons}
        </GlassView>
      </View>
    );
  }

  return (
    <View
      style={[
        containerStyle,
        styles.pillInner,
        {
          backgroundColor: colors.glass,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
        },
      ]}
    >
      {tabButtons}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  pillInner: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space[1],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: Radius.pill,
  },
});
