export type WebWorkoutPayload={workoutId:string;programDayId:string;name:string;programName:string;completedAt:string;exercises:Array<{name:string;muscleGroup:string|null;musclePriority:string|null;equipment:string|null;note:string|null;sets:Array<{reps:number;weight:number;rir:number|null;reportedRir:number|null;completed:boolean}>}>;feedback:Array<{muscleGroup:string;jointPain:string|null;pump:string|null;volume:string|null;soreness:string|null}>};
export type WorkoutDayUpdate={programDayId:string;skipped:boolean};

export function validateWorkoutDayUpdate(value:unknown):value is WorkoutDayUpdate{
  if(!value||typeof value!=='object')return false;const input=value as Partial<WorkoutDayUpdate>;
  return typeof input.programDayId==='string'&&input.programDayId.length>0&&typeof input.skipped==='boolean';
}

export function validateWorkoutPayload(value:unknown):value is WebWorkoutPayload{
  if(!value||typeof value!=='object')return false;const payload=value as Partial<WebWorkoutPayload>;
  if(typeof payload.workoutId!=='string'||typeof payload.programDayId!=='string'||typeof payload.name!=='string'||typeof payload.programName!=='string'||typeof payload.completedAt!=='string'||!Array.isArray(payload.exercises)||!Array.isArray(payload.feedback))return false;
  let completed=0;
  for(const exercise of payload.exercises){if(!exercise||typeof exercise.name!=='string'||!Array.isArray(exercise.sets))return false;for(const set of exercise.sets){if(typeof set.reps!=='number'||!Number.isInteger(set.reps)||set.reps<0||set.reps>1000||typeof set.weight!=='number'||!Number.isFinite(set.weight)||set.weight<0||set.weight>100000||typeof set.completed!=='boolean')return false;if(set.reportedRir!==null&&(!Number.isInteger(set.reportedRir)||set.reportedRir<0||set.reportedRir>10))return false;if(set.completed)completed++}}
  return completed>0;
}
