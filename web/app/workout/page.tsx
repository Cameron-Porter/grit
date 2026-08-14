import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Workout() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect('/login');
  const { data: programs } = await supabase.from('programs').select('id,name,is_current').is('deleted_at', null).order('created_at', { ascending: false });
  const current = programs?.find((program) => program.is_current);
  return (
    <main className="app-shell">
      <header><div><div className="eyebrow">TODAY</div><h1>{current?.name ?? 'Workout'}</h1></div><span className="status">PWA preview</span></header>
      <section className="surface"><h2>Migration in progress</h2><p>Your Supabase account and programs are connected. Workout logging will move here feature-by-feature while the existing app remains the parity reference.</p></section>
    </main>
  );
}
