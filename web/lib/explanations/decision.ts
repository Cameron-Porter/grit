import type { DecisionEvidence, TargetValues } from './types';
import corpus from './corpus.json';

export const ENGINE_REVISION=corpus.revision;
export function decisionEvidence(input:Omit<DecisionEvidence,'version'|'revision'|'adjustments'>):DecisionEvidence{
  const adjustments:string[]=[];
  if(input.recommendation&&input.finalTarget.sets!==input.recommendation.nextSets)adjustments.push(`The session set cap changed this exercise from ${input.recommendation.nextSets} to ${input.finalTarget.sets} sets after progression.`);
  return {version:1,revision:ENGINE_REVISION,...input,adjustments};
}
export function sameTarget(a:TargetValues,b:TargetValues){return a.sets===b.sets&&a.repsMin===b.repsMin&&a.repsMax===b.repsMax&&a.weightLbs===b.weightLbs&&a.rir===b.rir}

/** Use recorded gates to avoid blaming missing effort or mixed weights on RIR. */
export function decisionSummary(evidence:DecisionEvidence):string{
  const rec=evidence.recommendation;
  if(!rec)return 'The weight was pre-filled from an earlier session of this exercise in the same week. This was not a new load-progression decision.';
  if(rec.decisionCode!=='within_band_hold')return [rec.reason,...evidence.adjustments].join(' ');
  const reasons:string[]=[];
  if(rec.evidence.volumeHoldsLoad)reasons.push('The volume transition held the load steady.');
  if(rec.evidence.straightSetPrescriptionSatisfied===false)reasons.push(`The completed straight-set prescription did not clear the ${rec.evidence.effectiveRepCeiling}-rep ceiling on every set at one working weight with enough sets.`);
  if(rec.evidence.reportedEffortSatisfied===false)reasons.push(`At least one reported RIR was below the prescribed ${evidence.prescription.rir} RIR.`);
  return [`Load held at ${rec.nextWeight} lb.`,...reasons,`The exercise-level rep target is ${rec.nextRepsMax}.`,...evidence.adjustments].join(' ');
}
