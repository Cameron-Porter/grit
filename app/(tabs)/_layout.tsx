import { Tabs } from 'expo-router';

// The persistent tab bar is rendered as an overlay in app/_layout.tsx.
// This layout only needs to register the screens so routing works correctly.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="templates" />
      <Tabs.Screen name="exercises" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
