import { decisionSummary, ENGINE_REVISION } from '@/lib/explanations/decision';
import type { DecisionEvidence, EvidenceSource } from '@/lib/explanations/types';
import { resolveExercisePrescription } from './prescription';
import { recoverTargetWithTrace, type HistorySession, type RecoveryTemplate } from './recovery-target';

export type TargetTemplate = RecoveryTemplate & {muscle_group:string|null};
export type SavedTarget = {target_sets:number|null;target_reps_min:number|null;target_reps_max:number|null;target_weight:number|null;rir:number|null;decision_evidence?:unknown};
export type TargetContext = Parameters<typeof recoverTargetWithTrace>[2] & {bodyWeight:number;musclePriority:string|null};

export function recordedDecision(target:SavedTarget|undefined):DecisionEvidence|null {
  const evidence=target?.decision_evidence as DecisionEvidence|undefined;
  if(!evidence||evidence.version!==1||!Array.isArray(evidence.sessions)||!Array.isArray(evidence.adjustments)||!evidence.finalTarget||typeof evidence.revision!=='string')return null;
  const f=evidence.finalTarget;
  return f.sets===target?.target_sets&&f.repsMin===target.target_reps_min&&f.repsMax===target.target_reps_max&&f.weightLbs===target.target_weight&&f.rir===target.rir?evidence:null;
}

/** The logger and explanation endpoint must select the same target and its basis. */
export function resolveScheduledTarget(template:TargetTemplate,saved:SavedTarget|undefined,sessions:HistorySession[],context:TargetContext){
  const recorded=recordedDecision(saved);
  // Legacy targets without decision evidence are recomputed from available
  // history, rather than being trusted forever merely because weight is nonzero.
  const recovered=!recorded?recoverTargetWithTrace(template,sessions,context):undefined;
  const target=recorded?saved:recovered?.target??saved;
  const prescription=resolveExercisePrescription(template,target,context.musclePriority);
  const bodyweight=template.equipment==='Bodyweight';
  if(bodyweight&&context.bodyWeight>0)prescription.weight=context.bodyWeight;
  const status:'recorded'|'reconstructed'|'saved'|'template'=recorded?'recorded':recovered?'reconstructed':saved?'saved':'template';
  const basis=recorded?decisionSummary(recorded):recovered?recovered.reason:saved
    ? 'These values come from the saved targets for this program day. There is no usable workout history to recalculate them; their original rationale was not recorded.'
    : 'These starting targets come from your saved program. There is no suitable previous workout to personalize them yet.';
  const sources:EvidenceSource[]=[{id:'decision',label:recorded?'Recorded decision':recovered?'Calculated from saved workouts':saved?'Saved day targets':'Program starting targets',text:basis}];
  if(recovered)sources.push({id:'provenance',label:'Calculation basis',text:'Calculated now from saved workouts and current training rules. This is the reason for the current target, not a claim about why a previous target was chosen.'});
  const origin=recorded?'the recorded progression decision':recovered?.kind==='progression'?'the current progression calculation':saved&&!recovered?'your saved day targets':'your saved program';
  sources.push({id:'sets',label:'Sets',text:`${prescription.sets} sets come from ${origin}. Your saved program prescribes ${template.target_sets} sets.${sessions[0]?` Your last workout had ${sessions[0].sets.length} completed sets; that does not automatically replace the program's set prescription.`:''}${(target?.target_sets??template.target_sets??0)>prescription.sets?' The per-exercise limit reduced the stored set count.':''}`});
  sources.push({id:'effort',label:'Effort',text:`The target is ${prescription.rir} reps in reserve for week ${context.week} of ${context.totalWeeks} (${context.focus}). Your program's starting effort is ${template.rir} reps in reserve.${prescription.rir===template.rir?' That effort target is retained.':` The ${origin} adjusted it to ${prescription.rir}.`}`});
  sources.push({id:'weight',label:bodyweight?'Body weight':'Weight',text:bodyweight&&context.bodyWeight>0
    ? `${prescription.weight} lb is your saved profile body weight, not added resistance. Bodyweight progression changes reps or difficulty rather than adding to your body mass.`
    : `${prescription.weight} lb comes from ${origin}.${bodyweight?' This exercise uses bodyweight; this value does not prescribe additional external resistance.':''}`});
  const usedSessions=recorded?.sessions??recovered?.sessions??[];
  usedSessions.slice(0,3).forEach((session,index)=>sources.push({id:`session:${index}`,label:`Workout · ${session.date.slice(0,10)}`,text:session.sets.map((set,i)=>`Set ${i+1}: ${set.reps} reps at ${set.weight} lb${set.rir!==undefined?`, ${set.rir} reps in reserve`:''}`).join('\n')}));
  if(recovered?.kind==='history_seed')sources.push({id:'reps',label:'Reps',text:`${prescription.repsMax} reps comes from the lowest completed set in the latest suitable workout, subject to the exercise’s rep ceiling. Deload workouts and sessions with adverse feedback are excluded from new-block seeding.`});
  else sources.push({id:'reps',label:'Reps',text:`The current range is ${prescription.repsMin}–${prescription.repsMax} reps, from ${origin}. ${basis}`});
  return {prescription,sources,summary:basis,status,tags:recorded?.recommendation?.doctrineTags??recovered?.tags??[],revision:recorded?.revision??ENGINE_REVISION};
}
