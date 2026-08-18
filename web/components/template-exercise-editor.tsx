import { replaceProgramExercise,removeProgramExercise } from '@/app/(app)/programs/actions';
import { CustomSelect } from './custom-select';

type Exercise={id:string;exercise_name:string;muscle_group:string|null;equipment:string|null;target_sets:number;target_reps_min:number;target_reps_max:number;target_weight:number;rir:number};
type CatalogExercise={id:string;name:string;muscle_group:string|null;equipment:string|null};

export function TemplateExerciseEditor({programId,exercise,catalog}:{programId:string;exercise:Exercise;catalog:CatalogExercise[]}){
  const choices=catalog.filter(option=>option.muscle_group===exercise.muscle_group),current=choices.find(option=>option.name===exercise.exercise_name);
  return <article className="review-exercise template-review-exercise">
    <div><strong>{exercise.exercise_name}</strong><small>{exercise.muscle_group} · {exercise.equipment}</small><p>{exercise.target_sets} × {exercise.target_reps_min}–{exercise.target_reps_max} · RIR {exercise.rir}</p></div>
    <div className="template-review-controls">
      <form action={replaceProgramExercise}><input type="hidden" name="programId" value={programId}/><input type="hidden" name="exerciseId" value={exercise.id}/><CustomSelect name="replacementId" ariaLabel={`Swap ${exercise.exercise_name}`} defaultValue={current?.id??choices[0]?.id??''} options={choices.map(option=>({value:option.id,label:`${option.name} · ${option.equipment??'Equipment not listed'}`}))}/><button className="secondary compact">Save swap</button></form>
      <form action={removeProgramExercise}><input type="hidden" name="programId" value={programId}/><input type="hidden" name="exerciseId" value={exercise.id}/><button className="danger compact">Delete</button></form>
    </div>
  </article>;
}
