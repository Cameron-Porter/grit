'use client';
import { useState } from 'react';
import { saveAiProgram } from '@/app/(app)/programs/ai/actions';
import { AI_PROVIDER_STORAGE, GEMINI_KEY_STORAGE, GEMINI_MODEL_STORAGE, OPENAI_KEY_STORAGE, OPENAI_MODEL_STORAGE, type AiProvider } from './ai-key-settings';
import { AI_PROGRAM_SCHEMA, AI_SPLITS, MUSCLES, buildAiProgramBase, buildAiPrompt, validateAiSelection, type AiBuilderInput, type AiCatalogExercise, type AiProgramSelection } from '@/lib/ai/program';
import { requestStructuredProgram } from '@/lib/ai/providers';
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
    const provider = (localStorage.getItem(AI_PROVIDER_STORAGE) as AiProvider) || 'openai';
    const apiKey = localStorage.getItem(provider === 'openai' ? OPENAI_KEY_STORAGE : GEMINI_KEY_STORAGE)?.trim();
    const model = localStorage.getItem(provider === 'openai' ? OPENAI_MODEL_STORAGE : GEMINI_MODEL_STORAGE) ?? (provider === 'openai' ? 'gpt-5.6-luna' : 'gemini-3.6-flash');
    if (!apiKey) { setError(`Add and save your ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key in Profile first.`); return; }
    setGenerating(true); setError(null); setSelection(null);
    try {
      const program = buildAiProgramBase(input);
      if (!program.validation.valid) throw new Error(program.validation.issues.find(issue => issue.severity === 'error')?.message ?? 'This configuration does not pass the GRIT rules engine.');
      const missingMuscle=program.days.flatMap(day=>day.slots).find(slot=>!catalog.some(exercise=>exercise.muscleGroup===slot.muscle));if(missingMuscle)throw new Error(`Your selected equipment has no eligible ${missingMuscle.muscle} exercise. Update Equipment availability in Profile.`);
      const output = await requestStructuredProgram({ provider, apiKey, model, prompt: buildAiPrompt(input, program, catalog, history), schema: AI_PROGRAM_SCHEMA });
      const validated=validateAiSelection(program, JSON.parse(output) as AiProgramSelection, catalog);setSelection(validated);sessionStorage.setItem(AI_PROGRAM_DRAFT_KEY,JSON.stringify({input,selection:validated}));window.location.assign('/programs/ai/review');
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
      <p className="privacy-note">Generation sends these choices, eligible exercise names, and a compact exercise-history summary directly from this browser to your selected provider. Your API key never passes through GRIT or Supabase.</p>
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
