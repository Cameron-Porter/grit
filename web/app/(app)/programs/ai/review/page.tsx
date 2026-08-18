import { requireUser } from '@/lib/auth/require-user';
import { AiProgramReview } from '@/components/ai-program-review';
import { filterCatalogByEquipment, type AiCatalogExercise } from '@/lib/ai/program';
export const dynamic='force-dynamic';
export default async function ReviewPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams,{supabase,user}=await requireUser();
  const[{data:profile,error:profileError},{data:rows,error:catalogError}]=await Promise.all([
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
    supabase.from('exercises').select('name,muscle_group,equipment,movement_category,beginner_suitable').order('name'),
  ]);
  if(profileError||catalogError)throw new Error('Could not load the program review.');
  const fullCatalog:AiCatalogExercise[]=(rows??[]).map(row=>({name:row.name,muscleGroup:row.muscle_group,equipment:row.equipment,movementCategory:row.movement_category,beginnerSuitable:row.beginner_suitable}));
  const catalog=filterCatalogByEquipment(fullCatalog,Boolean(profile?.use_preferred_equipment),Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment:[]);
  return <>{query.error&&<p className="notice error global-notice" role="alert">{String(query.error)}</p>}<AiProgramReview catalog={catalog}/></>;
}
