'use client';

import { useEffect, useMemo, useState } from 'react';
import { createGuidedProgram } from '@/app/(app)/programs/actions';
import { CustomSelect } from './custom-select';
import { filterExercisesByMuscleGroup, stagedDefaultsForExercise, uniqueMuscleGroups, validateStagedExerciseInput, type CatalogExercise, type StagedExerciseInput } from '@/lib/programs/day-template-payload';

type Props = {
  catalog: CatalogExercise[];
  equipmentPreferenceEnabled: boolean;
  preferredEquipment: string[];
};

const weekOptions = Array.from({ length:15 },(_,index) => ({ value:String(index + 2),label:`${index + 2} weeks` }));
const dayOptions = Array.from({ length:7 },(_,index) => ({ value:String(index + 1),label:`${index + 1} ${index === 0 ? 'day' : 'days'} per week` }));

export function GuidedProgramBuilder({ catalog, equipmentPreferenceEnabled, preferredEquipment }: Props) {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('5');
  const [days, setDays] = useState('4');
  const dayCount = Number(days);
  const [activeDay, setActiveDay] = useState(0);
  const [stagedByDay, setStagedByDay] = useState<StagedExerciseInput[][]>(() => Array.from({ length: dayCount }, () => []));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setStagedByDay(current => Array.from({ length: dayCount }, (_, index) => current[index] ?? []));
    setActiveDay(current => Math.min(current, dayCount - 1));
  }, [dayCount]);

  const completedDays = stagedByDay.filter(day => day.length > 0).length;
  const canSave = name.trim().length > 0 && completedDays === dayCount;

  return <details className="surface create-panel guided-program-builder" open>
    <summary>Create custom program</summary>
    <div className="guided-builder-intro">
      <div><strong>Build the week before saving</strong><span>Add at least one exercise to every training day. The saved week becomes the template for the full program.</span></div>
      {equipmentPreferenceEnabled && <p className="notice">Showing only your preferred equipment: {preferredEquipment.join(', ')}.</p>}
    </div>
    <div className="section-label">Program details</div>
    <div className="form-grid guided-program-basics">
      <label>Name<input value={name} onChange={event => setName(event.target.value)} required maxLength={80}/></label>
      <label>Weeks<CustomSelect value={weeks} onChange={setWeeks} options={weekOptions}/></label>
      <label>Days/week<CustomSelect value={days} onChange={setDays} options={dayOptions}/></label>
    </div>
    <div className="section-label">Training days</div>
    <div className="day-stepper" role="tablist" aria-label="Training days">
      {stagedByDay.map((day,index)=><button key={index} type="button" role="tab" aria-selected={activeDay===index} className={activeDay===index?'active':''} onClick={()=>setActiveDay(index)}><span>Day {index+1}</span><strong>{day.length ? `${day.length} exercise${day.length===1?'':'s'}` : 'Needs exercises'}</strong></button>)}
    </div>
    <ProgramDayExercisePanel
      dayIndex={activeDay}
      catalog={catalog}
      staged={stagedByDay[activeDay] ?? []}
      setStaged={(items)=>setStagedByDay(current=>current.map((day,index)=>index===activeDay?items:day))}
    />
    {formError && <p className="notice error" role="alert">{formError}</p>}
    <form action={createGuidedProgram} className="guided-save-row" onSubmit={(event)=>{if(!canSave){event.preventDefault();setFormError('Add at least one exercise to every day before saving.');}}}>
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="weeks" value={weeks} />
      <input type="hidden" name="days" value={days} />
      <input type="hidden" name="dayItems" value={JSON.stringify(stagedByDay)} />
      <span>{completedDays}/{dayCount} days ready</span>
      <button disabled={!canSave}>Save custom program</button>
    </form>
  </details>;
}

