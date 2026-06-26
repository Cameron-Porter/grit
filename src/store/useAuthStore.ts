import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { useProfileStore } from './useProfileStore';
import { useWorkoutStore } from './useWorkoutStore';

WebBrowser.maybeCompleteAuthSession();

// Module-level guard so React Strict Mode double-invoke doesn't create two subscriptions
let _authInitialized = false;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: () => {
    if (_authInitialized) return;
    _authInitialized = true;

    // onAuthStateChange fires immediately with INITIAL_SESSION on startup,
    // giving us the session from storage (localStorage on web, AsyncStorage on native).
    // This is the single source of truth for both the session state and `initialized`.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (!error) return null;
    return humanizeError(error.message, 'login');
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });
    if (!error) return null;
    return humanizeError(error.message, 'signup');
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // Clear persisted data and reset in-memory state so a new user starts fresh
    await AsyncStorage.multiRemove(['grit-workout-storage', 'grit-profile-storage']);
    useWorkoutStore.getState().endWorkout();
    useProfileStore.getState().reset();
    set({ user: null, session: null, initialized: true });
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      if (Platform.OS === 'web') {
        // On web, custom URL schemes (grit://) don't work in browsers.
        // Use a standard full-page redirect instead — Supabase navigates away,
        // Google authenticates, and Supabase redirects back to the origin with
        // tokens in the URL hash. detectSessionInUrl:true (set in supabase.ts)
        // picks them up automatically on the return load.
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        set({ loading: false });
        if (error) return 'Unable to sign in with Google. Please try again.';
        // Page is navigating away — nothing more to do here.
        return null;
      }

      // Native: open OAuth URL in an in-app browser and capture the deep-link callback.
      const redirectTo = 'grit://auth/callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        set({ loading: false });
        return 'Unable to sign in with Google. Please try again.';
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const { accessToken, refreshToken } = parseTokensFromUrl(result.url);
        if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          });
          if (sessionError) {
            set({ loading: false });
            return 'Unable to sign in with Google. Please try again.';
          }
        }
      }

      set({ loading: false });
      return null;
    } catch {
      set({ loading: false });
      return 'Unable to sign in with Google. Please try again.';
    }
  },
}));

function parseTokensFromUrl(raw: string): { accessToken: string | null; refreshToken: string | null } {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  try {
    const parsed = new URL(raw);
    // Try fragment first (implicit flow)
    if (parsed.hash) {
      const frag = new URLSearchParams(parsed.hash.slice(1));
      accessToken = frag.get('access_token');
      refreshToken = frag.get('refresh_token');
    }
    // Fall back to query string (PKCE exchange token is code, but access_token may also appear here)
    if (!accessToken) {
      accessToken = parsed.searchParams.get('access_token');
      refreshToken = parsed.searchParams.get('refresh_token');
    }
  } catch {
    // URL constructor can fail on custom schemes in some envs — manual split
    const hashIdx = raw.indexOf('#');
    const qIdx = raw.indexOf('?');
    if (hashIdx !== -1) {
      const frag = new URLSearchParams(raw.slice(hashIdx + 1));
      accessToken = frag.get('access_token');
      refreshToken = frag.get('refresh_token');
    } else if (qIdx !== -1) {
      const qs = new URLSearchParams(raw.slice(qIdx + 1));
      accessToken = qs.get('access_token');
      refreshToken = qs.get('refresh_token');
    }
  }
  return { accessToken, refreshToken };
}

function humanizeError(raw: string, mode: 'login' | 'signup'): string {
  const s = raw.toLowerCase();
  if (s.includes('invalid login') || s.includes('invalid password') || s.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  if (s.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (s.includes('already registered') || s.includes('already in use') || s.includes('already exists')) {
    // Intentionally vague — don't reveal whether the email is in use
    return mode === 'signup'
      ? 'Unable to create account. Please try again.'
      : 'Invalid email or password.';
  }
  if (s.includes('rate limit') || s.includes('too many requests') || s.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (s.includes('weak password') || s.includes('password should be') || s.includes('at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (s.includes('invalid email') || s.includes('unable to validate email')) {
    return 'Please enter a valid email address.';
  }
  return 'Something went wrong. Please try again.';
}
