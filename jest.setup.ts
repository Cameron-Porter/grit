// Stub env vars for tests
process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-gemini-key-12345';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => null,
  Link: ({ children }: any) => children,
  useFocusEffect: (cb: () => void) => cb(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'Medium' } }));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({}));

// Mock @expo/vector-icons so icon components render as plain Views in tests
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Icon = () => React.createElement(View, null);
  return {
    MaterialCommunityIcons: Icon,
    Ionicons: Icon,
    FontAwesome: Icon,
  };
});
