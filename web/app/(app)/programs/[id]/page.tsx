import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { renameProgram, setCurrentProgram, softDeleteProgram } from '../actions';

export default async function ProgramDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const{id}=await params,query=await searchParams,{supabase,user}=await requireUser();
  const{data:program,error}=await supabase.from('programs').select('id,name,total_weeks,days_per_week,is_current,focus').eq('id',id).eq('user_id',user.id).is('deleted_at',null).maybeSingle();
  if(error)throw new Error(`Could not load program: ${error.message}`);if(!program)notFound();
  const{data:days,error:dayError}=await supabase.from('program_days').select('id,week_number,day_number,label,completed,skipped').eq('program_id',id).order('week_number').order('day_number');
  if(dayError)throw new Error(`Could not load days: ${dayError.message}`);
  const dayList=days??[],isComplete=dayList.length>0&&dayList.every(day=>day.completed||day.skipped);
  const weeks=Array.from({length:program.total_weeks},(_,index)=>({number:index+1,days:dayList.filter(day=>day.week_number===index+1)})),nextDay=dayList.find(day=>!day.completed&&!day.skipped);
  return <main className="content native-page native-gradient-background"><a className="back-link" href="/programs">← Programs</a><header className="page-header native-page-header"><div><div className="eyebrow">{program.focus}</div><h1>{program.name}</h1><p>{program.total_weeks} weeks · {program.days_per_week} days/week</p></div>{isComplete?<span className="native-badge solid">Complete</span>:program.is_current&&<span className="native-badge solid">Active</span>}</header>
    {query.error&&<p className="notice error" role="alert">{String(query.error)}</p>}
    <section className="surface program-settings native-settings-group"><form className="rename-program" action={renameProgram}><input type="hidden" name="id" value={id}/><label>Program name<input name="name" defaultValue={program.name} required/></label><button className="secondary">Rename</button></form>{!program.is_current&&!isComplete&&<div className="program-action-row"><form action={setCurrentProgram}><input type="hidden" name="id" value={id}/><button>Make active</button></form></div>}</section>
    <section className="surface week-calendar-card native-section" aria-labelledby="schedule-title"><header><div><div className="eyebrow">SCHEDULE</div><h2 id="schedule-title">Program overview</h2></div></header><p className="week-calendar-hint">Tap a Week 1 day that hasn&rsquo;t been completed yet to swap or remove its exercises — changes apply to every matching week.</p>
      <div className="week-calendar">{weeks.map(week=><div className="week-calendar-group" key={week.number}><span className="week-calendar-label">Week {week.number}</span><div className="week-calendar-days">{week.days.map(day=>{const status=day.completed?'completed':day.skipped?'skipped':day.id===nextDay?.id?'next':'upcoming',editable=status==='upcoming'&&week.number===1,icon=status==='completed'?'✓':status==='next'?'▶':status==='skipped'?'—':editable?'✎':'';return <Link key={day.id} href={`/programs/${id}/day/${day.id}`} className={`week-calendar-day ${status} ${editable?'editable':''}`}><span className="day-icon" aria-hidden="true">{icon}</span><span className="day-label">{day.label??`Day ${day.day_number}`}</span></Link>})}</div></div>)}</div>
    </section>
    <form className="delete-program-action" action={softDeleteProgram}><input type="hidden" name="id" value={id}/><button className="danger">Delete program</button></form>
  </main>;
}
