import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/require-user';
import { buildProgressMetrics, type ProgressSet } from '@/lib/progress/metrics';
import { titleCase } from '@/lib/text/title-case';
import { dashboardCacheTag, DASHBOARD_CACHE_SECONDS } from '@/lib/dashboard/cache';

type ProgramDay = { id: string; week_number: number; day_number: number; label: string | null; completed: boolean | null; skipped: boolean | null };
type CurrentProgram = { id: string; name: string; total_weeks: number; days_per_week: number; focus: string | null };
type WorkoutRow = { id: string; name: string | null; program_name: string | null; completed_at: string | null; created_at: string | null };
type WorkoutSetRow = { workout_id: string; exercise_name: string; weight: number | string | null; reps: number | string | null; completed: boolean | null; equipment: string | null };
type DashboardData = { program: CurrentProgram | null; days: ProgramDay[]; workoutRows: WorkoutRow[]; progressSets: ProgressSet[] };

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not logged';

/**
 * Dashboard reads are cached per-user for DASHBOARD_CACHE_SECONDS and busted immediately
 * by revalidateTag(dashboardCacheTag(userId)) from every write path that can change this
 * data (finish/skip workout, switch active program - see lib/dashboard/cache.ts callers).
 * The TTL is a safety net for any write path that isn't tagged; `supabase` is captured by
 * closure rather than re-created inside the cached function, since unstable_cache doesn't
 * allow calling cookies()/headers() (which client creation depends on) from within it.
 */
