import { classifyMovement, type MovementClass } from '@grit/data/movementClassMap';
import type { SelectOption } from '@/components/custom-select';

export type RecommendationCandidate = { id:string; name:string; muscleGroup:string|null; movementCategory?:string|null };
export type MuscleFeedbackTrend = { avgPump:number|null; avgJointPain:number|null };
export type MuscleFeedbackRow = { muscle_group:string; pump:string|null; joint_pain:string|null };
export type RecommendationContext = {
  muscleGroup?: string|null;
  originMovementClass?: MovementClass|null;
  feedbackTrend?: MuscleFeedbackTrend|null;
  limit?: number;
};

// Elevated-pain threshold on the 0(None)-3(Severe) scale below — Moderate or
// worse. Below this, a fresh (no-origin-exercise) recommendation defaults to
// one compound + one isolation pick for variety, per product direction: most
// training days for a muscle already run one of each.
const PAIN_ELEVATED_THRESHOLD = 2;
const PUMP_SCALE:Record<string,number> = { None:0, Low:1, Good:2, Excellent:3 };
const PAIN_SCALE:Record<string,number> = { None:0, Mild:1, Moderate:2, Severe:3 };

const byName = <T extends { name:string }>(a:T,b:T) => a.name.localeCompare(b.name);

// Picks up to `limit` (default 2) exercises to star at the top of a picker.
// Equipment preference is intentionally not re-applied here: every catalog
// passed into these pickers is already hard-filtered by preferred equipment
// upstream (see filterExercisesByEquipmentPreference call sites), so any
// candidate here already matches it.
export function recommendedExerciseIds(candidates:RecommendationCandidate[],context:RecommendationContext):string[] {
  const limit = context.limit ?? 2;
  let pool = candidates;
  if (context.muscleGroup) pool = pool.filter(candidate => candidate.muscleGroup === context.muscleGroup);
  if (pool.length === 0) return [];

  const classified = pool.map(candidate => ({ candidate, movementClass:classifyMovement(candidate.movementCategory) }));

  const desiredClasses:MovementClass[] = context.originMovementClass && context.originMovementClass !== 'unknown'
    ? [context.originMovementClass]
    : context.feedbackTrend?.avgJointPain != null && context.feedbackTrend.avgJointPain >= PAIN_ELEVATED_THRESHOLD
      ? ['isolation']
      : ['compound','isolation'];

  const chosen:RecommendationCandidate[] = [];
  const used = new Set<string>();
  // Round-robin through the desired classes (one pick per class per pass) so
  // a single desired class (matching a specific origin exercise) can still
  // fill every slot, while two desired classes (the no-origin default) land
  // one of each before repeating.
  for (let progress = true; chosen.length < limit && progress;) {
    progress = false;
    for (const movementClass of desiredClasses) {
      if (chosen.length >= limit) break;
      const match = classified.filter(entry => entry.movementClass === movementClass && !used.has(entry.candidate.id)).sort((a,b) => byName(a.candidate,b.candidate))[0];
      if (match) { chosen.push(match.candidate); used.add(match.candidate.id); progress = true; }
    }
  }
  if (chosen.length < limit) {
    for (const entry of [...classified].sort((a,b) => byName(a.candidate,b.candidate))) {
      if (chosen.length >= limit) break;
      if (used.has(entry.candidate.id)) continue;
      chosen.push(entry.candidate); used.add(entry.candidate.id);
    }
  }
  return chosen.map(candidate => candidate.id);
}

// Approximates a muscle's recent pump/joint-pain trend from workout_feedback,
// which is recorded per muscle group per session (not per exercise — see
// AGENTS.md/CLAUDE.md data-source notes). Used only to decide the compound
// vs. isolation balance for a fresh recommendation when there's no specific
// exercise being replaced; it can't rank between two exercises of the same
// movement class, since the underlying data doesn't distinguish them.
export function muscleFeedbackTrend(rows:MuscleFeedbackRow[],muscleGroup:string):MuscleFeedbackTrend {
  const relevant = rows.filter(row => row.muscle_group === muscleGroup);
  const pumpValues = relevant.map(row => row.pump !== null ? PUMP_SCALE[row.pump] : undefined).filter((value):value is number => value !== undefined);
  const painValues = relevant.map(row => row.joint_pain !== null ? PAIN_SCALE[row.joint_pain] : undefined).filter((value):value is number => value !== undefined);
  return {
    avgPump: pumpValues.length ? pumpValues.reduce((a,b) => a + b,0) / pumpValues.length : null,
    avgJointPain: painValues.length ? painValues.reduce((a,b) => a + b,0) / painValues.length : null,
  };
}

// Floats the recommended options (starred) to the top of an already-built
// option list, followed by a disabled divider, then everything else
// untouched. Works on the final SelectOption[] regardless of how its labels
// were assembled, so every picker can reuse it the same way.
export function withRecommendedOptions(options:SelectOption[],recommendedIds:string[],dividerLabel='All exercises'):SelectOption[] {
  if (recommendedIds.length === 0) return options;
  const recommendedSet = new Set(recommendedIds);
  const recommended = recommendedIds.map(id => options.find(option => option.value === id)).filter((option):option is SelectOption => Boolean(option));
  if (recommended.length === 0) return options;
  const rest = options.filter(option => !recommendedSet.has(option.value));
  return [
    ...recommended.map(option => ({ ...option,label:`★ ${option.label}` })),
    { value:'__recommended_divider__',label:`── ${dividerLabel} ──`,disabled:true },
    ...rest,
  ];
}
