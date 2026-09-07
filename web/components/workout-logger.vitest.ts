import { describe, expect, it, vi } from 'vitest';
import { validateWorkoutPayload } from '@/lib/workout/payload';
import { setRepPlan, toggleSetSkipped, countedSets, isCountedSet, menuPlacement, menuPlacementStyle, menuWidth, MENU_WIDTH, MENU_TRIGGER_GAP, MENU_VIEWPORT_MARGIN, appendedExercisePrescription, buildWorkoutPayload, canContinueFeedback, canFinishWorkout, cascadeWeight, clearWorkoutLocalState, closeWorkoutMenus, completedSetReps, createInitialDraft, exerciseStartingWeight, moveWorkoutItem, muscleCompletionState, reconcileSavedDraft, replacementPrescription, repRangeLabel, resetReplacementSets, rirDescription, shouldPromptSoreness, shouldStartRestTimer, skipWorkoutRequest, weightInputValue, workoutHeadingCopy, workoutStorageKeys, workoutSyncStateCopy, type WorkoutPrescription } from './workout-logger';

const workout: WorkoutPrescription = { dayId:'day-1',templateDayId:'template-1',bodyWeight:185,programName:'Mid Summer',week:4,day:2,label:'Pull',exercises:[{name:'Row',muscleGroup:'Back',musclePriority:'grow',equipment:'Cable',sets:3,repsMin:8,repsMax:12,weight:100,rir:2}] };
const quickWorkout: WorkoutPrescription = { dayId:null,templateDayId:null,bodyWeight:185,programName:'Quick Workout',week:null,day:null,label:'Quick Workout',exercises:[] };

