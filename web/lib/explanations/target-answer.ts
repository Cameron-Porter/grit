import type { EvidenceSource } from './types';

/** Known target questions use exact computed facts; wording cannot alter the math. */
export function answerTargetQuestion(question:string,sources:EvidenceSource[]):string|null{
  const q=question.trim().toLowerCase().replace(/[?!.]+$/,'');
  const get=(id:string)=>{const source=sources.find(s=>s.id===id);return source?.displayText??source?.text};
  let ids:string[];
  if(q==='why are these my targets'||q==='why these targets')ids=['decision','effort','weight'];
  else if(q==='why did my reps increase'||q==='why more reps')ids=['decision','rep-plan'];
  else if(q==='why did my weight stay the same'||q==='why the same weight')ids=['weight','decision'];
  else return null;
  return [get('draft-difference'),...ids.map(get)].filter(Boolean).join('\n\n');
}
