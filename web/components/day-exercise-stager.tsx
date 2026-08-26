'use client';

import { useEffect, useMemo, useState } from 'react';
import { addProgramExercises } from '@/app/(app)/programs/actions';
import { CustomSelect } from './custom-select';
import { filterExercisesByMuscleGroup, stagedDefaultsForExercise, uniqueMuscleGroups, validateStagedExerciseInput, type CatalogExercise, type StagedExerciseInput } from '@/lib/programs/day-template-payload';
import { muscleFeedbackTrend, recommendedExerciseIds, withRecommendedOptions, type MuscleFeedbackRow } from '@/lib/exercises/recommendations';

export function DayExerciseStager({ programId, dayId, catalog, muscleFeedback = [] }: { programId: string; dayId: string; catalog: CatalogExercise[]; muscleFeedback?: MuscleFeedbackRow[] }) {
  const catalogById = useMemo(() => new Map(catalog.map(exercise => [exercise.id, exercise])), [catalog]);
  const muscleGroups = useMemo(() => uniqueMuscleGroups(catalog), [catalog]);
  const [muscleFilter, setMuscleFilter] = useState('all');
  const filtered = useMemo(() => filterExercisesByMuscleGroup(catalog, muscleFilter), [catalog, muscleFilter]);
  const recommendedIds = useMemo(() => muscleFilter === 'all' ? [] : recommendedExerciseIds(filtered.map(exercise => ({ id:exercise.id,name:exercise.name,muscleGroup:exercise.muscle_group,movementCategory:exercise.movement_category })),{ muscleGroup:muscleFilter,feedbackTrend:muscleFeedbackTrend(muscleFeedback,muscleFilter) }), [filtered, muscleFilter, muscleFeedback]);
  const [exerciseId, setExerciseId] = useState(filtered[0]?.id ?? '');
  const initial = filtered[0] ? stagedDefaultsForExercise(filtered[0]) : { sets: 3, repsMin: 8, repsMax: 12, weight: 0, rir: 2 };
  const [sets, setSets] = useState(String(initial.sets));
  const [repsMin, setRepsMin] = useState(String(initial.repsMin));
  const [repsMax, setRepsMax] = useState(String(initial.repsMax));
  const [weight, setWeight] = useState(String(initial.weight));
  const [rir, setRir] = useState(String(initial.rir));
  const [staged, setStaged] = useState<StagedExerciseInput[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!filtered.some(exercise => exercise.id === exerciseId)) setExerciseId(filtered[0]?.id ?? '');
  }, [filtered, exerciseId]);

  useEffect(() => {
    const exercise = catalogById.get(exerciseId);
    if (!exercise) return;
    const next = stagedDefaultsForExercise(exercise);
    setSets(String(next.sets));
    setRepsMin(String(next.repsMin));
    setRepsMax(String(next.repsMax));
    setWeight(String(next.weight));
    setRir(String(next.rir));
  }, [catalogById, exerciseId]);

  const addToList = () => {
    const candidate = { exerciseId, sets: Number(sets), repsMin: Number(repsMin), repsMax: Number(repsMax), weight: Number(weight), rir: Number(rir) };
    if (!validateStagedExerciseInput(candidate) || !catalogById.has(candidate.exerciseId)) { setFormError('Check the exercise targets.'); return; }
    if (staged.some(item => item.exerciseId === candidate.exerciseId)) { setFormError('That exercise is already staged for this day.'); return; }
    setFormError(null);
    setStaged(current => [...current, candidate]);
  };

  const removeStaged = (index: number) => setStaged(current => current.filter((_, item) => item !== index));

  const selected = catalogById.get(exerciseId);
  const exerciseOptions = filtered.map(exercise => ({ value: exercise.id, label: `${exercise.name} · ${exercise.equipment ?? 'Equipment not listed'}${exercise.suggestion ? ' · history suggested' : ''}` }));

  return <details className="add-exercise">
    <summary>Add exercises</summary>
    <div className="form-grid add-exercise-card">
      <label>Muscle group<CustomSelect ariaLabel="Filter by muscle group" value={muscleFilter} onChange={setMuscleFilter} options={[{ value: 'all', label: 'All muscle groups' }, ...muscleGroups.map(group => ({ value: group, label: group }))]} /></label>
      <label>Exercise<CustomSelect ariaLabel="Exercise" value={exerciseId} onChange={setExerciseId} options={exerciseOptions.length ? withRecommendedOptions(exerciseOptions,recommendedIds) : [{ value: '', label: 'No exercises in this muscle group', disabled: true }]} /></label>
      <label>Sets<input type="number" min="1" max="10" value={sets} onChange={event => setSets(event.target.value)} /></label>
      <label>Rep minimum<input type="number" min="1" max="100" value={repsMin} onChange={event => setRepsMin(event.target.value)} /></label>
      <label>Rep maximum<input type="number" min="1" max="100" value={repsMax} onChange={event => setRepsMax(event.target.value)} /></label>
      <label>Starting weight<input type="number" min="0" step="0.5" value={weight} onChange={event => setWeight(event.target.value)} /></label>
      <label>Target RIR<input type="number" min="0" max="5" value={rir} onChange={event => setRir(event.target.value)} /></label>
      <button type="button" className="secondary" onClick={addToList} disabled={!exerciseId}>Stage exercise</button>
    </div>
    {selected?.suggestion && <p className="notice">Targets were prefilled from past performance. You can edit them before staging.</p>}
    {formError && <p className="notice error" role="alert">{formError}</p>}
    {staged.length > 0 && <div className="review-exercises staged-exercises">
      {staged.map((item, index) => {
        const exercise = catalogById.get(item.exerciseId);
        return <article className="review-exercise" key={`${item.exerciseId}-${index}`}>
          <div><strong>{exercise?.name ?? 'Unknown exercise'}</strong><div className="review-exercise-chips">{exercise?.muscle_group&&<span className="chip chip-muscle">{exercise.muscle_group}</span>}{exercise?.equipment&&<span className="chip chip-equipment">{exercise.equipment}</span>}</div><p>{item.sets} × {item.repsMin}–{item.repsMax}{item.weight>0?` · ${item.weight} lb`:''} · RIR {item.rir}</p></div>
          <div className="review-controls"><button type="button" className="danger compact" onClick={() => removeStaged(index)}>Remove</button></div>
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
