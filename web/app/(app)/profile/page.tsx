import { AiKeySettings } from '@/components/ai-key-settings';
import { CustomSelect } from '@/components/custom-select';
import { DeleteAccountButton } from '@/components/delete-account-button';
import { EquipmentPreferences } from '@/components/equipment-preferences';
import { ThemeSelect } from '@/components/theme-select';
import { requireUser } from '@/lib/auth/require-user';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { fetchStripeCustomerId, fetchStripeSubscriptionStatus } from '@/lib/billing/fetch-entitlement-profile';
import { saveProfile, signOut } from './actions';
export default async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const [{ data: profile,error:profileError },{data:equipmentRows,error:equipmentError},stripeSubscriptionStatus,stripeCustomerId] = await Promise.all([supabase.from('user_profiles').select('email,subscription_status,role,body_weight,experience_level,auto_match_weight,use_preferred_equipment,preferred_equipment').eq('id', user.id).maybeSingle(),supabase.from('exercises').select('equipment').order('equipment'),fetchStripeSubscriptionStatus(supabase,user.id),fetchStripeCustomerId(supabase,user.id)]);
  const equipment=[...new Set((equipmentRows??[]).map(row=>row.equipment).filter((item):item is string=>Boolean(item)))],preferred=new Set<string>(Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment:[]);
  const active = profileError ? false : resolveEntitlement({...profile,stripe_subscription_status:stripeSubscriptionStatus}) === 'pro';
  return <main className="content native-profile-page native-gradient-background"><header className="page-header native-profile-hero"><div className="native-avatar" aria-hidden="true">G</div><div><div className="eyebrow">ACCOUNT</div><h1>Profile</h1><p>{profile?.email ?? user.email}</p></div></header>
    {(profileError||equipmentError) && <p className="notice error" role="alert">Could not load your full profile, so editing is disabled to avoid overwriting your saved preferences. Please refresh to try again.</p>}
    {params.checkout === 'success' && <p className="notice success">Payment received. Your membership will update momentarily.</p>}
    {params.billing_error && <p className="notice error">Billing could not be opened. Please try again.</p>}{params.error&&<p className="notice error" role="alert">{String(params.error)}</p>}{params.saved&&<p className="notice success">Profile saved.</p>}
    <section className="surface settings-list native-settings-group"><div className="native-settings-row"><span>Membership</span><strong>{active ? 'Pro' : 'Free'}</strong></div><div className="native-settings-row"><span>Offline workout recovery</span><strong>Enabled</strong></div></section>
    {(profileError||equipmentError) ? <section className="surface profile-form native-settings-group"><p>Your profile settings could not be loaded, so they can't be edited right now. Refresh the page to try again.</p></section> : <form action={saveProfile} className="surface profile-form native-settings-group"><label>Body weight (lb)<input name="bodyWeight" type="number" min="50" max="1000" step="0.1" defaultValue={profile?.body_weight??''}/></label><label>Training experience<CustomSelect name="experience" defaultValue={profile?.experience_level??'intermediate'} options={[{value:'beginner',label:'Beginner'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}]}/></label><div className="setting-row"><div><strong>Auto-match weight</strong><span>Use your recent performance to suggest the next workout weight.</span></div><label className="switch"><input name="autoMatchWeight" type="checkbox" defaultChecked={profile?.auto_match_weight??false}/><span aria-hidden/></label></div><ThemeSelect/><EquipmentPreferences equipment={equipment} initiallyEnabled={profile?.use_preferred_equipment??false} initiallyPreferred={[...preferred]}/><button className="primary">Save profile</button></form>}
    <AiKeySettings/>
    <section className="surface account-actions native-settings-group"><div><h2>Account & billing</h2><p>Manage your membership, download your data, or sign out.</p></div><form action={stripeCustomerId ? '/api/billing/portal' : '/api/billing/checkout'} method="post"><button className="primary full">{stripeCustomerId ? 'Manage billing' : 'Coming Soon: Stripe Integration'}</button></form><a className="secondary full button-link" href="/api/export" role="button">Export workout data</a><form action={signOut}><button className="secondary full">Log out</button></form></section>
    <DeleteAccountButton/>
    <nav className="legal-nav"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></nav>
  </main>;
}
