'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { WebWorkoutPayload, WorkoutDayUpdate } from '@/lib/workout/payload';
import { useDialogFocusTrap } from '@/lib/hooks/use-dialog-focus-trap';
import { useConfirmDialog } from './confirm-dialog';
import { createRestChime, restTimerJustFinished, REST_COMPLETE_VIBRATION, type RestChime } from '@/lib/workout/rest-chime';
import { CustomSelect, type SelectOption } from './custom-select';
import { classifyMovement } from '@grit/data/movementClassMap';
import { recommendedExerciseIds, withRecommendedOptions } from '@/lib/exercises/recommendations';

type ExercisePrescription = { name:string; muscleGroup:string|null; musclePriority:string|null; equipment:string|null; sets:number; repsMin:number; repsMax:number; weight:number; rir:number };
export type WorkoutPrescription = { dayId:string|null; templateDayId:string|null; bodyWeight:number; programName:string; week:number|null; day:number|null; label:string; exercises:ExercisePrescription[] };
export type ExerciseOption = { id:string; name:string; muscleGroup:string|null; equipment:string|null; repsMin:number|null; repsMax:number|null; movementCategory?:string|null };
type LoggedSet = { reps:number; weight:number; reportedRir:number|null; complete:boolean; skipped?:boolean };
type ExerciseHistorySession = { date:string; sets:{ weight:number; reps:number; rir?:number }[] };
type Draft = LoggedSet[][];
export type Feedback = { jointPain:string; pump:string; volume:string; soreness:string };
export type FeedbackPrompt = { muscle:string; stage:'soreness'|'completion' };
type RirPrompt = { exerciseIndex:number; setIndex:number };
type WorkoutSyncState = 'local'|'queued'|'syncing'|'synced';
export type SavedDraft = { sets:Draft; exercises:ExercisePrescription[]; notes?:string[]; feedback?:Record<string,Feedback> };

export const exerciseStartingWeight = (exercise:Pick<ExercisePrescription,'equipment'|'weight'>,bodyWeight:number):number => exercise.equipment==='Bodyweight'&&bodyWeight>0?bodyWeight:exercise.weight;
export const weightInputValue = (weight:number):number|'' => weight===0?'':weight;
/**
 * A skipped set is blanked in place rather than deleted: the row stays visible so the
 * skip is legible and reversible, and it drops out of every count, every completion
 * check and the saved payload exactly as a removed set would. Its logged reps/weight
 * are kept so unskipping restores them.
 */
export const isCountedSet = (set:LoggedSet):boolean => !set.skipped;
export const countedSets = (sets:LoggedSet[]):LoggedSet[] => sets.filter(isCountedSet);
export const toggleSetSkipped = (sets:LoggedSet[],setIndex:number):LoggedSet[] =>
  sets.map((set,position) => position !== setIndex ? set : set.skipped
    ? { ...set,skipped:false }
    : { ...set,skipped:true,complete:false,reportedRir:null });