function ProgramDayExercisePanel({ dayIndex, catalog, staged, setStaged }: { dayIndex: number; catalog: CatalogExercise[]; staged: StagedExerciseInput[]; setStaged: (items: StagedExerciseInput[]) => void }) {
  const catalogById = useMemo(() => new Map(catalog.map(exercise => [exercise.id, exercise])), [catalog]);
  const muscleGroups = useMemo(() => uniqueMuscleGroups(catalog), [catalog]);
  const [muscleFilter, setMuscleFilter] = useState('all');
  const filtered = useMemo(() => filterExercisesByMuscleGroup(catalog, muscleFilter), [catalog, muscleFilter]);
  const [exerciseId, setExerciseId] = useState(filtered[0]?.id ?? '');
  const selected = catalogById.get(exerciseId);
  const defaults = selected ? stagedDefaultsForExercise(selected) : { sets: 3, repsMin: 8, repsMax: 12, weight: 0, rir: 2 };
  const [sets, setSets] = useState(String(defaults.sets));
  const [repsMin, setRepsMin] = useState(String(defaults.repsMin));
  const [repsMax, setRepsMax] = useState(String(defaults.repsMax));
  const [weight, setWeight] = useState(String(defaults.weight));
  const [rir, setRir] = useState(String(defaults.rir));
  const [panelError, setPanelError] = useState<string | null>(null);

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

  const exerciseOptions = filtered.map(exercise => ({ value: exercise.id, label: `${exercise.name} · ${exercise.equipment ?? 'Equipment not listed'}${exercise.suggestion ? ' · history suggested' : ''}` }));
  const addToDay = () => {
    const candidate = { exerciseId, sets: Number(sets), repsMin: Number(repsMin), repsMax: Number(repsMax), weight: Number(weight), rir: Number(rir) };
    if (!validateStagedExerciseInput(candidate) || !catalogById.has(candidate.exerciseId)) { setPanelError('Check the exercise targets.'); return; }
    if (staged.some(item => item.exerciseId === candidate.exerciseId)) { setPanelError('That exercise is already on this day.'); return; }
    setPanelError(null);
    setStaged([...staged, candidate]);
  };
  const removeStaged = (index: number) => setStaged(staged.filter((_, item) => item !== index));

  return <section className="guided-day-panel" aria-labelledby={`guided-day-${dayIndex}`}>
    <header><div><div className="eyebrow">DAY {dayIndex + 1}</div><h2 id={`guided-day-${dayIndex}`}>Choose exercises and editable targets</h2></div>{selected?.suggestion&&<span className="pill">History suggested</span>}</header>
    <div className="form-grid add-exercise-card">
      <label>Muscle group<CustomSelect ariaLabel="Filter by muscle group" value={muscleFilter} onChange={setMuscleFilter} options={[{ value: 'all', label: 'All muscle groups' }, ...muscleGroups.map(group => ({ value: group, label: group }))]} /></label>
      <label>Exercise<CustomSelect ariaLabel="Exercise" value={exerciseId} onChange={setExerciseId} options={exerciseOptions.length ? exerciseOptions : [{ value: '', label: 'No exercises available', disabled: true }]} /></label>
      <label>Sets<input type="number" min="1" max="10" value={sets} onChange={event => setSets(event.target.value)} /></label>
      <label>Rep minimum<input type="number" min="1" max="100" value={repsMin} onChange={event => setRepsMin(event.target.value)} /></label>
      <label>Rep maximum<input type="number" min="1" max="100" value={repsMax} onChange={event => setRepsMax(event.target.value)} /></label>
      <label>Starting weight<input type="number" min="0" step="0.5" value={weight} onChange={event => setWeight(event.target.value)} /></label>
      <label>Target RIR<input type="number" min="0" max="5" value={rir} onChange={event => setRir(event.target.value)} /></label>
      <button type="button" className="secondary" onClick={addToDay} disabled={!exerciseId}>Add to Day {dayIndex + 1}</button>
    </div>
    {selected?.suggestion&&<p className="notice">Targets were prefilled from your past {selected.name} performance. You can edit them before adding.</p>}
    {panelError && <p className="notice error" role="alert">{panelError}</p>}
    <div className="review-exercises staged-exercises">
      {staged.map((item,index)=>{const exercise=catalogById.get(item.exerciseId);return <article className="review-exercise" key={`${item.exerciseId}-${index}`}>
        <div><strong>{exercise?.name ?? 'Unknown exercise'}</strong><div className="review-exercise-chips">{exercise?.muscle_group&&<span className="chip chip-muscle">{exercise.muscle_group}</span>}{exercise?.equipment&&<span className="chip chip-equipment">{exercise.equipment}</span>}</div><p>{item.sets} × {item.repsMin}–{item.repsMax}{item.weight>0?` · ${item.weight} lb`:''} · RIR {item.rir}</p></div>
        <div className="review-controls"><button type="button" className="secondary compact" onClick={()=>removeStaged(index)}>Remove</button></div>
      </article>;})}
      {!staged.length&&<p className="empty-day-copy">No exercises added to Day {dayIndex+1} yet.</p>}
    </div>
  </section>;
}
