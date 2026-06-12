# Highest ROI Improvements
Date: 2026-06-12
Baseline: 8 P0/P1 rules shipped (HV-001, HV-002, HV-004, HV-007, HV-008, HV-013, HV-019, HV-020)
Source: rule_adoption_plan.md, rule_candidate_updates.md, high_value_rule_candidates.md

---

## Framework

**ROI = (User Impact × Confidence) / Development Effort**

Given limited development time, prefer:
- Changes that affect every user over niche edge cases
- Engine changes that are a constant or threshold (1 sprint) over ones requiring new data models
- Coaching cues batched together (one metadata + UI pass)

---

## Classification

### Category A — Workout Generation (engine rules)
These change what gets prescribed — exercise selection, session structure, set distribution.

### Category B — Progression (engine rules)
These change how weight, reps, and RIR targets evolve week to week.

### Category C — Weekly Adaptation (engine rules)
These change how the app responds to fatigue signals, bad sessions, and intra-week patterns.

### Category D — Coaching Guidance (NOT in rules engine)
These improve technique and awareness but are not computable rules. Delivered as UI cues, pre-set checklists, or rest-timer prompts. Should never enter `progressionEngine.ts` or `validation.ts`.

---

## Top 10 Ranked by ROI

---

### #1 — RC-005: Fat Loss Session Hard Cap = 90 Minutes
**Category:** A — Workout Generation
**Source:** rule_candidate_updates.md (RC-005)
**Currently:** The app uses a flat 120-minute hard cap (RM-002) regardless of training phase. Under caloric restriction, sessions beyond 90 minutes produce disproportionate fatigue relative to stimulus — junk volume accumulates faster when recovery is already compressed.
**Change:** When `programFocus === 'cut'` or `trainingPhase === 'cut'`, drop the hard cap from 120 → 90 minutes in session-builder validation.
**Impact:** High — affects every user running a cut phase. One constant change.
**Confidence:** High — Strong Evidence, cited in `training_during_fat_loss.md`
**Effort:** 1/5 — one conditional in the session duration guard
**Why #1:** Highest impact-to-effort ratio in the entire backlog. Every cut-phase user is currently generating oversized sessions with no engine awareness of their recovery context.

---

### #2 — RC-006: RIR Floor Varies by Movement Type
**Category:** B — Progression
**Source:** rule_candidate_updates.md (RC-006)
**Currently:** `SLOT_ROLE_CONFIGS` applies a flat RIR target regardless of whether an exercise is a compound Primary or an isolation Accessory. A Romanian Deadlift and a Cable Curl receive the same RIR prescription.
**Change:** In `progressionEngine.ts`, after computing `base.nextRir`, apply a movement-type modifier:
- `exerciseType === 'compound'` (Primary): floor at `max(nextRir, 1)` — never prescribe 0 RIR on compounds (except deadlifts, already covered by HV-019)
- `exerciseType === 'isolation'` (Accessory): allow `nextRir = 0` for intermediate/advanced
**Impact:** Medium-High — changes the RIR prescription for every slot in every session. Compounds stay safer; isolation work gets pushed harder, matching doctrine.
**Confidence:** High — Strong Evidence across multiple files; RC-006 was pre-identified in rule_candidate_updates.md
**Effort:** 2/5 — a two-branch conditional after the existing taper logic (HV-001 already in place)
**Why #2:** Broad coverage (every working set), low complexity, and directly enforces a principle already in doctrine that the engine ignores.

---

### #3 — RC-008: 2-Session Confirmation Rule Before Early Deload
**Category:** C — Weekly Adaptation
**Source:** rule_candidate_updates.md (RC-008); doctrine_change_log.md (B-4)
**Currently:** Bad-session detection in `progressionEngine.ts` (`BAD_SESSION` action) can trigger a deload recommendation after a single session below threshold. This fires too aggressively — one bad sleep or one high-stress day looks the same as accumulated fatigue.
**Change:** Gate early deload triggers behind a 2-session confirmation: only fire `SUGGEST_DELOAD` when performance drops across two consecutive sessions at the same prescribed RIR. A single `BAD_SESSION` result becomes `MONITOR` instead of `SUGGEST_DELOAD`. Requires the engine to carry forward a `consecutiveBadSessions` counter (can be passed in `ProgressionContext` from session history).
**Impact:** Medium — directly affects user trust in the system. Premature deload recommendations are the single biggest source of "why is the app telling me to deload, I feel fine" frustration. Fixing this makes the system feel intelligent rather than conservative.
**Confidence:** High — Named as the "2-Session Confirmation Rule" in doctrine after B-4 update
**Effort:** 2/5 — counter in `ProgressionContext`, one guard condition in `BAD_SESSION` branch
**Why #3:** High trust payoff. Users who see incorrect deload prompts stop trusting the system. This is a retention-quality fix, not just a correctness fix.

