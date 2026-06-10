import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from "@supabase/supabase-js";
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SSR (Node.js): window doesn't exist → no-op storage so the server render doesn't crash.
// Web browser: use localStorage directly (AsyncStorage's web shim has key-prefixing quirks
//              that break Supabase's session lookup on refresh).
// Native: use AsyncStorage as normal.
function makeStorage() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key: string, value: string) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
}

export const supabase = createClient(url, key, {
  auth: {
    storage: makeStorage(),
    autoRefreshToken: true,
    persistSession: true,
    // On web, Supabase returns tokens in the URL hash after OAuth redirect.
    // On native, we parse the deep-link URL ourselves in useAuthStore.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
