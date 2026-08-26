import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { removeProgramExercise } from '../../../actions';
import { DayExerciseStager } from '@/components/day-exercise-stager';
import { ExerciseSwapForm } from '@/components/exercise-swap-form';
import { filterExercisesByEquipmentPreference } from '@/lib/programs/day-template-payload';
import { resolveExercisePrescription } from '@/lib/workout/prescription';

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="trash-icon">
    <path d="M4.75 7.25h14.5"/>
    <path d="M9.75 7.25V5a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v2.25"/>
    <path d="M6.75 7.25v11.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V7.25"/>
    <path d="M10.25 11v6M13.75 11v6"/>
  </svg>;
}

export default async function ProgramDay({ params }:{ params:Promise<{ id:string; dayId:string }> }) {
  const { id, dayId } = await params;
  const { supabase, user } = await requireUser();
  const { data: program, error: programError } = await supabase.from('programs').select('id,name,muscle_priorities').eq('id', id).eq('user_id', user.id).is('deleted_at', null).maybeSingle();
  if (programError) throw new Error(`Could not load program: ${programError.message}`);
  if (!program) notFound();
  const { data: day, error: dayError } = await supabase.from('program_days').select('id,program_id,week_number,day_number,label,completed,skipped').eq('id', dayId).eq('program_id', id).maybeSingle();
  if (dayError) throw new Error(`Could not load this training day: ${dayError.message}`);
  if (!day) notFound();
  const heading = day.label ?? `Day ${day.day_number}`;

  if (day.completed) {
    const { data: workout, error: workoutError } = await supabase.from('workouts').select('id').eq('program_day_id', day.id).eq('user_id', user.id).is('deleted_at', null).order('completed_at', { ascending:false }).limit(1).maybeSingle();
    if (workoutError) throw new Error(`Could not load the logged workout: ${workoutError.message}`);
    if (!workout) return <main className="content native-page native-gradient-background">
      <a className="back-link" href={`/programs/${id}`}>← Program</a>
      <header className="page-header native-page-header"><div><h1>{heading}</h1><p className="day-week-label">Week {day.week_number}</p></div><span className="native-badge solid">Completed</span></header>
      <section className="surface empty-state native-empty-state"><h2>No logged data found</h2><p>This day is marked complete, but its workout record could not be found.</p></section>
    </main>;
    const [{ data: sets, error: setError }, { data: feedback, error: feedbackError }] = await Promise.all([
      supabase.from('workout_sets').select('exercise_name,muscle_group,equipment,exercise_index,set_index,reps,weight,reported_rir').eq('workout_id', workout.id).eq('completed', true).order('exercise_index').order('set_index'),
      supabase.from('workout_feedback').select('muscle_group,joint_pain,pump,volume,soreness').eq('workout_id', workout.id),
    ]);
    if (setError) throw new Error(`Could not load logged sets: ${setError.message}`);
    if (feedbackError) throw new Error(`Could not load session feedback: ${feedbackError.message}`);
    const grouped = new Map<string, typeof sets>();
    for (const set of sets ?? []) { const rows = grouped.get(set.exercise_name) ?? []; rows.push(set); grouped.set(set.exercise_name, rows); }
    return <main className="content native-page native-gradient-background">
      <a className="back-link" href={`/programs/${id}`}>← Program</a>
      <header className="page-header native-page-header"><div><h1>{heading}</h1><p className="day-week-label">Week {day.week_number}</p></div><span className="native-badge solid">Completed</span></header>
      <div className="exercise-stack native-workout-screen">{[...grouped].map(([name, rows]) => <section className="surface exercise-card native-workout-card" key={name}>
        <span className="native-muscle-stripe" aria-hidden="true"/>
        <div className="exercise-title native-exercise-title"><div><div className="cap native-muscle-label">{rows[0]?.muscle_group ?? 'Exercise'}</div><h2>{name}</h2><p>{rows[0]?.equipment || 'Bodyweight'}</p></div></div>
        <div className="set-grid set-grid-header native-set-row" aria-hidden="true"><span/><span>WEIGHT</span><span>REPS</span><span>LOG</span></div>
        {rows.map((set, index) => <div className="set-grid native-set-row set-complete" key={index}><span/><span>{set.weight}</span><span>{set.reps}</span><span className="set-check-wrap"><span className="set-check" aria-label="Set complete">✓</span></span></div>)}
      </section>)}</div>
      {feedback?.length ? <section className="surface recovery-feedback"><header><div><div className="eyebrow">SESSION FEEDBACK</div><h2>How it went</h2></div></header>
        <div className="recovery-feedback-list">{feedback.map((item) => <article className="native-workout-card recovery-feedback-item" key={item.muscle_group}>
          <span className="native-muscle-stripe" aria-hidden="true"/>
          <header><div className="eyebrow">MUSCLE GROUP</div><h3>{item.muscle_group}</h3></header>
          <dl><div><dt>Pump</dt><dd>{item.pump || 'Not reported'}</dd></div><div><dt>Volume</dt><dd>{item.volume || 'Not reported'}</dd></div><div><dt>Joint pain</dt><dd>{item.joint_pain || 'Not reported'}</dd></div><div><dt>Soreness</dt><dd>{item.soreness || 'Not reported'}</dd></div></dl>
        </article>)}</div>
      </section> : null}
    </main>;
  }

  const isTemplateDay = day.week_number === 1;
  const { data: templateDayRow, error: templateDayError } = isTemplateDay
    ? { data: { id: day.id }, error: null }
    : await supabase.from('program_days').select('id').eq('program_id', id).eq('week_number', 1).eq('day_number', day.day_number).maybeSingle();
  if (templateDayError) throw new Error(`Could not load the exercise template: ${templateDayError.message}`);
  if (!templateDayRow) throw new Error('The program is missing its Week 1 exercise template.');

  const [{ data: templateExercises, error: exerciseError }, { data: targets, error: targetError }, { data: catalog, error: catalogError }, { data: profile, error: profileError }, { data: feedbackRows, error: feedbackError }] = await Promise.all([
    supabase.from('program_exercises').select('id,exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir').eq('program_day_id', templateDayRow.id).order('sort_order'),
    supabase.from('program_day_targets').select('exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir').eq('program_day_id', day.id),
    supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max').order('name'),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id', user.id).maybeSingle(),
    supabase.from('workout_feedback').select('muscle_group,pump,joint_pain').order('created_at', { ascending:false }).limit(200),
  ]);
  if (exerciseError) throw new Error(`Could not load exercises: ${exerciseError.message}`);
  if (targetError) throw new Error(`Could not load progression targets: ${targetError.message}`);
  if (catalogError) throw new Error(`Could not load the exercise catalog: ${catalogError.message}`);
  if (profileError) throw new Error(`Could not load equipment preferences: ${profileError.message}`);
  if (feedbackError) throw new Error(`Could not load recovery feedback: ${feedbackError.message}`);
  const targetByName = new Map((targets ?? []).map((target) => [target.exercise_name, target]));
  const exercises = (templateExercises ?? []).map((exercise) => ({ ...exercise, prescription: resolveExercisePrescription(exercise, targetByName.get(exercise.exercise_name), exercise.muscle_group ? program.muscle_priorities?.[exercise.muscle_group] ?? null : null) }));
  const preferred = Array.isArray(profile?.preferred_equipment) ? profile.preferred_equipment.filter((item):item is string => typeof item === 'string') : [];
  const visibleCatalog = filterExercisesByEquipmentPreference(catalog ?? [], { enabled:Boolean(profile?.use_preferred_equipment), preferred });

  return <main className="content native-page native-gradient-background">
    <a className="back-link" href={`/programs/${id}`}>← Program</a>
    <header className="page-header native-page-header"><div><h1>{heading}</h1><p className="day-week-label">Week {day.week_number}</p></div></header>
    <div className="exercise-stack native-list-stack">
      {exercises.map((exercise) => <article className="surface exercise-card native-workout-card day-preview-card" key={exercise.id}>
        <span className="native-muscle-stripe" aria-hidden="true"/>
        <div className="exercise-title native-exercise-title">
          <div><div className="cap native-muscle-label">{exercise.muscle_group ?? 'Exercise'}</div><h2>{exercise.exercise_name}</h2><p>{exercise.equipment || 'Bodyweight'}</p></div>
          {isTemplateDay && <form action={removeProgramExercise}><input type="hidden" name="programId" value={id}/><input type="hidden" name="exerciseId" value={exercise.id}/><input type="hidden" name="returnTo" value={`/programs/${id}/day/${day.id}`}/><button type="submit" className="remove-set delete-exercise-button" aria-label={`Remove ${exercise.exercise_name}`}><TrashIcon/></button></form>}
        </div>
        <span className="pill rir-target">⚡ {exercise.prescription.sets}×{exercise.prescription.repsMin}–{exercise.prescription.repsMax} @ {exercise.prescription.rir} RIR</span>
        {isTemplateDay && <ExerciseSwapForm programId={id} exercise={exercise} catalog={visibleCatalog} returnTo={`/programs/${id}/day/${day.id}`}/>}
      </article>)}
      {exercises.length === 0 && <section className="surface empty-state native-empty-state"><h2>No exercises scheduled</h2><p>{isTemplateDay ? 'Add an exercise below to get started.' : 'This day inherits its exercises from the Week 1 template.'}</p></section>}
    </div>
    {isTemplateDay && <>
      {profile?.use_preferred_equipment && preferred.length > 0 && <p className="notice">Exercise choices are limited to your preferred equipment: {preferred.join(', ')}.</p>}
      <DayExerciseStager programId={id} dayId={templateDayRow.id} catalog={visibleCatalog} muscleFeedback={feedbackRows ?? []}/>
    </>}
    <a className="primary full button-link start-workout-action" href={`/workout?day=${day.id}`}>Start Workout</a>
  </main>;
}
