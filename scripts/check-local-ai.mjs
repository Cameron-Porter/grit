// Uses synthetic data only; does not access Supabase or personal workouts.
import { localExplanation } from '../web/lib/explanations/local-model.ts';

process.env.GRIT_EXPLANATIONS_ENABLED='1';
const result=await localExplanation('Why did the weight stay the same?',[
  {id:'decision',label:'Synthetic verification fixture',text:'Weight stayed at 100 lb. The previous sets were 12, 12, and 10 reps against a 12-rep ceiling. The straight-set completion gate failed. The reported effort gate passed. Per-set targets are 12, 12, and 11. This is synthetic test data.'},
]);
if(!result)throw new Error('No local model response.');
console.log(result.answer);
console.log(`Verified evidence references: ${result.citations.join(', ')}`);
