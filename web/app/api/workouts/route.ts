import{NextResponse}from'next/server';import{createClient}from'@/lib/supabase/server';import{computeProgression}from'@/lib/progression/compute';import{unknownWorkoutExerciseNames}from'@/lib/workout/identity';import{validateWorkoutDayUpdate,validateWorkoutPayload}from'@/lib/workout/payload';import type{ExperienceLevel}from'@grit/types/program';

export async function POST(request:Request){
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  let payload:unknown;try{payload=await request.json()}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400})}if(!validateWorkoutPayload(payload))return NextResponse.json({error:'Workout data is incomplete or invalid.'},{status:400});
  const{data:day,error:dayError}=await supabase.from('program_days').select('id,programs!inner(user_id)').eq('id',payload.programDayId).eq('programs.user_id',user.id).maybeSingle();if(dayError)return NextResponse.json({error:'Workout ownership could not be verified.'},{status:500});if(!day)return NextResponse.json({error:'Workout not found.'},{status:404});
  const submittedExerciseNames=[...new Set(payload.exercises.map(exercise=>exercise.name.trim()))],{data:catalog,error:catalogError}=await supabase.from('exercises').select('name').in('name',submittedExerciseNames);if(catalogError)return NextResponse.json({error:'Exercise identities could not be verified.'},{status:500});const unknownExercises=unknownWorkoutExerciseNames(submittedExerciseNames,new Set((catalog??[]).map(exercise=>exercise.name)));if(unknownExercises.length)return NextResponse.json({error:'Workout includes an exercise that is not in the exercise catalog.'},{status:400});
  const{data:saveResult,error:saveError}=await supabase.rpc('save_web_workout',{p_workout_id:payload.workoutId,p_program_day_id:payload.programDayId,p_name:payload.name,p_program_name:payload.programName,p_completed_at:payload.completedAt,p_exercises:payload.exercises,p_feedback:payload.feedback});
  if(saveError){console.error('Workout transaction failed.',saveError);return NextResponse.json({error:'Your workout could not be saved. Your local copy is still available.'},{status:500})}
  const{data:profile,error:profileError}=await supabase.from('user_profiles').select('experience_level').eq('id',user.id).maybeSingle();if(profileError)return NextResponse.json({error:'Workout saved, but progression settings could not be loaded.',saved:true},{status:503});
  try{await computeProgression(supabase,user.id,payload.programDayId,(profile?.experience_level??'intermediate') as ExperienceLevel,payload.workoutId)}catch(error){console.error('Progression generation failed.',error);return NextResponse.json({error:'Workout saved, but the next targets still need to sync.',saved:true},{status:503})}
  return NextResponse.json({saved:true,idempotent:saveResult==='already_saved'});
}

export async function PATCH(request:Request){
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400})}
  if(!validateWorkoutDayUpdate(body))return NextResponse.json({error:'Invalid workout update.'},{status:400});const input=body;
  const{data:day,error:readError}=await supabase.from('program_days').select('id,programs!inner(user_id)').eq('id',input.programDayId).eq('programs.user_id',user.id).maybeSingle();
  if(readError)return NextResponse.json({error:'Workout ownership could not be verified.'},{status:500});if(!day)return NextResponse.json({error:'Workout not found.'},{status:404});
  const{error}=await supabase.from('program_days').update({skipped:input.skipped,completed:false}).eq('id',input.programDayId);if(error)return NextResponse.json({error:'Workout could not be updated.'},{status:500});
  return NextResponse.json({updated:true});
}