describe('createInitialDraft',()=>{
  it('creates exactly the prescribed sets with safe incomplete defaults and reps left as a placeholder',()=>{
    expect(createInitialDraft(workout)).toEqual([[{reps:0,weight:100,reportedRir:null,complete:false},{reps:0,weight:100,reportedRir:null,complete:false},{reps:0,weight:100,reportedRir:null,complete:false}]]);
  });
});
describe('reps placeholder commits on set completion',()=>{
  it('fills the prescribed rep target when the user never typed a value',()=>expect(completedSetReps(0,8)).toBe(8));
  it('keeps a user-entered rep count untouched',()=>expect(completedSetReps(6,8)).toBe(6));
});
describe('rep range display',()=>{
  it('collapses a fixed rep target to a single number instead of a 12–12 range',()=>expect(repRangeLabel(12,12)).toBe('12'));
  it('keeps a real range as min–max',()=>expect(repRangeLabel(8,12)).toBe('8–12'));
});
describe('weight auto-fills down to later sets',()=>{
  const sets=[{reps:0,weight:0,reportedRir:null,complete:false},{reps:0,weight:0,reportedRir:null,complete:false},{reps:0,weight:0,reportedRir:null,complete:false}];
  it('propagates an edited weight to every later incomplete set',()=>{
    expect(cascadeWeight(sets,0,135)).toEqual([{reps:0,weight:135,reportedRir:null,complete:false},{reps:0,weight:135,reportedRir:null,complete:false},{reps:0,weight:135,reportedRir:null,complete:false}]);
  });
  it('does not overwrite a set that is already complete',()=>{
    const partiallyDone=[sets[0],{...sets[1],weight:120,complete:true},sets[2]];
    expect(cascadeWeight(partiallyDone,0,135)).toEqual([{reps:0,weight:135,reportedRir:null,complete:false},{reps:0,weight:120,reportedRir:null,complete:true},{reps:0,weight:135,reportedRir:null,complete:false}]);
  });
  it('does not push a later edit backward onto earlier sets',()=>{
    expect(cascadeWeight(sets,1,95)).toEqual([{reps:0,weight:0,reportedRir:null,complete:false},{reps:0,weight:95,reportedRir:null,complete:false},{reps:0,weight:95,reportedRir:null,complete:false}]);
  });
});
describe('empty set inputs',()=>{it('renders a zero weight as an empty controlled value so typing does not prepend zero',()=>{expect(weightInputValue(0)).toBe('');expect(weightInputValue(207)).toBe(207)})});
describe('bodyweight workout loads',()=>{
  it('uses profile body weight for exact Bodyweight equipment',()=>expect(exerciseStartingWeight({equipment:'Bodyweight',weight:0},185)).toBe(185));
  it('does not replace external load for Bodyweight Loadable equipment',()=>expect(exerciseStartingWeight({equipment:'Bodyweight Loadable',weight:25},185)).toBe(25));
  it('applies body weight when replacing an exercise with a bodyweight movement',()=>expect(replacementPrescription(workout.exercises[0],{id:'2',name:'Pull-Up',muscleGroup:'Back',equipment:'Bodyweight',repsMin:5,repsMax:10},185).weight).toBe(185));
  it('refreshes a restored bodyweight draft from the current profile weight',()=>{const bodyweightWorkout={...workout,exercises:[{...workout.exercises[0],equipment:'Bodyweight',weight:0}]};const saved={exercises:bodyweightWorkout.exercises,sets:[[{reps:8,weight:175,reportedRir:null,complete:false}]]};expect(reconcileSavedDraft(bodyweightWorkout,saved).sets[0][0].weight).toBe(185)});
});
describe('saved workout recovery',()=>{it('does not let a stale zero-weight draft erase a recovered prescription',()=>{const saved={exercises:workout.exercises.map(exercise=>({...exercise,weight:0})),sets:[[{reps:8,weight:0,reportedRir:null,complete:false},{reps:9,weight:95,reportedRir:2,complete:true}]]};expect(reconcileSavedDraft(workout,saved).sets[0]).toEqual([{reps:8,weight:100,reportedRir:null,complete:false},{reps:9,weight:95,reportedRir:2,complete:true},{reps:0,weight:100,reportedRir:null,complete:false}])});it('ignores exercises left behind by a changed prescription',()=>{const saved={exercises:[{...workout.exercises[0],name:'Old Row'}],sets:[[{reps:12,weight:200,reportedRir:0,complete:true}]]};expect(reconcileSavedDraft(workout,saved).sets).toEqual(createInitialDraft(workout))})});
describe('discarded workout recovery',()=>{it('removes both the draft and queued finish so a skipped workout cannot sync later',()=>{const removeItem=vi.fn();clearWorkoutLocalState({removeItem},'draft-key','queue-key');expect(removeItem.mock.calls).toEqual([['queue-key'],['draft-key']])})});
describe('safe exercise replacement',()=>{it('never carries execution data or load into a new movement',()=>{const replacement=replacementPrescription(workout.exercises[0],{id:'2',name:'Pull-Up',muscleGroup:'Back',equipment:'Bodyweight',repsMin:5,repsMax:10});expect(replacement.weight).toBe(0);expect(resetReplacementSets([{reps:12,weight:100,reportedRir:0,complete:true}],replacement)).toEqual([{reps:0,weight:0,reportedRir:null,complete:false}])});it('clears priority when the replacement changes muscle allocation',()=>expect(replacementPrescription(workout.exercises[0],{id:'3',name:'Curl',muscleGroup:'Biceps',equipment:'Dumbbell',repsMin:8,repsMax:12}).musclePriority).toBeNull())});
describe('staged muscle feedback',()=>{const twoExercises:WorkoutPrescription={...workout,exercises:[...workout.exercises,{...workout.exercises[0],name:'Pulldown',sets:1}]};it('recognizes the first completed set before the muscle is finished',()=>expect(muscleCompletionState(twoExercises.exercises,[[{reps:8,weight:100,reportedRir:null,complete:true}], [{reps:8,weight:100,reportedRir:null,complete:false}]],'Back')).toEqual({hasCompletedSet:true,allExercisesComplete:false}));it('waits for every set of every matching exercise before completion feedback',()=>expect(muscleCompletionState(twoExercises.exercises,[[{reps:8,weight:100,reportedRir:null,complete:true}],[{reps:8,weight:100,reportedRir:null,complete:true}]],'Back').allExercisesComplete).toBe(true))});
describe('RIR prompt language',()=>{it('explains each effort value in plain language',()=>{expect(rirDescription(0)).toBe('No clean reps left');expect(rirDescription(3)).toBe('3 clean reps left');expect(rirDescription(5)).toBe('5+ clean reps left')})});
describe('soreness prompt timing',()=>{it('does not automatically ask during week one',()=>{expect(shouldPromptSoreness(1,false,true,false)).toBe(false);expect(shouldPromptSoreness(2,false,true,false)).toBe(true)})});
describe('automatic rest timer',()=>{it('starts after a completed set except the final workout set',()=>{expect(shouldStartRestTimer(1,8)).toBe(true);expect(shouldStartRestTimer(8,8)).toBe(false);expect(shouldStartRestTimer(0,8)).toBe(false)})});
describe('finishing requires every set complete',()=>{
  it('blocks finishing while any set is still open',()=>{expect(canFinishWorkout(2,3)).toBe(false);expect(canFinishWorkout(0,3)).toBe(false)});
  it('allows finishing once every set is complete',()=>expect(canFinishWorkout(3,3)).toBe(true));
  it('blocks finishing a workout with no sets at all',()=>expect(canFinishWorkout(0,0)).toBe(false));
});
describe('feedback prompts cannot be skipped',()=>{
  it('requires a soreness answer before continuing',()=>{expect(canContinueFeedback('soreness',{jointPain:'',pump:'',volume:'',soreness:''})).toBe(false);expect(canContinueFeedback('soreness',{jointPain:'',pump:'',volume:'',soreness:'Still sore'})).toBe(true)});
  it('requires pump, volume, and joint pain before continuing a completion prompt',()=>{
    expect(canContinueFeedback('completion',{jointPain:'',pump:'Good',volume:'About right',soreness:''})).toBe(false);
    expect(canContinueFeedback('completion',{jointPain:'None',pump:'Good',volume:'About right',soreness:''})).toBe(true);
  });
});
describe('explicit workout sync state copy',()=>{it('labels each local-to-synced state distinctly',()=>{expect(workoutSyncStateCopy('local')).toMatchObject({label:'Local draft',tone:'neutral'});expect(workoutSyncStateCopy('queued')).toMatchObject({label:'Queued retry',tone:'warning'});expect(workoutSyncStateCopy('syncing')).toMatchObject({label:'Syncing…',tone:'info'});expect(workoutSyncStateCopy('synced')).toMatchObject({label:'Synced',tone:'success'})})});
describe('local storage keys for a null-day Quick Workout',()=>{
  it('uses a stable "quick" key instead of the literal string "null"',()=>{
    expect(workoutStorageKeys('user-1',null)).toEqual({storageKey:'grit-web-workout:user-1:quick',queueKey:'grit-web-workout-queue:user-1:quick'});
  });
  it('keeps the existing key shape for a scheduled program day',()=>{
    expect(workoutStorageKeys('user-1','day-1')).toEqual({storageKey:'grit-web-workout:user-1:day-1',queueKey:'grit-web-workout-queue:user-1:day-1'});
  });
});
describe('workout heading copy',()=>{
  it('hides the Week/Day eyebrow for a Quick Workout instead of showing fake values',()=>{
    expect(workoutHeadingCopy(quickWorkout)).toEqual({eyebrow:null,title:'Quick Workout',subtitle:'Quick Workout'});
  });
  it('still shows the Week/Day eyebrow for a scheduled program day',()=>{
    expect(workoutHeadingCopy(workout)).toEqual({eyebrow:'WEEK 4 · DAY 2',title:'Pull',subtitle:'Mid Summer'});
  });
});
describe('building a Quick Workout finish payload',()=>{
  it('preserves programDayId:null and validates once a set is complete',()=>{
    const exercises=[{name:'Row',muscleGroup:'Back',musclePriority:null,equipment:'Cable',sets:1,repsMin:8,repsMax:12,weight:100,rir:2}];
    const draft=[[{reps:10,weight:100,reportedRir:2,complete:true}]];
    const payload=buildWorkoutPayload({workoutId:'00000000-0000-4000-8000-000000000001',programDayId:null,name:'Quick Workout',programName:'Quick Workout',completedAt:new Date().toISOString(),exercises,draft,notes:[''],feedback:{},muscles:['Back']});
    expect(payload.programDayId).toBeNull();
    expect(validateWorkoutPayload(payload)).toBe(true);
  });
});
describe('skip-vs-discard behavior for null-day workouts',()=>{
  it('does not build a skip PATCH request for a Quick Workout',()=>{
    expect(skipWorkoutRequest(null)).toBeNull();
  });
  it('still builds a skip PATCH request for a scheduled program day',()=>{
    expect(skipWorkoutRequest('day-1')).toEqual({programDayId:'day-1',skipped:true});
  });
});
describe('workout menu cleanup',()=>{
  it('closes open workout bottom sheets before showing another modal',()=>{
    const menus=[{removeAttribute:vi.fn()},{removeAttribute:vi.fn()}];
    closeWorkoutMenus({querySelectorAll:vi.fn(()=>menus as unknown as NodeListOf<Element>)});
    expect(menus.map(menu=>menu.removeAttribute.mock.calls)).toEqual([[['open']],[['open']]]);
  });
});
describe('exercise ordering',()=>{
  it('moves the selected item while preserving every other item',()=>expect(moveWorkoutItem(['Row','Curl','Raise'],2,1)).toEqual(['Row','Raise','Curl']));
  it('does not mutate or reorder beyond the list boundaries',()=>{const items=['Row','Curl'];expect(moveWorkoutItem(items,0,-1)).toBe(items);expect(items).toEqual(['Row','Curl'])});
});
describe('adding an exercise to an empty training day',()=>{
  const option={id:'x1',name:'Leg Press',muscleGroup:'Quads',equipment:'Machine',repsMin:10,repsMax:15};
  it('gives a sensible default prescription when the day has no exercises to anchor from',()=>{
    expect(appendedExercisePrescription([],option)).toEqual({name:'Leg Press',muscleGroup:'Quads',musclePriority:null,equipment:'Machine',sets:3,repsMin:10,repsMax:15,weight:0,rir:2});
  });
  it('anchors sets/rir from the last exercise when one exists',()=>{
    const anchored=appendedExercisePrescription(workout.exercises,{...option,repsMin:null as unknown as number,repsMax:null as unknown as number});
    expect(anchored.sets).toBe(workout.exercises[0].sets);
    expect(anchored.rir).toBe(workout.exercises[0].rir);
    expect(anchored.repsMin).toBe(workout.exercises[0].repsMin);
    expect(anchored.weight).toBe(0);
  });
});

