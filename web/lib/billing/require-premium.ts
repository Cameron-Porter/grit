import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveEntitlement } from './entitlement';

/**
 * Server-side entitlement gate for any page or action that requires Pro
 * access (currently: AI program generation). Redirects free users to
 * /profile with an explanatory message instead of letting the page render
 * or the action run — this is the enforcement point the 2026-08-17 audit
 * found missing (StripeBillingProvider.getEntitlement() existed but nothing
 * called it before exposing "Build with AI" or before saveAiProgram wrote
 * data).
 */
export async function requirePremiumAccess(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await supabase.from('user_profiles').select('role,subscription_status,stripe_subscription_status').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (resolveEntitlement(data) !== 'pro') {
    redirect('/profile?error=' + encodeURIComponent('GRIT Pro is required for AI-generated programs. Upgrade to continue.'));
  }
}
