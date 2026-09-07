import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';

export default async function History() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('workouts').select('id,name,created_at,completed_at,program_name').eq('user_id', user.id).is('deleted_at', null).order('completed_at', { ascending: false });
  if (error) throw new Error('Could not load workout history.');
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = data?.filter(w => new Date(w.completed_at ?? w.created_at).getTime() >= weekAgo).length ?? 0;
  return <main className="content native-page">
    <header className="native-page-header"><div><h1>Progress</h1></div><Link className="native-pill-action" href="/progress">Personal records</Link></header>
    <section className="native-stats-row">
      <div className="native-stat-card"><strong>{thisWeek}</strong><span>sessions</span><small>This week</small></div>
      <div className="native-stat-card"><strong>{data?.length ?? 0}</strong><span>workouts</span><small>All time</small></div>
    </section>
    <div className="native-list-stack progress-history-list">{data?.map(w => <Link className="native-list-card history-row" href={`/history/${w.id}`} key={w.id}><div><h2>{w.name ?? w.program_name ?? 'Workout'}</h2><p>{new Date(w.completed_at ?? w.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p></div><span aria-hidden>›</span></Link>)}</div>
    {!data?.length && <section className="native-empty-state"><div aria-hidden="true">🏋</div><h2>No workouts logged</h2><p>Complete your first workout to see your training history and progress here.</p><Link className="primary button-link" href="/workout">Start a Workout</Link></section>}
  </main>;
}
