import type { ProgressionContext, ProgressionRecommendation, SessionPerformance, SlotPrescription } from '@grit/rules/progressionEngine';

export type TargetValues={sets:number;repsMin:number;repsMax:number;weightLbs:number;rir:number};
export type DecisionEvidence={
  version:1;
  revision:string;
  source:'progression'|'same_week_prefill';
  sourceWorkoutId:string;
  prescription:SlotPrescription;
  sessions:SessionPerformance[];
  context:ProgressionContext|null;
  recommendation:ProgressionRecommendation|null;
  finalTarget:TargetValues;
  adjustments:string[];
};
export type EvidenceSource={id:string;label:string;text:string;file?:string;line?:number;tags?:string[];displayText?:string};
export type ExplanationResult={
  answer:string;
  mode:'local_ai'|'evidence';
  notice:string|null;
  evidenceStatus:'recorded'|'reconstructed'|'saved'|'template'|'unavailable';
  refreshNeeded?:boolean;
  sources:EvidenceSource[];
  citations:string[];
};
export type ExplanationRequest={dayId:string;exerciseName:string;question:string;displayed:{sets:number;repsMin:number;repsMax:number;weight:number;rir:number};setCount:number;repTargets?:number[]|null};

export function isExplanationRequest(value:unknown):value is ExplanationRequest{
  if(!value||typeof value!=='object')return false;
  const v=value as ExplanationRequest,d=v.displayed;
  if(v.repTargets!=null&&(!Array.isArray(v.repTargets)||v.repTargets.length!==v.setCount||v.repTargets.some(n=>!Number.isInteger(n)||n<0||n>1000)))return false;
  return typeof v.dayId==='string'&&/^[0-9a-f-]{36}$/i.test(v.dayId)&&typeof v.exerciseName==='string'&&v.exerciseName.length>0&&v.exerciseName.length<=200&&typeof v.question==='string'&&v.question.trim().length>0&&v.question.length<=1000&&Number.isInteger(v.setCount)&&v.setCount>=0&&v.setCount<=50&&!!d&&[d.sets,d.repsMin,d.repsMax,d.weight,d.rir].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)&&d.sets<=50&&d.repsMin<=1000&&d.repsMax<=1000&&d.weight<=10000&&d.rir<=10;
}
