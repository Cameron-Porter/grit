import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type OrderRequest = { templateDayId:string; exerciseNames:string[] };

function isOrderRequest(value:unknown):value is OrderRequest {
  if(!value||typeof value!=='object')return false;
  const input=value as Partial<OrderRequest>;
  return typeof input.templateDayId==='string'&&input.templateDayId.length>0&&Array.isArray(input.exerciseNames)&&input.exerciseNames.length>1&&input.exerciseNames.length<=50&&input.exerciseNames.every(name=>typeof name==='string'&&name.trim().length>0)&&new Set(input.exerciseNames).size===input.exerciseNames.length;
}

export async function POST(request:Request){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400})}
  if(!isOrderRequest(body))return NextResponse.json({error:'Exercise order is incomplete or invalid.'},{status:400});
  const{data:day,error:dayError}=await supabase.from('program_days').select('id,programs!inner(user_id)').eq('id',body.templateDayId).eq('programs.user_id',user.id).maybeSingle();
  if(dayError)return NextResponse.json({error:'Exercise ownership could not be verified.'},{status:500});
  if(!day)return NextResponse.json({error:'Training day not found.'},{status:404});
  const{data:rows,error:readError}=await supabase.from('program_exercises').select('id,exercise_name,sort_order').eq('program_day_id',body.templateDayId).order('sort_order');
  if(readError)return NextResponse.json({error:'Current exercise order could not be loaded.'},{status:500});
  const current=rows??[],requested=new Set(body.exerciseNames);
  if(current.length!==body.exerciseNames.length||current.some(row=>!requested.has(row.exercise_name)))return NextResponse.json({error:'The workout changed before its order could be saved. Refresh and try again.'},{status:409});
  const byName=new Map(current.map(row=>[row.exercise_name,row]));
  for(let index=0;index<body.exerciseNames.length;index++){
    const row=byName.get(body.exerciseNames[index])!;
    const{error}=await supabase.from('program_exercises').update({sort_order:index}).eq('id',row.id).eq('program_day_id',body.templateDayId);
    if(error){
      const rollback=await Promise.all(current.map(original=>supabase.from('program_exercises').update({sort_order:original.sort_order}).eq('id',original.id).eq('program_day_id',body.templateDayId)));
      if(rollback.some(result=>result.error))console.error('Exercise order rollback failed for template day.',body.templateDayId);
      return NextResponse.json({error:'Exercise order could not be saved. The previous order was restored.'},{status:500});
    }
  }
  return NextResponse.json({saved:true});
}