---

### #4 — HV-010 + HV-009 + HV-011: Coaching Cue Batch (Calves, Traps, Hip Thrust Setup)
**Category:** D — Coaching Guidance (NOT in rules engine)
**Source:** high_value_rule_candidates.md (HV-009, HV-010, HV-011)
**Currently:** Exercise metadata has no technique cues. Users receive no setup or form guidance within the workout UI.
**Changes (batch together in one sprint):**
- **HV-010 (Calves):** Add to calf raise metadata: `techniqueCue: "Own the bottom stretch on every rep — slow eccentric into maximum stretch, pause 1s, controlled up. Do not bounce. Bouncing uses Achilles elastic rebound and bypasses the muscle."` Add a rest-timer prompt after the final set: "Hold the bottom position under load for 30 seconds."
- **HV-009 (Traps):** Add to shrug metadata: `techniqueCue: "Lean forward 15–30° to align resistance with upper trap fiber direction. Pure elevation — no shoulder roll at lockout."` Add `injuryRisk: "AC joint impingement from shoulder rolling."`
- **HV-011 (Hip Thrust):** Add pre-set checklist when hip thrust is the first working set: "Bench below scapulae · Pad centered on hips · Chin tucked · Aim for vertical shin at lockout."
**Impact:** Medium-High — calves and traps are the two most commonly trained-incorrectly muscle groups. Most users who "can't feel their calves" are bouncing. These cues fix the problem directly.
**Confidence:** High — Strong Evidence on all three; anatomically direct mechanisms
**Effort:** 1/5 per cue — pure metadata + one UI surface (technique cue card in ExerciseCard, and rest timer prompt)
**Why #4:** Zero engine risk. Pure content additions. Batching all three into one metadata + UI pass makes this the highest-yield single sprint in the coaching layer.

---

### #5 — RC-001: Per-Session Per-Muscle Volume Cap (Soft Warning at 8 Sets)
**Category:** A — Workout Generation
**Source:** rule_candidate_updates.md (RC-001)
**Currently:** VA-005 (24 total session sets) and VA-006 (5 sets per exercise) are enforced, but neither catches the case where 3 exercises × 3 sets = 9 sets targeting the same muscle in one session. Per-session muscle protein synthesis saturates at ~6–8 direct sets; the 9th set produces diminishing returns better distributed to a second weekly session.
**Change:** In the post-generation validation layer, add a per-muscle set counter. When `muscle.setsThisSession > 8`, push a `'proportionality'` warning: "9+ sets for [Muscle] in one session — consider splitting across two sessions for better weekly stimulus distribution." Soft warning only — not a hard block.
**Impact:** Medium — catches a real structural flaw the user may not notice, particularly for chest/back-dominant programs.
**Confidence:** Medium (Strong Evidence in one source; threshold between 6 and 8 not fully settled)
**Effort:** 2/5 — per-muscle counter in existing validation pass; `weeklyEffectiveSets` already tracked
**Why #5:** Catches a specific failure mode that VA-005 and VA-006 both miss. Uses already-built validation infrastructure from this sprint.

---