export const cascadeWeight = (sets:LoggedSet[],setIndex:number,weight:number):LoggedSet[] => sets.map((set,position) => position < setIndex ? set : position === setIndex ? { ...set,weight } : set.complete||set.skipped ? set : { ...set,weight });
export const completedSetReps = (reps:number,repsMin:number):number => reps === 0 ? repsMin : reps;
export const createInitialDraft = (workout:WorkoutPrescription):Draft => workout.exercises.map((exercise) => Array.from({ length:exercise.sets }, () => ({ reps:0, weight:exerciseStartingWeight(exercise,workout.bodyWeight), reportedRir:null, complete:false })));
export const reconcileSavedDraft = (workout:WorkoutPrescription,saved:SavedDraft):SavedDraft => {
  const currentSets=createInitialDraft(workout),savedByName=new Map(saved.exercises.map((exercise,index)=>[exercise.name,index]));
  const sets=currentSets.map((prescribedSets,exerciseIndex)=>{const exercise=workout.exercises[exerciseIndex],savedIndex=savedByName.get(exercise.name);if(savedIndex===undefined)return prescribedSets;return prescribedSets.map((prescribed,setIndex)=>{const prior=saved.sets[savedIndex]?.[setIndex];return prior?{...prior,weight:exercise.equipment==='Bodyweight'?prescribed.weight:prior.weight>0?prior.weight:prescribed.weight}:prescribed})});
  return {sets,exercises:workout.exercises,notes:workout.exercises.map(exercise=>{const index=savedByName.get(exercise.name);return index===undefined?'':saved.notes?.[index]??''}),feedback:saved.feedback};
};
const emptyFeedback = ():Feedback => ({ jointPain:'', pump:'', volume:'', soreness:'' });
export const replacementPrescription = (exercise:ExercisePrescription,option:ExerciseOption,bodyWeight=0):ExercisePrescription => ({ ...exercise,name:option.name,muscleGroup:option.muscleGroup,musclePriority:option.muscleGroup === exercise.muscleGroup ? exercise.musclePriority : null,equipment:option.equipment,repsMin:option.repsMin ?? exercise.repsMin,repsMax:option.repsMax ?? exercise.repsMax,weight:option.equipment==='Bodyweight'?bodyWeight:0 });
export const resetReplacementSets = (sets:LoggedSet[],exercise:ExercisePrescription):LoggedSet[] => sets.map(() => ({ reps:0,weight:0,reportedRir:null,complete:false }));
export const appendedExercisePrescription = (exercises:ExercisePrescription[],option:ExerciseOption,bodyWeight=0):ExercisePrescription => {
  const anchor = exercises.at(-1), repsMin = option.repsMin ?? anchor?.repsMin ?? 8, repsMax = option.repsMax ?? anchor?.repsMax ?? 12;
  return anchor
    ? { ...anchor,name:option.name,muscleGroup:option.muscleGroup,musclePriority:null,equipment:option.equipment,repsMin,repsMax,weight:option.equipment==='Bodyweight'?bodyWeight:0 }
    : { name:option.name,muscleGroup:option.muscleGroup,musclePriority:null,equipment:option.equipment,sets:3,repsMin,repsMax,weight:option.equipment==='Bodyweight'?bodyWeight:0,rir:2 };
};
export const muscleCompletionState = (exercises:ExercisePrescription[],draft:Draft,muscle:string) => {const indexes=exercises.map((exercise,index)=>exercise.muscleGroup===muscle?index:-1).filter((index)=>index>=0),sets=countedSets(indexes.flatMap((index)=>draft[index]??[]));return{hasCompletedSet:sets.some((set)=>set.complete),allExercisesComplete:sets.length>0&&sets.every((set)=>set.complete)}};
export const rirDescription = (rir:number) => rir === 0 ? 'No clean reps left' : rir === 1 ? '1 clean rep left' : rir < 5 ? `${rir} clean reps left` : '5+ clean reps left';
export const repRangeLabel = (repsMin:number,repsMax:number) => repsMin === repsMax ? `${repsMin}` : `${repsMin}–${repsMax}`;
export const shouldPromptSoreness = (week:number,hadCompletedSet:boolean,hasCompletedSet:boolean,alreadyPrompted:boolean) => week > 1 && !hadCompletedSet && hasCompletedSet && !alreadyPrompted;
export const shouldStartRestTimer = (completedSets:number,totalSets:number) => completedSets > 0 && completedSets < totalSets;
export const canFinishWorkout = (completed:number,total:number):boolean => total > 0 && completed === total;
export const canContinueFeedback = (stage:FeedbackPrompt['stage'],values:Feedback):boolean => stage === 'soreness' ? Boolean(values.soreness) : Boolean(values.pump && values.volume && values.jointPain);
export const clearWorkoutLocalState = (storage:Pick<Storage,'removeItem'>,storageKey:string,queueKey:string) => {
  storage.removeItem(queueKey);
  storage.removeItem(storageKey);
};
export const workoutSyncStateCopy = (state:WorkoutSyncState):{label:string;description:string;tone:'neutral'|'warning'|'info'|'success'} => ({
  local:{label:'Local draft',description:'Changes are saved on this device until you finish.',tone:'neutral'},
  queued:{label:'Queued retry',description:'Finish was saved locally and will retry when the connection returns.',tone:'warning'},
  syncing:{label:'Syncing…',description:'Sending this workout to your account now.',tone:'info'},
  synced:{label:'Synced',description:'Workout saved to your account.',tone:'success'},
} as const)[state];
export const workoutStorageKeys = (userId:string,dayId:string|null) => {
  const key = dayId ?? 'quick';
  return { storageKey:`grit-web-workout:${userId}:${key}`, queueKey:`grit-web-workout-queue:${userId}:${key}` };
};
export const workoutHeadingCopy = (workout:WorkoutPrescription) => ({
  eyebrow: workout.dayId === null ? null : `WEEK ${workout.week} · DAY ${workout.day}`,
  title: workout.label,
  subtitle: workout.programName,
});
export const buildWorkoutPayload = (args:{workoutId:string;programDayId:string|null;name:string;programName:string;completedAt:string;exercises:ExercisePrescription[];draft:Draft;notes:string[];feedback:Record<string,Feedback>;muscles:string[]}):WebWorkoutPayload => ({
  workoutId:args.workoutId, programDayId:args.programDayId, name:args.name, programName:args.programName, completedAt:args.completedAt,
  exercises:args.exercises.map((exercise,index) => ({ name:exercise.name,muscleGroup:exercise.muscleGroup,musclePriority:exercise.musclePriority,equipment:exercise.equipment,note:args.notes[index]?.trim() || null,sets:countedSets(args.draft[index] ?? []).map((set) => ({ reps:set.reps,weight:set.weight,reportedRir:set.reportedRir,completed:set.complete,rir:exercise.rir })) })),
  feedback:args.muscles.map((muscle) => ({ muscleGroup:muscle,jointPain:args.feedback[muscle]?.jointPain || null,pump:args.feedback[muscle]?.pump || null,volume:args.feedback[muscle]?.volume || null,soreness:args.feedback[muscle]?.soreness || null })),
});
export const skipWorkoutRequest = (dayId:string|null):WorkoutDayUpdate|null => dayId === null ? null : { programDayId:dayId, skipped:true };
export const closeWorkoutMenus = (root:Pick<Document,'querySelectorAll'>=document) => root.querySelectorAll('details.native-modal-menu[open]').forEach((menu) => menu.removeAttribute('open'));
export const moveWorkoutItem = <T,>(items:T[],from:number,to:number):T[] => {if(from===to||from<0||to<0||from>=items.length||to>=items.length)return items;const next=[...items],[item]=next.splice(from,1);next.splice(to,0,item);return next};

export type MenuAnchor = { top:number; bottom:number; right:number };
export type MenuPlacement = { top:number|null; bottom:number|null; right:number; maxHeight:number };
export const MENU_VIEWPORT_MARGIN = 8;
export const MENU_TRIGGER_GAP = 6;
/** Must match the panel width in globals.css; the port contract test asserts both. */
export const MENU_WIDTH = 272;
export const menuWidth = (viewport:{width:number}):number => Math.min(MENU_WIDTH,viewport.width - MENU_VIEWPORT_MARGIN * 2);

/**
 * Places an anchored command menu against its trigger. .native-workout-card sets
 * overflow:hidden for the muscle stripe and rounded corners, which would clip an
 * absolutely positioned panel, so the panel is position:fixed and positioned from
 * the trigger's viewport rect.
 *
 * It anchors by EDGES - right to the trigger's right, and either top-to-bottom or
 * bottom-to-top - so it never needs to measure the rendered panel. That means the
 * placement is known during the render that opens the menu, with no measure-then-
 * reposition pass: there is no frame in which the panel has no coordinates and
 * collapses into the top-left corner. maxHeight caps it to the space actually
 * available on the chosen side, so a long menu scrolls instead of overflowing.
 */
export const menuPlacement = (anchor:MenuAnchor,viewport:{width:number;height:number}):MenuPlacement => {
  const margin=MENU_VIEWPORT_MARGIN,gap=MENU_TRIGGER_GAP;
  // The set menu's trigger sits at the far left of its row, so right-aligning to it
  // alone would push the panel off the left edge - cap the offset by the panel width.
  const right=Math.min(Math.max(margin,viewport.width-anchor.right),Math.max(margin,viewport.width-menuWidth(viewport)-margin));
  const spaceBelow=viewport.height-anchor.bottom-gap-margin;
  const spaceAbove=anchor.top-gap-margin;
  return spaceBelow>=spaceAbove
    ? { top:Math.max(margin,anchor.bottom+gap), bottom:null, right, maxHeight:Math.max(0,spaceBelow) }
    : { top:null, bottom:Math.max(margin,viewport.height-anchor.top+gap), right, maxHeight:Math.max(0,spaceAbove) };
};