describe('menuPlacement', () => {
  const viewport = { width: 390, height: 844 };

  it('anchors its right edge to the trigger and opens downward from it', () => {
    const placement = menuPlacement({ top: 247, bottom: 291, right: 367 }, viewport);
    expect(placement.right).toBe(390 - 367);
    expect(placement.top).toBe(291 + MENU_TRIGGER_GAP);
    expect(placement.bottom).toBeNull();
  });

  it('opens upward from the trigger when there is more room above', () => {
    const placement = menuPlacement({ top: 700, bottom: 744, right: 367 }, viewport);
    expect(placement.top).toBeNull();
    expect(placement.bottom).toBe(844 - 700 + MENU_TRIGGER_GAP);
  });

  /**
   * The point of anchoring by edges: placement never consults the panel's own width
   * or height, so it is correct in the render that opens the menu and needs no
   * measure-then-reposition pass that could leave it briefly unpositioned.
   */
  it('needs no panel size, so identical triggers place identically', () => {
    const anchor = { top: 100, bottom: 144, right: 367 };
    expect(menuPlacement(anchor, viewport)).toEqual(menuPlacement(anchor, viewport));
  });

  it('caps the menu to the space available on the side it opens toward', () => {
    const below = menuPlacement({ top: 100, bottom: 144, right: 367 }, viewport);
    expect(below.maxHeight).toBe(844 - 144 - MENU_TRIGGER_GAP - MENU_VIEWPORT_MARGIN);
    const above = menuPlacement({ top: 700, bottom: 744, right: 367 }, viewport);
    expect(above.maxHeight).toBe(700 - MENU_TRIGGER_GAP - MENU_VIEWPORT_MARGIN);
  });

  /**
   * The set menu's trigger is the leftmost cell of its row, so right-aligning to it
   * alone would place the panel's left edge off-screen at roughly x:-215 on a phone.
   */
  it('keeps a left-hand trigger from pushing the panel off the left edge', () => {
    const placement = menuPlacement({ top: 400, bottom: 444, right: 57 }, viewport);
    const left = viewport.width - placement.right - menuWidth(viewport);
    expect(left).toBeGreaterThanOrEqual(MENU_VIEWPORT_MARGIN);
    expect(placement.right + menuWidth(viewport)).toBeLessThanOrEqual(viewport.width - MENU_VIEWPORT_MARGIN);
  });

  it('still right-aligns to a trigger that leaves room for the panel', () => {
    const placement = menuPlacement({ top: 247, bottom: 291, right: 367 }, viewport);
    expect(viewport.width - placement.right).toBe(367);
  });

  it('shrinks the panel width rather than overflowing a viewport narrower than the menu', () => {
    expect(menuWidth({ width: 240 })).toBe(240 - MENU_VIEWPORT_MARGIN * 2);
    expect(menuWidth({ width: 390 })).toBe(MENU_WIDTH);
  });

  it('keeps a trigger at the very edge inside the viewport margin', () => {
    const placement = menuPlacement({ top: 10, bottom: 40, right: 390 }, viewport);
    expect(placement.right).toBe(MENU_VIEWPORT_MARGIN);
    expect(placement.maxHeight).toBeGreaterThan(0);
  });

  it('never returns a negative maxHeight for a trigger jammed against an edge', () => {
    const placement = menuPlacement({ top: 0, bottom: 843, right: 367 }, { width: 390, height: 844 });
    expect(placement.maxHeight).toBeGreaterThanOrEqual(0);
  });
});

