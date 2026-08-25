import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { renameProgram, setCurrentProgram, softDeleteProgram } from '../actions';
import { TemplateExerciseEditor } from '@/components/template-exercise-editor';
import { DayExerciseStager } from '@/components/day-exercise-stager';
import { filterExercisesByEquipmentPreference } from '@/lib/programs/day-template-payload';

export default async function ProgramDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const{id}=await params,query=await searchParams,{supabase,user}=await requireUser();
  const{data:program,error}=await supabase.from('programs').select('id,name,total_weeks,days_per_week,is_current,focus').eq('id',id).eq('user_id',user.id).is('deleted_at',null).maybeSingle();
  if(error)throw new Error(`Could not load program: ${error.message}`);if(!program)notFound();
  const[{data:days,error:dayError},{data:catalog,error:catalogError},{data:profile,error:profileError}]=await Promise.all([
    supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped,program_exercises(id,exercise_name,muscle_group,equipment,sort_order,target_sets,target_reps_min,target_reps_max,target_weight,rir)').eq('program_id',id).order('week_number').order('day_number'),
    supabase.from('exercises').select('id,name,muscle_group,equipment,rep_range_min,rep_range_max').order('name'),
    supabase.from('user_profiles').select('use_preferred_equipment,preferred_equipment').eq('id',user.id).maybeSingle(),
  ]);
  if(dayError)throw new Error(`Could not load days: ${dayError.message}`);if(catalogError)throw new Error(`Could not load exercises: ${catalogError.message}`);
  if(profileError)throw new Error(`Could not load equipment preferences: ${profileError.message}`);
  const preferred=Array.isArray(profile?.preferred_equipment)?profile.preferred_equipment.filter((item):item is string=>typeof item==='string'):[];
  const visibleCatalog=filterExercisesByEquipmentPreference(catalog??[],{enabled:Boolean(profile?.use_preferred_equipment),preferred});
  const dayList=days??[],isComplete=dayList.length>0&&dayList.every(day=>day.completed||day.skipped);
  const weeks=Array.from({length:program.total_weeks},(_,index)=>({number:index+1,days:dayList.filter(day=>day.week_number===index+1)})),weekOne=weeks[0]?.days??[],nextDay=dayList.find(day=>!day.completed&&!day.skipped);
  return <main className="content native-page native-gradient-background"><a className="back-link" href="/programs">← Programs</a><header className="page-header native-page-header"><div><div className="eyebrow">{program.focus}</div><h1>{program.name}</h1><p>{program.total_weeks} weeks · {program.days_per_week} days/week</p></div>{isComplete?<span className="native-badge solid">Complete</span>:program.is_current&&<span className="native-badge solid">Active</span>}</header>
    {query.error&&<p className="notice error" role="alert">{String(query.error)}</p>}
    <section className="surface program-settings native-settings-group"><form className="rename-program" action={renameProgram}><input type="hidden" name="id" value={id}/><label>Program name<input name="name" defaultValue={program.name} required/></label><button className="secondary">Rename</button></form><div className="program-action-row">{!program.is_current&&!isComplete&&<form action={setCurrentProgram}><input type="hidden" name="id" value={id}/><button>Make active</button></form>}<form action={softDeleteProgram}><input type="hidden" name="id" value={id}/><button className="danger">Delete program</button></form></div></section>
    <section className="surface schedule-board native-section" aria-labelledby="schedule-title"><header><div><div className="eyebrow">SCHEDULE</div><h2 id="schedule-title">Program overview</h2></div><div className="schedule-legend"><span className="completed">Completed</span><span className="skipped">Skipped</span><span className="next">Up next</span></div></header><div className="schedule-scroll"><table><thead><tr><th>Week</th>{Array.from({length:program.days_per_week},(_,index)=><th key={index}>Day {index+1}</th>)}</tr></thead><tbody>{weeks.map(week=><tr key={week.number}><th><strong>{week.number}</strong><span>{week.days.filter(day=>day.completed).length}/{week.days.length}</span></th>{week.days.map(day=>{const status=day.completed?'completed':day.skipped?'skipped':day.id===nextDay?.id?'next':'not-started';return <td key={day.id}><div className={`schedule-day ${status}`}><strong>{day.label??`Day ${day.day_number}`}</strong><span>{status==='completed'?'Completed':status==='skipped'?'Skipped':status==='next'?'Up next':'Not started'}</span></div></td>})}</tr>)}</tbody></table></div></section>
    <details className="surface template-editor"><summary>Edit exercise template</summary><p>Swap within the same muscle group to preserve the program’s volume. Changes apply to matching future days.</p>{profile?.use_preferred_equipment&&preferred.length>0&&<p className="notice">Exercise choices are limited to your preferred equipment: {preferred.join(', ')}.</p>}<div className="stack day-stack">{weekOne.map(day=><section className="template-day" key={day.id}><h2>{day.label??`Day ${day.day_number}`}</h2><div className="review-exercises">{[...(day.program_exercises??[])].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map(exercise=><TemplateExerciseEditor key={exercise.id} programId={id} exercise={exercise} catalog={visibleCatalog}/>)}</div><DayExerciseStager programId={id} dayId={day.id} catalog={visibleCatalog}/></section>)}</div></details>
  </main>;
}