### #6 — RC-003: Lengthened-Position Partials as a Progression Method
**Category:** B — Progression
**Source:** rule_candidate_updates.md (RC-003); doctrine_change_log.md (A-1)
**Currently:** When a user hits a load ceiling (equipment cap) or fails to progress for 2+ sessions, the engine has no tool between "hold weight" and "deload." The progression toolkit is: linear → double → hold → deload. There is no intermediate option.
**Change:** Add `'LENGTHENED_PARTIALS'` as a progression action in `progressionEngine.ts`. Trigger when: `rec.action === 'HOLD'` AND `user.experienceLevel !== 'beginner'` AND `slot.role === 'Accessory'`. Surface as a workout-UI cue after the final set: "Hit the rep ceiling — add 3–5 partial reps at the bottom of the ROM to extend the stimulus without adding weight."
**Impact:** Medium — unlocks a real progression option that advanced users already use informally. The engine currently has a dead end between HOLD and DELOAD.
**Confidence:** High — Strong Evidence (2026 IJES study, multiple files); already added to doctrine (A-1)
**Effort:** 2/5 — one new action enum value, one trigger condition, one UI cue
**Why #6:** Fills a real gap in the progression toolkit. Currently the engine gets "stuck" when load can't increase — this gives it an intermediate step before recommending a deload.

---

### #7 — RC-004: HIT / Min-Max as an Advanced Program Modality
**Category:** B — Progression
**Source:** rule_candidate_updates.md (RC-004)
**Currently:** The engine assumes a standard multi-set submaximal approach. There is no way to build a 1–2 set-to-absolute-failure program for advanced users who want time efficiency. The HIT/Min-Max approach is validated as producing equivalent hypertrophy to 3–4 submaximal sets for this population.
**Change:** Add `'hit'` to `ProgramFocus` type alongside existing `'hypertrophy' | 'strength' | ...`. When `programFocus === 'hit'`:
- Sets floor drops to 1 (from 3)
- RIR target = 0 for all working sets
- Gate: `user.experienceLevel === 'advanced'` only — reject with warning otherwise
- Flag when total weekly volume falls below MEV despite high intensity
**Impact:** High for advanced users — entire program architecture change. Currently impossible.
**Confidence:** High — Strong Evidence; `hit_min_max.md`
**Effort:** 3/5 — new ProgramFocus type, conditional in set-floor logic, RIR override, MEV check
**Why #7:** Opens a new program archetype for the most engaged (advanced) users who currently have no time-efficient option. High loyalty signal — if the app can build their HIT programs, they won't leave.

---

### #8 — HV-016: Sumo Deadlift Default for Users with Lumbar History
**Category:** A — Workout Generation (Exercise Selection)
**Source:** high_value_rule_candidates.md (HV-016)
**Currently:** No exercise selection logic is personalized to injury history. A user with a herniated disc and a healthy user both receive the same conventional deadlift prescription.
**Change:** Add `injuryHistory?: { lumbar?: boolean }` to the user/profile model (one new field in `useProfileStore` + Supabase `profiles` table). When `injuryHistory.lumbar === true`, add a priority weight to sumo deadlift and trap bar deadlift in the hinge-pattern exercise selection. Also surface as an onboarding question: "Do you have a history of lower back pain? (affects exercise recommendations)."
**Impact:** Medium — affects a meaningful subset of users (lower back issues are extremely common). Safety-relevant.
**Confidence:** High — Strong Evidence (sumo significantly reduces lumbar shear force vs. conventional)
**Effort:** 2/5 once user model is extended — the exercise priority scoring change is trivial; the cost is the user model field + onboarding question
**Why #8:** Safety + personalization in one feature. The user model extension (`injuryHistory`) unlocks a whole class of future personalization (elbow history → no skull crushers, shoulder history → no overhead press) so the infrastructure investment has compound returns.

---

### #9 — RC-002: Exercise Count Guided by Set Count
**Category:** A — Workout Generation
**Source:** rule_candidate_updates.md (RC-002)
**Currently:** The session builder distributes sets across exercises without checking if the number of exercises makes sense for the total set volume. A user with 5 back sets could have them spread across 3 exercises (too much warm-up overhead per exercise) or concentrated in 1 exercise repeated 5 times (no angle variety).
**Change:** In the slot-assignment step, after total sets per muscle are determined, apply: `≤7 sets for a muscle → 1 exercise; 8–12 sets → 2–3 exercises`. If `muscle.setsThisSession ≥ 8` and `muscle.exerciseCountThisSession === 1`, add a second exercise before distributing remaining sets.
**Impact:** Medium — improves program structure for high-volume muscle groups. Particularly relevant for back and legs where variety of angle matters.
**Confidence:** Medium — Expert opinion / coaching best practice; strong mechanistic logic
**Effort:** 2/5 — slot assignment step modification; uses already-tracked `setsThisSession` values
**Why #9:** Prevents a structural flaw in high-volume programs that no current rule catches. Pairs naturally with HV-002 (proportionality audit) already shipped.

