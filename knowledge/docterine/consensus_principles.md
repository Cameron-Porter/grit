# Consensus Principles: Rules Engine Classification

## 1. Safe to Hard-Code

These have definable thresholds, no meaningful individual variation in the direction of the constraint, and violations produce predictable harm.

**Progressive overload is structural**
Already partially expressed in `SLOT_ROLE_CONFIGS` via rep ranges. Should also be enforced structurally: the rules engine must never generate a program where week N+1 has lower target sets than week N unless it's a deload week. This isn't a suggestion — a program without a progression pathway isn't a program.

**1–3 RIR as the validity gate for "effective sets"**
The `rir` field in `ExerciseSlot` already encodes this. The constraint to enforce: no slot should be generated with `rir >= 4`. Sets at 4+ RIR don't count toward volume landmarks. If the engine generates junk, it's giving false confidence about weekly effective sets.

**SESSION_MAX_EXERCISES = 5, SESSION_MAX_SETS = 24**
Already implemented. The 3–5 sets/exercise ceiling maps directly to `SESSION_MAX_EXERCISES`. Diminishing returns past set 5 are consistent enough across the literature that this is a floor, not a preference.

**Weekly volume bounds as validation: MEV ~8 sets, MRV ~20 sets**
The validator already checks against `targetEffectiveSets`. The floor and ceiling are real biological thresholds — below MEV, no meaningful hypertrophy signal; above MRV, recovery deficit accumulates. These aren't user preferences.

**Per-muscle frequency ≥ 2×/week**
Already enforced in assignment. The evidence for 2× vs 1× is strong enough and the direction is consistent enough (2× always equals or beats 1×) that allowing once-per-week as a user choice introduces known harm with no countervailing benefit.

**Rep range validity bounds: repsMin ≥ 5, repsMax ≤ 30**
`SLOT_ROLE_CONFIGS` currently bottoms out at 5 for Primary.emphasize — good. The upper bound (30) should be a hard ceiling. Below 5 carries disproportionate CNS and connective tissue cost with equivalent hypertrophy; above 30 the set becomes a cardiovascular event, not a hypertrophy stimulus.

**Deload structure encoded into multi-week programs**
If `totalWeeks >= 4`, the last week of every 4-week block should be a deload (50% volume). This is structural, not optional. The knowledge base treats deload skipping as the primary cause of stalled progress in intermediate and advanced trainees. It should be auto-generated into the `ProgramDay` row structure as `is_deload: true`.

---

## 2. Recommendations Only (Soft Defaults)

Evidence-backed but with meaningful individual variation in degree, not direction. These should be defaults the user can override, not constraints.

**Default rep ranges within the 5–30 band**
The SLOT_ROLE_CONFIGS values (e.g. Primary.emphasize = 5–10) are well-reasoned defaults. But some users legitimately prefer 8–15 for the same slot. The band is a hard constraint; where defaults land within it is a recommendation. Expose these as editable in settings.

**Session duration target: 60–90 min warning, 120 min hard stop**
The 90-minute target should surface as a UI warning on generated programs that exceed it. The 120-minute cap can be a softer constraint (warn but allow). Different schedules and recovery capacities make this a range, not a cliff.

**Deload cycle length: every 4 weeks as default**
The range is 4–8 weeks. Four weeks suits intermediate+ trainees running near-MRV. Eight weeks is appropriate for beginners or someone running conservative volumes. Default to 4, let the user extend.

**Deload depth: 50% volume cut as default**
Files specify 50–70%. Fifty percent is the correct default; some users need a shallower deload (joint recovery vs. volume retention). Not all deloads serve the same purpose.

**Double progression as the default advancement model**
+1 rep/week then reset weight is the cleanest model for intermediate lifters. But micro-loading (1.25 lb jumps) is correct for advanced isolation work. These are sensible defaults, not universal laws — the progression model should be settable per-slot type.

---

## 3. Requires User-Specific Adaptation

These can't be determined at program-generation time without user history, experience level, or feedback. The rules engine should accept them as inputs, not infer them.

**Starting volume within the 10–20 set band**
Where a user begins — closer to MEV (10) or MAV (16) — depends on training age, recovery capacity, and individual muscle response. Beginners should start near MEV. Advanced lifters chasing a priority muscle start near MAV. This is already partially encoded via `musclePriorities`, but the absolute set counts should scale with an `experienceLevel` input that doesn't exist yet.

**Exercise order within a session**
Compounds-first is correct for beginners (neural learning, energy). Pre-exhaust is valid for advanced lifters with joint considerations. The session template order in `sessionTemplates.ts` currently uses a fixed compound-then-isolation order. This should be toggleable based on experience level, not assumed.

**Rep range preference by muscle and joint tolerance**
The delt disagreement in the knowledge base — heavy 5–8 vs. higher 10–25 — is unresolved because it's individual. Some users tolerate heavy overhead pressing; others experience shoulder impingement. An `injuryFlags` or `jointSensitivity` field on the user profile should gate whether heavy rep ranges are generated for specific muscles.

