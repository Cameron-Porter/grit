type TemplateRow={exercise_name:string;muscle_group:string|null;equipment:string|null;target_sets:number|null;target_reps_min:number|null;target_reps_max:number|null;target_weight:number|null;rir:number|null};
type TargetRow={target_sets:number|null;target_reps_min:number|null;target_reps_max:number|null;target_weight:number|null;rir:number|null}|undefined;
const required=(value:number|null|undefined,label:string,exercise:string)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`The prescription for ${exercise} is missing ${label}.`);return value};
export function resolveExercisePrescription(exercise:TemplateRow,target:TargetRow,musclePriority:string|null){
  const sets=required(target?.target_sets??exercise.target_sets,'sets',exercise.exercise_name),repsMin=required(target?.target_reps_min??exercise.target_reps_min,'minimum reps',exercise.exercise_name),repsMax=required(target?.target_reps_max??exercise.target_reps_max,'maximum reps',exercise.exercise_name),rir=required(target?.rir??exercise.rir,'RIR',exercise.exercise_name);
  if(!Number.isInteger(sets)||sets<1||!Number.isInteger(repsMin)||repsMin<1||!Number.isInteger(repsMax)||repsMax<repsMin||!Number.isInteger(rir)||rir<0)throw new Error(`The prescription for ${exercise.exercise_name} is invalid.`);
  return{name:exercise.exercise_name,muscleGroup:exercise.muscle_group,musclePriority,equipment:exercise.equipment,sets,repsMin,repsMax,weight:target?.target_weight??exercise.target_weight??0,rir};
}