---

### #10 — HV-014: Explosive Concentric Tempo Coaching Cue
**Category:** D — Coaching Guidance (NOT in rules engine)
**Source:** high_value_rule_candidates.md (HV-014)
**Currently:** Set instructions default to "controlled lowering" with no concentric guidance. Users implicitly perform controlled concentrics, which reduces total mechanical output without adding hypertrophic benefit.
**Change:** Update default tempo cue in set instructions from implied "controlled" to explicit: "3s down / press as fast as form allows." Add `concentricTempo: 'explosive'` to intermediate/advanced slot prescriptions. Surface in ExerciseCard as a two-part tempo instruction. Gate: beginner users keep a neutral controlled cue until they have ≥6 months logged.
**Impact:** Medium — changes the quality of every working set for intermediate/advanced users. Mechanical output within sets directly drives adaptation.
**Confidence:** Medium — Moderate Evidence (consistent across 2 files; mechanistically coherent with motor unit recruitment)
**Effort:** 2/5 — tempo metadata field + ExerciseCard UI update; no rules engine changes
**Why #10:** Every workout, every set, every intermediate/advanced user. The breadth is unmatched by any single-muscle or edge-case rule. Low engine risk since it's a coaching cue, not a computable constraint.

---

## Summary Table

| Rank | ID | Description | Category | Impact | Effort | ROI |
|---|---|---|---|---|---|---|
| 1 | RC-005 | Fat loss session cap = 90 min | Generation | High | 1 | ★★★★★ |
| 2 | RC-006 | RIR floor by movement type | Progression | Med-High | 2 | ★★★★★ |
| 3 | RC-008 | 2-Session deload confirmation | Adaptation | Med | 2 | ★★★★ |
| 4 | HV-009/010/011 | Coaching cue batch | Coaching | Med-High | 1 | ★★★★★ |
| 5 | RC-001 | Per-muscle session cap | Generation | Med | 2 | ★★★★ |
| 6 | RC-003 | Lengthened partials | Progression | Med | 2 | ★★★★ |
| 7 | RC-004 | HIT/Min-Max modality | Progression | High | 3 | ★★★ |
| 8 | HV-016 | Sumo for lumbar history | Generation | Med | 2* | ★★★★ |
| 9 | RC-002 | Exercise count by sets | Generation | Med | 2 | ★★★ |
| 10 | HV-014 | Explosive concentric cue | Coaching | Med | 2 | ★★★ |

*HV-016 effort = 2 after `injuryHistory` user model field is added (which itself is a 1-point task)

---

## Implementation Batching Recommendation

**Sprint 1 (1–2 days):** #1 + #2 + #3 — all touch `progressionEngine.ts` and validation; share a review cycle. Highest combined ROI.

**Sprint 2 (1 day):** #4 coaching cue batch — pure metadata + ExerciseCard UI. Zero engine risk. Ship independently.

**Sprint 3 (2–3 days):** #5 + #6 + #9 — all touch the validation/slot-builder layer; share infrastructure from the HV-002/HV-004 batch already shipped.

**Sprint 4 (3 days):** #7 — new ProgramFocus type; largest scope item; do after engine is stable from Sprint 1–3.

**Sprint 5 (2 days):** #8 — user model + exercise selection; depends on `injuryHistory` field.

**Sprint 6 (1 day):** #10 — coaching cue + ExerciseCard tempo display.

---

## What Does NOT Belong in the Rules Engine

These remain coaching guidance permanently — they cannot be computed or enforced:

- **HV-009** (trap shrug lean): No sensor to detect torso angle
- **HV-010** (calf bounce detection): No sensor to detect elastic rebound
- **HV-011** (hip thrust foot placement): No sensor to detect shin angle
- **HV-014** (explosive concentric): Tempo is a cue, not a measurable outcome
- **HV-015** (inter-set stretching): Opt-in behavioral choice, not a prescription
- **HV-017** (feeder sets): Warm-up structure is user-controlled
- **HV-006** (bicep long-head tip): Moderate evidence only; soft tip not a hard constraint
