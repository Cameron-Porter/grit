import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExperienceLevel } from '@grit/types/program';
import type { ProgramFocus } from '@grit/rules/progressionEngine';
import type { HistorySession } from './recovery-target';
import { recordedDecision, resolveScheduledTarget, type SavedTarget, type TargetTemplate } from './target-resolution';

export class TargetLoadError extends Error { constructor(message:string,public status:number){super(message)} }
const joined=<T,>(value:T|T[])=>Array.isArray(value)?value[0]:value;

/** Server-only inputs already authenticated/ownership-checked by the caller. Never populate from request data. */
export type WorkoutTargetOptions = {
  userId?: string;
  programId?: string;
  totalWeeks?: number;
  focus?: ProgramFocus | string | null;
  musclePriorities?: Record<string, string | null> | null;
  weekNumber?: number;
  dayNumber?: number;
  profile?: {
    experience_level?: ExperienceLevel | string | null;
    body_weight?: number | null;
  } | null;
};

/** Authenticated, shared source of the workout display and its explanation. */
export async function loadWorkoutTargets(supabase:SupabaseClient,dayId:string,options?:WorkoutTargetOptions){
  let userId=options?.userId;
  if(!userId){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)throw new TargetLoadError('Sign in to view workout targets.',401);
    userId=user.id;
  }

  let programId=options?.programId;
  let weekNumber=options?.weekNumber;
  let dayNumber=options?.dayNumber;
  let totalWeeks=options?.totalWeeks;
  let focus=options?.focus;
  let musclePriorities=options?.musclePriorities;

  if(!programId||weekNumber===undefined||dayNumber===undefined||totalWeeks===undefined){
    const {data:day,error:dayError}=await supabase.from('program_days').select('id,program_id,week_number,day_number,programs!inner(user_id,deleted_at,total_weeks,focus,muscle_priorities)').eq('id',dayId).eq('programs.user_id',userId).is('programs.deleted_at',null).maybeSingle();
    if(dayError)throw new TargetLoadError('Could not load the program day.',503);
    if(!day)throw new TargetLoadError('Workout not found.',404);
    const program=joined(day.programs);
    if(!program)throw new TargetLoadError('Program not found.',404);
    programId=day.program_id;
    weekNumber=day.week_number;
    dayNumber=day.day_number;
    totalWeeks=program.total_weeks;
    focus=program.focus;
    musclePriorities=program.muscle_priorities;
  }

  if (typeof weekNumber !== 'number' || typeof totalWeeks !== 'number' || !Number.isInteger(weekNumber) || !Number.isInteger(totalWeeks) || weekNumber < 1 || totalWeeks < weekNumber) {
    throw new TargetLoadError('The workout schedule is incomplete. Reload the program and try again.',503);
  }
  const profile=options?.profile;
  const [{data:templateDay,error:templateError},{data:profileData,error:profileError},{data:pastWorkouts,error:historyError}]=await Promise.all([
    supabase.from('program_days').select('id').eq('program_id',programId).eq('week_number',1).eq('day_number',dayNumber).maybeSingle(),
    profile !== undefined ? Promise.resolve({data:profile,error:null}) : supabase.from('user_profiles').select('experience_level,body_weight').eq('id',userId).maybeSingle(),
    supabase.from('workouts').select('id,completed_at,program_day_id').eq('user_id',userId).is('deleted_at',null).order('completed_at',{ascending:false}).limit(40),
  ]);
  if(templateError||profileError||historyError)throw new TargetLoadError('Could not load target inputs.',503);
  if(!templateDay)throw new TargetLoadError('The workout exercise template is missing.',404);
  const workoutIds=(pastWorkouts??[]).map(w=>w.id),pastDayIds=[...new Set((pastWorkouts??[]).map(w=>w.program_day_id).filter(Boolean))];
  const [exerciseResult,targetResult,setResult,dayResult,feedbackResult]=await Promise.all([
    supabase.from('program_exercises').select('exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir,role').eq('program_day_id',templateDay.id).order('sort_order'),
    supabase.from('program_day_targets').select('exercise_name,target_sets,target_reps_min,target_reps_max,target_weight,rir,decision_evidence').eq('program_day_id',dayId),
    workoutIds.length?supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,reported_rir,set_index').in('workout_id',workoutIds).eq('completed',true).gt('reps',0).order('set_index'):Promise.resolve({data:[],error:null}),
    pastDayIds.length?supabase.from('program_days').select('id,week_number,programs(total_weeks)').in('id',pastDayIds):Promise.resolve({data:[],error:null}),
    workoutIds.length?supabase.from('workout_feedback').select('workout_id,muscle_group,joint_pain,pump,volume').in('workout_id',workoutIds):Promise.resolve({data:[],error:null}),
  ]);
  if([exerciseResult,targetResult,setResult,dayResult,feedbackResult].some(r=>r.error))throw new TargetLoadError('Could not load workout evidence. Check the explanation migration and try again.',503);
  const exercises=(exerciseResult.data??[]) as TargetTemplate[],targets=(targetResult.data??[]) as (SavedTarget&{exercise_name:string})[];
  const sourceIds=[...new Set(targets.flatMap(target=>{const e=recordedDecision(target);return e?[e.sourceWorkoutId,...e.sessions.map(s=>(s as {workoutId?:string}).workoutId).filter((id):id is string=>!!id)]:[]}))];
  let visibleIds=new Set<string>();
  if(sourceIds.length){
    const {data,error}=await supabase.from('workouts').select('id').eq('user_id',userId).is('deleted_at',null).in('id',sourceIds);
    if(error)throw new TargetLoadError('Could not verify recorded workouts.',503);
    visibleIds=new Set((data??[]).map(w=>w.id));
  }
  const safeTargets=targets.map(target=>{const e=recordedDecision(target);return e&&[e.sourceWorkoutId,...e.sessions.map(s=>(s as {workoutId?:string}).workoutId).filter((id):id is string=>!!id)].some(id=>!visibleIds.has(id))?{...target,decision_evidence:null}:target});
  const isDeloadByDay=new Map((dayResult.data??[]).map(d=>[d.id,d.week_number===joined(d.programs)?.total_weeks]));
  const feedback=new Map((feedbackResult.data??[]).map(row=>[`${row.workout_id}\0${row.muscle_group}`,row]));
  const muscleByName=new Map(exercises.map(ex=>[ex.exercise_name,ex.muscle_group]));
  const historyByExercise:Record<string,HistorySession[]>={};
  for(const workout of pastWorkouts??[]){
    const setsByName=new Map<string,HistorySession['sets']>();
    for(const set of setResult.data??[]){if(set.workout_id!==workout.id)continue;const sets=setsByName.get(set.exercise_name)??[];sets.push({weight:Number(set.weight),reps:set.reps,rir:set.reported_rir??undefined});setsByName.set(set.exercise_name,sets)}
    for(const [name,sets] of setsByName){
      const row=feedback.get(`${workout.id}\0${muscleByName.get(name)}`);
      const hasBadFeedback=!!row&&(Boolean(row.joint_pain&&row.joint_pain!=='None')||Boolean(row.pump&&['None','Low'].includes(row.pump))||row.volume==='Too much');
      (historyByExercise[name]??=[]).push({date:workout.completed_at,sets,isDeloadSession:isDeloadByDay.get(workout.program_day_id)??false,hasBadFeedback});
    }
  }
  const bodyWeight=Number(profileData?.body_weight)||0;
  const resolved=exercises.map(ex=>resolveScheduledTarget(ex,safeTargets.find(t=>t.exercise_name===ex.exercise_name),(historyByExercise[ex.exercise_name]??[]).slice(0,8),{experienceLevel:(profileData?.experience_level??'intermediate') as ExperienceLevel,week:weekNumber,totalWeeks,focus:(focus??'hypertrophy') as ProgramFocus,bodyWeight,musclePriority:ex.muscle_group?musclePriorities?.[ex.muscle_group]??null:null}));
  return {userId,templateDayId:templateDay.id,bodyWeight,resolved,historyByExercise:Object.fromEntries(Object.entries(historyByExercise).map(([name,sessions])=>[name,sessions.slice(0,3)]))};
}
