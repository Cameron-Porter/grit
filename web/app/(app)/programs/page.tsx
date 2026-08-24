import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { GuidedProgramBuilder } from '@/components/guided-program-builder';
import { resolveEntitlement } from '@/lib/billing/entitlement';
import { fetchStripeSubscriptionStatus } from '@/lib/billing/fetch-entitlement-profile';
import { setCurrentProgram } from './actions';
import { filterExercisesByEquipmentPreference, type CatalogExercise } from '@/lib/programs/day-template-payload';
import { recoverMissingTarget } from '@/lib/workout/recovery-target';
import type { SessionPerformance } from '@grit/rules/progressionEngine';
import type { ExperienceLevel } from '@grit/types/program';

export default async function Programs({ searchParams }:{ searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const { supabase,user } = await requireUser();
  const [{ data,error },{ data:profile,error:profileError },stripeSubscriptionStatus,{data:catalogRows,error:catalogError},{data:workouts,error:workoutError}] = await Promise.all([
    supabase.from('programs').select('id,name,total_weeks,days_per_week,is_current,focus,program_days(completed,skipped)').eq('user_id',user.id).is('deleted_at',null).order('created_at',{ ascending:false }),
    supabase.from('user_profiles').select('role,subscription_status,stripe_subscription_status,experience_level,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
    fetchStripeSubscriptionStatus(supabase,user.id),
    supabase.from('exercises').select('id,name,muscle_group,equipment,rep_range_min,rep_range_max').order('name'),
    supabase.from('workouts').select('id,completed_at').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:false}).limit(80),
  ]);
  if(error)throw new Error('Could not load programs.');
  if(catalogError)throw new Error('Could not load exercise catalog.');
  if(workoutError)throw new Error('Could not load workout history.');
  const workoutIds=(workouts??[]).map(workout=>workout.id);
  const {data:pastSets,error:pastSetError}=workoutIds.length?await supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,reported_rir').in('workout_id',workoutIds).eq('completed',true).gt('reps',0):{data:[],error:null};
  if(pastSetError)throw new Error('Could not load exercise target history.');
  const workoutOrder=new Map((workouts??[]).map((item,index)=>[item.id,{index,date:item.completed_at}])),grouped=new Map<string,Map<string,SessionPerformance>>();
  for(const set of pastSets??[]){const byWorkout=grouped.get(set.exercise_name)??new Map<string,SessionPerformance>(),meta=workoutOrder.get(set.workout_id);if(!meta)continue;const session:SessionPerformance=byWorkout.get(set.workout_id)??{date:meta.date,sets:[]};session.sets.push({weight:Number(set.weight),reps:set.reps,rir:set.reported_rir??undefined});byWorkout.set(set.workout_id,session);grouped.set(set.exercise_name,byWorkout)}
  const experience=(profile?.experience_level??'intermediate') as ExperienceLevel;
  const catalogWithSuggestions:CatalogExercise[]=(catalogRows??[]).map(exercise=>{
    const sessions=[...(grouped.get(exercise.name)?.entries()??[])].sort((a,b)=>(workoutOrder.get(a[0])?.index??999)-(workoutOrder.get(b[0])?.index??999)).map(([,session])=>session).slice(0,8);
    const recovered=recoverMissingTarget({exercise_name:exercise.name,target_sets:3,target_reps_min:exercise.rep_range_min??8,target_reps_max:exercise.rep_range_max??12,target_weight:0,rir:2,equipment:exercise.equipment,role:'Primary'},sessions,{experienceLevel:experience,week:1,totalWeeks:5,focus:'hypertrophy'});
    return {id:exercise.id,name:exercise.name,muscle_group:exercise.muscle_group,equipment:exercise.equipment,rep_range_min:exercise.rep_range_min,rep_range_max:exercise.rep_range_max,suggestion:recovered?{sets:recovered.target_sets,repsMin:recovered.target_reps_min,repsMax:recovered.target_reps_max,weight:recovered.target_weight,rir:recovered.rir}:null};
  });
  const preferredEquipment=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
  const preference={enabled:Boolean(profile?.use_preferred_equipment),preferred:preferredEquipment};
  const builderCatalog=filterExercisesByEquipmentPreference(catalogWithSuggestions,preference);
  const isPro = profileError ? false : resolveEntitlement({...profile,stripe_subscription_status:stripeSubscriptionStatus}) === 'pro';
  return <main className="content">
    <header className="page-header"><div><div className="eyebrow">TRAINING</div><h1>Programs</h1></div><div className="header-actions"><Link className="secondary button-link compact header-action" href="/programs/templates">Templates</Link>{isPro ? <Link className="primary compact" href="/programs/ai">Build with AI</Link> : <Link className="secondary compact" href="/profile">Upgrade for AI programs</Link>}</div></header>
    {profileError&&<p className="notice error" role="alert">Could not load your membership or equipment preferences. Showing the full exercise catalog.</p>}
    {params.error&&<p className="notice error" role="alert">{String(params.error)}</p>}
    <GuidedProgramBuilder catalog={builderCatalog} equipmentPreferenceEnabled={preference.enabled&&preferredEquipment.length>0&&!profileError} preferredEquipment={preferredEquipment}/>
    <div className="stack">{data?.map(program=>{const days=program.program_days??[],done=days.filter(day=>day.completed||day.skipped).length,isComplete=days.length>0&&done===days.length;return <article className="surface program-card" key={program.id}><Link href={`/programs/${program.id}`}><div className="title-line"><h2>{program.name}</h2>{isComplete?<span className="pill">Complete</span>:program.is_current&&<span className="pill">Active</span>}</div><p>{program.total_weeks} weeks · {program.days_per_week} days/week</p></Link><div className="program-actions"><strong>{done}/{days.length}</strong>{!program.is_current&&!isComplete&&<form action={setCurrentProgram}><input type="hidden" name="id" value={program.id}/><button className="quiet compact">Use</button></form>}</div></article>})}</div>
    {!data?.length&&<section className="empty"><h2>No programs yet</h2><p>Create your first structured training program.</p></section>}
  </main>;
}
