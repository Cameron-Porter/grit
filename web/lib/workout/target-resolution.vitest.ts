import { describe, expect, it } from 'vitest';
import { resolveScheduledTarget } from './target-resolution';
import { decisionEvidence } from '@/lib/explanations/decision';
import { recommendProgression } from '@grit/rules/progressionEngine';

const template={exercise_name:'Push-Up',muscle_group:'Chest',equipment:'Bodyweight',target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:0,rir:4};
const saved={target_sets:3,target_reps_min:8,target_reps_max:12,target_weight:206,rir:4};
const sessions=[{date:'2026-09-28',sets:Array.from({length:4},()=>({weight:210,reps:20,rir:5}))}];
const context={experienceLevel:'intermediate' as const,week:1,totalWeeks:8,focus:'hypertrophy' as const,bodyWeight:206,musclePriority:'grow'};
describe('shared target selection and evidence',()=>{
  it('replaces stale nonzero bodyweight targets with the same history-backed values it explains',()=>{
    const result=resolveScheduledTarget(template,saved,sessions,context);
    expect(result.prescription).toMatchObject({sets:3,repsMin:20,repsMax:20,weight:206,rir:4});
    expect(result.status).toBe('reconstructed');
    expect(result.sources.find(s=>s.id==='weight')?.text).toContain('saved profile body weight');
    expect(result.sources.find(s=>s.id==='sets')?.text).toContain('program prescribes 3');
    expect(result.sources.find(s=>s.id==='effort')?.text).toContain('starting effort is 4');
    expect(result.sources.find(s=>s.id==='session:0')?.text).toContain('20 reps at 210');
    expect(saved.target_reps_max).toBe(12); // Reconstruct without rewriting historical database rows.
  });
  it('explains program defaults when there is no usable history',()=>{
    const result=resolveScheduledTarget(template,undefined,[],context);
    expect(result.status).toBe('template');expect(result.summary).toContain('saved program');
    expect(result.sources.map(s=>s.id)).toEqual(expect.arrayContaining(['sets','reps','weight','effort']));
  });
  it('does not invent an original rationale for a saved target with no usable history',()=>{
    const result=resolveScheduledTarget(template,saved,[],context);
    expect(result.status).toBe('saved');expect(result.summary).toContain('original rationale was not recorded');
  });
  it('excludes deload and adverse-feedback sessions from new-block seeding',()=>{
    const result=resolveScheduledTarget(template,saved,[{...sessions[0],isDeloadSession:true},{...sessions[0],hasBadFeedback:true},{...sessions[0],date:'2026-09-10',sets:[{weight:206,reps:18,rir:4}]}],context);
    expect(result.prescription.repsMax).toBe(18);
    expect(result.sources.find(s=>s.id==='session:0')?.label).toContain('2026-09-10');
  });
  it('retains a matching recorded decision while explaining current body weight separately',()=>{
    const prescription={sets:3,repsMin:8,repsMax:12,rir:4,equipment:'Bodyweight'};
    const recContext={experienceLevel:'intermediate' as const,isDeload:false,mesoWeek:2,totalMesoWeeks:8};
    const rec=recommendProgression(prescription,sessions,recContext);
    const evidence=decisionEvidence({source:'progression',sourceWorkoutId:'w1',prescription,sessions,context:recContext,recommendation:rec,finalTarget:{sets:rec.nextSets,repsMin:rec.nextRepsMin,repsMax:rec.nextRepsMax,weightLbs:rec.nextWeight,rir:rec.nextRir}});
    const result=resolveScheduledTarget(template,{target_sets:rec.nextSets,target_reps_min:rec.nextRepsMin,target_reps_max:rec.nextRepsMax,target_weight:rec.nextWeight,rir:rec.nextRir,decision_evidence:evidence},[],context);
    expect(result.status).toBe('recorded');expect(result.prescription.weight).toBe(206);expect(result.prescription.repsMax).toBe(rec.nextRepsMax);
  });
});
