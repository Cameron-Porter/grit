'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { equipmentSettings } from '@/lib/profile/equipment';

export async function signOut(){const supabase=await createClient();const{error}=await supabase.auth.signOut();if(error)redirect('/profile?error=Could%20not%20log%20out.%20Please%20try%20again.');redirect('/login')}

export async function saveProfile(formData:FormData){
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
  const bodyWeightRaw=String(formData.get('bodyWeight')??'').trim(),experience=String(formData.get('experience')??''),bodyWeight=bodyWeightRaw===''?null:Number(bodyWeightRaw);
  if((bodyWeight!==null&&(!Number.isFinite(bodyWeight)||bodyWeight<50||bodyWeight>1000))||!['beginner','intermediate','advanced'].includes(experience))redirect('/profile?error=Check%20your%20profile%20values.');
  const{data:equipmentRows,error:equipmentError}=await supabase.from('exercises').select('equipment');
  if(equipmentError)redirect('/profile?error=Could%20not%20verify%20your%20equipment.');
  let settings:ReturnType<typeof equipmentSettings>;try{settings=equipmentSettings(formData,(equipmentRows??[]).map(row=>row.equipment).filter((item):item is string=>Boolean(item)))}catch(error){redirect(`/profile?error=${encodeURIComponent(error instanceof Error?error.message:'Check your equipment availability.')}`)}
  const{error}=await supabase.from('user_profiles').update({body_weight:bodyWeight,experience_level:experience,use_preferred_equipment:settings.enabled,preferred_equipment:settings.preferred}).eq('id',user.id);
  if(error)redirect('/profile?error=Could%20not%20save%20your%20profile.');redirect('/profile?saved=true');
}
