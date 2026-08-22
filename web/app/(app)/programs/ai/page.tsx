import { requireUser } from '@/lib/auth/require-user';
import { requirePremiumAccess } from '@/lib/billing/require-premium';
import { AiProgramBuilder } from '@/components/ai-program-builder';
import { filterCatalogByEquipment, type AiBuilderInput, type AiCatalogExercise } from '@/lib/ai/program';
export const dynamic = 'force-dynamic';

export default async function AiProgramPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = await searchParams, { supabase, user } = await requireUser();
  await requirePremiumAccess(supabase, user.id);
  const [{data:profile,error:profileError},{data:current,error:currentError},{data:catalogRows,error:catalogError},{data:workouts,error:workoutError}] = await Promise.all([
    supabase.from('user_profiles').select('experience_level,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
    supabase.from('programs').select('muscle_priorities').eq('user_id',user.id).eq('is_current',true).is('deleted_at',null).maybeSingle(),
    supabase.from('exercises').select('name,muscle_group,equipment,movement_category,beginner_suitable').order('name'),
    supabase.from('workouts').select('id,completed_at').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:false}).limit(20),
  ]);
  if(profileError||currentError||catalogError||workoutError) throw new Error('Could not load the AI builder context.');
  const ids=(workouts??[]).map(workout=>workout.id), {data:sets,error:setError}=ids.length?await supabase.from('workout_sets').select('workout_id,exercise_name,weight').in('workout_id',ids).eq('completed',true):{data:[],error:null};
  if(setError) throw new Error('Could not load exercise history.');
  const order=new Map(ids.map((id,index)=>[id,index])),summary=new Map<string,{uses:Set<string>;lastWeight:number|null;first:number}>();
  for(const set of sets??[]){const existing=summary.get(set.exercise_name)??{uses:new Set<string>(),lastWeight:null,first:order.get(set.workout_id)??999};existing.uses.add(set.workout_id);const position=order.get(set.workout_id)??999;if(position<=existing.first){existing.first=position;existing.lastWeight=Math.max(existing.lastWeight??0,Number(set.weight))}summary.set(set.exercise_name,existing)}
  const history=[...summary].map(([exerciseName,value])=>({exerciseName,uses:value.uses.size,lastWeight:value.lastWeight})).sort((a,b)=>b.uses-a.uses).slice(0,80);
  const fullCatalog:AiCatalogExercise[]=(catalogRows??[]).map(row=>({name:row.name,muscleGroup:row.muscle_group,equipment:row.equipment,movementCategory:row.movement_category,beginnerSuitable:row.beginner_suitable}));
  const catalog=filterCatalogByEquipment(fullCatalog,Boolean(profile?.use_preferred_equipment),Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment:[]);
  return <>{query.error&&<p className="notice error global-notice" role="alert">{String(query.error)}</p>}<AiProgramBuilder experienceLevel={(profile?.experience_level??'intermediate')as AiBuilderInput['experienceLevel']} initialPriorities={current?.muscle_priorities??{}} catalog={catalog} history={history}/></>;
}
