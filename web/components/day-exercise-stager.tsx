'use client';

import { useEffect, useMemo, useState } from 'react';
import { addProgramExercises } from '@/app/(app)/programs/actions';
import { CustomSelect } from './custom-select';
import { filterExercisesByMuscleGroup, uniqueMuscleGroups, validateStagedExerciseInput, type CatalogExercise, type StagedExerciseInput } from '@/lib/programs/day-template-payload';

const DEFAULTS = { sets: '3', repsMin: '8', repsMax: '12', weight: '0', rir: '3' };

export function DayExerciseStager({ programId, dayId, catalog }: { programId: string; dayId: string; catalog: CatalogExercise[] }) {
  const catalogById = useMemo(() => new Map(catalog.map(exercise => [exercise.id, exercise])), [catalog]);
  const muscleGroups = useMemo(() => uniqueMuscleGroups(catalog), [catalog]);
  const [muscleFilter, setMuscleFilter] = useState('all');
  const filtered = useMemo(() => filterExercisesByMuscleGroup(catalog, muscleFilter), [catalog, muscleFilter]);
  const [exerciseId, setExerciseId] = useState(filtered[0]?.id ?? '');
  const [sets, setSets] = useState(DEFAULTS.sets);
  const [repsMin, setRepsMin] = useState(DEFAULTS.repsMin);
  const [repsMax, setRepsMax] = useState(DEFAULTS.repsMax);
  const [weight, setWeight] = useState(DEFAULTS.weight);
  const [rir, setRir] = useState(DEFAULTS.rir);
  const [staged, setStaged] = useState<StagedExerciseInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!filtered.some(exercise => exercise.id === exerciseId)) setExerciseId(filtered[0]?.id ?? '');
  }, [filtered, exerciseId]);

  const addToList = () => {
    const candidate = { exerciseId, sets: Number(sets), repsMin: Number(repsMin), repsMax: Number(repsMax), weight: Number(weight), rir: Number(rir) };
    if (!validateStagedExerciseInput(candidate) || !catalogById.has(candidate.exerciseId)) { setFormError('Check the exercise targets.'); return; }
    setFormError(null);
    setStaged(current => [...current, candidate]);
  };

  const removeStaged = (index: number) => setStaged(current => current.filter((_, item) => item !== index));

  const exerciseOptions = filtered.map(exercise => ({ value: exercise.id, label: `${exercise.name} · ${exercise.equipment ?? 'Equipment not listed'}` }));

  return <details className="add-exercise">
    <summary>Add exercises</summary>
    <div className="form-grid add-exercise-card">
      <label>Muscle group<CustomSelect ariaLabel="Filter by muscle group" value={muscleFilter} onChange={setMuscleFilter} options={[{ value: 'all', label: 'All muscle groups' }, ...muscleGroups.map(group => ({ value: group, label: group }))]} /></label>
      <label>Exercise<CustomSelect ariaLabel="Exercise" value={exerciseId} onChange={setExerciseId} options={exerciseOptions.length ? exerciseOptions : [{ value: '', label: 'No exercises in this muscle group', disabled: true }]} /></label>
      <label>Sets<input type="number" min="1" max="10" value={sets} onChange={event => setSets(event.target.value)} /></label>
      <label>Rep minimum<input type="number" min="1" max="100" value={repsMin} onChange={event => setRepsMin(event.target.value)} /></label>
      <label>Rep maximum<input type="number" min="1" max="100" value={repsMax} onChange={event => setRepsMax(event.target.value)} /></label>
      <label>Starting weight<input type="number" min="0" step="0.5" value={weight} onChange={event => setWeight(event.target.value)} /></label>
      <label>Target RIR<input type="number" min="0" max="5" value={rir} onChange={event => setRir(event.target.value)} /></label>
      <button type="button" className="secondary" onClick={addToList} disabled={!exerciseId}>Stage exercise</button>
    </div>
    {formError && <p className="notice error" role="alert">{formError}</p>}
    {staged.length > 0 && <div className="review-exercises staged-exercises">
      {staged.map((item, index) => {
        const exercise = catalogById.get(item.exerciseId);
        return <article className="review-exercise" key={`${item.exerciseId}-${index}`}>
          <div><strong>{exercise?.name ?? 'Unknown exercise'}</strong><small>{exercise?.muscle_group} · {exercise?.equipment}</small><p>{item.sets} × {item.repsMin}–{item.repsMax} · RIR {item.rir}</p></div>
          <div className="review-controls"><button type="button" className="secondary compact" onClick={() => removeStaged(index)}>Remove</button></div>
        </article>;
      })}
    </div>}
    <form action={addProgramExercises} className="stage-save-row">
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="items" value={JSON.stringify(staged)} />
      <button disabled={staged.length === 0}>{staged.length ? `Save ${staged.length} exercise${staged.length === 1 ? '' : 's'}` : 'Save exercises'}</button>
    </form>
  </details>;
}
