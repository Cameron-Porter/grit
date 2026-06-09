import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PersistentTabBar from '../src/components/navigation/PersistentTabBar';
import { useAuthStore } from '../src/store/useAuthStore';
import { useWorkoutStore } from '../src/store/useWorkoutStore';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initialized, initialize } = useAuthStore();
  const { activeWorkoutId, exercises } = useWorkoutStore();
  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'login';
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // If there's an in-progress workout, jump straight into it
      router.replace(hasActiveWorkout ? '/workout' : '/(tabs)/programs');
    }
  }, [user, initialized]);

  // Hold a blank screen until auth state is known — prevents flashing
  // to /login before the stored session is loaded from storage.
  if (!initialized) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#0B0F14' }} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="programs/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="programs/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="programs/[id]/day/[dayId]" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="exercise/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      <PersistentTabBar />
    </GestureHandlerRootView>
  );
}
