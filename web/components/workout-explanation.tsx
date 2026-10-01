'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialogFocusTrap } from '@/lib/hooks/use-dialog-focus-trap';
import type { ExplanationRequest, ExplanationResult } from '@/lib/explanations/types';

export function WorkoutExplanation({context,onClose}:{context:Omit<ExplanationRequest,'question'>;onClose:()=>void}){
  const dialog=useRef<HTMLElement|null>(null),pending=useRef<AbortController|null>(null);
  const [question,setQuestion]=useState('Why are these my targets?');
  const [result,setResult]=useState<ExplanationResult|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
  useDialogFocusTrap(true,dialog);
  useEffect(()=>()=>pending.current?.abort(),[]);
  const ask=async(value:string)=>{
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setQuestion(value);setLoading(true);setError(null);setResult(null);
    try{
      const response=await fetch('/api/ai/explain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...context,question:value}),signal:controller.signal});
      const body=await response.json();if(!response.ok)throw new Error(body.error??'Could not load this explanation.');
      if(!controller.signal.aborted)setResult(body);
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Could not load this explanation.')}
    finally{if(!controller.signal.aborted)setLoading(false)}
  };
  return <div className="modal-backdrop" onClick={onClose}>
    <section ref={dialog} tabIndex={-1} className="feedback-modal exercise-action-modal workout-explanation" role="dialog" aria-modal="true" aria-labelledby="explanation-title" onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape')onClose()}}>
      <h2 id="explanation-title">{context.exerciseName}</h2><p className="cap">About your targets</p>
      <p>{context.displayed.sets} sets · {context.displayed.repsMin===context.displayed.repsMax?context.displayed.repsMax:`${context.displayed.repsMin}–${context.displayed.repsMax}`} reps · {context.displayed.weight} lb · {context.displayed.rir} RIR</p>
      <form className="note-field" onSubmit={event=>{event.preventDefault();void ask(question)}}>
        <label htmlFor="explanation-question">Ask about this exercise</label>
        <textarea id="explanation-question" value={question} maxLength={1000} rows={3} onChange={event=>setQuestion(event.target.value)}/>
        <div className="explanation-actions"><button className="primary" disabled={loading||!question.trim()}>{loading?'Explaining…':'Ask'}</button><button type="button" className="quiet" onClick={onClose}>Close</button></div>
      </form>
      <div className="explanation-actions" aria-label="Suggested questions">
        <button type="button" className="secondary" disabled={loading} onClick={()=>void ask('Why did my reps increase?')}>Why more reps?</button>
        <button type="button" className="secondary" disabled={loading} onClick={()=>void ask('Why did my weight stay the same?')}>Why the same weight?</button>
      </div>
      {error&&<p role="alert" className="notice">{error}</p>}
      <div aria-live="polite" aria-busy={loading}>
        {result&&<><p className="cap">Explanation</p>{result.notice&&<p className="notice">{result.notice}</p>}<div className="explanation-answer">{result.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
          {result.refreshNeeded&&<button type="button" className="secondary" onClick={()=>window.location.reload()}>Reload workout targets</button>}
          <details className="explanation-sources"><summary tabIndex={0}>Based on ({result.sources.length})</summary>{result.sources.filter(source=>result.citations.includes(source.id)).map(source=><article key={source.id}><strong>{source.label}</strong><p>{source.text}</p></article>)}</details>
        </>}
      </div>
    </section>
  </div>;
}
