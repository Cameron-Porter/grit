import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUserProfileStore } from '../store/useUserProfileStore';
import { useRevenueCatContext } from './RevenueCatContext';
import {
  hasPremiumAccess as computePremiumAccess,
  isAdmin as computeIsAdmin,
  isVip as computeIsVip,
  hasRole as computeHasRole,
  hasAnyRole as computeHasAnyRole,
} from '../lib/entitlements';
import { UserProfile, UserRole } from '../types/auth';
import { assignRole as apiAssignRole } from '../api/userProfile';

// ─────────────────────────────────────────────────────────────────────────────

interface EntitlementsContextValue {
  // ── Access flags ────────────────────────────────────────────────────────────
  hasPremiumAccess: boolean;
  isAdmin: boolean;
  isVip: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;

  // ── Raw data ────────────────────────────────────────────────────────────────
  profile: UserProfile | null;
  /** True while either RC or the profile is still loading. */
  loading: boolean;

  // ── Admin actions ───────────────────────────────────────────────────────────
  /** Assign a role to any user. Throws if the caller is not an admin. */
  assignRole: (targetUserId: string, role: UserRole) => Promise<void>;
  /** Re-fetch the current user's profile (e.g. after an admin changes your role). */
  refreshProfile: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { profile, loading: profileLoading, settled: profileSettled, fetchProfile, clearProfile } = useUserProfileStore();
  const { isProMember, loading: rcLoading } = useRevenueCatContext();

  // Keep profile in sync with auth state.
  // The Zustand subscriber in useUserProfileStore handles this automatically,
  // but we also call it here to ensure the profile is fresh on mount if the
  // user is already signed in when this provider first renders.
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      clearProfile();
    }
  }, [user?.id]);

  // Stay loading until RC is done AND the profile fetch has settled at least once.
  // Without `profileSettled`, there's a render window where rcLoading flips to false
  // before profileLoading has been set to true, causing the paywall to fire on stale data.
  const loading = rcLoading || (!!user && (!profileSettled || profileLoading));

  const value: EntitlementsContextValue = {
    hasPremiumAccess: computePremiumAccess(profile, isProMember),
    isAdmin:          computeIsAdmin(profile),
    isVip:            computeIsVip(profile),
    hasRole:          (role) => computeHasRole(profile, role),
    hasAnyRole:       (roles) => computeHasAnyRole(profile, roles),

    profile,
    loading,

    assignRole: async (targetUserId, role) => {
      await apiAssignRole(targetUserId, role);
    },
    refreshProfile: fetchProfile,
  };

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return ctx;
}
