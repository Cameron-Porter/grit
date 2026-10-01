// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkoutExplanation } from './workout-explanation';

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
it('shows errors, retries, traps keyboard focus, and restores the trigger',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('scrollTo',vi.fn());
  vi.spyOn(HTMLElement.prototype,'offsetParent','get').mockImplementation(()=>document.body);
  const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:'Model is busy.'}),{status:429})).mockResolvedValueOnce(new Response(JSON.stringify({mode:'evidence',answer:'Load held at 100 lb.\n\nThe rep target stays steady.',notice:'Local AI is unavailable.',citations:['decision'],sources:[{id:'decision',label:'Recorded decision',text:'Recorded load: 100 lb.'}]})));
  vi.stubGlobal('fetch',fetch);
  const trigger=document.createElement('button');document.body.append(trigger);trigger.focus();
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container),close=vi.fn();
  try{
    await act(async()=>root.render(createElement(WorkoutExplanation,{context:{dayId:'00000000-0000-4000-8000-000000000001',exerciseName:'Row',displayed:{sets:3,repsMin:8,repsMax:12,weight:100,rir:2},setCount:3},onClose:close})));
    expect(document.activeElement).toBe(container.querySelector('textarea'));
    await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Model is busy.');
    await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(container.textContent).toContain('Based on (1)');expect(container.querySelectorAll('.explanation-answer p')).toHaveLength(2);expect(container.textContent).toContain('Load held at 100 lb.');expect(container.textContent).toContain('Local AI is unavailable.');
    const dialog=container.querySelector('[role="dialog"]')!;
    const last=container.querySelector('summary')!;last.focus();
    await act(async()=>last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));
    expect(document.activeElement).toBe(container.querySelector('textarea'));
    await act(async()=>container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));
    expect(document.activeElement).toBe(last);
    await act(async()=>dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    expect(close).toHaveBeenCalledOnce();
  }finally{await act(async()=>root.unmount());expect(document.activeElement).toBe(trigger);container.remove();trigger.remove()}
});
