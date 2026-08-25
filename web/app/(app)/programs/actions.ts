'use server';
import{randomUUID}from'node:crypto';import{revalidatePath}from'next/cache';import{redirect}from'next/navigation';import{requireUser}from'@/lib/auth/require-user';import{buildProgramExerciseRows,parseProgramDayExerciseItems,parseStagedExerciseItems,type CatalogExercise}from'@/lib/programs/day-template-payload';
const fail=(code:string):never=>redirect(`/programs?error=${encodeURIComponent(code)}`);
type ProfileEquipment={use_preferred_equipment:boolean|null;preferred_equipment:unknown};
const preferredEquipment=(profile:ProfileEquipment|null|undefined)=>({enabled:Boolean(profile?.use_preferred_equipment),preferred:Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'&&item.length>0):[]});
function assertPreferredEquipment(catalog:CatalogExercise[],profile:ProfileEquipment|null|undefined,failWith:(message:string)=>never){const preference=preferredEquipment(profile);if(!preference.enabled||!preference.preferred.length)return;const allowed=new Set(preference.preferred);if(catalog.some(exercise=>!exercise.equipment||!allowed.has(exercise.equipment)))failWith('Choose exercises that match your saved equipment preferences.');}
export async function createProgram(formData:FormData){const name=String(formData.get('name')??'').trim(),weeks=Number(formData.get('weeks')),days=Number(formData.get('days'));if(!name||!Number.isInteger(weeks)||weeks<2||weeks>16||!Number.isInteger(days)||days<1||days>7)fail('Check the program name, weeks, and days.');const{supabase,user}=await requireUser(),id=randomUUID();const{error}=await supabase.from('programs').insert({id,user_id:user.id,name,total_weeks:weeks,days_per_week:days,focus:'hypertrophy',is_current:false});if(error)fail('Could not create the program.');const rows=Array.from({length:weeks*days},(_,index)=>({program_id:id,week_number:Math.floor(index/days)+1,day_number:index%days+1,label:`Day ${index%days+1}`}));const{error:dayError}=await supabase.from('program_days').insert(rows);if(dayError){await supabase.from('programs').delete().eq('id',id).eq('user_id',user.id);fail('Could not create the training days. No partial program was kept.')}redirect(`/programs/${id}`)}
export async function createGuidedProgram(formData:FormData){
  const name=String(formData.get('name')??'').trim(),weeks=Number(formData.get('weeks')),days=Number(formData.get('days'));
  if(!name||!Number.isInteger(weeks)||weeks<2||weeks>16||!Number.isInteger(days)||days<1||days>7)fail('Check the program name, weeks, and days.');
  const dayItems=parseProgramDayExerciseItems(String(formData.get('dayItems')??''),days);
  if(!dayItems){fail('Add at least one exercise to every training day before saving the program.');throw new Error('unreachable');}
  const{supabase,user}=await requireUser(),id=randomUUID();
  const exerciseIds=[...new Set(dayItems.flat().map(item=>item.exerciseId))];
  const[{data:catalog,error:catalogError},{data:profile,error:profileError}]=await Promise.all([
    supabase.from('exercises').select('id,name,muscle_group,equipment').in('id',exerciseIds),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
  ]);
  if(catalogError)fail('Could not verify the selected exercises.');
  if(profileError)fail('Could not verify your equipment preferences.');
  if((catalog??[]).length!==exerciseIds.length)fail('One of the selected exercises could not be found.');
  assertPreferredEquipment((catalog??[]) as CatalogExercise[],profile,(message)=>fail(message));
  const{error:programError}=await supabase.from('programs').insert({id,user_id:user.id,name,total_weeks:weeks,days_per_week:days,focus:'hypertrophy',is_current:false});
  if(programError)fail('Could not create the program.');
  const dayRows=Array.from({length:weeks*days},(_,index)=>({program_id:id,week_number:Math.floor(index/days)+1,day_number:index%days+1,label:`Day ${index%days+1}`}));
  const{data:createdDays,error:dayError}=await supabase.from('program_days').insert(dayRows).select('id,week_number,day_number');
  if(dayError){await supabase.from('programs').delete().eq('id',id).eq('user_id',user.id);fail('Could not create the training days. No partial program was kept.');}
  const weekOneDays=(createdDays??[]).filter(day=>day.week_number===1).sort((a,b)=>a.day_number-b.day_number);
  if(weekOneDays.length!==days){await supabase.from('programs').delete().eq('id',id).eq('user_id',user.id);fail('Could not prepare the exercise templates. No partial program was kept.');}
  const exerciseRows=weekOneDays.flatMap((day,index)=>buildProgramExerciseRows(day.id,dayItems[index],(catalog??[]) as CatalogExercise[],0)??[]);
  if(!exerciseRows.length){await supabase.from('programs').delete().eq('id',id).eq('user_id',user.id);fail('Could not prepare the exercises. No partial program was kept.');}
  const{error:exerciseError}=await supabase.from('program_exercises').insert(exerciseRows);
  if(exerciseError){await supabase.from('programs').delete().eq('id',id).eq('user_id',user.id);fail('Could not save the exercises. No partial program was kept.');}
  revalidatePath('/programs');redirect(`/programs/${id}`);
}
export async function setCurrentProgram(formData:FormData){const id=String(formData.get('id')??'');const{supabase,user}=await requireUser();const{data:owned,error:ownedError}=await supabase.from('programs').select('id').eq('id',id).eq('user_id',user.id).is('deleted_at',null).maybeSingle();if(ownedError||!owned)fail('Program not found.');const{data:programDays,error:programDaysError}=await supabase.from('program_days').select('completed,skipped').eq('program_id',id);if(programDaysError)fail('Could not check the program.');if(programDays?.length&&programDays.every((day)=>day.completed||day.skipped))fail('This program is already complete and cannot be made active.');const{data:previous,error:previousError}=await supabase.from('programs').select('id').eq('user_id',user.id).eq('is_current',true).is('deleted_at',null);if(previousError)fail('Could not load the active program.');const{error:clearError}=await supabase.from('programs').update({is_current:false}).eq('user_id',user.id);if(clearError)fail('Could not change the active program.');const{error:setError}=await supabase.from('programs').update({is_current:true}).eq('id',id).eq('user_id',user.id);if(setError){if(previous?.length)await supabase.from('programs').update({is_current:true}).in('id',previous.map((program)=>program.id)).eq('user_id',user.id);fail('Could not change the active program; the previous selection was restored.')}revalidatePath('/programs');revalidatePath('/workout');redirect('/programs')}
export async function softDeleteProgram(formData:FormData){const id=String(formData.get('id')??'');const{supabase,user}=await requireUser();const{error}=await supabase.from('programs').update({deleted_at:new Date().toISOString(),is_current:false}).eq('id',id).eq('user_id',user.id);if(error)fail('Could not delete the program.');revalidatePath('/programs');redirect('/programs')}
export async function renameProgram(formData:FormData){const id=String(formData.get('id')??''),name=String(formData.get('name')??'').trim();if(!name)fail('Program name is required.');const{supabase,user}=await requireUser();const{error}=await supabase.from('programs').update({name}).eq('id',id).eq('user_id',user.id);if(error)fail('Could not rename the program.');revalidatePath(`/programs/${id}`);revalidatePath('/programs');redirect(`/programs/${id}`)}
export async function addProgramExercises(formData:FormData){
  const programId=String(formData.get('programId')??''),dayId=String(formData.get('dayId')??'');
  const detailFail=(message:string):never=>redirect(`/programs/${programId}?error=${encodeURIComponent(message)}`);
  if(!programId||!dayId)detailFail('Training day not found.');
  const items=parseStagedExerciseItems(String(formData.get('items')??''));
  if(!items)detailFail('Check the exercise targets.');
  const{supabase,user}=await requireUser();
  const{data:day,error:dayError}=await supabase.from('program_days').select('id,programs!inner(user_id)').eq('id',dayId).eq('programs.user_id',user.id).maybeSingle();
  if(dayError||!day)detailFail('Training day not found.');
  const exerciseIds=[...new Set(items!.map(item=>item.exerciseId))];
  const[{data:catalog,error:catalogError},{data:profile,error:profileError}]=await Promise.all([
    supabase.from('exercises').select('id,name,muscle_group,equipment').in('id',exerciseIds),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
  ]);
  if(catalogError)detailFail('Could not verify the exercises.');if(profileError)detailFail('Could not verify your equipment preferences.');
  assertPreferredEquipment((catalog??[]) as CatalogExercise[],profile,detailFail);
  const{data:last,error:lastError}=await supabase.from('program_exercises').select('sort_order').eq('program_day_id',dayId).order('sort_order',{ascending:false}).limit(1).maybeSingle();
  if(lastError)detailFail('Could not read the training day.');
  const rows=buildProgramExerciseRows(dayId,items!,catalog??[],(last?.sort_order??-1)+1);
  if(!rows)detailFail('One of the selected exercises could not be found.');
  const{error}=await supabase.from('program_exercises').insert(rows!);
  if(error)detailFail('Could not add the exercises. No exercises were saved.');
  revalidatePath(`/programs/${programId}`);redirect(`/programs/${programId}`)
}
export async function removeProgramExercise(formData:FormData){const programId=String(formData.get('programId')??''),exerciseId=String(formData.get('exerciseId')??'');const{supabase,user}=await requireUser();const{data:row,error:readError}=await supabase.from('program_exercises').select('id,program_days!inner(programs!inner(user_id))').eq('id',exerciseId).eq('program_days.programs.user_id',user.id).maybeSingle();if(readError||!row)redirect(`/programs/${programId}?error=${encodeURIComponent('Exercise not found.')}`);const{error}=await supabase.from('program_exercises').delete().eq('id',exerciseId);if(error)redirect(`/programs/${programId}?error=${encodeURIComponent('Could not remove the exercise.')}`);revalidatePath(`/programs/${programId}`);redirect(`/programs/${programId}`)}

export async function replaceProgramExercise(formData:FormData){
  const programId=String(formData.get('programId')??''),exerciseId=String(formData.get('exerciseId')??''),replacementId=String(formData.get('replacementId')??'');
  const detailFail=(message:string):never=>redirect(`/programs/${programId}?error=${encodeURIComponent(message)}`);
  if(!programId||!exerciseId||!replacementId)detailFail('Choose a replacement exercise.');
  const{supabase,user}=await requireUser();
  const{data:program,error:programError}=await supabase.from('programs').select('id').eq('id',programId).eq('user_id',user.id).is('deleted_at',null).maybeSingle();
  if(programError||!program)detailFail('Program not found.');
  const{data:current,error:currentError}=await supabase.from('program_exercises').select('id,program_day_id,exercise_name,muscle_group,equipment').eq('id',exerciseId).maybeSingle();
  if(currentError||!current)detailFail('Template exercise not found.');
  const currentRow=current!;
  const{data:day,error:dayError}=await supabase.from('program_days').select('id,day_number').eq('id',currentRow.program_day_id).eq('program_id',programId).maybeSingle();
  if(dayError||!day)detailFail('Template day not found.');
  const dayRow=day!;
  const{data:replacement,error:replacementError}=await supabase.from('exercises').select('name,muscle_group,equipment').eq('id',replacementId).maybeSingle();
  if(replacementError||!replacement)detailFail('Replacement exercise not found.');
  const replacementRow=replacement!;
  if(replacementRow.muscle_group!==currentRow.muscle_group)detailFail(`Choose another ${currentRow.muscle_group} exercise so weekly volume stays intact.`);
  const{data:profile,error:profileError}=await supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle();
  if(profileError)detailFail('Could not verify your equipment preferences.');
  assertPreferredEquipment([{id:replacementId,name:replacementRow.name,muscle_group:replacementRow.muscle_group,equipment:replacementRow.equipment}],profile,detailFail);
  const{data:duplicate,error:duplicateError}=await supabase.from('program_exercises').select('id').eq('program_day_id',dayRow.id).eq('exercise_name',replacementRow.name).neq('id',exerciseId).limit(1).maybeSingle();
  if(duplicateError)detailFail('Could not verify the replacement.');if(duplicate)detailFail('That exercise is already on this day.');
  const{error:updateError}=await supabase.from('program_exercises').update({exercise_name:replacementRow.name,muscle_group:replacementRow.muscle_group,equipment:replacementRow.equipment,target_weight:0}).eq('id',exerciseId).eq('program_day_id',dayRow.id);
  if(updateError)detailFail('Could not replace the exercise.');
  const{data:matchingDays,error:matchingDaysError}=await supabase.from('program_days').select('id').eq('program_id',programId).eq('day_number',dayRow.day_number);
  if(matchingDaysError){await supabase.from('program_exercises').update({exercise_name:currentRow.exercise_name,muscle_group:currentRow.muscle_group,equipment:currentRow.equipment}).eq('id',exerciseId);detailFail('Could not update future training days; the template was restored.');}
  const futureDayIds=(matchingDays??[]).map(item=>item.id);
  if(futureDayIds.length){const{error:targetError}=await supabase.from('program_day_targets').update({exercise_name:replacementRow.name,target_weight:0}).in('program_day_id',futureDayIds).eq('exercise_name',currentRow.exercise_name);if(targetError){await supabase.from('program_exercises').update({exercise_name:currentRow.exercise_name,muscle_group:currentRow.muscle_group,equipment:currentRow.equipment}).eq('id',exerciseId);detailFail('Could not update future targets; the template was restored.')}}
  revalidatePath(`/programs/${programId}`);revalidatePath('/workout');redirect(`/programs/${programId}`);
}
