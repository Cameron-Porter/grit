import Link from'next/link';
import{ProgressDashboard}from'@/components/progress-dashboard';
import{ManualRecords,type ManualRecord}from'@/components/manual-records';
import{requireUser}from'@/lib/auth/require-user';
import{buildProgressMetrics,type ProgressSet}from'@/lib/progress/metrics';

export default async function ProgressPage(){
  const{supabase,user}=await requireUser(),{data:workouts,error:workoutError}=await supabase.from('workouts').select('id,completed_at,created_at').eq('user_id',user.id).is('deleted_at',null).order('completed_at',{ascending:true});
  if(workoutError)throw new Error('Could not load progress history.');
  const workoutIds=(workouts??[]).map(workout=>workout.id);let sets:ProgressSet[]=[];
  if(workoutIds.length){const{data:rows,error:setError}=await supabase.from('workout_sets').select('workout_id,exercise_name,weight,reps,completed,equipment').in('workout_id',workoutIds).eq('completed',true);if(setError)throw new Error('Could not load personal records.');const dates=new Map((workouts??[]).map(workout=>[workout.id,workout.completed_at??workout.created_at]));sets=(rows??[]).map(row=>({exerciseName:row.exercise_name,weight:Number(row.weight??0),reps:Number(row.reps??0),equipment:row.equipment,completedAt:dates.get(row.workout_id)??new Date(0).toISOString()}))}
  const[{data:manualRows,error:manualError},{data:exerciseRows,error:exerciseError}]=await Promise.all([supabase.from('personal_records').select('id,exercise_name,weight,reps,achieved_at').eq('user_id',user.id).is('deleted_at',null).order('exercise_name'),supabase.from('exercises').select('name').order('name')]);
  if(manualError)throw new Error('Could not load your manual records.');if(exerciseError)throw new Error('Could not load the exercise catalog.');
  const manualRecords:ManualRecord[]=(manualRows??[]).map(row=>({id:row.id,exerciseName:row.exercise_name,weight:Number(row.weight??0),reps:Number(row.reps??0),achievedAt:row.achieved_at}));
  const exerciseNames=[...new Set((exerciseRows??[]).map(row=>row.name as string))];
  return <main className="content native-page"><header className="native-page-header"><div><h1>Personal Records</h1><p>Your best completed sets by exercise.</p></div><Link className="native-pill-action" href="/history">Workout history</Link></header><section className="native-section"><ProgressDashboard records={buildProgressMetrics(sets)}/></section><section className="native-section"><ManualRecords records={manualRecords} exerciseNames={exerciseNames}/></section></main>
}
