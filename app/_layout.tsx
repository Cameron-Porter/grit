import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PersistentTabBar from '../src/components/navigation/PersistentTabBar';
import SideNav from '../src/components/navigation/SideNav';
import { useAuthStore } from '../src/store/useAuthStore';
import { RevenueCatProvider } from '../src/contexts/RevenueCatContext';
import { EntitlementsProvider, useEntitlements } from '../src/contexts/EntitlementsContext';

export default function Layout() {
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
}

function LayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, initialize } = useAuthStore();
  const { hasPremiumAccess, loading: entitlementsLoading } = useEntitlements();
  const [fontsLoaded] = useFonts({
    'Square721-BoldExtended': require('../assets/fonts/Square 721 Extended Bold.otf'),
  });
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isLoginScreen = segments[0] === 'login';
  const isSubscriptionScreen = segments[0] === 'subscription';

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'login';
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/workout');
    }
  }, [user, initialized]);

  // Paywall gate: send authenticated non-premium users to /subscription
  useEffect(() => {
    if (!initialized || entitlementsLoading) return;
    if (user && !hasPremiumAccess && !isLoginScreen && !isSubscriptionScreen) {
      router.replace('/subscription');
    }
  }, [initialized, entitlementsLoading, user, hasPremiumAccess, isLoginScreen, isSubscriptionScreen]);

  // Hold a blank screen until auth, fonts, and entitlements are all resolved.
  if (!initialized || !fontsLoaded || (user && entitlementsLoading)) {
    return <View style={{ flex: 1, backgroundColor: '#0B0F14' }} />;
  }

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="subscription" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workout" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="programs/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="programs/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
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
