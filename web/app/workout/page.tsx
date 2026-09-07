import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { AppNav } from '@/components/app-nav';
import { WorkoutLogger, type ExerciseOption, type WorkoutPrescription } from '@/components/workout-logger';
import { resolveExercisePrescription } from '@/lib/workout/prescription';
import { recoverMissingTarget } from '@/lib/workout/recovery-target';
import { filterExercisesByEquipmentPreference } from '@/lib/programs/day-template-payload';
import type { ProgramFocus, SessionPerformance } from '@grit/rules/progressionEngine';
import type { ExperienceLevel } from '@grit/types/program';

export const dynamic = 'force-dynamic';

type ActiveProgram = { id:string; name:string; muscle_priorities:Record<string,string|null>|null; total_weeks:number; focus:string|null };
type ProgramDayRow = { id:string; week_number:number; day_number:number; label:string|null; completed:boolean; skipped:boolean };
type HistorySession = SessionPerformance & { isDeloadSession?:boolean; hasBadFeedback?:boolean };

export default async function Workout({ searchParams }:{ searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const { supabase, user } = await requireUser();
  const params=await searchParams, quick=Array.isArray(params.quick)?params.quick[0]:params.quick, dayParam=Array.isArray(params.day)?params.day[0]:params.day;
  if (quick === 'blank') {
    const [{data:catalog,error:catalogError},{data:profile,error:profileError}]=await Promise.all([supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max').order('name'),supabase.from('user_profiles').select('body_weight,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle()]);
    if(catalogError) throw new Error(`Could not load exercise catalog: ${catalogError.message}`);
    if(profileError) throw new Error(`Could not load body weight: ${profileError.message}`);
    const workout:WorkoutPrescription={dayId:null,templateDayId:null,bodyWeight:Number(profile?.body_weight)||0,programName:'Quick Workout',week:null,day:null,label:'Quick Workout',exercises:[]};
    const preferred=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
    const visibleCatalog=filterExercisesByEquipmentPreference(catalog??[],{enabled:Boolean(profile?.use_preferred_equipment),preferred});
    const options:ExerciseOption[]=visibleCatalog.map((exercise)=>({id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,equipment:exercise.equipment,repsMin:exercise.rep_range_min,repsMax:exercise.rep_range_max,movementCategory:exercise.movement_category}));
    return <><main className="app-shell page-frame"><WorkoutLogger key="quick-workout" workout={workout} userId={user.id} catalog={options}/></main><AppNav /></>;
  }

  // The catalog, the profile and the workout history depend only on the signed-in
  // user, not on which program is active, so they are started here and awaited
  // after the program lookup instead of behind it. Promise.resolve() on a
  // Postgrest builder is what actually issues the request. This collapses the
  // page from five sequential Supabase steps to three; the cost is that the two
  // early-return branches below fetch three rows they end up not using, which is
  // rare and costs no wall-clock time because it overlaps the program lookup.
  const catalogPromise = Promise.resolve(supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max').order('name'));
  const profilePromise = Promise.resolve(supabase.from('user_profiles').select('experience_level,body_weight,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle());
  const pastWorkoutsPromise = Promise.resolve(supabase.from('workouts').select('id,completed_at,program_day_id').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:false}).limit(40));

  let current:ActiveProgram, days:ProgramDayRow[], nextDay:ProgramDayRow;
  if (dayParam) {
    // Jumping straight to a specific day (e.g. from its program calendar) —
    // any not-yet-completed day can be started out of order, regardless of
    // which program is currently active.
    const { data: dayRow, error: dayError } = await supabase.from('program_days').select('id,program_id,week_number,day_number,label,completed,skipped,programs!inner(id,name,muscle_priorities,total_weeks,focus,user_id,deleted_at)').eq('id', dayParam).eq('programs.user_id', user.id).maybeSingle();
    if (dayError) throw new Error(`Could not load that training day: ${dayError.message}`);
    const programRow = dayRow?.programs[0];
    if (!dayRow || !programRow || programRow.deleted_at) notFound();
    if (dayRow.completed) redirect(`/programs/${dayRow.program_id}/day/${dayRow.id}`);
    current = { id:programRow.id, name:programRow.name, muscle_priorities:programRow.muscle_priorities, total_weeks:programRow.total_weeks, focus:programRow.focus };
    const { data: allDays, error: allDaysError } = await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', current.id).order('week_number').order('day_number');
    if (allDaysError) throw new Error(`Could not load program days: ${allDaysError.message}`);
    days = allDays ?? [];
    nextDay = { id:dayRow.id, week_number:dayRow.week_number, day_number:dayRow.day_number, label:dayRow.label, completed:dayRow.completed, skipped:dayRow.skipped };
  } else {
    const { data: currentProgram, error: programError } = await supabase.from('programs').select('id,name,muscle_priorities,total_weeks,focus').eq('user_id', user.id).eq('is_current', true).is('deleted_at', null).maybeSingle();
    if (programError) throw new Error(`Could not load current program: ${programError.message}`);
    if (!currentProgram) return <><main className="app-shell page-frame native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>No active program</h1><p>Choose a program or start an ad hoc workout.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a><a className="secondary button-link" href="/programs">View programs</a></section></main><AppNav /></>;
    current = currentProgram;
    const { data: allDays, error: daysError } = await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', current.id).order('week_number').order('day_number');
    if (daysError) throw new Error(`Could not load program days: ${daysError.message}`);
    days = allDays ?? [];
    const foundNext=days.find((day)=>!day.completed&&!day.skipped);
    if (!foundNext) {
      const { error: clearError } = await supabase.from('programs').update({ is_current: false }).eq('id', current.id).eq('user_id', user.id).eq('is_current', true);
      if (clearError) console.error('Could not clear completed program from active status.', clearError);
      return <><main className="app-shell page-frame native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>Program complete</h1><p>You’ve completed every scheduled day in {current.name}.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a></section></main><AppNav /></>;
    }
    nextDay = foundNext;
  }
  const templateDay=days.find((day)=>day.week_number===1&&day.day_number===nextDay.day_number);
  if(!templateDay) throw new Error('The program is missing its Week 1 exercise template.');
  const [
    [{data:exercises,error:exerciseError},{data:targets,error:targetError}],
    [{data:catalog,error:catalogError},{data:profile,error:profileError},{data:pastWorkouts,error:pastWorkoutError}],
  ]=await Promise.all([
    Promise.all([
      supabase.from('program_exercises').select('exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir,role').eq('program_day_id',templateDay.id).order('sort_order'),
      supabase.from('program_day_targets').select('exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir').eq('program_day_id',nextDay.id),
    ]),
    Promise.all([catalogPromise,profilePromise,pastWorkoutsPromise]),
  ]);
  if(exerciseError) throw new Error(`Could not load exercises: ${exerciseError.message}`);
  if(targetError) throw new Error(`Could not load progression targets: ${targetError.message}`);
  if(catalogError) throw new Error(`Could not load exercise replacements: ${catalogError.message}`);
  if(profileError) throw new Error(`Could not load training experience: ${profileError.message}`);
  if(pastWorkoutError) throw new Error(`Could not load program workout history: ${pastWorkoutError.message}`);
  const workoutIds=(pastWorkouts??[]).map(item=>item.id);
  const pastDayIds=[...new Set((pastWorkouts??[]).map(item=>item.program_day_id).filter((id):id is string=>Boolean(id)))];
  const [{data:pastSets,error:pastSetError},{data:pastDays,error:pastDayError},{data:pastFeedback,error:pastFeedbackError}]=await Promise.all([
    workoutIds.length?supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,reported_rir').in('workout_id',workoutIds).eq('completed',true).gt('reps',0):Promise.resolve({data:[],error:null}),
    // HV-040 needs to seed a new mesocycle from the last *working* session, not
    // a deload — deload weeks intentionally cut weight/reps, so treating one as
    // "last completed" would regress the prescribed load instead of continuing it.
    pastDayIds.length?supabase.from('program_days').select('id,week_number,programs(total_weeks)').in('id',pastDayIds):Promise.resolve({data:[],error:null}),
    // A session should only be used to seed a new mesocycle's starting weight/reps
    // if it was actually a good one — reported joint pain, a flat pump, or "too
    // much" volume feedback for that muscle group means the load isn't something
    // to carry forward as-is.
    workoutIds.length?supabase.from('workout_feedback').select('workout_id,muscle_group,joint_pain,pump,volume').in('workout_id',workoutIds):Promise.resolve({data:[],error:null}),
  ]);
  if(pastSetError)throw new Error(`Could not load exercise history: ${pastSetError.message}`);
  if(pastDayError) throw new Error(`Could not load past program weeks: ${pastDayError.message}`);
  if(pastFeedbackError) throw new Error(`Could not load past workout feedback: ${pastFeedbackError.message}`);
  const isDeloadByDay=new Map((pastDays??[]).map((day)=>[day.id,day.week_number===day.programs[0]?.total_weeks])),isDeloadByWorkout=new Map((pastWorkouts??[]).map((item)=>[item.id,item.program_day_id?isDeloadByDay.get(item.program_day_id)??false:false]));
  const feedbackByWorkoutMuscle=new Map((pastFeedback??[]).map((row)=>[`${row.workout_id} ${row.muscle_group}`,row])),muscleGroupByExerciseName=new Map((catalog??[]).map((item)=>[item.name,item.muscle_group]));
  const hasBadFeedback=(workoutId:string,exerciseName:string)=>{const muscleGroup=muscleGroupByExerciseName.get(exerciseName),row=muscleGroup?feedbackByWorkoutMuscle.get(`${workoutId} ${muscleGroup}`):undefined;if(!row)return false;return Boolean(row.joint_pain&&row.joint_pain!=='None')||Boolean(row.pump&&['None','Low'].includes(row.pump))||row.volume==='Too much'};
  const workoutOrder=new Map((pastWorkouts??[]).map((item,index)=>[item.id,{index,date:item.completed_at}])),grouped=new Map<string,Map<string,HistorySession>>();
  for(const set of pastSets??[]){const byWorkout=grouped.get(set.exercise_name)??new Map<string,HistorySession>(),meta=workoutOrder.get(set.workout_id);if(!meta)continue;const session:HistorySession=byWorkout.get(set.workout_id)??{date:meta.date,sets:[],isDeloadSession:isDeloadByWorkout.get(set.workout_id)??false,hasBadFeedback:hasBadFeedback(set.workout_id,set.exercise_name)};session.sets.push({weight:Number(set.weight),reps:set.reps,rir:set.reported_rir??undefined});byWorkout.set(set.workout_id,session);grouped.set(set.exercise_name,byWorkout)}
  const targetByExercise=new Map((targets??[]).map((target)=>[target.exercise_name,target]));
  for(const exercise of exercises??[]){const existing=targetByExercise.get(exercise.exercise_name);if(existing&&(Number(existing.target_weight)>0||exercise.equipment==='Bodyweight'))continue;const sessions=[...(grouped.get(exercise.exercise_name)?.entries()??[])].sort((a,b)=>(workoutOrder.get(a[0])?.index??999)-(workoutOrder.get(b[0])?.index??999)).map(([,session])=>session).slice(0,8),recovered=recoverMissingTarget(exercise,sessions,{experienceLevel:(profile?.experience_level??'intermediate')as ExperienceLevel,week:nextDay.week_number,totalWeeks:current.total_weeks,focus:(current.focus??'hypertrophy')as ProgramFocus});if(recovered)targetByExercise.set(exercise.exercise_name,{exercise_name:exercise.exercise_name,...recovered})}
  const historyByExercise=Object.fromEntries([...grouped].map(([name,sessions])=>[name,[...sessions.entries()].sort((a,b)=>(workoutOrder.get(a[0])?.index??999)-(workoutOrder.get(b[0])?.index??999)).map(([,session])=>session).slice(0,3)]));
  const workout:WorkoutPrescription={dayId:nextDay.id,templateDayId:templateDay.id,bodyWeight:Number(profile?.body_weight)||0,programName:current.name,week:nextDay.week_number,day:nextDay.day_number,label:nextDay.label??`Day ${nextDay.day_number}`,exercises:(exercises??[]).map((exercise)=>resolveExercisePrescription(exercise,targetByExercise.get(exercise.exercise_name),exercise.muscle_group?current.muscle_priorities?.[exercise.muscle_group]??null:null))};
  const preferred=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
  const visibleCatalog=filterExercisesByEquipmentPreference(catalog??[],{enabled:Boolean(profile?.use_preferred_equipment),preferred});
  const options:ExerciseOption[]=visibleCatalog.map((exercise)=>({id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,equipment:exercise.equipment,repsMin:exercise.rep_range_min,repsMax:exercise.rep_range_max,movementCategory:exercise.movement_category}));
  return <><main className="app-shell page-frame"><WorkoutLogger key={workout.dayId} workout={workout} userId={user.id} catalog={options} historyByExercise={historyByExercise}/></main><AppNav /></>;
}
