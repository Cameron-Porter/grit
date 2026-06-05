import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="programs/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="programs/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="programs/[id]/day/[dayId]" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="exercise/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
