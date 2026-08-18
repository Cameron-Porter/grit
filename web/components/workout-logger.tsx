'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WebWorkoutPayload } from '@/lib/workout/payload';
import { useDialogFocusTrap } from '@/lib/hooks/use-dialog-focus-trap';
import { useConfirmDialog } from './confirm-dialog';
import { CustomSelect } from './custom-select';

type ExercisePrescription = { name:string; muscleGroup:string|null; musclePriority:string|null; equipment:string|null; sets:number; repsMin:number; repsMax:number; weight:number; rir:number };
export type WorkoutPrescription = { dayId:string; programName:string; week:number; day:number; label:string; exercises:ExercisePrescription[] };
export type ExerciseOption = { id:string; name:string; muscleGroup:string|null; equipment:string|null; repsMin:number|null; repsMax:number|null };
type LoggedSet = { reps:number; weight:number; reportedRir:number|null; complete:boolean };
type Draft = LoggedSet[][];
type Feedback = { jointPain:string; pump:string; volume:string; soreness:string };
type FeedbackPrompt = { muscle:string; stage:'soreness'|'completion' };
type RirPrompt = { exerciseIndex:number; setIndex:number };
export type SavedDraft = { sets:Draft; exercises:ExercisePrescription[]; notes?:string[]; feedback?:Record<string,Feedback> };

export const createInitialDraft = (workout:WorkoutPrescription):Draft => workout.exercises.map((exercise) => Array.from({ length:exercise.sets }, () => ({ reps:exercise.repsMin, weight:exercise.weight, reportedRir:null, complete:false })));
export const reconcileSavedDraft = (workout:WorkoutPrescription,saved:SavedDraft):SavedDraft => {
  const currentSets=createInitialDraft(workout),savedByName=new Map(saved.exercises.map((exercise,index)=>[exercise.name,index]));
  const sets=currentSets.map((prescribedSets,exerciseIndex)=>{const savedIndex=savedByName.get(workout.exercises[exerciseIndex].name);if(savedIndex===undefined)return prescribedSets;return prescribedSets.map((prescribed,setIndex)=>{const prior=saved.sets[savedIndex]?.[setIndex];return prior?{...prior,weight:prior.weight>0?prior.weight:prescribed.weight}:prescribed})});
  return {sets,exercises:workout.exercises,notes:workout.exercises.map(exercise=>{const index=savedByName.get(exercise.name);return index===undefined?'':saved.notes?.[index]??''}),feedback:saved.feedback};
};
const emptyFeedback = ():Feedback => ({ jointPain:'', pump:'', volume:'', soreness:'' });
export const replacementPrescription = (exercise:ExercisePrescription,option:ExerciseOption):ExercisePrescription => ({ ...exercise,name:option.name,muscleGroup:option.muscleGroup,musclePriority:option.muscleGroup === exercise.muscleGroup ? exercise.musclePriority : null,equipment:option.equipment,repsMin:option.repsMin ?? exercise.repsMin,repsMax:option.repsMax ?? exercise.repsMax,weight:0 });
export const resetReplacementSets = (sets:LoggedSet[],exercise:ExercisePrescription):LoggedSet[] => sets.map(() => ({ reps:exercise.repsMin,weight:0,reportedRir:null,complete:false }));
export const muscleCompletionState = (exercises:ExercisePrescription[],draft:Draft,muscle:string) => {const indexes=exercises.map((exercise,index)=>exercise.muscleGroup===muscle?index:-1).filter((index)=>index>=0),sets=indexes.flatMap((index)=>draft[index]??[]);return{hasCompletedSet:sets.some((set)=>set.complete),allExercisesComplete:sets.length>0&&sets.every((set)=>set.complete)}};
export const rirDescription = (rir:number) => rir === 0 ? 'No clean reps left' : rir === 1 ? '1 clean rep left' : rir < 5 ? `${rir} clean reps left` : '5+ clean reps left';
export const shouldPromptSoreness = (week:number,hadCompletedSet:boolean,hasCompletedSet:boolean,alreadyPrompted:boolean) => week > 1 && !hadCompletedSet && hasCompletedSet && !alreadyPrompted;
export const shouldStartRestTimer = (completedSets:number,totalSets:number) => completedSets > 0 && completedSets < totalSets;
export const clearWorkoutLocalState = (storage:Pick<Storage,'removeItem'>,storageKey:string,queueKey:string) => {
  storage.removeItem(queueKey);
  storage.removeItem(storageKey);
};

