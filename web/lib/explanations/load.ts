import type { SupabaseClient } from '@supabase/supabase-js';
import { perSetRepTargets } from '@grit/rules/perSetTargets';
import { loadWorkoutTargets, TargetLoadError } from '@/lib/workout/load-targets';
import type { ExplanationRequest } from './types';

export { TargetLoadError as ExplanationError } from '@/lib/workout/load-targets';

export async function loadExplanationEvidence(db:SupabaseClient,input:ExplanationRequest){
  const loaded=await loadWorkoutTargets(db,input.dayId);
  const resolved=loaded.resolved.find(item=>item.prescription.name===input.exerciseName);
  if(!resolved)throw new TargetLoadError('This exercise is not in the saved workout. Save the exercise change before asking about its targets.',404);
  const p=resolved.prescription,d=input.displayed;
  const differs=p.sets!==d.sets||p.repsMin!==d.repsMin||p.repsMax!==d.repsMax||p.weight!==d.weight||p.rir!==d.rir;
  const sources=[...resolved.sources];
  let fallback=resolved.summary;
  if(differs){
    const difference=`Your open workout shows ${d.sets} sets, ${d.repsMin}-${d.repsMax} reps, ${d.weight} lb and ${d.rir} reps in reserve. Current saved inputs give ${p.sets} sets, ${p.repsMin}-${p.repsMax} reps, ${p.weight} lb and ${p.rir} reps in reserve. Reload to use the current targets; the open draft may contain edits or older targets.`;
    sources.unshift({id:'draft-difference',label:'Open workout differs',text:difference});
    fallback=`Your open workout differs from the current calculation. ${resolved.summary} Reload the workout to use the current targets.`;
  }
  if(input.setCount!==p.sets)sources.push({id:'draft-sets',label:'Sets in this draft',text:`Your draft has ${input.setCount} set rows; the saved program calculation prescribes ${p.sets}. Added or removed draft rows are session edits, not an automatic set recommendation.`});
  const last=loaded.historyByExercise[input.exerciseName]?.[0];
  if(last){
    const reps=last.sets.map(s=>s.reps),next=perSetRepTargets(reps,input.setCount,p.repsMax,p.repsMin);
    sources.push({id:'rep-plan',label:'Set targets',text:`Last workout (${last.date.slice(0,10)}): ${reps.join(', ')} reps. Current set targets: ${next.join(', ')} reps. Starting from the previous sets, the logger adds one rep to the lowest set below the current target ceiling of ${p.repsMax}; ties go to the last matching set. Sets already at the ceiling stay there.`});
    if(!differs&&input.repTargets&&JSON.stringify(next)!==JSON.stringify(input.repTargets))sources.push({id:'draft-warning',label:'History has changed',text:'The open workout has different set targets than the current saved history produces. Reload to bring the targets up to date.'});
  }
  return {userId:loaded.userId,sources,fallback,tags:resolved.tags,revision:resolved.revision,evidenceStatus:resolved.status,refreshNeeded:differs};
}
