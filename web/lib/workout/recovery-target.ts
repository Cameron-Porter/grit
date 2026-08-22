import { recommendInitialMesocycleTarget, recommendProgression, type ProgramFocus, type SessionPerformance } from '@grit/rules/progressionEngine';
import type { ExperienceLevel, SlotRole } from '@grit/types/program';

type Template={exercise_name:string;target_sets:number|null;target_reps_min:number|null;target_reps_max:number|null;target_weight:number|null;rir:number|null;equipment:string|null;role?:string|null};
export function recoverMissingTarget(template:Template,sessions:SessionPerformance[],context:{experienceLevel:ExperienceLevel;week:number;totalWeeks:number;focus:ProgramFocus}){
  if(!sessions.length)return undefined;
  const prescription={sets:template.target_sets??sessions[0].sets.length,repsMin:template.target_reps_min??1,repsMax:template.target_reps_max??1,rir:template.rir??3,equipment:template.equipment??undefined,role:(template.role??'Primary')as SlotRole};
  if(context.week===1&&context.focus==='hypertrophy'){const seed=recommendInitialMesocycleTarget(prescription,sessions);if(seed.seededFromHistory)return{target_sets:seed.sets,target_reps_min:seed.repsMin,target_reps_max:seed.repsMax,target_weight:seed.weight,rir:seed.rir}}
  const rec=recommendProgression(prescription,sessions,{experienceLevel:context.experienceLevel,isDeload:context.week===context.totalWeeks,mesoWeek:context.week,totalMesoWeeks:context.totalWeeks,programFocus:context.focus});
  if(rec.action==='FIRST_SESSION')return undefined;
  return{target_sets:rec.nextSets,target_reps_min:rec.nextRepsMin,target_reps_max:rec.nextRepsMax,target_weight:rec.nextWeight,rir:rec.nextRir};
}