describe('menuPlacementStyle', () => {
  it('passes coordinates as custom properties, never as inline top/right', () => {
    // An !important declaration always beats an inline style, and
    // .native-workout-card .set-menu>div forces left/top with !important - inline
    // top/right would be ignored and the menu would render pinned to the card's edge.
    const style = menuPlacementStyle({ top: 296, bottom: null, right: 23, maxHeight: 500 }) as Record<string, unknown>;
    expect(style['--menu-top']).toBe('296px');
    expect(style['--menu-bottom']).toBe('auto');
    expect(style['--menu-right']).toBe('23px');
    expect(style['--menu-max-h']).toBe('500px');
    expect(style.top).toBeUndefined();
    expect(style.right).toBeUndefined();
  });

  it('emits auto for the edge it is not anchored to', () => {
    const style = menuPlacementStyle({ top: null, bottom: 200, right: 23, maxHeight: 400 }) as Record<string, unknown>;
    expect(style['--menu-top']).toBe('auto');
    expect(style['--menu-bottom']).toBe('200px');
  });

  it('sets no coordinates at all when there is no placement', () => {
    // The panel only lacks a placement while its <details> is closed, and a closed
    // <details> already hides it - so it must not be hidden with visibility here:
    // .focus() is a no-op on a visibility:hidden element and useDialogFocusTrap
    // focuses the first row as soon as the menu opens.
    const style = menuPlacementStyle(null) as Record<string, unknown>;
    expect(style).toEqual({});
    expect(style.visibility).toBeUndefined();
  });
});

