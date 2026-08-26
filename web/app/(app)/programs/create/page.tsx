import { requireUser } from '@/lib/auth/require-user';
import { GuidedProgramBuilder } from '@/components/guided-program-builder';
import { filterExercisesByEquipmentPreference, type CatalogExercise } from '@/lib/programs/day-template-payload';
import { recoverMissingTarget } from '@/lib/workout/recovery-target';
import type { SessionPerformance } from '@grit/rules/progressionEngine';
import type { ExperienceLevel } from '@grit/types/program';

export default async function CreateProgramPage() {
  const { supabase,user } = await requireUser();
  const [{ data:profile,error:profileError },{data:catalogRows,error:catalogError},{data:workouts,error:workoutError},{data:feedbackRows,error:feedbackError}] = await Promise.all([
    supabase.from('user_profiles').select('experience_level,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
    supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max').order('name'),
    supabase.from('workouts').select('id,completed_at').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:false}).limit(80),
    supabase.from('workout_feedback').select('muscle_group,pump,joint_pain').order('created_at',{ascending:false}).limit(200),
  ]);
  if(catalogError)throw new Error('Could not load exercise catalog.');
  if(workoutError)throw new Error('Could not load workout history.');
  if(feedbackError)throw new Error('Could not load recovery feedback.');
  const workoutIds=(workouts??[]).map(workout=>workout.id);
  const {data:pastSets,error:pastSetError}=workoutIds.length?await supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,reported_rir').in('workout_id',workoutIds).eq('completed',true).gt('reps',0):{data:[],error:null};
  if(pastSetError)throw new Error('Could not load exercise target history.');
  const workoutOrder=new Map((workouts??[]).map((item,index)=>[item.id,{index,date:item.completed_at}])),grouped=new Map<string,Map<string,SessionPerformance>>();
  for(const set of pastSets??[]){const byWorkout=grouped.get(set.exercise_name)??new Map<string,SessionPerformance>(),meta=workoutOrder.get(set.workout_id);if(!meta)continue;const session:SessionPerformance=byWorkout.get(set.workout_id)??{date:meta.date,sets:[]};session.sets.push({weight:Number(set.weight),reps:set.reps,rir:set.reported_rir??undefined});byWorkout.set(set.workout_id,session);grouped.set(set.exercise_name,byWorkout)}
  const experience=(profile?.experience_level??'intermediate') as ExperienceLevel;
  const catalogWithSuggestions:CatalogExercise[]=(catalogRows??[]).map(exercise=>{
    const sessions=[...(grouped.get(exercise.name)?.entries()??[])].sort((a,b)=>(workoutOrder.get(a[0])?.index??999)-(workoutOrder.get(b[0])?.index??999)).map(([,session])=>session).slice(0,8);
    const recovered=recoverMissingTarget({exercise_name:exercise.name,target_sets:3,target_reps_min:exercise.rep_range_min??8,target_reps_max:exercise.rep_range_max??12,target_weight:0,rir:2,equipment:exercise.equipment,role:'Primary'},sessions,{experienceLevel:experience,week:1,totalWeeks:5,focus:'hypertrophy'});
    return {id:exercise.id,name:exercise.name,muscle_group:exercise.muscle_group,equipment:exercise.equipment,movement_category:exercise.movement_category,rep_range_min:exercise.rep_range_min,rep_range_max:exercise.rep_range_max,suggestion:recovered?{sets:recovered.target_sets,repsMin:recovered.target_reps_min,repsMax:recovered.target_reps_max,weight:recovered.target_weight,rir:recovered.rir}:null};
  });
  const preferredEquipment=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
  const preference={enabled:Boolean(profile?.use_preferred_equipment),preferred:preferredEquipment};
  const builderCatalog=filterExercisesByEquipmentPreference(catalogWithSuggestions,preference);
  return <main className="content native-page native-create-page">
    <a className="back-link" href="/programs">← Programs</a>
    <header className="native-page-header"><div><h1>New Program</h1><p>Build the week before saving, just like the native guided setup flow.</p></div></header>
    {profileError&&<p className="notice error" role="alert">Could not load your equipment preferences. Showing the full exercise catalog.</p>}
    <GuidedProgramBuilder catalog={builderCatalog} equipmentPreferenceEnabled={preference.enabled&&preferredEquipment.length>0&&!profileError} preferredEquipment={preferredEquipment} muscleFeedback={feedbackRows??[]}/>
  </main>;
}
