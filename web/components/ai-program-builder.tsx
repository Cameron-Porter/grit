'use client';
import { useState } from 'react';
import { saveAiProgram } from '@/app/(app)/programs/ai/actions';
import { AI_PROGRAM_SCHEMA, AI_SPLITS, MUSCLES, buildAiProgramBase, buildAiPrompt, validateAiSelection, type AiBuilderInput, type AiCatalogExercise, type AiProgramSelection } from '@/lib/ai/program';
import { AI_PROGRAM_DRAFT_KEY } from '@/lib/ai/draft';
import { CustomSelect } from './custom-select';
type HistoryItem = { exerciseName: string; uses: number; lastWeight: number | null };
const splitLabels: Record<(typeof AI_SPLITS)[number], string> = { auto: 'Automatic (recommended)', 'upper-lower': 'Upper / Lower', 'push-pull-legs': 'Push / Pull / Legs', 'full-body': 'Full Body' };

export function AiProgramBuilder({ experienceLevel, initialPriorities, catalog, history }: { experienceLevel: AiBuilderInput['experienceLevel']; initialPriorities: AiBuilderInput['priorities']; catalog: AiCatalogExercise[]; history: HistoryItem[] }) {
  const [input, setInput] = useState<AiBuilderInput>({ name: 'AI Training Program', focus: 'hypertrophy', experienceLevel, split: 'auto', weeks: 5, daysPerWeek: 4, priorities: Object.fromEntries(MUSCLES.map(muscle => [muscle, initialPriorities[muscle] ?? 'maintain'])) });
  const [selection, setSelection] = useState<AiProgramSelection | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof AiBuilderInput>(key: K, value: AiBuilderInput[K]) => { setInput(current => ({ ...current, [key]: value })); setSelection(null); };
  const generate = async () => {
    setGenerating(true); setError(null); setSelection(null);
    try {
      const program = buildAiProgramBase(input);
      if (!program.validation.valid) throw new Error(program.validation.issues.find(issue => issue.severity === 'error')?.message ?? 'This configuration does not pass the GRIT rules engine.');
      const missingMuscle=program.days.flatMap(day=>day.slots).find(slot=>!catalog.some(exercise=>exercise.muscleGroup===slot.muscle));if(missingMuscle)throw new Error(`Your selected equipment has no ${missingMuscle.muscle} exercises. Add equipment in Profile or pick a different split.`);
      // Generation runs on the server against a shared key; nothing about the
      // provider or its credentials exists in the browser any more.
      const response = await fetch('/api/ai/program', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ input, catalog, history }) });
      const body = await response.json() as { output?:string; error?:string };
      if (!response.ok || !body.output) throw new Error(body.error ?? 'Program generation failed.');
      const validated=validateAiSelection(program, JSON.parse(body.output) as AiProgramSelection, catalog);setSelection(validated);sessionStorage.setItem(AI_PROGRAM_DRAFT_KEY,JSON.stringify({input,selection:validated}));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Program generation failed.'); } finally { setGenerating(false); }
  };
  const preview = selection ? buildAiProgramBase(input) : null;
  return <main className="content ai-builder native-page native-gradient-background">
    <a className="back-link" href="/programs">← Programs</a>
    <header className="page-header native-page-header"><div><div className="eyebrow">RULES-GROUNDED AI</div><h1>Build a program</h1><p>GRIT locks the training science. AI personalizes exercise selection.</p></div></header>
    <section className="surface ai-builder-form">
      <div className="form-grid">
        <label>Program name<input value={input.name} maxLength={80} onChange={event => update('name', event.target.value)} /></label>
        <label>Focus<CustomSelect value={input.focus} onChange={value => update('focus', value as AiBuilderInput['focus'])} options={[{value:'hypertrophy',label:'Hypertrophy'},{value:'strength',label:'Strength'},{value:'powerbuilding',label:'Powerbuilding'},{value:'general',label:'General fitness'},{value:'maintenance',label:'Maintenance'},{value:'cut',label:'Cut'}]} /></label>
        <label>Split<CustomSelect value={input.split} onChange={value => update('split', value as AiBuilderInput['split'])} options={AI_SPLITS.map(split => ({value:split,label:splitLabels[split]}))} /></label>
        <label>Weeks<CustomSelect value={String(input.weeks)} onChange={value => update('weeks', Number(value))} options={Array.from({length:15},(_,index)=>({value:String(index+2),label:`${index+2} weeks`}))} /></label>
        <label>Days per week<CustomSelect value={String(input.daysPerWeek)} onChange={value => update('daysPerWeek', Number(value))} options={Array.from({length:7},(_,index)=>({value:String(index+1),label:`${index+1} ${index===0?'day':'days'} per week`}))} /></label>
      </div>
      <details className="priority-editor"><summary>Muscle priorities</summary><div className="priority-grid">{MUSCLES.map(muscle => <label key={muscle}>{muscle}<CustomSelect value={input.priorities[muscle] ?? 'maintain'} onChange={value => update('priorities', { ...input.priorities, [muscle]: value as 'maintain' | 'grow' | 'emphasize' })} options={[{value:'maintain',label:'Maintain'},{value:'grow',label:'Grow'},{value:'emphasize',label:'Emphasize'}]} /></label>)}</div></details>
      <p className="privacy-note">Generation sends these choices, eligible exercise names, and a compact exercise-history summary from GRIT&rsquo;s server to Google Gemini. No workout logs, personal records, or account details are included.</p>
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="primary full" type="button" disabled={generating || !input.name.trim()} onClick={generate}>{generating ? 'Generating and validating…' : 'Generate program'}</button>
    </section>
    {selection && preview && <section className="ai-preview native-section">
      <div className="surface ai-preview-summary"><div className="eyebrow">VALIDATED PREVIEW</div><h2>{input.name}</h2><p>{selection.summary}</p>{preview.validation.issues.filter(issue => issue.severity === 'warning').map(issue => <p className="validation-warning" key={issue.message}>Review: {issue.message}</p>)}</div>
      {preview.days.map(day => { const selectedDay = selection.days.find(item => item.dayIndex === day.dayIndex)!; const chosen = new Map(selectedDay.selections.map(item => [item.slotId, item])); return <article className="surface native-section" key={day.dayIndex}><h3>{selectedDay.label}</h3><p>{day.splitName} · {day.totalSets} sets · about {day.estimatedMinutes} min</p><div className="ai-exercise-list">{day.slots.map(slot => { const item = chosen.get(slot.id)!; return <div key={slot.id}><span><strong>{item.exerciseName}</strong><small>{slot.muscle} · {slot.role}</small></span><span>{slot.sets} × {slot.repsMin}–{slot.repsMax} · RIR {slot.rir}<small>{item.reason}</small></span></div>; })}</div></article>; })}
      <form action={saveAiProgram}><input type="hidden" name="input" value={JSON.stringify(input)} /><input type="hidden" name="selection" value={JSON.stringify(selection)} /><button className="primary full">Save validated program</button></form>
    </section>}
  </main>;
}