describe('skipping a set', () => {
  const set = (over:Partial<{reps:number;weight:number;reportedRir:number|null;complete:boolean;skipped:boolean}> = {}) =>
    ({ reps: 10, weight: 100, reportedRir: null, complete: false, ...over });

  it('blanks the set in place instead of removing it', () => {
    const sets = [set(), set(), set()];
    const next = toggleSetSkipped(sets, 1);
    expect(next).toHaveLength(3);
    expect(next[1].skipped).toBe(true);
    expect(next[0].skipped).toBeFalsy();
  });

  it('clears completion and reported RIR so a skipped set cannot count as done', () => {
    const next = toggleSetSkipped([set({ complete: true, reportedRir: 2 })], 0);
    expect(next[0].complete).toBe(false);
    expect(next[0].reportedRir).toBeNull();
  });

  it('is reversible, restoring the logged reps and weight', () => {
    const skipped = toggleSetSkipped([set({ reps: 8, weight: 135 })], 0);
    const restored = toggleSetSkipped(skipped, 0);
    expect(restored[0].skipped).toBe(false);
    expect(restored[0]).toMatchObject({ reps: 8, weight: 135 });
  });

  it('drops out of the counts, so a workout finishes with a set skipped', () => {
    const sets = [set({ complete: true }), set({ complete: true }), set({ skipped: true })];
    expect(countedSets(sets)).toHaveLength(2);
    const completed = sets.filter((entry) => isCountedSet(entry) && entry.complete).length;
    expect(canFinishWorkout(completed, countedSets(sets).length)).toBe(true);
    // Without the filter the skipped set would keep the workout permanently unfinishable.
    expect(canFinishWorkout(completed, sets.length)).toBe(false);
  });

  it('does not block the per-muscle completion feedback prompt', () => {
    const exercises = [{ name:'Bench', muscleGroup:'Chest', musclePriority:null, equipment:'Barbell', sets:3, repsMin:8, repsMax:12, weight:100, rir:2 }];
    const draft = [[set({ complete: true }), set({ complete: true }), set({ skipped: true })]];
    expect(muscleCompletionState(exercises, draft, 'Chest')).toEqual({ hasCompletedSet: true, allExercisesComplete: true });
  });

  it('is left out of the saved payload, exactly as a removed set was', () => {
    const exercises = [{ name:'Bench', muscleGroup:'Chest', musclePriority:null, equipment:'Barbell', sets:3, repsMin:8, repsMax:12, weight:100, rir:2 }];
    const payload = buildWorkoutPayload({
      workoutId:'w1', programDayId:null, name:'Day 1', programName:'P', completedAt:'2026-09-05T00:00:00.000Z',
      exercises, draft:[[set({ complete: true }), set({ skipped: true }), set({ complete: true })]],
      notes:[''], feedback:{}, muscles:['Chest'],
    });
    expect(payload.exercises[0].sets).toHaveLength(2);
    expect(payload.exercises[0].sets.every((entry) => entry.completed)).toBe(true);
  });

  it('does not cascade a weight change into a skipped set', () => {
    const sets = [set({ weight: 100 }), set({ weight: 100, skipped: true }), set({ weight: 100 })];
    const next = cascadeWeight(sets, 0, 145);
    expect(next[0].weight).toBe(145);
    expect(next[1].weight).toBe(100);
    expect(next[2].weight).toBe(145);
  });
});