/**
 * Inline top/right cannot be used: an !important declaration always beats an inline
 * style, and .native-workout-card .set-menu>div forces left/top with !important. The
 * coordinates ride in as custom properties that the !important rule reads, and the
 * CSS fallbacks resolve to a right-anchored panel so a missing value can never park
 * it in the corner.
 */
export const menuPlacementStyle = (placement:MenuPlacement|null):CSSProperties => placement ? {
  ['--menu-top' as string]:placement.top===null?'auto':`${placement.top}px`,
  ['--menu-bottom' as string]:placement.bottom===null?'auto':`${placement.bottom}px`,
  ['--menu-right' as string]:`${placement.right}px`,
  ['--menu-max-h' as string]:`${placement.maxHeight}px`,
} : {};

/** Viewport-safe placement: menuAnchor is only ever set from a browser event. */
const anchoredMenuStyle = (anchor:MenuAnchor|null):CSSProperties =>
  menuPlacementStyle(anchor && typeof window !== 'undefined' ? menuPlacement(anchor,{ width:window.innerWidth,height:window.innerHeight }) : null);

/* Stroke icons for the command rows. Decorative only - every row is also labelled. */
const MENU_ICON_PATHS = {
  note:'M7 3h7l4 4v14H7z|M14 3v4h4|M12.5 12v5|M10 14.5h5',
  arrowUp:'M12 19V5|M6 11l6-6 6 6',
  arrowDown:'M12 5v14|M6 13l6 6 6-6',
  replace:'M4 8h13l-3-3|M20 16H7l3 3',
  history:'M12 7v5l3 2|M4 12a8 8 0 1 0 2.5-5.8|M4 5v4h4',
  addSet:'M4 6h11|M4 11h11|M4 16h6|M17 13v6|M14 16h6',
  soreness:'M3 12h4l2-5 3 10 2-5h7',
  training:'M5 19v-8|M12 19V5|M19 19v-5',
  skip:'M6 5l9 7-9 7z|M18 5v14',
  trash:'M4 7h16|M9 7V4h6v3|M6 7l1 13h10l1-13|M10 11v6|M14 11v6',
} as const;
type MenuIconName = keyof typeof MENU_ICON_PATHS;

function CommandRow({ icon, label, onClick, disabled, tone }:{ icon:MenuIconName; label:string; onClick:() => void; disabled?:boolean; tone?:'danger' }) {
  return <button type="button" className={`command-row${tone==='danger'?' danger':''}`} disabled={disabled} onClick={onClick}>
    <svg className="command-row-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {MENU_ICON_PATHS[icon].split('|').map((path) => <path key={path} d={path}/>)}
    </svg>
    <span>{label}</span>
  </button>;
}

const sorenessOptions = [{value:'Healed early',label:'Healed early'},{value:'Just in time',label:'Just in time'},{value:'Still sore',label:'Still sore'}];
const pumpOptions = [{value:'None',label:'None'},{value:'Low',label:'Low'},{value:'Good',label:'Good'},{value:'Excellent',label:'Excellent'}];
const volumeOptions = [{value:'Too little',label:'Too little'},{value:'About right',label:'About right'},{value:'Too much',label:'Too much'}];
const jointPainOptions = [{value:'None',label:'None'},{value:'Mild',label:'Mild'},{value:'Moderate',label:'Moderate'},{value:'Severe',label:'Severe'}];

function FeedbackOptionGroup({ legend, options, value, onChange, autoFocus }:{ legend:string; options:{value:string;label:string}[]; value:string; onChange:(value:string) => void; autoFocus?:boolean }) {
  return <div className="feedback-option-group">
    <span className="feedback-option-legend">{legend}</span>
    <div className="feedback-option-row" role="radiogroup" aria-label={legend}>
      {options.map((option,index) => <button type="button" key={option.value} autoFocus={autoFocus&&index===0} role="radio" aria-checked={value===option.value} className={`feedback-option ${value===option.value?'selected':''}`} onClick={()=>onChange(option.value)}>{option.label}</button>)}
    </div>
  </div>;
}

function ReplaceExerciseSelect({ exercise, catalog, onReplace }:{ exercise:ExercisePrescription; catalog:ExerciseOption[]; onReplace:(optionId:string) => void }) {
  const [choice,setChoice] = useState('');
  const candidates = catalog.filter((option) => option.id && option.name !== exercise.name);
  const options:SelectOption[] = candidates.map((option) => ({ value:option.id,label:`${option.name} — ${option.equipment}` }));
  const originClass = classifyMovement(catalog.find((option) => option.name === exercise.name)?.movementCategory);
  const recommendedIds = recommendedExerciseIds(candidates.map((option) => ({ id:option.id,name:option.name,muscleGroup:option.muscleGroup,movementCategory:option.movementCategory })),{ muscleGroup:exercise.muscleGroup,originMovementClass:originClass });
  return <CustomSelect ariaLabel={`Replace ${exercise.name}`} value={choice} onChange={(value) => { setChoice(value); onReplace(value); setChoice(''); }} options={[{value:'',label:'Choose…',disabled:true},...withRecommendedOptions(options,recommendedIds)]}/>;
}

