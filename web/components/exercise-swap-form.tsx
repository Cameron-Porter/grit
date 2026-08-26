'use client';

import { classifyMovement } from '@grit/data/movementClassMap';
import { recommendedExerciseIds, withRecommendedOptions } from '@/lib/exercises/recommendations';
import { CustomSelect } from './custom-select';
import { replaceProgramExercise } from '@/app/(app)/programs/actions';

type CatalogOption = { id:string; name:string; muscle_group:string|null; equipment:string|null; movement_category?:string|null };
type SwapExercise = { id:string; exercise_name:string; muscle_group:string|null };

export function ExerciseSwapForm({ programId, exercise, catalog, returnTo }:{ programId:string; exercise:SwapExercise; catalog:CatalogOption[]; returnTo:string }) {
  const choices = catalog.filter((option) => option.muscle_group === exercise.muscle_group && option.name !== exercise.exercise_name);
  const originClass = classifyMovement(catalog.find((option) => option.name === exercise.exercise_name)?.movement_category);
  const recommendedIds = recommendedExerciseIds(choices.map((option) => ({ id:option.id, name:option.name, muscleGroup:option.muscle_group, movementCategory:option.movement_category })), { originMovementClass:originClass });
  const options = withRecommendedOptions(choices.map((option) => ({ value:option.id, label:`${option.name} · ${option.equipment ?? 'Equipment not listed'}` })), recommendedIds);
  return <form action={replaceProgramExercise} className="day-swap-form">
    <input type="hidden" name="programId" value={programId}/>
    <input type="hidden" name="exerciseId" value={exercise.id}/>
    <input type="hidden" name="returnTo" value={returnTo}/>
    <CustomSelect name="replacementId" ariaLabel={`Swap ${exercise.exercise_name}`} options={options.length ? [{ value:'', label:'Choose a replacement…', disabled:true }, ...options] : [{ value:'', label:'No other exercises for this muscle', disabled:true }]}/>
    <button className="secondary compact">Swap</button>
  </form>;
}
