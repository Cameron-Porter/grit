'use server';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { buildAiProgramBase, validAiBuilderInput, validateAiSelection, type AiBuilderInput, type AiCatalogExercise, type AiProgramSelection } from '@/lib/ai/program';
import { recommendInitialMesocycleTarget, type SessionPerformance } from '@grit/rules/progressionEngine';
const fail=(message:string):never=>redirect(`/programs/ai/review?error=${encodeURIComponent(message)}`);

export async function saveAiProgram(formData:FormData){
  let input:unknown,selection:unknown;
  try{input=JSON.parse(String(formData.get('input')??''));selection=JSON.parse(String(formData.get('selection')??''))}catch{fail('The generated program could not be read.')}
  if(!validAiBuilderInput(input))fail('The program settings are invalid.');
  const validInput=input as AiBuilderInput,chosen=selection as AiProgramSelection,base=buildAiProgramBase(validInput);
  if(!base.validation.valid)fail('The selected configuration does not pass the GRIT rules engine.');
  const names=[...new Set(chosen.days?.flatMap(day=>day.selections?.map(item=>item.exerciseName)??[])??[])];
  if(!names.length)fail('The generated program contains no exercises.');
  const{supabase,user}=await requireUser();
  const[{data:catalogRows,error:catalogError},{data:profile,error:profileError}]=await Promise.all([
    supabase.from('exercises').select('name,muscle_group,equipment,movement_category,beginner_suitable').in('name',names),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
  ]);
  if(catalogError||profileError)fail('The exercise catalog could not be verified.');
  const preferred=new Set<string>(profile?.use_preferred_equipment&&Array.isArray(profile.preferred_equipment)?profile.preferred_equipment:[]);
  if(profile?.use_preferred_equipment&&(catalogRows??[]).some(row=>!row.equipment||!preferred.has(row.equipment)))fail('An exercise uses equipment outside your current availability. Review the program again.');
  const catalog:AiCatalogExercise[]=(catalogRows??[]).map(row=>({name:row.name,muscleGroup:row.muscle_group,equipment:row.equipment,movementCategory:row.movement_category,beginnerSuitable:row.beginner_suitable}));
  try{validateAiSelection(base,chosen,catalog)}catch(error){fail(error instanceof Error?error.message:'The generated exercise selection is invalid.')}
  const{data:historyWorkouts,error:historyWorkoutError}=await supabase.from('workouts').select('id,completed_at').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:false}).limit(100);
  if(historyWorkoutError)fail('Past workout history could not be read. No program was created.');
  const historyIds=(historyWorkouts??[]).map(workout=>workout.id),{data:historySets,error:historySetError}=historyIds.length?await supabase.from('workout_sets').select('workout_id,exercise_name,set_index,weight,reps,reported_rir').in('workout_id',historyIds).in('exercise_name',names).eq('completed',true).order('set_index'):{data:[],error:null};
  if(historySetError)fail('Past exercise performance could not be read. No program was created.');
  const setsByExerciseWorkout=new Map<string,SessionPerformance['sets']>();
  for(const set of historySets??[]){const key=`${set.exercise_name}\u0000${set.workout_id}`,sets=setsByExerciseWorkout.get(key)??[];sets.push({weight:Number(set.weight),reps:Number(set.reps),...(set.reported_rir==null?{}:{rir:Number(set.reported_rir)})});setsByExerciseWorkout.set(key,sets)}
  const historyByExercise=new Map<string,SessionPerformance[]>();
  for(const name of names){const sessions:SessionPerformance[]=[];for(const workout of historyWorkouts??[]){const sets=setsByExerciseWorkout.get(`${name}\u0000${workout.id}`);if(sets?.length)sessions.push({date:workout.completed_at??'',sets})}historyByExercise.set(name,sessions)}
  const catalogByName=new Map(catalog.map(exercise=>[exercise.name,exercise])),selectionByDay=new Map(chosen.days.map(day=>[day.dayIndex,day])),programId=randomUUID();
  const cleanup=async()=>{const{error}=await supabase.from('programs').delete().eq('id',programId).eq('user_id',user.id);return error};
  const{error:programError}=await supabase.from('programs').insert({id:programId,user_id:user.id,name:validInput.name.trim(),total_weeks:validInput.weeks,days_per_week:validInput.daysPerWeek,focus:validInput.focus,muscle_priorities:validInput.priorities,is_current:false});
  if(programError)fail('The program could not be created.');
  const dayRows=base.weeks.flatMap(week=>week.days.map(day=>({program_id:programId,week_number:week.weekNumber,day_number:day.dayIndex+1,label:(selectionByDay.get(day.dayIndex)?.label||day.splitName).slice(0,80)})));
  const{data:savedDays,error:dayError}=await supabase.from('program_days').insert(dayRows).select('id,week_number,day_number');
  if(dayError||!savedDays){const cleanupError=await cleanup();fail(cleanupError?'Training days failed and cleanup also failed. Contact support.':'Training days could not be saved. No partial program was kept.')}
  const dayId=new Map((savedDays??[]).map(day=>[`${day.week_number}:${day.day_number}`,day.id]));
  if(dayId.size!==dayRows.length){const cleanupError=await cleanup();fail(cleanupError?'Saved days were incomplete and cleanup failed. Contact support.':'Saved days were incomplete. No partial program was kept.')}
  const templateRows=base.days.flatMap(day=>{const selected=new Map(selectionByDay.get(day.dayIndex)!.selections.map(item=>[item.slotId,item]));return day.slots.map((slot,index)=>{const choice=selected.get(slot.id)!,exercise=catalogByName.get(choice.exerciseName)!;return{program_day_id:dayId.get(`1:${day.dayIndex+1}`)!,exercise_name:exercise.name,muscle_group:slot.muscle,equipment:exercise.equipment,sort_order:index,target_sets:slot.sets,target_reps_min:slot.repsMin,target_reps_max:slot.repsMax,target_weight:0,rir:slot.rir,role:slot.role}})});
  const{error:templateError}=await supabase.from('program_exercises').insert(templateRows);
  if(templateError){const cleanupError=await cleanup();fail(cleanupError?'Exercise templates failed and cleanup also failed. Contact support.':'Exercise templates could not be saved. No partial program was kept.')}
  const targetRows=base.weeks.flatMap(week=>week.days.flatMap(day=>{const selected=new Map(selectionByDay.get(day.dayIndex)!.selections.map(item=>[item.slotId,item]));return day.slots.map(slot=>{const choice=selected.get(slot.id)!,exercise=catalogByName.get(choice.exerciseName)!,seed=week.weekNumber===1&&validInput.focus==='hypertrophy'?recommendInitialMesocycleTarget({sets:slot.sets,repsMin:slot.repsMin,repsMax:slot.repsMax,rir:slot.rir,role:slot.role,equipment:exercise.equipment??undefined},historyByExercise.get(choice.exerciseName)??[]):null;return{program_day_id:dayId.get(`${week.weekNumber}:${day.dayIndex+1}`)!,exercise_name:choice.exerciseName,target_sets:slot.sets,target_reps_min:seed?.repsMin??slot.repsMin,target_reps_max:seed?.repsMax??slot.repsMax,target_weight:seed?.weight??0,rir:slot.rir,ai_rationale:choice.reason.slice(0,300)}})}));
  const{error:targetError}=await supabase.from('program_day_targets').insert(targetRows);
  if(targetError){const cleanupError=await cleanup();fail(cleanupError?'Weekly targets failed and cleanup also failed. Contact support.':'Weekly progression targets could not be saved. No partial program was kept.')}
  redirect(`/programs/${programId}`);
}
