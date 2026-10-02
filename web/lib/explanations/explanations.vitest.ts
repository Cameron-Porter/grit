import { afterEach, describe, expect, it, vi } from 'vitest';
import { recommendProgression, type SlotPrescription } from '@grit/rules/progressionEngine';
import { decisionEvidence, decisionSummary, ENGINE_REVISION } from './decision';
import { localExplanation, localModelConfig, validateModelAnswer } from './local-model';
import { retrieveBundledRules } from './retrieval';
import { isExplanationRequest } from './types';

const prescription:SlotPrescription={sets:3,repsMin:8,repsMax:12,rir:2,equipment:'Barbell'};
const context={experienceLevel:'intermediate' as const,isDeload:false,mesoWeek:2,totalMesoWeeks:6,programFocus:'general' as const};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});

describe('recorded decision evidence',()=>{
  it('distinguishes mixed loads from effort and records post-engine caps',()=>{
    const sessions=[{date:'2026-09-30',sets:[{weight:100,reps:12},{weight:100,reps:12},{weight:90,reps:12}]}];
    const rec=recommendProgression(prescription,sessions,context);
    const evidence=decisionEvidence({source:'progression',sourceWorkoutId:'w1',prescription,sessions,context,recommendation:rec,finalTarget:{sets:2,repsMin:rec.nextRepsMin,repsMax:rec.nextRepsMax,weightLbs:rec.nextWeight,rir:rec.nextRir}});
    expect(evidence.recommendation?.evidence).toMatchObject({reportedEffortSatisfied:true,straightSetPrescriptionSatisfied:false});
    expect(decisionSummary(evidence)).toContain('one working weight');
    expect(decisionSummary(evidence)).not.toContain('reported RIR was below');
    expect(evidence.adjustments[0]).toContain('from 3 to 2 sets');
  });
  it('uses the exact decision revision and refuses current doctrine for old revisions',()=>{
    expect(retrieveBundledRules('reps ceiling load',ENGINE_REVISION).length).toBeGreaterThan(0);
    expect(retrieveBundledRules('reps ceiling load','old-revision')).toEqual([]);
    expect(retrieveBundledRules('reps ceiling load',ENGINE_REVISION).every(s=>!s.text.includes('SUPERSEDED'))).toBe(true);
  });
});

describe('local model boundary',()=>{
  const sources=[{id:'decision',label:'Recorded decision',text:'Weight held at 100 lb. The target is 12 reps.'}];
  it('defaults to the user’s llama.cpp model only when explicitly enabled',()=>{
    expect(localModelConfig({})).toBeNull();
    expect(localModelConfig({GRIT_EXPLANATIONS_ENABLED:'1'})).toMatchObject({base:'http://127.0.0.1:8080/v1',model:'qwen'});
    expect(()=>localModelConfig({GRIT_EXPLANATIONS_ENABLED:'1',GRIT_AI_BASE_URL:'file:///private'})).toThrow();
  });
  it('rejects invented citations and numbers absent from cited evidence',()=>{
    expect(()=>validateModelAnswer(JSON.stringify({claims:[{text:'Use 105 lb.',evidenceIds:['decision']}]}),sources)).toThrow();
    expect(()=>validateModelAnswer(JSON.stringify({claims:[{text:'Held at 100 lb.',evidenceIds:['missing']}]}),sources)).toThrow();
    expect(validateModelAnswer(JSON.stringify({claims:[{text:'The weight held at 100 lb.',evidenceIds:['decision']}]}),sources).citations).toEqual(['decision']);
  });
  it('calls llama.cpp with bounded JSON output and no cloud fallback',async()=>{
    vi.stubEnv('GRIT_EXPLANATIONS_ENABLED','1');vi.stubEnv('GRIT_AI_BASE_URL','http://127.0.0.1:8080/v1');
    const fetch=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({claims:[{text:'Held at 100 lb.',evidenceIds:['decision']}]})}}]})));
    vi.stubGlobal('fetch',fetch);
    expect((await localExplanation('Why?',sources))?.answer).toBe('Held at 100 lb.');
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8080/v1/chat/completions',expect.objectContaining({redirect:'error',signal:expect.any(AbortSignal)}));
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string,RequestInit])[1].body as string)).toMatchObject({model:'qwen',stream:false,max_tokens:700});
  });
  it('rejects oversized or malformed request context',()=>{
    expect(isExplanationRequest({dayId:'day',exerciseName:'Row',question:'why'})).toBe(false);
  });
});