**RIR estimation fidelity**
Beginners track by bar speed (can't accurately self-report RIR). Intermediate lifters can estimate within ~2 reps. Advanced within ~1. The experience tier should change how RIR is communicated in the UI — beginners shouldn't see "RIR 2" cold; they should see "stop when the bar slows noticeably."

**MRV ceiling per muscle**
The knowledge base flags this explicitly: the difference between 15 and 35 sets as someone's MRV for a prioritized muscle is unknown at program-generation time. The engine should start at MEV and track recovery markers over weeks, then allow progressive increase — not try to predict MRV upfront.

---

## 4. AI Coaching (Not Deterministic Rules)

These involve interpreting subjective feedback, emergent patterns, and judgment calls that deterministic thresholds can't handle without producing false positives.

**Exercise SFR assessment**
Whether a given movement produces stimulus vs. fatigue for a specific user is only knowable from logged feedback — did they get a pump? DOMS in the right place? Did the target muscle fail first? The rules engine can provide the exercise list (`getApprovedExercises`), but deciding when to swap Barbell Bench Press for Deficit Push-Ups because the user's pec never gets sore requires longitudinal session data and pattern recognition. This is the Gemini layer's job.

**Deload trigger (early deload from performance decline)**
The "2 consecutive bad sessions" rule sounds deterministic but isn't — it requires distinguishing between accumulated training fatigue, sleep deprivation, dietary deficit, illness, and psychological state. A rule that fires every time two workouts underperform will false-positive constantly. The AI should weigh context before recommending an early deload.

**Volume tolerance calibration over time**
The literature is explicit: start at MEV, add 1–2 sets per week until recovery markers decline. The detection of recovery marker decline — persistent joint ache, plateau in performance, declining motivation, poor sleep — can't be encoded as a threshold. It requires the AI to observe trends across sessions and make a judgment call about when the user has hit their MRV for the current block.

**Exercise rotation for accommodation**
When a movement stops producing gains — because the user has adapted to its specific loading pattern — the engine can't detect this from rep/weight data alone. A lifter who adds 1 rep every 3 weeks may be plateaued on the exercise, not globally undertrained. The AI should flag stagnation patterns and recommend exercise substitutions, not the rules engine.

**Post-failure technique prescription**
Whether to recommend myo-reps, partial reps, or straight sets to failure depends on: time available, accumulated fatigue that session, whether the user is in a build or maintain phase, and individual response to partials (flagged as highly variable in the knowledge base). A rule can't encode this without becoming a lookup table of every context permutation. The AI coaches this in-session.

**Adherence tradeoffs**
The principle that adherence beats perfect programming is a meta-principle that the AI must operationalize: if a user repeatedly skips Pull days or skips leg sessions, the AI should reshape the program toward what they'll actually do rather than enforce the theoretically optimal split. The rules engine can't observe skip patterns — that's a coaching function.

---

## Summary Table

| Principle | Classification | Rationale |
|---|---|---|
| Progressive overload structure | Hard-code | No program is valid without it |
| RIR 1–3 validity gate | Hard-code | Junk volume undermines all downstream targets |
| Session slot/set caps | Hard-code | Biological ceiling, consistent across literature |
| Weekly volume MEV/MRV bounds | Hard-code | Real thresholds, not preferences |
| Frequency ≥ 2×/week | Hard-code | 1× consistently inferior; no individual exception |
| Rep range 5–30 bounds | Hard-code | Below/above these, trade-off shifts against hypertrophy |
| Deload weeks in program structure | Hard-code | Structural necessity for sustained progress |
| Rep range defaults (within bounds) | Recommendation | Direction correct; exact values individual |
| Session duration targets | Recommendation | Soft ceiling, not a cliff |
| Deload depth/cycle length | Recommendation | Range is 4–8 weeks; individual fatigue varies |
| Double progression model | Recommendation | Best default; not universal |
| Starting volume within MEV–MAV | User adaptation | Scales with training age; unknown at gen time |
| Exercise order | User adaptation | Experience-level dependent |
| Rep range tolerance by muscle | User adaptation | Joint health / individual; delt conflict unresolved |
| RIR communication method | User adaptation | Beginner needs different cues than advanced |
| MRV ceiling per muscle | User adaptation | No predictive model exists; must be observed |
| Exercise SFR assessment | AI coaching | Only derivable from per-session logged feedback |
| Early deload trigger | AI coaching | Context-sensitive; false positives with a rule |
| Volume tolerance calibration | AI coaching | Recovery markers are subjective trend signals |
| Exercise rotation for accommodation | AI coaching | Stagnation detection requires longitudinal pattern |
| Post-failure technique timing | AI coaching | High individual variance; context-dependent |
| Adherence-based program reshaping | AI coaching | Requires skip pattern observation over time |
