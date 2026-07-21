import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useEffect } from 'react';
import { AppState, Text, useWindowDimensions, View } from 'react-native';

(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.style = { fontFamily: 'Inter_400Regular' };
import { drainPendingWorkouts } from '../src/api/pendingWorkouts';
import { getBodyWeight } from '../src/api/userProfile';
import { supabase } from '../src/api/supabase';
import { useProfileStore } from '../src/store/useProfileStore';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import PersistentTabBar from '../src/components/navigation/PersistentTabBar';
import SideNav from '../src/components/navigation/SideNav';
import { useAuthStore } from '../src/store/useAuthStore';
import { RevenueCatProvider } from '../src/contexts/RevenueCatContext';
import { EntitlementsProvider, useEntitlements } from '../src/contexts/EntitlementsContext';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Send 20% of transactions as performance traces — enough to catch slow screens
  // without burning through your quota. Raise to 1.0 temporarily when debugging perf.
  tracesSampleRate: 0.2,
});

export default Sentry.wrap(function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RevenueCatProvider>
          <EntitlementsProvider>
            <LayoutInner />
          </EntitlementsProvider>
        </RevenueCatProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});

// Checks if the active program day was completed on another device and clears stale local state.
async function syncCrossDevice() {
  const { activeProgramDayId, endWorkout } = useWorkoutStore.getState();
  if (!activeProgramDayId) return;
  const { data } = await supabase
    .from('program_days')
    .select('completed, skipped')
    .eq('id', activeProgramDayId)
    .maybeSingle();
  if (data?.completed || data?.skipped) endWorkout();
}

function LayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, initialize } = useAuthStore();
  const { hasPremiumAccess, loading: entitlementsLoading } = useEntitlements();
  const hydrateBodyWeight = useProfileStore((s) => s.hydrateBodyWeight);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_800ExtraBold,
  });
  if (fontError) console.warn('[Fonts] failed to load:', fontError);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isLoginScreen = segments[0] === 'login';
  const isSubscriptionScreen = segments[0] === 'subscription';

  useEffect(() => {
    initialize();
    drainPendingWorkouts();
    syncCrossDevice();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        drainPendingWorkouts();
        syncCrossDevice();
      }
    });
    return () => sub.remove();
  }, []);

  // Fetch body weight from Supabase whenever the user logs in so it syncs across devices
  useEffect(() => {
    if (!user) return;
    getBodyWeight().then((bw) => {
      if (bw != null) hydrateBodyWeight(bw);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'login' || (segments[0] === 'auth' && segments[1] === 'callback');
    if (!user && !inAuthGroup) {
      // Defer one tick so Expo Router's navigation stack is fully mounted
      // before replacing — calling replace synchronously on first render can
      // fail silently on Android production builds.
      const t = setTimeout(() => router.replace('/login'), 0);
      return () => clearTimeout(t);
    } else if (user && inAuthGroup) {
      router.replace('/workout');
    }
  }, [user, initialized]);

  // Paywall gate: send authenticated non-premium users to /subscription.
  // 800 ms debounce prevents a transient RC state change (e.g. listener firing
  // mid-navigation before the SDK cache catches up) from locking the user out.
  useEffect(() => {
    if (!initialized || entitlementsLoading) return;
    if (user && !hasPremiumAccess && !isLoginScreen && !isSubscriptionScreen) {
      const t = setTimeout(() => router.replace('/subscription'), 800);
      return () => clearTimeout(t);
    }
  }, [initialized, entitlementsLoading, user, hasPremiumAccess, isLoginScreen, isSubscriptionScreen]);

  // Hold a blank screen until auth, fonts, and entitlements are all resolved.
  if (!initialized || (!fontsLoaded && !fontError) || (user && entitlementsLoading)) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="subscription" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="workout" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="workout/quick" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="plate-calculator" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="programs/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="programs/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="programs/templates" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="programs/[id]/day/[dayId]" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="exercise/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="personal-records" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="growth-over-time" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="terms" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="admin/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );

  return (
    <>
      {isLandscape && !isLoginScreen ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <SideNav />
          <View style={{ flex: 1 }}>{stack}</View>
        </View>
      ) : (
        <>
          {stack}
          <PersistentTabBar />
        </>
      )}
    </>
  );
}
