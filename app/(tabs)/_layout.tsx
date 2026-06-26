import { Tabs } from 'expo-router';

// The persistent tab bar is rendered as an overlay in app/_layout.tsx.
// This layout only needs to register the screens so routing works correctly.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="more" />
      {/* Legacy / deep-link screens — not shown in tab bar */}
      <Tabs.Screen name="templates" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
    </Tabs>
  );
}
