'use client';

import { useRef } from 'react';
import { replaceProgramExercise,removeProgramExercise } from '@/app/(app)/programs/actions';
import { useConfirmDialog } from './confirm-dialog';
import { CustomSelect } from './custom-select';
import { classifyMovement } from '@grit/data/movementClassMap';
import { recommendedExerciseIds, withRecommendedOptions } from '@/lib/exercises/recommendations';

type Exercise={id:string;exercise_name:string;muscle_group:string|null;equipment:string|null;target_sets:number;target_reps_min:number;target_reps_max:number;target_weight:number;rir:number};
type CatalogExercise={id:string;name:string;muscle_group:string|null;equipment:string|null;movement_category?:string|null};

export function TemplateExerciseEditor({programId,exercise,catalog}:{programId:string;exercise:Exercise;catalog:CatalogExercise[]}){
  const choices=catalog.filter(option=>option.muscle_group===exercise.muscle_group),current=choices.find(option=>option.name===exercise.exercise_name);
  const originClass=classifyMovement(current?.movement_category);
  const recommendedIds=recommendedExerciseIds(choices.filter(option=>option.name!==exercise.exercise_name).map(option=>({id:option.id,name:option.name,muscleGroup:option.muscle_group,movementCategory:option.movement_category})),{originMovementClass:originClass});
  const removeFormRef=useRef<HTMLFormElement>(null);
  const { confirm, dialog } = useConfirmDialog();
  const confirmRemove = async(event:React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await confirm({ message:`Remove ${exercise.exercise_name} from this program?`, tone:'danger', confirmLabel:'Remove exercise' })) removeFormRef.current?.requestSubmit();
  };
  return <article className="review-exercise template-review-exercise">
    <div><strong>{exercise.exercise_name}</strong><small>{exercise.muscle_group} · {exercise.equipment}</small><p>{exercise.target_sets} × {exercise.target_reps_min}–{exercise.target_reps_max} · RIR {exercise.rir}</p></div>
    <div className="template-review-controls">
      <form action={replaceProgramExercise}><input type="hidden" name="programId" value={programId}/><input type="hidden" name="exerciseId" value={exercise.id}/><CustomSelect name="replacementId" ariaLabel={`Swap ${exercise.exercise_name}`} defaultValue={current?.id??choices[0]?.id??''} options={withRecommendedOptions(choices.map(option=>({value:option.id,label:`${option.name} · ${option.equipment??'Equipment not listed'}`})),recommendedIds)}/><button className="secondary compact">Save swap</button></form>
      <form ref={removeFormRef} action={removeProgramExercise} onSubmit={confirmRemove}><input type="hidden" name="programId" value={programId}/><input type="hidden" name="exerciseId" value={exercise.id}/><button className="danger compact">Delete</button></form>
    </div>
    {dialog}
  </article>;
}
