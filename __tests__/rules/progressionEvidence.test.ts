import { describe, expect, it } from 'vitest';
import { recommendProgression } from '../../src/rules/progressionEngine';

const prescription={sets:3,repsMin:8,repsMax:12,rir:2,equipment:'Barbell'};
const context={experienceLevel:'intermediate' as const,isDeload:false,mesoWeek:2,totalMesoWeeks:6,programFocus:'general' as const};
describe('progression branch evidence',()=>{
  it.each([
    {rir:undefined,expected:true,code:'ceiling_load_progression'},
    {rir:1,expected:false,code:'within_band_hold'},
    {rir:2,expected:true,code:'ceiling_load_progression'},
  ])('records reported effort without treating missing RIR as failure: $rir',({rir,expected,code})=>{
    const result=recommendProgression(prescription,[{date:'2026-09-30',sets:Array.from({length:3},()=>({weight:100,reps:12,rir}))}],context);
    expect(result.decisionCode).toBe(code);
    expect(result.evidence.reportedEffortSatisfied).toBe(expected);
    expect(result.evidence.straightSetPrescriptionSatisfied).toBe(true);
    expect(result.nextWeight>100).toBe(expected);
  });
  it('marks load gates unevaluated when an earlier branch wins',()=>{
    const result=recommendProgression(prescription,[],context);
    expect(result.decisionCode).toBe('first_session');
    expect(result.evidence.reportedEffortSatisfied).toBeNull();
    expect(result.evidence.straightSetPrescriptionSatisfied).toBeNull();
  });
});