describe('setRepPlan', () => {
  const session = (reps: number[]) => ({ date: '2026-01-08', sets: reps.map((r) => ({ weight: 135, reps: r })) });

  it('turns last session into a per-set goal for this one', () => {
    // The RP shape: total reps creep up one set at a time.
    expect(setRepPlan([session([12, 12, 12])], 3, 8, 15)).toEqual([12, 12, 13]);
    // And an uneven session brings its weakest set up first.
    expect(setRepPlan([session([11, 12, 12])], 3, 8, 12)).toEqual([12, 12, 12]);
  });

  it('reads the most recent session, not an older one', () => {
    expect(setRepPlan([session([12, 12, 12]), session([8, 8, 8])], 3, 8, 15)).toEqual([12, 12, 13]);
  });

  /**
   * A first exposure has nothing to build on, so the caller keeps showing the
   * prescribed range rather than inventing a per-set number.
   */
  it('returns null when there is no history to build on', () => {
    expect(setRepPlan(undefined, 3, 8, 12)).toBeNull();
    expect(setRepPlan([], 3, 8, 12)).toBeNull();
    expect(setRepPlan([{ date: '2026-01-08', sets: [] }], 3, 8, 12)).toBeNull();
  });

  it('covers a set added since last session', () => {
    expect(setRepPlan([session([12, 12, 12])], 4, 8, 15)).toHaveLength(4);
  });
});
