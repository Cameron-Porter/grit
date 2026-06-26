import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/api/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  useEffect(() => {
    if (!code) {
      router.replace('/login');
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      // onAuthStateChange in useAuthStore fires automatically on success,
      // setting user and triggering the root layout's redirect to /workout.
      if (error) router.replace('/login');
    });
  }, [code]);

  // Show the same dark background as the splash while exchanging the code.
  return <View style={{ flex: 1, backgroundColor: '#111114' }} />;
}
