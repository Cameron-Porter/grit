import { describe, expect, it } from 'vitest';
import { muscleFeedbackTrend, recommendedExerciseIds, withRecommendedOptions } from './recommendations';

const candidates = [
  { id:'1',name:'Barbell Bench Press',muscleGroup:'Chest',movementCategory:'Horizontal Press' },
  { id:'2',name:'Incline Dumbbell Press',muscleGroup:'Chest',movementCategory:'Incline Press' },
  { id:'3',name:'Cable Fly',muscleGroup:'Chest',movementCategory:'Lateral Raise' },
  { id:'4',name:'Pec Deck',muscleGroup:'Chest',movementCategory:'Lateral Raise' },
  { id:'5',name:'Leg Press',muscleGroup:'Quads',movementCategory:'Quad Dominant' },
];

describe('recommendedExerciseIds',()=>{
  it('caps recommendations at 2 by default',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Chest'}).length).toBeLessThanOrEqual(2);
  });
  it('recommends one compound and one isolation exercise when there is no origin exercise or elevated pain',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Chest'})).toEqual(['1','3']);
  });
  it('matches the same movement class as the exercise being replaced',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Chest',originMovementClass:'compound'})).toEqual(['1','2']);
  });
  it('recommends two of the same type when that is all that fits the origin class',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Chest',originMovementClass:'isolation'})).toEqual(['3','4']);
  });
  it('leans on isolation-only picks when recent joint pain for that muscle is elevated',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Chest',feedbackTrend:{avgPump:1,avgJointPain:2.5}})).toEqual(['3','4']);
  });
  it('is scoped to a single muscle group',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Quads'})).toEqual(['5']);
  });
  it('returns nothing outside the candidate pool',()=>{
    expect(recommendedExerciseIds(candidates,{muscleGroup:'Back'})).toEqual([]);
  });
});

describe('muscleFeedbackTrend',()=>{
  const rows = [
    { muscle_group:'Chest',pump:'Good',joint_pain:'Moderate' },
    { muscle_group:'Chest',pump:'Excellent',joint_pain:'Severe' },
    { muscle_group:'Back',pump:'Low',joint_pain:'None' },
  ];
  it('averages only rows for the requested muscle group',()=>{
    expect(muscleFeedbackTrend(rows,'Chest')).toEqual({ avgPump:2.5,avgJointPain:2.5 });
  });
  it('returns nulls when there is no feedback history yet',()=>{
    expect(muscleFeedbackTrend(rows,'Hamstrings')).toEqual({ avgPump:null,avgJointPain:null });
  });
});

describe('withRecommendedOptions',()=>{
  const options = [
    { value:'1',label:'Barbell Bench Press' },
    { value:'2',label:'Incline Dumbbell Press' },
    { value:'3',label:'Cable Fly' },
  ];
  it('stars and floats recommended options above a divider, keeping the rest in place',()=>{
    expect(withRecommendedOptions(options,['3','1'])).toEqual([
      { value:'3',label:'★ Cable Fly' },
      { value:'1',label:'★ Barbell Bench Press' },
      { value:'__recommended_divider__',label:'── All exercises ──',disabled:true },
      { value:'2',label:'Incline Dumbbell Press' },
    ]);
  });
  it('leaves the list untouched when there are no recommendations',()=>{
    expect(withRecommendedOptions(options,[])).toBe(options);
  });
});
