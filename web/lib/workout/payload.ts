import{canonicalExerciseName}from'@grit/data/exerciseNameAliases';

export type WebWorkoutPayload={workoutId:string;programDayId:string|null;name:string;programName:string;completedAt:string;exercises:Array<{name:string;muscleGroup:string|null;musclePriority:string|null;equipment:string|null;note:string|null;sets:Array<{reps:number;weight:number;rir:number|null;reportedRir:number|null;completed:boolean}>}>;feedback:Array<{muscleGroup:string;jointPain:string|null;pump:string|null;volume:string|null;soreness:string|null}>};
export type WorkoutDayUpdate={programDayId:string;skipped:boolean};

// A payload built before a catalog rename (an open tab, an offline-queued save)
// can still carry a retired exercise name; move it onto the kept one so the
// catalog check accepts it and the sets join that exercise's history.
export function canonicalizeWorkoutExerciseNames(payload:WebWorkoutPayload):WebWorkoutPayload{
  return{...payload,exercises:payload.exercises.map(exercise=>({...exercise,name:canonicalExerciseName(exercise.name)}))};
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EXERCISES=50,MAX_SETS_PER_EXERCISE=20,MAX_FEEDBACK=40;
const stringIn=(value:unknown,min:number,max:number)=>typeof value==='string'&&value.trim().length>=min&&value.length<=max;
const nullableStringIn=(value:unknown,max:number)=>value===null||stringIn(value,0,max);
const nullableRir=(value:unknown)=>value===null||(Number.isInteger(value)&&typeof value==='number'&&value>=0&&value<=10);
const nullableUuid=(value:unknown)=>value===null||(typeof value==='string'&&stringIn(value,1,64)&&UUID.test(value));

export function validateWorkoutDayUpdate(value:unknown):value is WorkoutDayUpdate{
  if(!value||typeof value!=='object')return false;const input=value as Partial<WorkoutDayUpdate>;
  return typeof input.programDayId==='string'&&input.programDayId.length>0&&typeof input.skipped==='boolean';
}

export function validateWorkoutPayload(value:unknown):value is WebWorkoutPayload{
  if(!value||typeof value!=='object')return false;const payload=value as Partial<WebWorkoutPayload>;
  if(typeof payload.workoutId!=='string'||!stringIn(payload.workoutId,1,64)||!UUID.test(payload.workoutId)||!nullableUuid(payload.programDayId)||!stringIn(payload.name,1,120)||!stringIn(payload.programName,1,120)||typeof payload.completedAt!=='string'||!stringIn(payload.completedAt,1,64)||Number.isNaN(Date.parse(payload.completedAt))||!Array.isArray(payload.exercises)||payload.exercises.length<1||payload.exercises.length>MAX_EXERCISES||!Array.isArray(payload.feedback)||payload.feedback.length>MAX_FEEDBACK)return false;
  let completed=0;
  for(const exercise of payload.exercises){if(!exercise||typeof exercise!=='object'||!stringIn(exercise.name,1,160)||!nullableStringIn(exercise.muscleGroup,80)||!nullableStringIn(exercise.musclePriority,80)||!nullableStringIn(exercise.equipment,80)||!nullableStringIn(exercise.note,1000)||!Array.isArray(exercise.sets)||exercise.sets.length<1||exercise.sets.length>MAX_SETS_PER_EXERCISE)return false;for(const set of exercise.sets){if(!set||typeof set!=='object'||typeof set.reps!=='number'||!Number.isInteger(set.reps)||set.reps<0||set.reps>1000||typeof set.weight!=='number'||!Number.isFinite(set.weight)||set.weight<0||set.weight>100000||!nullableRir(set.rir)||!nullableRir(set.reportedRir)||typeof set.completed!=='boolean')return false;if(set.completed)completed++}}
  for(const item of payload.feedback){if(!item||typeof item!=='object'||!stringIn(item.muscleGroup,1,80)||!nullableStringIn(item.jointPain,80)||!nullableStringIn(item.pump,80)||!nullableStringIn(item.volume,80)||!nullableStringIn(item.soreness,80))return false;}
  return completed>0;
}
