import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';

export const dynamic = 'force-dynamic';

export default async function WorkoutHistoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('id,name,program_name,completed_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load workout: ${error.message}`);
  if (!workout) notFound();

  const [{ data: sets, error: setError }, { data: feedback, error: feedbackError }] = await Promise.all([
    supabase
      .from('workout_sets')
      .select('exercise_name,muscle_group,equipment,note,exercise_index,set_index,reps,weight,rir,reported_rir')
      .eq('workout_id', id)
      .order('exercise_index')
      .order('set_index'),
    supabase.from('workout_feedback').select('muscle_group,joint_pain,pump,volume,soreness').eq('workout_id', id),
  ]);
  if (setError) throw new Error(`Could not load sets: ${setError.message}`);
  if (feedbackError) throw new Error(`Could not load feedback: ${feedbackError.message}`);

  const grouped = new Map<string, typeof sets>();
  for (const set of sets ?? []) {
    const rows = grouped.get(set.exercise_name) ?? [];
    rows.push(set);
    grouped.set(set.exercise_name, rows);
  }

  return <main className="content native-page native-gradient-background">
    <a className="back-link" href="/history">← History</a>
    <header className="page-header native-page-header">
      <div>
        <div className="eyebrow">{new Date(workout.completed_at).toLocaleDateString()}</div>
        <h1>{workout.name}</h1>
        <p>{workout.program_name}</p>
      </div>
    </header>
    <div className="exercise-stack native-list-stack">
      {[...grouped].map(([name, rows]) => <section className="surface exercise-card native-workout-card history-exercise-card" key={name}>
        <span className="native-muscle-stripe" aria-hidden="true" />
        <div className="exercise-title native-exercise-title">
          <div>
            <div className="cap native-muscle-label">{rows[0]?.muscle_group ?? 'Exercise'}</div>
            <h2>{name}</h2>
            <p>{[rows[0]?.muscle_group, rows[0]?.equipment].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {rows.map((set, index) => <div className="history-set native-set-row" key={set.set_index}>
          <strong>Set {index + 1}</strong>
          <span>{set.weight} lb × {set.reps}</span>
          <span>{set.reported_rir == null ? 'RIR not reported' : `RIR ${set.reported_rir}`}</span>
        </div>)}
      </section>)}
    </div>
    {feedback?.length ? <section className="surface feedback-summary recovery-feedback">
      <header><div><div className="eyebrow">RECOVERY</div><h2>Training feedback</h2></div><span>{feedback.length} {feedback.length === 1 ? 'muscle' : 'muscles'}</span></header>
      <div className="recovery-feedback-list">{feedback.map((item) => <article className="native-workout-card recovery-feedback-item" key={item.muscle_group}>
        <span className="native-muscle-stripe" aria-hidden="true" />
        <header><div className="eyebrow">MUSCLE GROUP</div><h3>{item.muscle_group}</h3></header>
        <dl>
          <div><dt>Soreness</dt><dd>{item.soreness || 'Not reported'}</dd></div>
          <div><dt>Joint pain</dt><dd>{item.joint_pain || 'Not reported'}</dd></div>
          <div><dt>Pump</dt><dd>{item.pump || 'Not reported'}</dd></div>
          <div><dt>Volume</dt><dd>{item.volume || 'Not reported'}</dd></div>
        </dl>
      </article>)}</div>
    </section> : null}
  </main>;
}
