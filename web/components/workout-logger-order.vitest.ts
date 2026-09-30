// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkoutLogger, workoutStorageKeys, type WorkoutPrescription } from './workout-logger';

const router={refresh:vi.fn(),push:vi.fn()};
vi.mock('next/navigation',()=>({useRouter:()=>router}));
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear()});

it.each([409,500,'offline'] as const)('keeps exercise order, sets, and notes when saving fails (%s)',async(failure)=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('scrollTo',vi.fn());
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
    if(url==='/api/exercises')return {ok:true,json:async()=>({options:[]})};
    if(failure==='offline')throw new Error('Offline');
    return {ok:false,status:failure,json:async()=>({error:'Could not save template order.'})};
  }));
  const exercise={muscleGroup:'Back',musclePriority:null,equipment:'Cable',sets:1,repsMin:8,repsMax:12,weight:100,rir:2};
  const workout:WorkoutPrescription={dayId:'day',templateDayId:'template',bodyWeight:185,programName:'Program',week:1,day:1,label:'Pull',exercises:[{...exercise,name:'Row'},{...exercise,name:'Pulldown'}]};
  const {storageKey}=workoutStorageKeys('user','day');
  localStorage.setItem(storageKey,JSON.stringify({exercises:workout.exercises,sets:[[{reps:8,weight:110,complete:true,reportedRir:2}],[{reps:10,weight:90,complete:false,reportedRir:null}]],notes:['Row note','Pulldown note']}));
  const container=document.createElement('div');document.body.append(container);
  let root=createRoot(container);
  try{
    await act(async()=>root.render(createElement(WorkoutLogger,{workout,userId:'user'})));
    const menu=container.querySelector<HTMLDetailsElement>('summary[aria-label="Pulldown menu"]')!.parentElement!;
    await act(async()=>{menu.setAttribute('open','');menu.dispatchEvent(new Event('toggle'))});
    const move=[...container.querySelectorAll('button')].find(button=>button.textContent?.includes('Move up'))!;
    await act(async()=>move.click());
    expect([...container.querySelectorAll('.exercise-title h2')].map(node=>node.textContent)).toEqual(['Pulldown','Row']);
    expect(container.textContent).toContain('Order kept for this workout');
    const saved=JSON.parse(localStorage.getItem(storageKey)!);
    expect(saved.notes).toEqual(['Pulldown note','Row note']);
    expect(saved.sets.map((sets:{weight:number}[])=>sets[0].weight)).toEqual([90,110]);
    await act(async()=>root.unmount());
    root=createRoot(container);
    await act(async()=>root.render(createElement(WorkoutLogger,{workout,userId:'user'})));
    expect([...container.querySelectorAll('.exercise-title h2')].map(node=>node.textContent)).toEqual(['Pulldown','Row']);
  }finally{await act(async()=>root.unmount());container.remove()}
});
