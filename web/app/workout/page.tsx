import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { AppNav } from '@/components/app-nav';
import { WorkoutLogger, type ExerciseOption, type WorkoutPrescription } from '@/components/workout-logger';
import { loadWorkoutTargets } from '@/lib/workout/load-targets';
import { filterExercisesByEquipmentPreference } from '@/lib/programs/day-template-payload';
import { fetchStripeSubscriptionStatus } from '@/lib/billing/fetch-entitlement-profile';
import { resolveEntitlement } from '@/lib/billing/entitlement';

export const dynamic = 'force-dynamic';

type ActiveProgram = { id:string; name:string; muscle_priorities:Record<string,string|null>|null; total_weeks:number; focus:string|null };
type ProgramDayRow = { id:string; week_number:number; day_number:number; label:string|null; completed:boolean; skipped:boolean };

export default async function Workout({ searchParams }:{ searchParams:Promise<Record<string,string|string[]|undefined>> }) {
  const { supabase, user } = await requireUser();
  const params=await searchParams, quick=Array.isArray(params.quick)?params.quick[0]:params.quick, dayParam=Array.isArray(params.day)?params.day[0]:params.day;
  if (quick === 'blank') {
    const [{data:catalog,error:catalogError},{data:profile,error:profileError}]=await Promise.all([supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max').order('name'),supabase.from('user_profiles').select('body_weight,use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle()]);
    if(catalogError) throw new Error(`Could not load exercise catalog: ${catalogError.message}`);
    if(profileError) throw new Error(`Could not load body weight: ${profileError.message}`);
    const workout:WorkoutPrescription={dayId:null,templateDayId:null,bodyWeight:Number(profile?.body_weight)||0,programName:'Quick Workout',week:null,day:null,label:'Quick Workout',exercises:[]};
    const preferred=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
    const visibleCatalog=filterExercisesByEquipmentPreference(catalog,{enabled:Boolean(profile?.use_preferred_equipment),preferred});
    const options:ExerciseOption[]=visibleCatalog.map((exercise)=>({id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,equipment:exercise.equipment,repsMin:exercise.rep_range_min,repsMax:exercise.rep_range_max,movementCategory:exercise.movement_category}));
    return <><main className="app-shell page-frame workout-page"><WorkoutLogger key="quick-workout" workout={workout} userId={user.id} catalog={options}/></main><AppNav /></>;
  }

  const [profileResult, stripeStatus, programOrDayResult] = await Promise.all([
    supabase.from('user_profiles').select('role,subscription_status,experience_level,body_weight').eq('id', user.id).maybeSingle(),
    process.env.GRIT_EXPLANATIONS_ENABLED === '1' ? fetchStripeSubscriptionStatus(supabase, user.id) : Promise.resolve(null),
    dayParam
      ? supabase.from('program_days').select('id,program_id,week_number,day_number,label,completed,skipped,programs!inner(id,name,muscle_priorities,total_weeks,focus,user_id,deleted_at)').eq('id', dayParam).eq('programs.user_id', user.id).maybeSingle()
      : supabase.from('programs').select('id,name,muscle_priorities,total_weeks,focus').eq('user_id', user.id).eq('is_current', true).is('deleted_at', null).maybeSingle(),
  ]);

  if (profileResult.error) throw new Error(`Could not load profile: ${profileResult.error.message}`);
  if (programOrDayResult.error) throw new Error(`Could not load ${dayParam ? 'that training day' : 'current program'}: ${programOrDayResult.error.message}`);
  const userProfile = profileResult.data;
  const entitlementProfile = userProfile ? { role: userProfile.role, subscription_status: userProfile.subscription_status, stripe_subscription_status: stripeStatus } : null;
  const isPro = resolveEntitlement(entitlementProfile) === 'pro';
  const explanationsEnabled = isPro && process.env.GRIT_EXPLANATIONS_ENABLED === '1';

  let current:ActiveProgram, days:ProgramDayRow[], nextDay:ProgramDayRow;
  if (dayParam) {
    const dayRow = programOrDayResult.data as { id:string; program_id:string; week_number:number; day_number:number; label:string|null; completed:boolean; skipped:boolean; programs:{ id:string; name:string; muscle_priorities:Record<string,string|null>|null; total_weeks:number; focus:string|null; user_id:string; deleted_at:string|null }[] } | null;
    const programRow = dayRow?.programs?.[0];
    if (!dayRow || !programRow || programRow.deleted_at) notFound();
    if (dayRow.completed) redirect(`/programs/${dayRow.program_id}/day/${dayRow.id}`);
    current = { id:programRow.id, name:programRow.name, muscle_priorities:programRow.muscle_priorities, total_weeks:programRow.total_weeks, focus:programRow.focus };
    const { data: allDays, error: allDaysError } = await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', current.id).order('week_number').order('day_number');
    if (allDaysError) throw new Error(`Could not load program days: ${allDaysError.message}`);
    days = allDays ?? [];
    nextDay = { id:dayRow.id, week_number:dayRow.week_number, day_number:dayRow.day_number, label:dayRow.label, completed:dayRow.completed, skipped:dayRow.skipped };
  } else {
    const currentProgram = programOrDayResult.data as ActiveProgram | null;
    if (!currentProgram) return <><main className="app-shell page-frame workout-page native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>No active program</h1><p>Choose a program or start an ad hoc workout.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a><a className="secondary button-link" href="/programs">View programs</a></section></main><AppNav /></>;
    current = currentProgram;
    const { data: allDays, error: daysError } = await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id', current.id).order('week_number').order('day_number');
    if (daysError) throw new Error(`Could not load program days: ${daysError.message}`);
    days = allDays ?? [];
    const foundNext=days.find((day)=>!day.completed&&!day.skipped);
    if (!foundNext) {
      const { error: clearError } = await supabase.from('programs').update({ is_current: false }).eq('id', current.id).eq('user_id', user.id).eq('is_current', true);
      if (clearError) console.error('Could not clear completed program from active status.', clearError);
      return <><main className="app-shell page-frame workout-page native-page native-gradient-background"><section className="surface empty-state native-empty-state"><h1>Program complete</h1><p>You’ve completed every scheduled day in {current.name}.</p><a className="primary button-link" href="/workout?quick=blank">Start blank Quick Workout</a></section></main><AppNav /></>;
    }
    nextDay = foundNext;
  }
  const loaded=await loadWorkoutTargets(supabase,nextDay.id,{
    userId: user.id,
    programId: current.id,
    totalWeeks: current.total_weeks,
    focus: current.focus,
    musclePriorities: current.muscle_priorities,
    weekNumber: nextDay.week_number,
    dayNumber: nextDay.day_number,
    profile: userProfile ? { experience_level: userProfile.experience_level, body_weight: userProfile.body_weight } : null,
  });
  const historyByExercise=loaded.historyByExercise;
  const workout:WorkoutPrescription={dayId:nextDay.id,templateDayId:loaded.templateDayId,bodyWeight:loaded.bodyWeight,programName:current.name,week:nextDay.week_number,day:nextDay.day_number,label:nextDay.label??`Day ${nextDay.day_number}`,exercises:loaded.resolved.map(item=>item.prescription)};
  return <><main className="app-shell page-frame workout-page"><WorkoutLogger key={workout.dayId} workout={workout} userId={user.id} historyByExercise={historyByExercise} explanationsEnabled={explanationsEnabled}/></main><AppNav /></>;
}
