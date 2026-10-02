import { expect, it } from 'vitest';
import { answerTargetQuestion } from './target-answer';

it('answers target questions with exact sourced facts, including any stale-draft warning',()=>{
  const sources=[{id:'decision',label:'Reason',text:'Your last workout supports 20 reps.'},{id:'weight',label:'Weight',text:'206 lb is your profile body weight.'},{id:'draft-difference',label:'Draft',text:'Your draft still shows 12 reps; reload for the current target.'}];
  expect(answerTargetQuestion('Why are these my targets?',sources)).toBe('Your draft still shows 12 reps; reload for the current target.\n\nYour last workout supports 20 reps.\n\n206 lb is your profile body weight.');
  expect(answerTargetQuestion('How does effort affect progression?',sources)).toBeNull();
});