export function WorkoutLogger({ workout, userId, catalog:initialCatalog=[], historyByExercise={} }:{ workout:WorkoutPrescription; userId:string; catalog?:ExerciseOption[]; historyByExercise?:Record<string,ExerciseHistorySession[]> }) {
  /**
   * The picker options are ~100KB of the workout document when serialised into
   * it, and they are only needed once Replace or Add exercise is opened. They
   * are fetched after paint instead, so the session renders without waiting on
   * them. Tests and the quick-workout path may still pass them directly.
   */
  const [catalog,setCatalog] = useState<ExerciseOption[]>(initialCatalog);
  const [catalogState,setCatalogState] = useState<'idle'|'loading'|'ready'|'error'>(initialCatalog.length?'ready':'idle');
  const catalogRequested = useRef(initialCatalog.length > 0);
  const router = useRouter();
  const { storageKey, queueKey } = workoutStorageKeys(userId,workout.dayId);
  const [draft,setDraft] = useState<Draft>(() => createInitialDraft(workout));
  const [exercises,setExercises] = useState(workout.exercises);
  const [notes,setNotes] = useState<string[]>(() => workout.exercises.map(() => ''));
  const [feedback,setFeedback] = useState<Record<string,Feedback>>({});
  const [restored,setRestored] = useState(false);
  const [timerSeconds,setTimerSeconds] = useState(0);
  const [timerRunning,setTimerRunning] = useState(false);
  const restChime = useRef<RestChime|null>(null);
  const previousTimerSeconds = useRef(0);
  const timerCleared = useRef(false);
  const [syncing,setSyncing] = useState(false);
  const [syncState,setSyncState] = useState<WorkoutSyncState>('local');
  const [message,setMessage] = useState<string|null>(null);
  const [feedbackPrompt,setFeedbackPrompt] = useState<FeedbackPrompt|null>(null);
  const [rirPrompt,setRirPrompt] = useState<RirPrompt|null>(null);
  const [noteEditor,setNoteEditor] = useState<number|null>(null);
  const [replacePicker,setReplacePicker] = useState<number|null>(null);
  const [historySheet,setHistorySheet] = useState<number|null>(null);
  const [menuAnchor,setMenuAnchor] = useState<MenuAnchor|null>(null);
  const [openExerciseMenu,setOpenExerciseMenu] = useState<number|null>(null);
  const [openSetMenu,setOpenSetMenu] = useState<string|null>(null);
  const [addExerciseChoice,setAddExerciseChoice] = useState('');
  const [reordering,setReordering] = useState(false);
  const [feedbackQueue,setFeedbackQueue] = useState<FeedbackPrompt[]>([]);
  const promptedSoreness = useRef(new Set<string>());
  const promptedCompletion = useRef(new Set<string>());
  const rirDialogRef = useRef<HTMLElement | null>(null);
  const feedbackDialogRef = useRef<HTMLElement | null>(null);
  const exerciseMenuDialogRef = useRef<HTMLDivElement | null>(null);
  const setMenuDialogRef = useRef<HTMLDivElement | null>(null);
  const noteDialogRef = useRef<HTMLElement | null>(null);
  const replaceDialogRef = useRef<HTMLElement | null>(null);
  const historyDialogRef = useRef<HTMLElement | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  useDialogFocusTrap(rirPrompt !== null, rirDialogRef);
  useDialogFocusTrap(feedbackPrompt !== null, feedbackDialogRef);
  useDialogFocusTrap(openExerciseMenu !== null, exerciseMenuDialogRef);
  useDialogFocusTrap(openSetMenu !== null, setMenuDialogRef);
  useDialogFocusTrap(noteEditor !== null, noteDialogRef);
  useDialogFocusTrap(replacePicker !== null, replaceDialogRef);
  useDialogFocusTrap(historySheet !== null, historyDialogRef);

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
      if (window.localStorage.getItem(queueKey)) setSyncState('queued');
    } catch { /* Keep logging in memory when storage is unavailable. */ }
    setRestored(true);
  },[queueKey,storageKey]);

  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(storageKey,JSON.stringify({ sets:draft,exercises,notes,feedback } satisfies SavedDraft)); }
    catch { /* The in-memory draft remains usable. */ }
  },[draft,exercises,notes,feedback,restored,storageKey]);

  /**
   * Fetched once, after paint. The guard is a ref rather than catalogState: with
   * the state in the dependency list the effect re-ran the moment it set
   * 'loading', and that re-run's cleanup cancelled its own in-flight request, so
   * the options never arrived. A ref also survives StrictMode's double-invoke,
   * which would otherwise issue the request twice.
   */
  useEffect(() => {
    if (catalogRequested.current) return;
    catalogRequested.current = true;
    setCatalogState('loading');
    fetch('/api/exercises')
      .then(async (response) => {
        const body = await response.json() as { options?:ExerciseOption[]; error?:string };
        if (!response.ok) throw new Error(body.error ?? 'Could not load exercises.');
        setCatalog(body.options ?? []); setCatalogState('ready');
      })
      .catch(() => setCatalogState('error'));
  },[]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimerSeconds((value) => Math.max(0,value - 1)),1000);
    return () => window.clearInterval(interval);
  },[timerRunning]);
  useEffect(() => { if (timerSeconds === 0) setTimerRunning(false); },[timerSeconds]);
  useEffect(() => {
    const previous = previousTimerSeconds.current;
    previousTimerSeconds.current = timerSeconds;
    const cancelled = timerCleared.current;
    timerCleared.current = false;
    if (!restTimerJustFinished(previous,timerSeconds,cancelled)) return;
    restChime.current?.play();
    // Not on iOS, and the caller cannot feature-detect a no-op, so just try.
    try { navigator.vibrate?.(REST_COMPLETE_VIBRATION); } catch { /* optional */ }
  },[timerSeconds]);
  useEffect(() => { if(!rirPrompt&&!feedbackPrompt&&feedbackQueue.length){setFeedbackPrompt(feedbackQueue[0]);setFeedbackQueue((current)=>current.slice(1))} },[rirPrompt,feedbackPrompt,feedbackQueue]);
  useEffect(()=>{if(openExerciseMenu===null&&openSetMenu===null)return;const reset=()=>{closeWorkoutMenus();setOpenExerciseMenu(null);setOpenSetMenu(null);setMenuAnchor(null)};window.addEventListener('resize',reset);window.addEventListener('orientationchange',reset);return()=>{window.removeEventListener('resize',reset);window.removeEventListener('orientationchange',reset)}},[openExerciseMenu,openSetMenu]);
  useEffect(()=>{if(!rirPrompt)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape')setRirPrompt(null)};window.addEventListener('keydown',dismiss);return()=>window.removeEventListener('keydown',dismiss)},[rirPrompt]);
  useEffect(()=>{if(openExerciseMenu===null)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape'){closeWorkoutMenus();setOpenExerciseMenu(null);}};window.addEventListener('keydown',dismiss);return()=>window.removeEventListener('keydown',dismiss)},[openExerciseMenu]);
  useEffect(()=>{if(openSetMenu===null)return;const dismiss=(event:KeyboardEvent)=>{if(event.key==='Escape'){closeWorkoutMenus();setOpenSetMenu(null);}};window.addEventListener('keydown',dismiss);return()=>window.removeEventListener('keydown',dismiss)},[openSetMenu]);

  const completed = useMemo(() => draft.flat().filter((set) => isCountedSet(set) && set.complete).length,[draft]);
  const total = useMemo(() => countedSets(draft.flat()).length,[draft]);
  const muscles = useMemo(() => [...new Set(exercises.map((exercise) => exercise.muscleGroup).filter((muscle):muscle is string => Boolean(muscle)))],[exercises]);
  const updateSet = (exerciseIndex:number,setIndex:number,patch:Partial<LoggedSet>) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? sets.map((set,position) => position === setIndex ? { ...set,...patch } : set) : sets));
  const updateSetWeight = (exerciseIndex:number,setIndex:number,weight:number) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? cascadeWeight(sets,setIndex,weight) : sets));
  const completeSet = (exerciseIndex:number,setIndex:number,complete:boolean) => {
    const exercise=exercises[exerciseIndex];
    const next=draft.map((sets,index)=>index===exerciseIndex?sets.map((set,position)=>position===setIndex?{...set,complete,reps:complete?completedSetReps(set.reps,exercise.repsMin):set.reps}:set):sets),muscle=exercise?.muscleGroup;
    setDraft(next);
    if(complete){restChime.current??=createRestChime();restChime.current.prime();const nextCompleted=next.flat().filter(set=>set.complete).length;if(shouldStartRestTimer(nextCompleted,total)){setTimerSeconds(90);setTimerRunning(true)}else{setTimerSeconds(0);setTimerRunning(false)}setRirPrompt({exerciseIndex,setIndex});}
    if(complete&&muscle){const before=muscleCompletionState(exercises,draft,muscle),after=muscleCompletionState(exercises,next,muscle),prompts:FeedbackPrompt[]=[];if(shouldPromptSoreness(workout.week ?? 1,before.hasCompletedSet,after.hasCompletedSet,promptedSoreness.current.has(muscle))){promptedSoreness.current.add(muscle);prompts.push({muscle,stage:'soreness'})}if(!before.allExercisesComplete&&after.allExercisesComplete&&!promptedCompletion.current.has(muscle)){promptedCompletion.current.add(muscle);prompts.push({muscle,stage:'completion'})}if(prompts.length)setFeedbackQueue((queue)=>[...queue,...prompts])}
  };

  const syncPayload = useCallback(async(payload:WebWorkoutPayload) => {
    const response = await fetch('/api/workouts',{ method:'POST',headers:{ 'content-type':'application/json' },body:JSON.stringify(payload) });
    const result = await response.json() as { saved?:boolean; error?:string };
    if (!response.ok) throw new Error(result.error ?? 'Workout sync failed.');
    return result;
  },[]);

  const buildPayload = ():WebWorkoutPayload => buildWorkoutPayload({
    workoutId:crypto.randomUUID(), programDayId:workout.dayId, name:workout.label, programName:workout.programName, completedAt:new Date().toISOString(),
    exercises,draft,notes,feedback,muscles,
  });

  const finish = async() => {
    if (!canFinishWorkout(completed,total)) { setMessage('Complete every set before finishing.'); return; }
    setSyncing(true); setSyncState('syncing'); setMessage(null);
    let payload = buildPayload();
    try {
      const queued = localStorage.getItem(queueKey);
      if (queued) payload = JSON.parse(queued) as WebWorkoutPayload;
      else localStorage.setItem(queueKey,JSON.stringify(payload));
      await syncPayload(payload);
      localStorage.removeItem(queueKey); localStorage.removeItem(storageKey); setSyncState('synced'); router.refresh();
    } catch(error) { setSyncState('queued'); setMessage(error instanceof Error ? error.message : 'Workout sync failed. Your local copy is safe.'); }
    finally { setSyncing(false); }
  };

  useEffect(() => {
    const retry = async() => {
      const raw = localStorage.getItem(queueKey); if (!raw) return;
      setSyncing(true); setSyncState('syncing');
      try { await syncPayload(JSON.parse(raw) as WebWorkoutPayload); localStorage.removeItem(queueKey); localStorage.removeItem(storageKey); setSyncState('synced'); router.refresh(); }
      catch { setSyncState('queued'); setMessage('Workout sync is still pending. Your local copy is safe.'); }
      finally { setSyncing(false); }
    };
    window.addEventListener('online',retry); if (navigator.onLine) void retry();
    return () => window.removeEventListener('online',retry);
  },[queueKey,router,storageKey,syncPayload]);

  const updateFeedback = (muscle:string,key:keyof Feedback,value:string) => setFeedback((current) => ({ ...current,[muscle]:{ ...(current[muscle] ?? emptyFeedback()),[key]:value } }));
  const openFeedback = (muscle:string|null,stage:FeedbackPrompt['stage']) => {if(!muscle)return;closeWorkoutMenus();setOpenExerciseMenu(null);if(stage==='soreness')promptedSoreness.current.add(muscle);else promptedCompletion.current.add(muscle);setFeedbackPrompt({muscle,stage})};
  const addSet = (exerciseIndex:number) => setDraft((current) => current.map((sets,index) => index === exerciseIndex ? [...sets,{ reps:0,weight:sets.at(-1)?.weight ?? exercises[index].weight,reportedRir:null,complete:false }] : sets));
  const removeSet = (exerciseIndex:number,setIndex:number) => { closeWorkoutMenus(); setOpenSetMenu(null); setDraft((current) => current.map((sets,index) => index === exerciseIndex ? sets.filter((_,position) => position !== setIndex) : sets)); };
  const skipSet = (exerciseIndex:number,setIndex:number) => {
    closeSetMenu();
    const skipping = !draft[exerciseIndex]?.[setIndex]?.skipped;
    setDraft((current) => current.map((sets,index) => index === exerciseIndex ? toggleSetSkipped(sets,setIndex) : sets));
    setMessage(skipping ? 'Set skipped for this workout.' : 'Set restored.');
  };
  const closeExerciseMenu = () => { closeWorkoutMenus(); setOpenExerciseMenu(null); setMenuAnchor(null); };
  const closeSetMenu = () => { closeWorkoutMenus(); setOpenSetMenu(null); setMenuAnchor(null); };
  /* Each opener closes the menu and opens its sheet in one state batch, so the menu
     backdrop unmounts in the same commit the sheet mounts - never two stacked. */
  const openNoteEditor = (exerciseIndex:number) => { closeExerciseMenu(); setNoteEditor(exerciseIndex); };
  const openReplacePicker = (exerciseIndex:number) => { closeExerciseMenu(); setReplacePicker(exerciseIndex); };
  const openHistorySheet = (exerciseIndex:number) => { closeExerciseMenu(); setHistorySheet(exerciseIndex); };
  const anchorFromTrigger = (details:HTMLDetailsElement):MenuAnchor|null => {
    const rect = details.querySelector('summary')?.getBoundingClientRect();
    return rect ? { top:rect.top, bottom:rect.bottom, right:rect.right } : null;
  };

  const moveExercise = async(exerciseIndex:number,direction:-1|1) => {
    const targetIndex=exerciseIndex+direction;
    if(targetIndex<0||targetIndex>=exercises.length||!workout.templateDayId||reordering)return;
    closeWorkoutMenus();setOpenExerciseMenu(null);setMessage(null);
    const previousExercises=exercises,previousDraft=draft,previousNotes=notes;
    const nextExercises=moveWorkoutItem(exercises,exerciseIndex,targetIndex);
    setExercises(nextExercises);setDraft(moveWorkoutItem(draft,exerciseIndex,targetIndex));setNotes(moveWorkoutItem(notes,exerciseIndex,targetIndex));setReordering(true);
    try{
      const response=await fetch('/api/program-exercises/order',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({templateDayId:workout.templateDayId,exerciseNames:nextExercises.map(exercise=>exercise.name)})});
      const result=await response.json() as {saved?:boolean;error?:string};
      if(!response.ok)throw new Error(result.error??'Exercise order could not be saved.');
      setMessage('Exercise order saved for future workouts on this day.');
    }catch(error){setExercises(previousExercises);setDraft(previousDraft);setNotes(previousNotes);setMessage(error instanceof Error?error.message:'Exercise order could not be saved.');}
    finally{setReordering(false)}
  };

  const replaceExercise = (exerciseIndex:number,optionId:string) => {
    const option = catalog.find((item) => item.id === optionId); if (!option) return;
    const oldExercise = exercises[exerciseIndex], replacement = replacementPrescription(oldExercise,option,workout.bodyWeight);
    setExercises((current) => current.map((exercise,index) => index === exerciseIndex ? replacement : exercise));
    setDraft((current) => current.map((sets,index) => index === exerciseIndex ? resetReplacementSets(sets,replacement) : sets));
    setMessage(option.muscleGroup !== oldExercise.muscleGroup ? 'Exercise replaced. Its muscle group changed, so review weekly volume before making this permanent.' : 'Exercise replaced. Previous set entries were reset for safety.');
  };

  const removeExercise = (exerciseIndex:number) => {
    closeWorkoutMenus();setOpenExerciseMenu(null);
    void confirm({ message:`Remove ${exercises[exerciseIndex].name} from this workout?`, tone:'danger', confirmLabel:'Remove exercise' }).then((confirmed) => {
      if (!confirmed) return;
      setExercises((current) => current.filter((_,index) => index !== exerciseIndex)); setDraft((current) => current.filter((_,index) => index !== exerciseIndex)); setNotes((current) => current.filter((_,index) => index !== exerciseIndex));
    });
  };

  const addExercise = (optionId:string) => {
    const option = catalog.find((item) => item.id === optionId); if (!option) return;
    const hadAnchor = exercises.length > 0;
    const exercise = appendedExercisePrescription(exercises,option,workout.bodyWeight);
    setExercises((current) => [...current,exercise]); setDraft((current) => [...current,Array.from({ length:exercise.sets },() => ({ reps:0,weight:exerciseStartingWeight(exercise,workout.bodyWeight),reportedRir:null,complete:false }))]); setNotes((current) => [...current,'']);
    setMessage(hadAnchor ? 'Exercise added for this session. Choose a conservative starting load.' : 'Exercise added for this session: 3 sets of 8–12 at a conservative RIR of 2. Adjust as needed.');
  };

  const skipWorkout = async() => {
    if (!(await confirm({ message:'Skip this workout? You can still reopen it from the program later.', confirmLabel:'Skip workout' }))) return;
    const skipRequest = skipWorkoutRequest(workout.dayId);
    if (!skipRequest) { clearWorkoutLocalState(localStorage,storageKey,queueKey); router.push('/workout'); return; }
    setSyncing(true); setMessage(null);
    try {
      const response = await fetch('/api/workouts',{ method:'PATCH',headers:{ 'content-type':'application/json' },body:JSON.stringify(skipRequest) });
      const result = await response.json() as { error?:string }; if (!response.ok) throw new Error(result.error ?? 'Workout could not be skipped.');
      clearWorkoutLocalState(localStorage,storageKey,queueKey); router.refresh();
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Workout could not be skipped.'); }
    finally { setSyncing(false); }
  };

  return <div className="native-workout-screen">
    <header className="page-header workout-heading native-page-header"><div>{workoutHeadingCopy(workout).eyebrow && <div className="eyebrow">{workoutHeadingCopy(workout).eyebrow}</div>}<h1>{workoutHeadingCopy(workout).title}</h1><p>{workoutHeadingCopy(workout).subtitle}</p></div><span className="status native-badge tint">{completed}/{total} sets</span></header>
    <section className={`surface timer-card rest-panel native-rest-timer ${timerRunning?'running':''}`} aria-label="Rest timer"><span className="native-rest-progress" style={{ inlineSize:`${Math.max(0,Math.min(100,(timerSeconds / 90) * 100))}%` }} aria-hidden="true"/><div className="rest-status"><span className="rest-icon" aria-hidden>◷</span><div><small>{timerRunning?'RESTING':'REST TIMER'}</small><strong aria-live="polite">{Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2,'0')}</strong></div></div><div className="rest-controls"><button className="rest-control primary-tint" onClick={() => { restChime.current??=createRestChime(); restChime.current.prime(); setTimerSeconds(90); setTimerRunning(true); }}>{timerSeconds===0?'Start':'Reset'}</button><button className="rest-control" onClick={() => { restChime.current??=createRestChime(); restChime.current.prime(); setTimerRunning(value => !value); }} disabled={timerSeconds === 0}>{timerRunning ? 'Pause' : 'Resume'}</button><button className="rest-control timer-dismiss" aria-label="Clear rest timer" onClick={() => { timerCleared.current = true; setTimerSeconds(0); setTimerRunning(false); }} disabled={timerSeconds === 0}><span aria-hidden="true">×</span></button></div></section>
    <div className="exercise-stack">{exercises.map((exercise,exerciseIndex) => <section className="surface exercise-card native-workout-card" key={`${exerciseIndex}:${exercise.name}`}><span className="native-muscle-stripe" aria-hidden="true"/>
      <div className="exercise-title native-exercise-title"><div><div className="cap native-muscle-label">{exercise.muscleGroup ?? 'Exercise'}</div><h2>{exercise.name}</h2><p>{exercise.equipment || 'Bodyweight'}</p>{notes[exerciseIndex]?.trim()&&<p className="exercise-note-preview"><span aria-hidden>✎</span>{notes[exerciseIndex].trim()}</p>}</div><details className="exercise-menu native-command-menu native-set-menu-cell native-modal-menu" onToggle={(event)=>{const opened=event.currentTarget.open;setMenuAnchor(opened?anchorFromTrigger(event.currentTarget):null);setOpenExerciseMenu(opened?exerciseIndex:(current)=>current===exerciseIndex?null:current)}}><summary aria-label={`${exercise.name} menu`}>⋮</summary>{openExerciseMenu===exerciseIndex&&<><button type="button" className="menu-backdrop" aria-label={`Close ${exercise.name} menu`} onClick={()=>closeExerciseMenu()}/><div ref={exerciseMenuDialogRef} style={anchoredMenuStyle(menuAnchor)} tabIndex={-1} className="command-menu-panel" role="dialog" aria-modal="true" aria-label={`${exercise.name} actions`}><div className="command-menu-title">Exercise</div><CommandRow icon="note" label={notes[exerciseIndex]?.trim()?'Edit note':'New note'} onClick={()=>openNoteEditor(exerciseIndex)}/><CommandRow icon="arrowUp" label="Move up" disabled={!workout.templateDayId||reordering||exerciseIndex===0} onClick={()=>void moveExercise(exerciseIndex,-1)}/><CommandRow icon="arrowDown" label="Move down" disabled={!workout.templateDayId||reordering||exerciseIndex===exercises.length-1} onClick={()=>void moveExercise(exerciseIndex,1)}/><CommandRow icon="replace" label="Replace" onClick={()=>openReplacePicker(exerciseIndex)}/><CommandRow icon="history" label="View history" onClick={()=>openHistorySheet(exerciseIndex)}/><CommandRow icon="addSet" label="Add set" onClick={()=>{closeExerciseMenu();addSet(exerciseIndex)}}/><CommandRow icon="soreness" label="Soreness feedback" disabled={!exercise.muscleGroup} onClick={()=>openFeedback(exercise.muscleGroup,'soreness')}/><CommandRow icon="training" label="Training feedback" disabled={!exercise.muscleGroup} onClick={()=>openFeedback(exercise.muscleGroup,'completion')}/><CommandRow icon="trash" tone="danger" label="Remove exercise" onClick={()=>removeExercise(exerciseIndex)}/></div></>}</details></div>
      <div className="set-grid set-grid-header native-set-row" aria-hidden="true"><span /><span>WEIGHT</span><span>REPS</span><span>RIR</span><span>LOG</span></div>
      {draft[exerciseIndex]?.map((set,setIndex) => {const setMenuId=`${exerciseIndex}:${setIndex}`;return <div className={`set-grid native-set-row ${set.complete ? 'set-complete' : ''} ${set.skipped ? 'set-skipped' : ''}`} key={setIndex}><details className="set-menu native-command-menu native-set-menu-cell native-modal-menu" onToggle={(event)=>{const opened=event.currentTarget.open;setMenuAnchor(opened?anchorFromTrigger(event.currentTarget):null);setOpenSetMenu(opened?setMenuId:(current)=>current===setMenuId?null:current)}}><summary aria-label={`${exercise.name} set ${setIndex + 1}${set.skipped?', skipped,':''} menu`}>⋮</summary>{openSetMenu===setMenuId&&<><button type="button" className="menu-backdrop" aria-label={`Close ${exercise.name} set ${setIndex + 1} menu`} onClick={()=>closeSetMenu()}/><div ref={setMenuDialogRef} style={anchoredMenuStyle(menuAnchor)} tabIndex={-1} className="command-menu-panel" role="dialog" aria-modal="true" aria-label={`${exercise.name} set ${setIndex + 1} actions`}><div className="command-menu-title">Set {setIndex+1}</div><CommandRow icon="skip" label={set.skipped?'Unskip set':'Skip set'} onClick={()=>skipSet(exerciseIndex,setIndex)}/><CommandRow icon="trash" tone="danger" label="Remove set" onClick={()=>removeSet(exerciseIndex,setIndex)}/></div></>}</details><input aria-label={`${exercise.name} set ${setIndex + 1} weight`} inputMode="decimal" type="number" min="0" step="0.5" value={set.skipped?'':weightInputValue(set.weight)} disabled={set.skipped} placeholder={set.skipped?'—':'0'} onChange={(event) => updateSetWeight(exerciseIndex,setIndex,Number(event.target.value))}/><input aria-label={`${exercise.name} set ${setIndex + 1} reps`} inputMode="numeric" type="number" min="0" value={set.skipped||set.reps === 0 ? '' : set.reps} disabled={set.skipped} placeholder={set.skipped?'—':repRangeLabel(exercise.repsMin,exercise.repsMax)} onChange={(event) => updateSet(exerciseIndex,setIndex,{ reps:Number(event.target.value) })}/><button type="button" className={`native-rir-button ${set.reportedRir===null||set.skipped?'empty':''}`} disabled={!set.complete||set.skipped} onClick={() => setRirPrompt({exerciseIndex,setIndex})} aria-label={`${exercise.name} set ${setIndex + 1} RIR`}>{set.reportedRir ?? '—'}</button>{set.skipped&&<span className="sr-only">Set {setIndex+1} skipped</span>}<label className="set-check-wrap"><input className="set-check" aria-label={`${exercise.name} set ${setIndex + 1} complete`} type="checkbox" checked={set.complete} disabled={set.skipped} onChange={(event) => completeSet(exerciseIndex,setIndex,event.target.checked)}/></label></div>})}
      <button type="button" className="native-add-set-row" onClick={() => addSet(exerciseIndex)}>+ Add Set</button>
      <p className="prescription">Prescription: {exercise.sets} × {repRangeLabel(exercise.repsMin,exercise.repsMax)}{exercise.weight > 0 ? ` at ${exercise.weight} lb` : ''}</p>
    </section>)}</div>
    {exercises.length === 0 && <section className="surface empty-state"><h2>No exercises scheduled</h2><p>This training day has no exercises yet. Add one below to get started.</p></section>}
    <section className="surface add-exercise-card"><label>Add an exercise{catalogState==="error"&&<span className="notice error" role="alert">Exercise list unavailable — reload to try again.</span>}<CustomSelect ariaLabel="Add an exercise" value={addExerciseChoice} onChange={value=>{setAddExerciseChoice(value);addExercise(value);setAddExerciseChoice('')}} options={[{value:'',label:'Choose an exercise…',disabled:true},...catalog.map(option=>({value:option.id,label:`${option.name} · ${option.equipment??'Equipment not listed'}`}))]}/></label></section>
    <section className="surface workout-finish-panel">{syncState === 'queued' && <p className={`sync-status ${workoutSyncStateCopy(syncState).tone}`} aria-live="polite"><span>{workoutSyncStateCopy(syncState).label}</span>{workoutSyncStateCopy(syncState).description}</p>}{message && <p className="notice error" role="alert">{message}</p>}<div className="finish-actions native-finish-bar"><button className="quiet" disabled={syncing} onClick={skipWorkout}>Skip workout</button><button className="primary" disabled={syncing || !canFinishWorkout(completed,total)} onClick={finish}>{syncing ? 'Syncing…' : `Finish workout (${completed}/${total})`}</button></div></section>
    {rirPrompt&&<div className="modal-backdrop rir-backdrop" role="presentation"><section ref={(node)=>{rirDialogRef.current=node}} tabIndex={-1} className="feedback-modal rir-modal" role="dialog" aria-modal="true" aria-labelledby="rir-title"><div className="eyebrow">SET COMPLETE</div><h2 id="rir-title">How many reps were left?</h2><p>RIR means “reps in reserve”: the number of clean reps you could still have completed with good form.</p><div className="rir-options">{[0,1,2,3,4,5].map(rir=><button type="button" className="quiet" key={rir} onClick={()=>{updateSet(rirPrompt.exerciseIndex,rirPrompt.setIndex,{reportedRir:rir});setRirPrompt(null)}}><strong>{rir}</strong><span>{rirDescription(rir)}</span></button>)}</div><button type="button" className="rir-skip" onClick={()=>setRirPrompt(null)}>Not sure — skip</button></section></div>}
    {feedbackPrompt&&<div className="feedback-sheet-backdrop" role="presentation"><section ref={(node)=>{feedbackDialogRef.current=node}} tabIndex={-1} className="feedback-sheet" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><span className="sheet-handle" aria-hidden="true"/><h2 id="feedback-title">{feedbackPrompt.stage==='soreness'?'How sore were you?':'How did it go?'}</h2><p className="feedback-subtitle">{feedbackPrompt.muscle} · {feedbackPrompt.stage==='soreness'?'Check in before training':'Rate this session'}</p>{feedbackPrompt.stage==='soreness'?<FeedbackOptionGroup legend="Soreness" autoFocus options={sorenessOptions} value={feedback[feedbackPrompt.muscle]?.soreness??''} onChange={(value)=>updateFeedback(feedbackPrompt.muscle,'soreness',value)}/>:<><FeedbackOptionGroup legend="Joint pain" autoFocus options={jointPainOptions} value={feedback[feedbackPrompt.muscle]?.jointPain??''} onChange={(value)=>updateFeedback(feedbackPrompt.muscle,'jointPain',value)}/><FeedbackOptionGroup legend="Pump" options={pumpOptions} value={feedback[feedbackPrompt.muscle]?.pump??''} onChange={(value)=>updateFeedback(feedbackPrompt.muscle,'pump',value)}/><FeedbackOptionGroup legend="Adequate volume" options={volumeOptions} value={feedback[feedbackPrompt.muscle]?.volume??''} onChange={(value)=>updateFeedback(feedbackPrompt.muscle,'volume',value)}/></>}<button type="button" className="primary full" disabled={!canContinueFeedback(feedbackPrompt.stage,feedback[feedbackPrompt.muscle]??emptyFeedback())} onClick={()=>setFeedbackPrompt(null)}>Save Feedback</button></section></div>}
    {noteEditor!==null&&<div className="modal-backdrop" role="presentation" onClick={()=>setNoteEditor(null)}><section ref={(node)=>{noteDialogRef.current=node}} tabIndex={-1} className="feedback-modal exercise-action-modal" role="dialog" aria-modal="true" aria-labelledby="note-title" onClick={(event)=>event.stopPropagation()} onKeyDown={(event)=>{if(event.key==='Escape')setNoteEditor(null)}}><h2 id="note-title">Exercise note</h2><p>{exercises[noteEditor]?.name}</p><label className="note-field">Note<textarea value={notes[noteEditor] ?? ''} maxLength={500} placeholder="Technique cue, setup, or pain note" onChange={(event)=>{const value=event.target.value;setNotes((current)=>current.map((note,index)=>index===noteEditor?value:note))}}/></label><div className="modal-actions"><button type="button" className="primary" onClick={()=>setNoteEditor(null)}>Done</button></div></section></div>}
    {replacePicker!==null&&<div className="modal-backdrop" role="presentation" onClick={()=>setReplacePicker(null)}><section ref={(node)=>{replaceDialogRef.current=node}} tabIndex={-1} className="feedback-modal exercise-action-modal" role="dialog" aria-modal="true" aria-labelledby="replace-title" onClick={(event)=>event.stopPropagation()} onKeyDown={(event)=>{if(event.key==='Escape')setReplacePicker(null)}}><h2 id="replace-title">Replace exercise</h2><p>{exercises[replacePicker]?.name}</p><ReplaceExerciseSelect exercise={exercises[replacePicker]} catalog={catalog} onReplace={(optionId)=>{replaceExercise(replacePicker,optionId);setReplacePicker(null)}}/><div className="modal-actions"><button type="button" className="quiet" onClick={()=>setReplacePicker(null)}>Cancel</button></div></section></div>}
    {historySheet!==null&&<div className="modal-backdrop" role="presentation" onClick={()=>setHistorySheet(null)}><section ref={(node)=>{historyDialogRef.current=node}} tabIndex={-1} className="feedback-modal exercise-action-modal" role="dialog" aria-modal="true" aria-labelledby="history-title" onClick={(event)=>event.stopPropagation()} onKeyDown={(event)=>{if(event.key==='Escape')setHistorySheet(null)}}><h2 id="history-title">Recent history</h2><p>{exercises[historySheet]?.name}</p><div className="native-exercise-history">{(historyByExercise[exercises[historySheet]?.name ?? '']??[]).slice(0,5).length?(historyByExercise[exercises[historySheet]?.name ?? '']??[]).slice(0,5).map((session)=><div key={session.date}><strong>{new Date(session.date).toLocaleDateString()}</strong><ul className="history-set-rows">{session.sets.map((set,index)=><li key={index}><span>Set {index+1}</span><span>{set.weight} lb</span><span>{set.reps} reps</span><span>{set.rir==null?'':`${set.rir} RIR`}</span></li>)}</ul></div>):<p>No recent history for this exercise.</p>}</div><div className="modal-actions"><button type="button" className="quiet" onClick={()=>setHistorySheet(null)}>Close</button></div></section></div>}
    {confirmDialog}
  </div>;
}
