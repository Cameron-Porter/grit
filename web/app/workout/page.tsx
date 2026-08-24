import { requireUser } from '@/lib/auth/require-user';
import { AppNav } from '@/components/app-nav';
import { WorkoutLogger, type ExerciseOption, type WorkoutPrescription } from '@/components/workout-logger';
import { resolveExercisePrescription } from '@/lib/workout/prescription';
import { recoverMissingTarget } from '@/lib/workout/recovery-target';
import type { ProgramFocus, SessionPerformance } from '@grit/rules/progressionEngine';
import type { ExperienceLevel } from '@grit/types/program';

export const dynamic = 'force-dynamic';

export default async function Workout({ searchParams }:{ searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const { supabase, user } = await requireUser();
  const params=await searchParams, quick=Array.isArray(params.quick)?params.quick[0]:params.quick;
  if (quick === 'blank') {
    const { data:catalog, error:catalogError } = await supabase.from('exercises').select('id,name,muscle_group,equipment,rep_range_min,rep_range_max').order('name');
    if(catalogError) throw new Error(`Could not load exercise catalog: ${catalogError.message}`);
    const workout:WorkoutPrescription={dayId:null,programName:'Quick Workout',week:null,day:null,label:'Quick Workout',exercises:[]};
    const options:ExerciseOption[]=(catalog??[]).map((exercise)=>({id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,equipment:exercise.equipment,repsMin:exercise.rep_range_min,repsMax:exercise.rep_range_max}));
    return <><main className="app-shell page-frame"><WorkoutLogger key="quick-workout" workout={workout} userId={user.id} catalog={options}/></main><AppNav /></>;
  }
  const { data: current, error: programError } = await supabase.from('programs').select('id,name,muscle_priorities,total_weeks,focus').eq('user_id', user.id).eq('is_current', true).is('deleted_at', null).maybeSingle();
  if (programError) throw new Error(`Could not load current program: ${programError.message}`);
  if (!current) return <><main className="app-shell page-frame native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>No active program</h1><p>Choose a program or start an ad hoc workout.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a><a className="secondary button-link" href="/programs">View programs</a></section></main><AppNav /></>;
  const { data: days, error: daysError } = await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', current.id).order('week_number').order('day_number');
  if (daysError) throw new Error(`Could not load program days: ${daysError.message}`);
  const nextDay=days?.find((day)=>!day.completed&&!day.skipped);
  if (!nextDay) {
    const { error: clearError } = await supabase.from('programs').update({ is_current: false }).eq('id', current.id).eq('user_id', user.id).eq('is_current', true);
    if (clearError) console.error('Could not clear completed program from active status.', clearError);
    return <><main className="app-shell page-frame native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>Program complete</h1><p>You’ve completed every scheduled day in {current.name}.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a></section></main><AppNav /></>;
  }
  const templateDay=days?.find((day)=>day.week_number===1&&day.day_number===nextDay.day_number);
  if(!templateDay) throw new Error('The program is missing its Week 1 exercise template.');
  const [{data:exercises,error:exerciseError},{data:targets,error:targetError},{data:catalog,error:catalogError},{data:profile,error:profileError},{data:pastWorkouts,error:pastWorkoutError}]=await Promise.all([
    supabase.from('program_exercises').select('exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir,role').eq('program_day_id',templateDay.id).order('sort_order'),
    supabase.from('program_day_targets').select('exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir').eq('program_day_id',nextDay.id),
    supabase.from('exercises').select('id,name,muscle_group,equipment,rep_range_min,rep_range_max').order('name'),
    supabase.from('user_profiles').select('experience_level').eq('id',user.id).maybeSingle(),
    supabase.from('workouts').select('id,completed_at').eq('user_id',user.id).in('program_day_id',(days??[]).map(day=>day.id)).is('deleted_at',null).order('completed_at',{ascending:false}).limit(40),
  ]);
  if(exerciseError) throw new Error(`Could not load exercises: ${exerciseError.message}`);
  if(targetError) throw new Error(`Could not load progression targets: ${targetError.message}`);
  if(catalogError) throw new Error(`Could not load exercise replacements: ${catalogError.message}`);
  if(profileError) throw new Error(`Could not load training experience: ${profileError.message}`);
  if(pastWorkoutError) throw new Error(`Could not load program workout history: ${pastWorkoutError.message}`);
  const workoutIds=(pastWorkouts??[]).map(item=>item.id),{data:pastSets,error:pastSetError}=workoutIds.length?await supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,reported_rir').in('workout_id',workoutIds).eq('completed',true).gt('reps',0):{data:[],error:null};
  if(pastSetError)throw new Error(`Could not load exercise history: ${pastSetError.message}`);
  const workoutOrder=new Map((pastWorkouts??[]).map((item,index)=>[item.id,{index,date:item.completed_at}])),grouped=new Map<string,Map<string,SessionPerformance>>();
  for(const set of pastSets??[]){const byWorkout=grouped.get(set.exercise_name)??new Map<string,SessionPerformance>(),meta=workoutOrder.get(set.workout_id);if(!meta)continue;const session:SessionPerformance=byWorkout.get(set.workout_id)??{date:meta.date,sets:[]};session.sets.push({weight:Number(set.weight),reps:set.reps,rir:set.reported_rir??undefined});byWorkout.set(set.workout_id,session);grouped.set(set.exercise_name,byWorkout)}
  const targetByExercise=new Map((targets??[]).map((target)=>[target.exercise_name,target]));
  for(const exercise of exercises??[]){const existing=targetByExercise.get(exercise.exercise_name);if(existing&&(Number(existing.target_weight)>0||exercise.equipment==='Bodyweight'))continue;const sessions=[...(grouped.get(exercise.exercise_name)?.entries()??[])].sort((a,b)=>(workoutOrder.get(a[0])?.index??999)-(workoutOrder.get(b[0])?.index??999)).map(([,session])=>session).slice(0,8),recovered=recoverMissingTarget(exercise,sessions,{experienceLevel:(profile?.experience_level??'intermediate')as ExperienceLevel,week:nextDay.week_number,totalWeeks:current.total_weeks,focus:(current.focus??'hypertrophy')as ProgramFocus});if(recovered)targetByExercise.set(exercise.exercise_name,{exercise_name:exercise.exercise_name,...recovered})}
  const workout:WorkoutPrescription={dayId:nextDay.id,programName:current.name,week:nextDay.week_number,day:nextDay.day_number,label:nextDay.label??`Day ${nextDay.day_number}`,exercises:(exercises??[]).map((exercise)=>resolveExercisePrescription(exercise,targetByExercise.get(exercise.exercise_name),exercise.muscle_group?current.muscle_priorities?.[exercise.muscle_group]??null:null))};
  const options:ExerciseOption[]=(catalog??[]).map((exercise)=>({id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,equipment:exercise.equipment,repsMin:exercise.rep_range_min,repsMax:exercise.rep_range_max}));
  return <><main className="app-shell page-frame"><WorkoutLogger key={workout.dayId} workout={workout} userId={user.id} catalog={options}/></main><AppNav /></>;
}
