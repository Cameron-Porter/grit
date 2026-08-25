import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { fetchStripeSubscriptionStatus } from '@/lib/billing/fetch-entitlement-profile';
import { setCurrentProgram } from './actions';

export default async function Programs({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const { supabase,user } = await requireUser();
  const [{ data,error },{ data:profile,error:profileError },stripeSubscriptionStatus] = await Promise.all([
    supabase.from('programs').select('id,name,total_weeks,days_per_week,is_current,focus,program_days(completed,skipped)').eq('user_id',user.id).is('deleted_at',null).order('created_at',{ ascending:false }),
    supabase.from('user_profiles').select('role,subscription_status,stripe_subscription_status').eq('id',user.id).maybeSingle(),
    fetchStripeSubscriptionStatus(supabase,user.id),
  ]);
  if(error)throw new Error('Could not load programs.');
  const isPro = profileError ? false : resolveEntitlement({...profile,stripe_subscription_status:stripeSubscriptionStatus}) === 'pro';
  return <main className="content native-page">
    <header className="native-page-header"><h1>Programs</h1><div className="native-header-actions"><Link className="native-pill-action" href="/programs/templates"><span aria-hidden="true">▦</span>Templates</Link><Link className="native-icon-action" href="/programs/create" aria-label="Create program">+</Link></div></header>
    {profileError&&<p className="notice error" role="alert">Could not load your membership. Showing standard program options.</p>}
    {params.error&&<p className="notice error" role="alert">{String(params.error)}</p>}
    {isPro ? <Link className="native-pro-card" href="/programs/ai"><span aria-hidden="true">✦</span><div><strong>Build with AI</strong><small>Generate a program from your goals and equipment.</small></div><b>›</b></Link> : <Link className="native-pro-card" href="/profile"><span aria-hidden="true">♕</span><div><strong>Start Your Free Trial</strong><small>Unlock AI-generated programs and premium tooling.</small></div><b>›</b></Link>}
    <div className="native-list-stack">{data?.map(program=>{const days=program.program_days??[],done=days.filter(day=>day.completed||day.skipped).length,isComplete=days.length>0&&done===days.length,status=isComplete?'COMPLETE':program.is_current?'ACTIVE':'PAUSED';return <article className="native-list-card program-card" key={program.id}><Link href={`/programs/${program.id}`}><div className="native-row-title"><h2>{program.name}</h2><span className={`native-badge ${program.is_current?'solid':'ghost'}`}>{status}</span></div><p>{program.total_weeks} weeks · {program.days_per_week} days/week{done>0?` · ${done}/${days.length} days done`:''}</p></Link><div className="program-actions"><strong>{done}/{days.length}</strong>{!program.is_current&&!isComplete&&<form action={setCurrentProgram}><input type="hidden" name="id" value={program.id}/><button className="quiet compact">Use</button></form>}</div></article>})}</div>
    {!data?.length&&<section className="native-empty-state"><div aria-hidden="true">▣</div><h2>No programs yet</h2><p>Build your first program to get started with structured, progressive training.</p><Link className="primary button-link" href="/programs/create">Create Program</Link><Link className="quiet button-link" href="/programs/templates">Browse templates →</Link></section>}
  </main>;
}
