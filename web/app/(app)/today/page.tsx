import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth/require-user';
import { dashboardCacheTag, DASHBOARD_CACHE_SECONDS } from '@/lib/today/cache';

type ProgramDay = {
  id: string;
  week_number: number;
  day_number: number;
  label: string | null;
  completed: boolean | null;
  skipped: boolean | null;
};

type CurrentProgram = {
  id: string;
  name: string;
  total_weeks: number;
  days_per_week: number;
  focus: string | null;
};

type TodayData = {
  program: CurrentProgram | null;
  nextDay: ProgramDay | null;
  completedDays: number;
  totalDays: number;
};

const loadTodayData = (supabase: SupabaseClient, userId: string) => unstable_cache(
  async (): Promise<TodayData> => {
    const { data: current, error: programError } = await supabase.from('programs')
      .select('id,name,total_weeks,days_per_week,focus')
      .eq('user_id', userId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (programError) throw new Error(`Could not load today program: ${programError.message}`);

    const program = current as CurrentProgram | null;
    if (!program) {
      return { program: null, nextDay: null, completedDays: 0, totalDays: 0 };
    }

    const { data, error: daysError } = await supabase.from('program_days')
      .select('id,week_number,day_number,label,completed,skipped')
      .eq('program_id', program.id)
      .order('week_number')
      .order('day_number');

    if (daysError) throw new Error(`Could not load today program days: ${daysError.message}`);

    const days = (data ?? []) as ProgramDay[];
    return {
      program,
      nextDay: days.find(day => !day.completed && !day.skipped) ?? null,
      completedDays: days.filter(day => day.completed || day.skipped).length,
      totalDays: days.length,
    };
  },
  ['today-data', userId],
  { tags: [dashboardCacheTag(userId)], revalidate: DASHBOARD_CACHE_SECONDS },
)();

export default async function TodayPage() {
  const { supabase, user } = await requireUser();
  const { program, nextDay, completedDays, totalDays } = await loadTodayData(supabase, user.id);

  const hasProgram = Boolean(program);
  const primaryHref = hasProgram ? '/workout' : '/programs';
  const primaryLabel = hasProgram ? 'Start Workout' : 'Choose Program';

  return (
    <main className="content native-page native-gradient-background native-dashboard-page">
      <header className="native-page-header stacked native-dashboard-hero">
        <div>
          <div className="eyebrow">TODAY</div>
          <h1>Ready to train?</h1>
          <p>Fast-launch into your next workout.</p>
        </div>
        <div className="native-header-actions">
          <Link className="native-pill-action" href={primaryHref}>{primaryLabel}</Link>
          <Link className="native-pill-action" href="/workout?quick=blank">Quick Workout</Link>
        </div>
      </header>

      <section className="native-section" aria-labelledby="today-training-title">
        <div className="native-section-title">
          <h2 id="today-training-title">Today's training</h2>
          <span>{nextDay ? `Week ${nextDay.week_number}` : program ? 'Program complete' : 'No active program'}</span>
        </div>
        <article className="native-pro-card dashboard-primary-card">
          <span aria-hidden="true">🏋</span>
          <div>
            <strong>{nextDay ? nextDay.label ?? `Day ${nextDay.day_number}` : program ? 'Program complete' : 'Choose a program'}</strong>
            <small>{program ? `${program.name}${nextDay ? ` · Day ${nextDay.day_number}` : ''}` : 'Pick a template or create a program to make launch actionable.'}</small>
          </div>
          <Link className="native-pill-action" href={primaryHref}>{primaryLabel}</Link>
        </article>
      </section>

      <section className="native-stats-row dashboard-stats" aria-label="Program snapshot">
        <div className="native-stat-card"><strong>{program ? `${completedDays}/${totalDays}` : '—'}</strong><span>days</span><small>Program progress</small></div>
        <div className="native-stat-card"><strong>{program?.days_per_week ?? '—'}</strong><span>days/wk</span><small>Schedule</small></div>
        <div className="native-stat-card"><strong>{program?.total_weeks ?? '—'}</strong><span>weeks</span><small>Plan length</small></div>
      </section>

      <section className="native-section" aria-labelledby="quick-actions-title">
        <div className="native-section-title"><h2 id="quick-actions-title">Quick actions</h2><span>Open when needed</span></div>
        <div className="dashboard-action-grid">
          <Link className="native-row" href="/history"><div><h2>History</h2><p>Review completed workouts.</p></div><b aria-hidden="true">›</b></Link>
          <Link className="native-row" href="/programs/templates"><div><h2>Templates</h2><p>Start from a curated structure.</p></div><b aria-hidden="true">›</b></Link>
          <Link className="native-row" href="/exercises"><div><h2>Exercises</h2><p>Catalog, details, and plate calculator.</p></div><b aria-hidden="true">›</b></Link>
        </div>
      </section>
    </main>
  );
}
