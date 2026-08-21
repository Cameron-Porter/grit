import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { CustomSelect } from '@/components/custom-select';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { createProgram, setCurrentProgram } from './actions';

const weekOptions = Array.from({ length:15 },(_,index) => ({ value:String(index + 2),label:`${index + 2} weeks` }));
const dayOptions = Array.from({ length:7 },(_,index) => ({ value:String(index + 1),label:`${index + 1} ${index === 0 ? 'day' : 'days'} per week` }));

export default async function Programs({ searchParams }:{ searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const { supabase,user } = await requireUser();
  const [{ data,error },{ data:profile,error:profileError }] = await Promise.all([
    supabase.from('programs').select('id,name,total_weeks,days_per_week,is_current,focus,program_days(completed,skipped)').eq('user_id',user.id).is('deleted_at',null).order('created_at',{ ascending:false }),
    supabase.from('user_profiles').select('role,subscription_status,stripe_subscription_status').eq('id',user.id).maybeSingle(),
  ]);
  if(error)throw new Error('Could not load programs.');
  if(profileError)throw new Error('Could not load your membership status.');
  const isPro = resolveEntitlement(profile) === 'pro';
  return <main className="content">
    <header className="page-header"><div><div className="eyebrow">TRAINING</div><h1>Programs</h1></div><div className="header-actions"><Link className="secondary compact" href="/programs/templates">Templates</Link>{isPro ? <Link className="primary compact" href="/programs/ai">Build with AI</Link> : <Link className="secondary compact" href="/profile">Upgrade for AI programs</Link>}</div></header>
    {params.error&&<p className="notice error" role="alert">{String(params.error)}</p>}
    <details className="surface create-panel"><summary>Create manually</summary><form action={createProgram} className="form-grid"><label>Name<input name="name" required maxLength={80}/></label><label>Weeks<CustomSelect name="weeks" defaultValue="5" options={weekOptions}/></label><label>Days/week<CustomSelect name="days" defaultValue="4" options={dayOptions}/></label><button>Create</button></form></details>
    <div className="stack">{data?.map(program=>{const days=program.program_days??[],done=days.filter(day=>day.completed||day.skipped).length;return <article className="surface program-card" key={program.id}><Link href={`/programs/${program.id}`}><div className="title-line"><h2>{program.name}</h2>{program.is_current&&<span className="pill">Active</span>}</div><p>{program.total_weeks} weeks · {program.days_per_week} days/week</p></Link><div className="program-actions"><strong>{done}/{days.length}</strong>{!program.is_current&&<form action={setCurrentProgram}><input type="hidden" name="id" value={program.id}/><button className="quiet compact">Use</button></form>}</div></article>})}</div>
    {!data?.length&&<section className="empty"><h2>No programs yet</h2><p>Create your first structured training program.</p></section>}
  </main>;
}