export function WorkoutLogger({ workout, userId, catalog }:{ workout:WorkoutPrescription; userId:string; catalog:ExerciseOption[] }) {
  const router = useRouter();
  const storageKey = `grit-web-workout:${userId}:${workout.dayId}`;
  const queueKey = `grit-web-workout-queue:${userId}:${workout.dayId}`;
  const [draft,setDraft] = useState<Draft>(() => createInitialDraft(workout));
  const [exercises,setExercises] = useState(workout.exercises);
  const [notes,setNotes] = useState<string[]>(() => workout.exercises.map(() => ''));
  const [feedback,setFeedback] = useState<Record<string,Feedback>>({});
  const [restored,setRestored] = useState(false);
  const [timerSeconds,setTimerSeconds] = useState(0);
  const [timerRunning,setTimerRunning] = useState(false);
  const [syncing,setSyncing] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const [feedbackPrompt,setFeedbackPrompt] = useState<FeedbackPrompt|null>(null);
  const [rirPrompt,setRirPrompt] = useState<RirPrompt|null>(null);
  const [addExerciseChoice,setAddExerciseChoice] = useState('');
  const [feedbackQueue,setFeedbackQueue] = useState<FeedbackPrompt[]>([]);
  const promptedSoreness = useRef(new Set<string>());
  const promptedCompletion = useRef(new Set<string>());
  const rirDialogRef = useRef<HTMLElement | null>(null);
  const feedbackDialogRef = useRef<HTMLElement | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  useDialogFocusTrap(rirPrompt !== null, rirDialogRef);
  useDialogFocusTrap(feedbackPrompt !== null, feedbackDialogRef);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedDraft|Draft;
        if (Array.isArray(parsed)) setDraft(parsed);
        else if (Array.isArray(parsed.sets) && Array.isArray(parsed.exercises)) {
          const restoredDraft=reconcileSavedDraft(workout,parsed);
          setDraft(restoredDraft.sets); setExercises(restoredDraft.exercises);
          if (restoredDraft.notes) setNotes(restoredDraft.notes);
          if (restoredDraft.feedback) {setFeedback(restoredDraft.feedback);for(const[muscle,value]of Object.entries(restoredDraft.feedback)){if(value.soreness)promptedSoreness.current.add(muscle);if(value.pump||value.volume||value.jointPain)promptedCompletion.current.add(muscle)}}
        }
      }
    } catch { /* Keep logging in memory when storage is unavailable. */ }
    setRestored(true);
  },[storageKey]);

  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(storageKey,JSON.stringify({ sets:draft,exercises,notes,feedback } satisfies SavedDraft)); }
    catch { /* The in-memory draft remains usable. */ }
  },[draft,exercises,notes,feedback,restored,storageKey]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimerSeconds((value) => Math.max(0,value - 1)),1000);
    return () => window.clearInterval(interval);
  },[timerRunning]);
  useEffect(() => { if (timerSeconds === 0) setTimerRunning(false); },[timerSeconds]);
  useEffect(() => { if(!rirPrompt&&!feedbackPrompt&&feedbackQueue.length){setFeedbackPrompt(feedbackQueue[0]);setFeedbackQueue((current)=>current.slice(1))} },[rirPrompt,feedbackPrompt,feedbackQueue]);
  useEffect(()=>{if(!feedbackPrompt)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setFeedbackPrompt(null)};window.addEventListener('keydown',dismiss);return()=>window.removeEventListener('keydown',dismiss)},[feedbackPrompt]);
  useEffect(()=>{if(!rirPrompt)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setRirPrompt(null)};window.addEventListener('keydown',dismiss);return()=>window.removeEventListener('keydown',dismiss)},[rirPrompt]);

  const completed = useMemo(() => draft.flat().filter((set) => set.complete).length,[draft]);
  const total = draft.flat().length;
  const muscles = useMemo(() => [...new Set(exercises.map((exercise) => exercise.muscleGroup).filter((muscle):muscle is string => Boolean(muscle)))],[exercises]);
  const updateSet = (exerciseIndex:number,setIndex:number,patch:Partial<LoggedSet>) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? sets.map((set,position) => position === setIndex ? { ...set,...patch } : set) : sets));
  const completeSet = (exerciseIndex:number,setIndex:number,complete:boolean) => {
    const next=draft.map((sets,index)=>index===exerciseIndex?sets.map((set,position)=>position===setIndex?{...set,complete}:set):sets),muscle=exercises[exerciseIndex]?.muscleGroup;
    setDraft(next);
    if(complete){const nextCompleted=next.flat().filter(set=>set.complete).length;if(shouldStartRestTimer(nextCompleted,total)){setTimerSeconds(90);setTimerRunning(true)}else{setTimerSeconds(0);setTimerRunning(false)}setRirPrompt({exerciseIndex,setIndex});}
    if(complete&&muscle){const before=muscleCompletionState(exercises,draft,muscle),after=muscleCompletionState(exercises,next,muscle),prompts:FeedbackPrompt[]=[];if(shouldPromptSoreness(workout.week,before.hasCompletedSet,after.hasCompletedSet,promptedSoreness.current.has(muscle))){promptedSoreness.current.add(muscle);prompts.push({muscle,stage:'soreness'})}if(!before.allExercisesComplete&&after.allExercisesComplete&&!promptedCompletion.current.has(muscle)){promptedCompletion.current.add(muscle);prompts.push({muscle,stage:'completion'})}if(prompts.length)setFeedbackQueue((queue)=>[...queue,...prompts])}
  };

  const syncPayload = useCallback(async(payload:WebWorkoutPayload) => {
    const response = await fetch('/api/workouts',{ method:'POST',headers:{ 'content-type':'application/json' },body:JSON.stringify(payload) });
    const result = await response.json() as { saved?:boolean; error?:string };
    if (!response.ok) throw new Error(result.error ?? 'Workout sync failed.');
    return result;
  },[]);

  const buildPayload = ():WebWorkoutPayload => ({
    workoutId:crypto.randomUUID(), programDayId:workout.dayId, name:workout.label, programName:workout.programName, completedAt:new Date().toISOString(),
    exercises:exercises.map((exercise,index) => ({ name:exercise.name,muscleGroup:exercise.muscleGroup,musclePriority:exercise.musclePriority,equipment:exercise.equipment,note:notes[index]?.trim() || null,sets:(draft[index] ?? []).map((set) => ({ reps:set.reps,weight:set.weight,reportedRir:set.reportedRir,completed:set.complete,rir:exercise.rir })) })),
    feedback:muscles.map((muscle) => ({ muscleGroup:muscle,jointPain:feedback[muscle]?.jointPain || null,pump:feedback[muscle]?.pump || null,volume:feedback[muscle]?.volume || null,soreness:feedback[muscle]?.soreness || null })),
  });

  const finish = async() => {
    if (completed === 0) { setMessage('Complete at least one set before finishing.'); return; }
    setSyncing(true); setMessage(null);
    let payload = buildPayload();
    try {
      const queued = localStorage.getItem(queueKey);
      if (queued) payload = JSON.parse(queued) as WebWorkoutPayload;
      else localStorage.setItem(queueKey,JSON.stringify(payload));
      await syncPayload(payload);
      localStorage.removeItem(queueKey); localStorage.removeItem(storageKey); router.refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Workout sync failed. Your local copy is safe.'); }
    finally { setSyncing(false); }
  };

  useEffect(() => {
    const retry = async() => {
      const raw = localStorage.getItem(queueKey); if (!raw) return;
      setSyncing(true);
      try { await syncPayload(JSON.parse(raw) as WebWorkoutPayload); localStorage.removeItem(queueKey); localStorage.removeItem(storageKey); router.refresh(); }
      catch { setMessage('Workout sync is still pending. Your local copy is safe.'); }
      finally { setSyncing(false); }
    };
    window.addEventListener('online',retry); if (navigator.onLine) void retry();
    return () => window.removeEventListener('online',retry);
  },[queueKey,router,storageKey,syncPayload]);

  const updateFeedback = (muscle:string,key:keyof Feedback,value:string) => setFeedback((current) => ({ ...current,[muscle]:{ ...(current[muscle] ?? emptyFeedback()),[key]:value } }));
  const openFeedback = (muscle:string|null,stage:FeedbackPrompt['stage']) => {if(!muscle)return;if(stage==='soreness')promptedSoreness.current.add(muscle);else promptedCompletion.current.add(muscle);setFeedbackPrompt({muscle,stage})};
  const addSet = (exerciseIndex:number) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? [...sets,{ reps:exercises[index].repsMin,weight:sets.at(-1)?.weight ?? exercises[index].weight,reportedRir:null,complete:false }] : sets));
  const removeSet = (exerciseIndex:number,setIndex:number) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? sets.filter((_,position) => position !== setIndex) : sets));

  const replaceExercise = (exerciseIndex:number,optionId:string) => {
    const option = catalog.find((item) => item.id === optionId); if (!option) return;
    const oldExercise = exercises[exerciseIndex], replacement = replacementPrescription(oldExercise,option);
    setExercises((current) => current.map((exercise,index) => index === exerciseIndex ? replacement : exercise));
    setDraft((current) => current.map((sets,index) => index === exerciseIndex ? resetReplacementSets(sets,replacement) : sets));
    setMessage(option.muscleGroup !== oldExercise.muscleGroup ? 'Exercise replaced. Its muscle group changed, so review weekly volume before making this permanent.' : 'Exercise replaced. Previous set entries were reset for safety.');
  };

  const removeExercise = (exerciseIndex:number) => {
    void confirm({ message:`Remove ${exercises[exerciseIndex].name} from this workout?`, tone:'danger', confirmLabel:'Remove exercise' }).then((confirmed) => {
      if (!confirmed) return;
      setExercises((current) => current.filter((_,index) => index !== exerciseIndex)); setDraft((current) => current.filter((_,index) => index !== exerciseIndex)); setNotes((current) => current.filter((_,index) => index !== exerciseIndex));
    });
  };

  const addExercise = (optionId:string) => {
    const option = catalog.find((item) => item.id === optionId), anchor = exercises.at(-1); if (!option || !anchor) return;
    const repsMin = option.repsMin ?? anchor.repsMin, repsMax = option.repsMax ?? anchor.repsMax;
    const exercise = { ...anchor,name:option.name,muscleGroup:option.muscleGroup,musclePriority:null,equipment:option.equipment,repsMin,repsMax,weight:0 };
    setExercises((current) => [...current,exercise]); setDraft((current) => [...current,Array.from({ length:exercise.sets },() => ({ reps:repsMin,weight:0,reportedRir:null,complete:false }))]); setNotes((current) => [...current,'']);
    setMessage('Exercise added for this session. Choose a conservative starting load.');
  };

  const skipWorkout = async() => {
    if (!(await confirm({ message:'Skip this workout? You can still reopen it from the program later.', confirmLabel:'Skip workout' }))) return;
    setSyncing(true); setMessage(null);
    try {
      const response = await fetch('/api/workouts',{ method:'PATCH',headers:{ 'content-type':'application/json' },body:JSON.stringify({ programDayId:workout.dayId,skipped:true }) });
      const result = await response.json() as { error?:string }; if (!response.ok) throw new Error(result.error ?? 'Workout could not be skipped.');
      clearWorkoutLocalState(localStorage,storageKey,queueKey); router.refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Workout could not be skipped.'); }
    finally { setSyncing(false); }
  };

  return <>
    <header className="page-header workout-heading"><div><div className="eyebrow">WEEK {workout.week} · DAY {workout.day}</div><h1>{workout.label}</h1><p>{workout.programName}</p></div><span className="status">{completed}/{total} sets</span></header>
    <section className={`surface timer-card rest-panel ${timerRunning?'running':''}`} aria-label="Rest timer"><div className="rest-status"><span className="rest-icon" aria-hidden>◷</span><div><small>{timerRunning?'RESTING':'REST TIMER'}</small><strong aria-live="polite">{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2,'0')}</strong></div></div><div className="rest-controls"><button className="quiet compact" onClick={() => { setTimerSeconds(90); setTimerRunning(true); }}>{timerSeconds===0?'Start':'Reset'}</button><button className="quiet compact" onClick={() => setTimerRunning(value => !value)} disabled={timerSeconds === 0}>{timerRunning ? 'Pause' : 'Resume'}</button><button className="timer-dismiss" aria-label="Clear rest timer" onClick={() => { setTimerSeconds(0); setTimerRunning(false); }} disabled={timerSeconds === 0}>Clear</button></div></section>
    <div className="exercise-stack">{exercises.map((exercise,exerciseIndex) => <section className="surface exercise-card" key={`${exerciseIndex}:${exercise.name}`}>
      <div className="exercise-title"><div><h2>{exercise.name}</h2><p>{[exercise.muscleGroup,exercise.equipment].filter(Boolean).join(' · ')}</p>{notes[exerciseIndex]?.trim()&&<p className="exercise-note-preview"><span aria-hidden>✎</span>{notes[exerciseIndex].trim()}</p>}</div><div className="exercise-title-actions"><span className="rir-target">Target RIR {exercise.rir}</span><details className="exercise-menu"><summary aria-label={`${exercise.name} menu`}>•••</summary><div className="exercise-menu-panel"><button className="quiet compact" onClick={() => addSet(exerciseIndex)}>Add set</button><div className="exercise-feedback-actions"><button className="quiet compact" onClick={()=>openFeedback(exercise.muscleGroup,'soreness')}>Soreness feedback</button><button className="quiet compact" onClick={()=>openFeedback(exercise.muscleGroup,'completion')}>Training feedback</button></div><label>Exercise note<textarea value={notes[exerciseIndex] ?? ''} maxLength={500} onChange={(event) => setNotes((current) => current.map((note,index) => index === exerciseIndex ? event.target.value : note))} placeholder="Technique cue, setup, or pain note"/></label><label>Replace exercise<select defaultValue="" onChange={(event) => { replaceExercise(exerciseIndex,event.target.value); event.target.value=''; }}><option value="" disabled>Choose…</option>{catalog.filter((option) => option.id && option.name !== exercise.name).map((option) => <option value={option.id} key={option.id}>{option.name} — {option.equipment}</option>)}</select></label><button className="danger compact" onClick={() => removeExercise(exerciseIndex)}>Remove exercise</button></div></details></div></div>
      <div className="set-grid set-grid-header" aria-hidden="true"><span>Set</span><span>lb</span><span>Reps</span><span>Done</span><span /></div>
      {draft[exerciseIndex]?.map((set,setIndex) => <div className={`set-grid ${set.complete ? 'set-complete' : ''}`} key={setIndex}><strong>{setIndex + 1}</strong><input aria-label={`${exercise.name} set ${setIndex + 1} weight`} inputMode="decimal" type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateSet(exerciseIndex,setIndex,{ weight:Number(event.target.value) })}/><input aria-label={`${exercise.name} set ${setIndex + 1} reps`} inputMode="numeric" type="number" min="0" value={set.reps} onChange={(event) => updateSet(exerciseIndex,setIndex,{ reps:Number(event.target.value) })}/><label className="set-check-wrap"><input className="set-check" aria-label={`${exercise.name} set ${setIndex + 1} complete`} type="checkbox" checked={set.complete} onChange={(event) => completeSet(exerciseIndex,setIndex,event.target.checked)}/></label><details className="set-menu"><summary aria-label={`${exercise.name} set ${setIndex + 1} menu`}>⋮</summary><div><button className="danger compact" onClick={() => removeSet(exerciseIndex,setIndex)}>Remove set</button></div></details></div>)}
      <p className="prescription">Prescription: {exercise.sets} × {exercise.repsMin}–{exercise.repsMax}{exercise.weight > 0 ? ` at ${exercise.weight} lb` : ''}</p>
    </section>)}</div>
    {exercises.length > 0 && <section className="surface add-exercise-card"><label>Add an exercise<CustomSelect ariaLabel="Add an exercise" value={addExerciseChoice} onChange={value=>{setAddExerciseChoice(value);addExercise(value);setAddExerciseChoice('')}} options={[{value:'',label:'Choose an exercise…',disabled:true},...catalog.map(option=>({value:option.id,label:`${option.name} · ${option.equipment??'Equipment not listed'}`}))]}/></label></section>}
    <section className="surface migration-guard"><strong>Your draft saves on this device.</strong><p>If the connection drops, Finish keeps the workout queued and retries when you reconnect.</p>{message && <p className="notice error" role="alert">{message}</p>}<div className="finish-actions"><button className="quiet" disabled={syncing} onClick={skipWorkout}>Skip workout</button><button className="primary" disabled={syncing || completed === 0} onClick={finish}>{syncing ? 'Syncing…' : `Finish workout (${completed}/${total})`}</button></div></section>
    {rirPrompt&&<div className="modal-backdrop rir-backdrop" role="presentation"><section ref={(node)=>{rirDialogRef.current=node}} tabIndex={-1} className="feedback-modal rir-modal" role="dialog" aria-modal="true" aria-labelledby="rir-title"><div className="eyebrow">SET COMPLETE</div><h2 id="rir-title">How many reps were left?</h2><p>RIR means “reps in reserve”: the number of clean reps you could still have completed with good form.</p><div className="rir-options">{[0,1,2,3,4,5].map(rir=><button type="button" className="quiet" key={rir} onClick={()=>{updateSet(rirPrompt.exerciseIndex,rirPrompt.setIndex,{reportedRir:rir});setRirPrompt(null)}}><strong>{rir}</strong><span>{rirDescription(rir)}</span></button>)}</div><button type="button" className="rir-skip" onClick={()=>setRirPrompt(null)}>Not sure — skip</button></section></div>}
    {feedbackPrompt&&<div className="modal-backdrop" role="presentation"><section ref={(node)=>{feedbackDialogRef.current=node}} tabIndex={-1} className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><div className="eyebrow">{feedbackPrompt.muscle.toUpperCase()}</div><h2 id="feedback-title">{feedbackPrompt.stage==='soreness'?'How sore were you before training?':'How did that muscle work feel?'}</h2><p>{feedbackPrompt.stage==='soreness'?'This early check helps prevent adding work while you are still recovering.':'You finished every exercise for this muscle. This feedback shapes its next prescription.'}</p>{feedbackPrompt.stage==='soreness'?<label>Soreness<select autoFocus value={feedback[feedbackPrompt.muscle]?.soreness??''} onChange={(event)=>updateFeedback(feedbackPrompt.muscle,'soreness',event.target.value)}><option value="">Not reported</option><option>Healed early</option><option>Just in time</option><option>Still sore</option></select></label>:<div className="feedback-modal-fields"><label>Pump<select autoFocus value={feedback[feedbackPrompt.muscle]?.pump??''} onChange={(event)=>updateFeedback(feedbackPrompt.muscle,'pump',event.target.value)}><option value="">Not reported</option><option>None</option><option>Low</option><option>Good</option><option>Excellent</option></select></label><label>Volume<select value={feedback[feedbackPrompt.muscle]?.volume??''} onChange={(event)=>updateFeedback(feedbackPrompt.muscle,'volume',event.target.value)}><option value="">Not reported</option><option>Too little</option><option>About right</option><option>Too much</option></select></label><label>Joint pain<select value={feedback[feedbackPrompt.muscle]?.jointPain??''} onChange={(event)=>updateFeedback(feedbackPrompt.muscle,'jointPain',event.target.value)}><option value="">Not reported</option><option>None</option><option>Mild</option><option>Moderate</option><option>Severe</option></select></label></div>}<div className="modal-actions"><button className="quiet" onClick={()=>setFeedbackPrompt(null)}>Skip</button><button className="primary" onClick={()=>setFeedbackPrompt(null)}>Continue</button></div></section></div>}
    {confirmDialog}
  </>;
}
