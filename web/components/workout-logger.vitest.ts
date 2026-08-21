import { describe, expect, it, vi } from 'vitest';
import { validateWorkoutPayload } from '@/lib/workout/payload';
import { appendedExercisePrescription, buildWorkoutPayload, clearWorkoutLocalState, createInitialDraft, muscleCompletionState, reconcileSavedDraft, replacementPrescription, resetReplacementSets, rirDescription, shouldPromptSoreness, shouldStartRestTimer, skipWorkoutRequest, workoutHeadingCopy, workoutRecoveryCopy, workoutStorageKeys, workoutSyncStateCopy, type WorkoutPrescription } from './workout-logger';

const workout: WorkoutPrescription = { dayId:'day-1',programName:'Mid Summer',week:4,day:2,label:'Pull',exercises:[{name:'Row',muscleGroup:'Back',musclePriority:'grow',equipment:'Cable',sets:3,repsMin:8,repsMax:12,weight:100,rir:2}] };
const quickWorkout: WorkoutPrescription = { dayId:null,programName:'Quick Workout',week:null,day:null,label:'Quick Workout',exercises:[] };

describe('createInitialDraft',()=>{
  it('creates exactly the prescribed sets with safe incomplete defaults',()=>{
    expect(createInitialDraft(workout)).toEqual([[{reps:8,weight:100,reportedRir:null,complete:false},{reps:8,weight:100,reportedRir:null,complete:false},{reps:8,weight:100,reportedRir:null,complete:false}]]);
  });
});
describe('saved workout recovery',()=>{it('does not let a stale zero-weight draft erase a recovered prescription',()=>{const saved={exercises:workout.exercises.map(exercise=>({...exercise,weight:0})),sets:[[{reps:8,weight:0,reportedRir:null,complete:false},{reps:9,weight:95,reportedRir:2,complete:true}]]};expect(reconcileSavedDraft(workout,saved).sets[0]).toEqual([{reps:8,weight:100,reportedRir:null,complete:false},{reps:9,weight:95,reportedRir:2,complete:true},{reps:8,weight:100,reportedRir:null,complete:false}])});it('ignores exercises left behind by a changed prescription',()=>{const saved={exercises:[{...workout.exercises[0],name:'Old Row'}],sets:[[{reps:12,weight:200,reportedRir:0,complete:true}]]};expect(reconcileSavedDraft(workout,saved).sets).toEqual(createInitialDraft(workout))})});
describe('discarded workout recovery',()=>{it('removes both the draft and queued finish so a skipped workout cannot sync later',()=>{const removeItem=vi.fn();clearWorkoutLocalState({removeItem},'draft-key','queue-key');expect(removeItem.mock.calls).toEqual([['queue-key'],['draft-key']])})});
describe('safe exercise replacement',()=>{it('never carries execution data or load into a new movement',()=>{const replacement=replacementPrescription(workout.exercises[0],{id:'2',name:'Pull-Up',muscleGroup:'Back',equipment:'Bodyweight',repsMin:5,repsMax:10});expect(replacement.weight).toBe(0);expect(resetReplacementSets([{reps:12,weight:100,reportedRir:0,complete:true}],replacement)).toEqual([{reps:5,weight:0,reportedRir:null,complete:false}])});it('clears priority when the replacement changes muscle allocation',()=>expect(replacementPrescription(workout.exercises[0],{id:'3',name:'Curl',muscleGroup:'Biceps',equipment:'Dumbbell',repsMin:8,repsMax:12}).musclePriority).toBeNull())});
describe('staged muscle feedback',()=>{const twoExercises:WorkoutPrescription={...workout,exercises:[...workout.exercises,{...workout.exercises[0],name:'Pulldown',sets:1}]};it('recognizes the first completed set before the muscle is finished',()=>expect(muscleCompletionState(twoExercises.exercises,[[{reps:8,weight:100,reportedRir:null,complete:true}], [{reps:8,weight:100,reportedRir:null,complete:false}]],'Back')).toEqual({hasCompletedSet:true,allExercisesComplete:false}));it('waits for every set of every matching exercise before completion feedback',()=>expect(muscleCompletionState(twoExercises.exercises,[[{reps:8,weight:100,reportedRir:null,complete:true}],[{reps:8,weight:100,reportedRir:null,complete:true}]],'Back').allExercisesComplete).toBe(true))});
describe('RIR prompt language',()=>{it('explains each effort value in plain language',()=>{expect(rirDescription(0)).toBe('No clean reps left');expect(rirDescription(3)).toBe('3 clean reps left');expect(rirDescription(5)).toBe('5+ clean reps left')})});
describe('soreness prompt timing',()=>{it('does not automatically ask during week one',()=>{expect(shouldPromptSoreness(1,false,true,false)).toBe(false);expect(shouldPromptSoreness(2,false,true,false)).toBe(true)})});
describe('automatic rest timer',()=>{it('starts after a completed set except the final workout set',()=>{expect(shouldStartRestTimer(1,8)).toBe(true);expect(shouldStartRestTimer(8,8)).toBe(false);expect(shouldStartRestTimer(0,8)).toBe(false)})});
describe('local draft recovery copy',()=>{it('describes local draft recovery and queued finish retry without implying full offline support',()=>{expect(workoutRecoveryCopy()).toEqual({heading:'Local draft recovery',body:'Your sets are saved on this device, not synced offline. Finish still needs a connection — if it drops mid-request, the workout stays queued and retries automatically.'})})});
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