const loadDashboardData = (supabase: SupabaseClient, userId: string) => unstable_cache(
  async (): Promise<DashboardData> => {
    const [{ data: current, error: programError }, { data: workouts, error: workoutError }] = await Promise.all([
      supabase.from('programs').select('id,name,total_weeks,days_per_week,focus').eq('user_id', userId).eq('is_current', true).is('deleted_at', null).maybeSingle(),
      supabase.from('workouts').select('id,name,program_name,completed_at,created_at').eq('user_id', userId).is('deleted_at', null).order('completed_at', { ascending: false }).limit(40),
    ]);
    if (programError) throw new Error(`Could not load dashboard program: ${programError.message}`);
    if (workoutError) throw new Error(`Could not load dashboard workouts: ${workoutError.message}`);

    const program = current as CurrentProgram | null;
    const workoutRows = (workouts ?? []) as WorkoutRow[];
    const workoutIds = workoutRows.map(workout => workout.id);

    // program_days and workout_sets depend only on the results above, not on each other -
    // fetch both concurrently instead of chaining two more sequential round-trips.
    const [daysResult, setsResult] = await Promise.all([
      program
        ? supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', program.id).order('week_number').order('day_number')
        : Promise.resolve({ data: [] as ProgramDay[], error: null }),
      workoutIds.length
        ? supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,completed,equipment').in('workout_id', workoutIds).eq('completed', true)
        : Promise.resolve({ data: [] as WorkoutSetRow[], error: null }),
    ]);
    if (daysResult.error) throw new Error(`Could not load dashboard program days: ${daysResult.error.message}`);
    if (setsResult.error) throw new Error(`Could not load dashboard progress: ${setsResult.error.message}`);
    const days = (daysResult.data ?? []) as ProgramDay[];

    let progressSets: ProgressSet[] = [];
    if (workoutIds.length) {
      const dates = new Map(workoutRows.map(workout => [workout.id, workout.completed_at ?? workout.created_at ?? new Date(0).toISOString()]));
      progressSets = ((setsResult.data ?? []) as WorkoutSetRow[]).map(set => ({
        exerciseName: set.exercise_name,
        weight: Number(set.weight ?? 0),
        reps: Number(set.reps ?? 0),
        equipment: set.equipment,
        completedAt: dates.get(set.workout_id) ?? new Date(0).toISOString(),
      }));
    }

    return { program, days, workoutRows, progressSets };
  },
  ['dashboard-data', userId],
  { tags: [dashboardCacheTag(userId)], revalidate: DASHBOARD_CACHE_SECONDS },
)();

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const { program, days, workoutRows, progressSets } = await loadDashboardData(supabase, user.id);

  const completedDays = days.filter(day => day.completed || day.skipped).length;
  const nextDay = days.find(day => !day.completed && !day.skipped);
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = workoutRows.filter(workout => new Date(workout.completed_at ?? workout.created_at ?? 0).getTime() >= weekAgo).length;
  const recentPr = buildProgressMetrics(progressSets).sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())[0];
  const lastWorkout = workoutRows[0];

  return <main className="content native-page native-gradient-background native-dashboard-page">
    <header className="native-page-header stacked native-dashboard-hero">
      <div><div className="eyebrow">GRIT DASHBOARD</div><h1>Ready to train?</h1><p>Your program, workout momentum, and progress shortcuts in one place.</p></div>
      <div className="native-header-actions"><Link className="native-pill-action" href="/workout">Start Workout</Link><Link className="native-pill-action" href="/workout?quick=blank">Quick Workout</Link></div>
    </header>

    <section className="native-stats-row dashboard-stats" aria-label="Training snapshot">
      <div className="native-stat-card"><strong>{thisWeek}</strong><span>sessions</span><small>This week</small></div>
      <div className="native-stat-card"><strong>{workoutRows.length}</strong><span>workouts</span><small>Recent log</small></div>
      <div className="native-stat-card"><strong>{program ? `${completedDays}/${days.length}` : '—'}</strong><span>days</span><small>Program progress</small></div>
    </section>

    <section className="native-section" aria-labelledby="today-training-title">
      <div className="native-section-title"><h2 id="today-training-title">Today's training</h2><span>{nextDay ? `Week ${nextDay.week_number}` : program ? 'Program complete' : 'No active program'}</span></div>
      <article className="native-pro-card dashboard-primary-card">
        <span aria-hidden="true">🏋</span>
        <div><strong>{nextDay ? nextDay.label ?? `Day ${nextDay.day_number}` : program ? 'Program complete' : 'Choose a program'}</strong><small>{program ? `${program.name}${nextDay ? ` · Day ${nextDay.day_number}` : ''}` : 'Start from a template, manual program, or AI builder.'}</small></div>
        <Link className="native-pill-action" href={program ? '/workout' : '/programs'}>{program ? 'Start Workout' : 'Programs'}</Link>
      </article>
    </section>

    <section className="native-section" aria-labelledby="active-program-title">
      <div className="native-section-title"><h2 id="active-program-title">Active program</h2><span>{program?.focus ? titleCase(program.focus) : 'Not selected'}</span></div>
      {program ? <Link className="native-list-card dashboard-program-card" href={`/programs/${program.id}`}><div><div className="native-row-title"><h2>{program.name}</h2><span className="native-badge solid">Active</span></div><p>{program.total_weeks} weeks · {program.days_per_week} days/week · {completedDays}/{days.length} days done</p></div><b aria-hidden="true">›</b></Link> : <section className="native-empty-state dashboard-inline-empty"><div aria-hidden="true">▣</div><h2>No active program</h2><p>Pick a template or create a program to make the dashboard actionable.</p><Link className="primary button-link" href="/programs/templates">Browse templates</Link></section>}
    </section>

    <section className="native-section" aria-labelledby="recent-progress-title">
      <div className="native-section-title"><h2 id="recent-progress-title">Recent progress</h2><span>{lastWorkout ? formatDate(lastWorkout.completed_at ?? lastWorkout.created_at) : 'No workouts yet'}</span></div>
      <div className="native-list-stack">
        {recentPr && <Link className="native-list-card" href="/progress"><div><h2>{recentPr.exerciseName}</h2><p>Best recent set: {recentPr.bestWeight} lb × {recentPr.bestReps}</p></div><span className="native-badge tint">PR</span></Link>}
        {lastWorkout && <Link className="native-list-card" href={`/history/${lastWorkout.id}`}><div><h2>{lastWorkout.name ?? lastWorkout.program_name ?? 'Workout'}</h2><p>Last logged {formatDate(lastWorkout.completed_at ?? lastWorkout.created_at)}</p></div><b aria-hidden="true">›</b></Link>}
        {!recentPr && !lastWorkout && <section className="native-empty-state dashboard-inline-empty"><div aria-hidden="true">↗</div><h2>No progress yet</h2><p>Log your first workout and your dashboard will surface your recent best sets.</p><Link className="primary button-link" href="/workout">Start Workout</Link></section>}
      </div>
    </section>

    <section className="native-section" aria-labelledby="quick-actions-title">
      <div className="native-section-title"><h2 id="quick-actions-title">Quick actions</h2><span>Shortcuts</span></div>
      <div className="dashboard-action-grid">
        <Link className="native-row" href="/programs/templates"><div><h2>Templates</h2><p>Start from a curated structure.</p></div><b aria-hidden="true">›</b></Link>
        <Link className="native-row" href="/programs/ai"><div><h2>AI Builder</h2><p>Draft exercise selections from goals and equipment.</p></div><b aria-hidden="true">›</b></Link>
        <Link className="native-row" href="/exercises"><div><h2>Exercises</h2><p>Catalog, details, and plate calculator.</p></div><b aria-hidden="true">›</b></Link>
        <Link className="native-row" href="/history"><div><h2>History</h2><p>Review completed workouts.</p></div><b aria-hidden="true">›</b></Link>
      </div>
    </section>
  </main>;
}
