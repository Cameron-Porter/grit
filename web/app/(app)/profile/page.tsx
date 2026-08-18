import { requireUser } from '@/lib/auth/require-user';
import { signOut,saveProfile } from './actions';
import{ThemeSelect}from'@/components/theme-select';
import{DeleteAccountButton}from'@/components/delete-account-button';
import{AiKeySettings}from'@/components/ai-key-settings';
import{CustomSelect}from'@/components/custom-select';
import{EquipmentPreferences}from'@/components/equipment-preferences';
export default async function Profile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const [{ data: profile,error:profileError },{data:equipmentRows,error:equipmentError}] = await Promise.all([supabase.from('user_profiles').select('email,subscription_status,role,stripe_customer_id,body_weight,experience_level,use_preferred_equipment,preferred_equipment').eq('id', user.id).maybeSingle(),supabase.from('exercises').select('equipment').order('equipment')]);
  if(profileError||equipmentError)throw new Error('Could not load your profile.');
  const equipment=[...new Set((equipmentRows??[]).map(row=>row.equipment).filter((item):item is string=>Boolean(item)))],preferred=new Set<string>(Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment:[]);
  const active = profile?.subscription_status === 'active';
  return <main className="content"><header className="page-header"><div><div className="eyebrow">ACCOUNT</div><h1>Profile</h1><p>{profile?.email ?? user.email}</p></div></header>
    {params.checkout === 'success' && <p className="notice success">Payment received. Your membership will update momentarily.</p>}
    {params.billing_error && <p className="notice error">Billing could not be opened. Please try again.</p>}{params.error&&<p className="notice error" role="alert">{String(params.error)}</p>}{params.saved&&<p className="notice success">Profile saved.</p>}
    <section className="surface settings-list"><div><span>Membership</span><strong>{active ? 'Pro' : 'Free'}</strong></div><div><span>Offline workout recovery</span><strong>Enabled</strong></div></section>
    <form action={saveProfile} className="surface profile-form"><label>Body weight (lb)<input name="bodyWeight" type="number" min="50" max="1000" step="0.1" defaultValue={profile?.body_weight??''}/></label><label>Training experience<CustomSelect name="experience" defaultValue={profile?.experience_level??'intermediate'} options={[{value:'beginner',label:'Beginner'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}]}/></label><ThemeSelect/><EquipmentPreferences equipment={equipment} initiallyEnabled={profile?.use_preferred_equipment??false} initiallyPreferred={[...preferred]}/><button className="primary full">Save profile</button></form>
    <AiKeySettings/>
    <section className="surface account-actions"><div><h2>Account & billing</h2><p>Manage your membership, download your data, or sign out.</p></div><form action={profile?.stripe_customer_id ? '/api/billing/portal' : '/api/billing/checkout'} method="post"><button className="primary full">{profile?.stripe_customer_id ? 'Manage billing' : 'Upgrade with Stripe'}</button></form><a className="secondary full button-link" href="/api/export" role="button">Export workout data</a><form action={signOut}><button className="secondary full">Log out</button></form></section>
    <DeleteAccountButton/>
    <nav className="legal-nav"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></nav>
  </main>;
}
