import { create } from 'zustand';
import { fetchMyProfile } from '../api/userProfile';
import { UserProfile } from '../types/auth';
import { useAuthStore } from './useAuthStore';

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  /** True once a fetch attempt has completed (success or error). Prevents the paywall gate from firing before the first profile load finishes. */
  settled: boolean;
  /** Fetch (or re-fetch) the signed-in user's profile from Supabase. */
  fetchProfile: () => Promise<void>;
  /** Clear profile on sign-out. */
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: null,
  loading: false,
  settled: false,

  fetchProfile: async () => {
    set({ loading: true });
    const profile = await fetchMyProfile();
    set({ profile, loading: false, settled: true });
  },

  clearProfile: () => set({ profile: null, loading: false, settled: false }),
}));

// ── Auto-sync with auth state ─────────────────────────────────────────────────
// subscribe(state, prevState) is available on any Zustand store without extra
// middleware.  We only act when user.id actually changes to avoid thrashing.
useAuthStore.subscribe((state, prevState) => {
  if (state.user?.id !== prevState.user?.id) {
    if (state.user) {
      useUserProfileStore.getState().fetchProfile();
    } else {
      useUserProfileStore.getState().clearProfile();
    }
  }
});
