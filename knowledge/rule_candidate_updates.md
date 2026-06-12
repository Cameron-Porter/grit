# Rule Candidate Updates
Date: 2026-06-12
Source: knowledge/doctrine/ (post doctrine_change_log.md updates)

## Summary
- Existing Rules confirmed: 22
- New Rule Candidates identified: 12
- Coaching Guidance items: 11
- Informational Only items: 9

---

## New Rule Candidates

### RC-001 — Per-Session Per-Muscle Volume Cap (6–8 Sets)
**Principle:** Muscle protein synthesis per session appears to saturate at approximately 6–8 sets targeting the same muscle; sets beyond this within a single session yield diminishing returns regardless of exercise variety and are better distributed to a second session that week.
**Implementation recommendation:** In the session-builder / volume-budget logic (`src/api/progression.ts` or wherever session slots are assembled), add a per-muscle set counter. When `muscle.setsThisSession >= 8`, block further slot assignment for that muscle and flag `PER_MUSCLE_SESSION_CAP_REACHED`. This is distinct from the per-exercise cap (VA-006, 5 sets) and the total session cap (VA-005, 24 sets). The new guard is: `for each muscle in session: if direct sets > 8 → warn and trim or defer to second session`. Note: this is the A-8 addition deferred in E-1 with "soft guideline" status — implement as a warning flag, not a hard block, until evidence on exact threshold (6 vs. 8) matures.
**Confidence:** Medium (Strong Evidence in one source file; threshold not yet settled across multiple files)
**Expected impact:** Medium — prevents edge case where 3 exercises × 3 sets = 9 sets for one muscle slip through VA-005/VA-006 without triggering either cap
**Source doctrine:** hypertrophy.md (Volume rules, A-8 addition); doctrine_change_log.md A-8

---

### RC-002 — Volume Distribution: Exercise Count by Set Count
**Principle:** When 5–7 sets are planned for a muscle in a session, use one exercise; when 7–12 sets are planned, use two to three exercises. This prevents both over-variety (excessive warm-up overhead) and under-variety (identical angle repeated every set).
**Implementation recommendation:** In the slot-assignment step of the session generator, after total sets per muscle are determined for the session, apply this mapping before distributing sets across exercises: `sets <= 7 → 1 exercise; 8–12 → 2–3 exercises`. If the generator currently just fills exercises up to the 5-set-per-exercise cap without checking for minimum exercise variety, this rule adds a floor. Concretely: if `muscle.setsThisSession >= 8` and `muscle.exerciseCountThisSession === 1`, add a second exercise before distributing remaining sets. Implementation file: wherever session slot templates are assembled (likely `src/api/workoutTemplates.ts` or equivalent session-builder).
**Confidence:** Medium (expert opinion / coaching best practice from exercise_selection_for_muscle_growth.md)
**Expected impact:** Medium — changes exercise slot count for high-volume muscles, affecting variety and stimulus angle in generated sessions
**Source doctrine:** hypertrophy.md (Volume rules, A-11 addition); doctrine_change_log.md A-11

---

### RC-003 — Lengthened-Position Partials as Valid Progression Method
**Principle:** After reaching full-ROM failure on an isolation exercise (intermediate/advanced only), adding lengthened-position partial reps in the stretched portion of the ROM is a valid intensity extension that produces near-equivalent hypertrophy to full ROM at matched volume — it is not a ROM shortcut.
**Implementation recommendation:** Add `'LENGTHENED_PARTIALS'` as a progression method option in `progressionEngine.ts`, available when: `user.experienceLevel !== 'beginner'` AND `slot.role === 'Accessory'` AND `progression.loadIncreaseBlocked === true` (equipment cap) OR as an optional set-extension cue at the end of the final working set. This sits in the progression toolkit alongside `ECCENTRIC_TEMPO` (PR-006). The UI should surface it as: "Hit failure — add 3–5 partial reps at the bottom of the ROM to extend the set." Do NOT apply to compound Primary slots (injury risk at failure with heavy loads). Do NOT present to beginners.
**Confidence:** High (Strong Evidence from 2026 IJES study; multiple corroborating files)
**Expected impact:** Medium — expands the progression toolkit for experienced lifters on isolation exercises, particularly when load is capped
**Source doctrine:** exercise_selection.md (Outdated Guidance qualification, C-1/C-2); progression.md (Progression Methods table, A-1 addition); doctrine_change_log.md A-1

---

### RC-004 — HIT / Min-Max: 1–2 Sets to Absolute Failure (Advanced Only)
**Principle:** For advanced lifters, 1–2 sets taken to absolute failure (0 RIR) produce equivalent hypertrophy to 3–4 submaximal (1–2 RIR) sets — this is a valid inverse volume-intensity trade-off for time-constrained sessions.
**Implementation recommendation:** In `progressionEngine.ts`, add a `'hit'` option to `ProgramFocus` (alongside existing `'hypertrophy' | 'strength' | 'powerbuilding'`). When `programFocus === 'hit'`: (a) set `slot.sets` floor to 1 instead of 3; (b) set `slot.rir` to 0 for all working sets; (c) gate this option behind `user.experienceLevel === 'advanced'` — reject or warn if applied to beginners or intermediates. The session-builder should also note that HIT sessions may conflict with FA-001 (2× minimum frequency) when sets per session are so low — flag if total weekly volume falls below MEV despite high intensity. This is separate from AD-002 (minimum effective dose during disruption), which is a temporary measure, not a full program modality.
**Confidence:** High (Strong Evidence; hit_min_max.md, hit_min_max.json)
**Expected impact:** High — changes prescribed set counts and RIR targets, fundamentally altering workout output for advanced users who select this modality
**Source doctrine:** foundational_beliefs.md R-01 (C-3 qualification); progression.md (Outdated Guidance exception note, A-2 addition); doctrine_change_log.md A-2

---

### RC-005 — Fat Loss Session Duration: 90-Minute Hard Cap
**Principle:** During a caloric deficit (trainingPhase = 'cut'), the effective session hard cap drops from 120 minutes to 90 minutes — sessions beyond 90 minutes under caloric restriction accumulate disproportionate fatigue and degrade into junk volume.
**Implementation recommendation:** In RM-002 (session duration rule), add a phase-conditional branch: `if (user.trainingPhase === 'cut' && session.estimatedMinutes > 90) → FLAG SESSION_DURATION_EXCEEDED_CUT and trim`. Currently RM-002 warns at 90 min and hard-caps at 120 min regardless of phase. Add a pre-check: if `trainingPhase === 'cut'`, treat 90 min as the hard cap (not just the warning threshold). In `progressionEngine.ts`, this is surfaced via `ProgressionContext.trainingPhase === 'cut'` — the session builder can check estimated duration before returning a session and trim lowest-priority slots. Also update AD-001 (session length hard cap) to accept a `phase`-dependent cap value.
**Confidence:** Medium (Moderate Evidence; training_during_fat_loss.md)
**Expected impact:** High — directly shortens sessions and trims slots for users in a cut phase, changing what gets prescribed
**Source doctrine:** hypertrophy.md (Session Duration, B-9 addition); recovery.md (Fat Loss modifications, B-9 addition); doctrine_change_log.md B-9

---

### RC-006 — Isolation Exercise RIR Target: 0–1 vs. Compound 1–2
**Principle:** RIR target should be adjusted by movement type — use lower RIR (0–1) on stable isolation exercises where form-breakdown risk is low; use higher RIR (1–2) on high-skill compound movements where form breakdown risk is significant.
**Implementation recommendation:** In the slot-prescription logic and `progressionEngine.ts`, add a `rirByMovementType` modifier: if `slot.role === 'Accessory' && exerciseType === 'isolation'` → allow `slot.rir = 0–1`; if `slot.role === 'Primary' && (exerciseType === 'barbell-compound' || exerciseType === 'dumbbell-compound')` → floor `slot.rir` at 1 (never prescribe 0 RIR on compounds for non-advanced users). Currently `SLOT_ROLE_CONFIGS` likely applies a flat RIR across role tiers. This adds a per-exercise-type modifier on top of the role-based default. Beginner guard: beginners should never be prescribed RIR 0 on any exercise (sandbagging risk; AMRAP calibration first per B-3).
**Confidence:** Medium (new addition B-3; sources: rir_intensity_autoregulation.md, training_intensity_failure_management.md)
**Expected impact:** Medium — changes RIR prescriptions for advanced users on isolations; adds a safety floor for compound movements
**Source doctrine:** hypertrophy.md (Intensity rules, B-3 addition); doctrine_change_log.md B-3

---

### RC-007 — Shoulders Require All Three Planes (Slot Assignment Validation)
**Principle:** Complete deltoid development requires training in all three planes: abduction (lateral delt — cable lateral raise), overhead press (anterior delt), and transverse plane (rear delt fly). No single exercise covers all segments. A shoulder-inclusive program that lacks any of these three plane types has a structural gap.
**Implementation recommendation:** Add a shoulder-specific movement balance validator (analogous to EO-005 push/pull/hinge/squat balance). When `muscle.id === 'Shoulders'` is present in a weekly program, check that at least one slot covers each plane: (a) `movementCategory === 'Vertical Press'` (anterior/OHP), (b) `movementCategory === 'Vertical Press' && exerciseTag === 'lateral-raise'` or equivalent abduction tag (lateral delt), (c) `movementCategory === 'Horizontal Pull' && exerciseTag === 'rear-delt'` (transverse/posterior delt). If any plane is absent, flag `SHOULDER_PLANE_COVERAGE_INCOMPLETE`. Exercise taxonomy needs `exerciseTag` or similar field to distinguish lateral raises from OHP within the same movement category. Implementation files: session-builder / exercise-selection validator, and `exercise_taxonomy.md`-derived exercise metadata.
**Confidence:** High (Strong Evidence; building_delts_hypertrophy.md, lateral_raise_biomechanics.md)
**Expected impact:** Medium — changes exercise selection for shoulder-emphasis programs by requiring abduction-plane and rear-delt coverage even when the user has only specified "shoulders"
**Source doctrine:** exercise_selection.md (Shoulders section, A-4 addition); doctrine_change_log.md A-4

---

### RC-008 — Seated Leg Curl Preferred Over Lying Leg Curl
**Principle:** When assigning a hamstring isolation slot, the seated leg curl is the preferred exercise over the lying leg curl because the seated position trains the hamstring at a longer overall muscle length (hip flexion adds to knee extension stretch simultaneously).
**Implementation recommendation:** In the exercise selection logic (wherever `getApprovedExercises` or equivalent filters exercises for a slot), add a preference score or sort weight to the seated leg curl: `if (exercise.name === 'Seated Leg Curl') exercise.selectionPriority += 1` (or equivalent within the approved list ranking). The exercise taxonomy already marks it with `★ Preferred`. This preference should apply when both seated and lying leg curl are available (i.e., equipment permits both). Do not remove lying leg curl from the list — it remains acceptable when seated is unavailable. This is a soft preference rule, not a hard filter.
**Confidence:** High (Strong Evidence; stretch_mediated_hypertrophy.md)
**Expected impact:** Low — changes which hamstring isolation is selected by default; does not affect volume, load, or set count
**Source doctrine:** exercise_selection.md (Hamstrings section, A-6 addition); exercise_taxonomy.md (Hip Hinge section, A-6 addition); doctrine_change_log.md A-6

---

### RC-009 — Leg Extension: Lean-Back Positioning for Rectus Femoris
**Principle:** For the leg extension exercise, prescribing a slight seat lean-back places the hip in extension, stretching the rectus femoris at both the hip and knee simultaneously — producing superior rectus femoris stimulus compared to upright seated positioning.
**Implementation recommendation:** Add an exercise-level technique cue flag to the leg extension entry in the exercise database/taxonomy: `techniqueCue: "Lean seat back slightly to stretch rectus femoris at hip. Do not sit fully upright."`. This cue should surface in the workout UI when leg extension is in a slot. No changes to volume, sets, or rep ranges are needed — this is purely a technique-delivery item. However, it should be implemented as a hard-coded cue (not just coaching text) since it represents Strong Evidence for a specific exercise variant. Implementation: exercise metadata field in whatever powers the exercise detail view.
**Confidence:** High (Strong Evidence; stretch_mediated_hypertrophy.md)
**Expected impact:** Low — does not change program structure; affects stimulus quality for users on leg extensions
**Source doctrine:** exercise_taxonomy.md (Quad Dominant key cue, A-7 addition); doctrine_change_log.md A-7

---

### RC-010 — Asymmetrical A/B Split: Differentiate 2x/Week Sessions
**Principle:** For intermediate and advanced lifters training a muscle 2×/week, the two sessions should differ by angle, exercise, or load emphasis (e.g., Chest-focused Push A vs. Delt-focused Push B). Identical repeated sessions underutilize the dual-frequency structure.
**Implementation recommendation:** In the program generator, when a muscle appears in two sessions per week and `user.experienceLevel !== 'beginner'`, enforce that the two sessions do not share identical Primary-slot exercise selections. Specifically: `if session_A.primaryExercise[muscle] === session_B.primaryExercise[muscle] → select an alternative exercise from the approved list for one of the sessions, differing in angle or movement category`. For push days this means one session emphasizes a horizontal press and the other a vertical press (or incline variant). The program generator should track `exerciseAngle` or use `movementCategory` to enforce differentiation. This is intermediate/advanced only — beginners should use identical sessions for technique consistency (doctrine explicitly states this).
**Confidence:** High (Strong Evidence for angle/region targeting; asymmetrical_ppl_splits.md, pull_day_architecture.md)
**Expected impact:** Medium — changes exercise selection for the second weekly session of the same muscle group for intermediate/advanced users
**Source doctrine:** progression.md (Asymmetrical A/B Split section, A-9 addition); doctrine_change_log.md A-9

---

### RC-011 — Beginner Rep Range: Default Isolations to 8–12, Not 5–10
**Principle:** For beginners, isolation work should default to the 8–12 rep range rather than the 5–10 range, as multiple sources recommend 8–12 for better technique acquisition and reduced discomfort at the beginner stage.
**Implementation recommendation:** In `progressionEngine.ts`, `getLoadIncrement`, and the slot-prescription defaults (`SLOT_ROLE_CONFIGS` or equivalent): when `user.experienceLevel === 'beginner'` AND `slot.role === 'Accessory'`, apply `slot.repsMin = 8, slot.repsMax = 12` rather than deriving from the standard 5–10 compound range. Currently `progressionEngine.ts` uses `effectiveRepsMin = isCut ? Math.max(prescription.repsMin, 8) : prescription.repsMin` — the underlying `prescription.repsMin` for beginner isolation slots should already be 8, not 5. This is a config-level change to `SLOT_ROLE_CONFIGS` for the beginner × Accessory combination. Also update the beginner progression section comments in the engine to note the 8–12 default rationale.
**Confidence:** Medium (C-4 qualification; sources: science_rep_ranges.md, foundational_strength_training.md)
**Expected impact:** Medium — changes the rep range for beginner accessory slots, reducing injury risk from heavy isolation loading
**Source doctrine:** progression.md (Beginner section, C-4 qualification); doctrine_change_log.md C-4

---

### RC-012 — Posterior Chain Volume Parity Validation
**Principle:** Weekly effective sets for posterior chain muscles (back, hamstrings, rear delts) should meet or exceed the corresponding anterior chain muscles (chest, quads, front delts). An imbalance — anterior > posterior — is a structural flaw that increases injury risk and produces movement dysfunction.
**Implementation recommendation:** Add an end-of-week (or program-generation-time) validation check: compare `muscle['Back'].weeklyEffectiveSets >= muscle['Chest'].weeklyEffectiveSets` and `muscle['Hamstrings'].weeklyEffectiveSets >= muscle['Quads'].weeklyEffectiveSets * 0.7` (hamstrings naturally receive some quad-session overlap; 70% threshold is practical). If either condition fails, flag `POSTERIOR_CHAIN_IMBALANCE` and recommend adding back or hamstring volume. This is an extension of EO-005 (movement balance) but operates at the weekly effective-sets level rather than the movement-category presence level. Implementation: post-generation validation step in the program builder, similar to existing MEV/MRV checks.
**Confidence:** High (consistent across multiple files; specifically flagged in foundational_beliefs.md I-06)
**Expected impact:** Medium — may cause the program generator to add back/hamstring sessions for aesthetics-focused users who under-program posterior chain
**Source doctrine:** foundational_beliefs.md I-06; exercise_selection.md (movement balance); exercise_taxonomy.md (Push/Pull/Hinge/Squat balance table)

---

## Coaching Guidance Items

### CG-001 — The 2-Session Confirmation Rule (Named Heuristic)
**Guidance:** When a user reports a bad session, surface a coaching note: "One bad session is just data — poor sleep, stress, or nutrition can cause this. We'll watch the next session. If it happens again, we'll deload." Only trigger a deload after two consecutive bad sessions, never after one.
**Source doctrine:** recovery.md (Deload Scheduling, B-4 named heuristic); doctrine_change_log.md B-4

---

### CG-002 — The Braking Rule (Named Heuristic)
**Guidance:** When a deload is triggered, surface the coaching note: "Hit the brakes hard. A deload that still feels like training doesn't clear fatigue — it just slows the accumulation. This week should feel almost embarrassingly easy by day 5."
**Source doctrine:** recovery.md (Deload Execution Standards, B-4 named heuristic); doctrine_change_log.md B-4

---

### CG-003 — Lateral Raise Technique: Neutral Wrist, Scapular Plane, Stop at Shoulder Height
**Guidance:** When a lateral raise exercise is in an active slot, surface three technique cues: (1) "Keep wrist neutral — do not tilt the thumb down ('pour the pitcher')." (2) "Raise in the scapular plane — 15–30° forward of directly to the side." (3) "Stop at shoulder height — raising higher shifts load to the traps and narrows the shoulder joint." These are injury prevention cues with Strong Evidence backing.
**Source doctrine:** exercise_selection.md (Shoulders section, A-5 addition); doctrine_change_log.md A-5

---

### CG-004 — Cable Lateral Raises Preferred Over Dumbbell
**Guidance:** In the exercise picker, when a user selects lateral raise and both cable and dumbbell options are available, surface: "Cable lateral raises are recommended — dumbbells provide no tension at the bottom (the most productive part of the movement). Cables maintain constant tension throughout the full range."
**Source doctrine:** exercise_selection.md (Shoulders section, B-7 addition); doctrine_change_log.md B-7

---

### CG-005 — Beginner Sandbagging Detection
**Guidance:** For beginner users in the first 4–8 weeks, surface an effort calibration prompt after each isolation set: "Could you have done 5+ more reps? If yes, the set didn't count as real work. Try an AMRAP set on this exercise to calibrate what true near-failure feels like." This addresses the systematic beginner error of self-reporting RIR 2 when actual RIR is 8+.
**Source doctrine:** hypertrophy.md (Intensity rules, B-3 addition); foundational_beliefs.md C-06; doctrine_change_log.md B-3

---

### CG-006 — Strength Plateau Coaching: Technique First
**Guidance:** When a strength-focused user hits a plateau (PLATEAU_DELOAD or STALL trigger fires), surface a coaching note before suggesting load reduction: "Before reducing weight — is the technique exactly the same on rep 1 and rep 5? Strength plateaus are often technique problems, not muscle problems. Consider filming a set before making changes."
**Source doctrine:** strength.md (Core Principle 1, A-12 strengthening); doctrine_change_log.md A-12

---

### CG-007 — Adherence Is Primary: If You Dread It, Change It
**Guidance:** When a user has low session completion rates (AD-004 CONSECUTIVE_SESSIONS_MISSED fires, or overall completion < 85% over a 4-week block), surface: "A program you dread is objectively the wrong program, regardless of how well-designed it is. Let's adjust — what's making this hard to show up for?" This is not willpower coaching; it is program-change prompting.
**Source doctrine:** mindset.md (The Role of Enjoyment, B-6 strengthening); doctrine_change_log.md B-6

---

### CG-008 — Protein Timing Window (Post-Workout)
**Guidance:** In the post-workout summary screen, surface a recovery tip: "Aim to get 30–50g of protein within 2 hours of training. Daily totals matter most, but this window has an anti-catabolic effect — don't leave it open unnecessarily." (Do not present this as a hard requirement — Moderate Evidence only.)
**Source doctrine:** recovery.md (Nutrition for Recovery, A-3 strengthening); doctrine_change_log.md A-3

---

### CG-009 — Protein Target Range for Hypertrophy
**Guidance:** In onboarding or nutrition settings, surface the target: "For muscle growth, aim for 0.7–1.0g of protein per pound of bodyweight daily (roughly 1.6–2.2g/kg). During a cut, stay at the higher end (1.0g/lb) to protect muscle."
**Source doctrine:** recovery.md (Nutrition for Recovery, A-3 strengthening); doctrine_change_log.md A-3

---

### CG-010 — Drop Sets and Myo-Reps: Time-Efficient Advanced Options
**Guidance:** For intermediate/advanced users in time-constrained sessions (AD-002 fires), surface: "Short on time? Drop sets and myo-reps on isolation exercises can match the muscle growth of traditional straight sets in less time. Not for beginners — requires knowing your true failure point." Link to exercise-level guidance when these techniques are relevant.
**Source doctrine:** foundational_beliefs.md R-08 (B-5 strengthening); doctrine_change_log.md B-5

---

### CG-011 — Deload Expectations: Post-Deload Performance Dip is Normal
**Guidance:** In the first session after a deload week completes, surface a pre-session note: "First session back — don't be surprised if performance feels slightly off. Neuromuscular coordination needs 1–2 sessions to re-express. Don't chase a PR today; just move well." This prevents users from treating the post-deload dip as a plateau signal and triggering FM-001 prematurely. (Note: FM-005 handles the mechanical immunity; this cue handles the psychological expectation.)
**Source doctrine:** progression.md (Exceptions — Post-deload performance expression); rules_engine.md FM-005; strength.md (Deloading for Strength)

---

## Existing Rules Confirmed

The following rule IDs from rules_engine.md are already covered by progressionEngine.ts or the rules engine JSON definitions. No action needed.

- **VA-001 through VA-010** — MEV/MAV/MRV targets, session slot/set caps (VA-004/VA-005), per-exercise set cap (VA-006), RIR junk volume gate (VA-007), volume progression within meso (VA-008), experience-level volume scaling (VA-009), very-high fatigue exercise cap (VA-010) — all defined in rules_engine.md; VA-004/VA-005/VA-006/VA-007 have partial implementation analogs in progressionEngine.ts (effectiveSets, isCut RIR handling)
- **FA-001 through FA-006** — Frequency minimums, recovery class assignment, 48-hour gaps, no consecutive lower sessions, cut-phase frequency floor — defined in rules_engine.md
- **PR-001** — Double progression trigger — fully implemented in `evaluateDoubleProgression()` in progressionEngine.ts
- **PR-002** — Beginner linear progression — fully implemented in `evaluateBeginnerLinear()` in progressionEngine.ts
- **PR-003** — Micro-loading for isolation movements — implemented in `getLoadIncrement()` (1.25 lb / 2.5 lb tiers by role and experience level)
- **PR-004** — Stall detection — implemented via `countConsecutiveStalls()` and `stallThreshold` in progressionEngine.ts
- **PR-005** — Progression inhibition during fat loss — implemented via `isCut` guard and `CUT_HOLD` action in progressionEngine.ts
- **PR-006** — Tempo progression fallback — defined in rules_engine.md
- **PR-007** — Meso volume baseline reset — defined in rules_engine.md
- **PR-009** — Cross-meso load carry-forward — defined in rules_engine.md
- **PR-010** — Fat loss rep floor (repsMin >= 8 during cut) — implemented in progressionEngine.ts (`effectiveRepsMin = isCut ? Math.max(prescription.repsMin, 8) : prescription.repsMin`)
- **PR-011** — Cross-meso MEV advancement — defined in rules_engine.md
- **EO-001 through EO-005** — Exercise ordering by role and priority, movement balance validation — defined in rules_engine.md
- **ES-001 through ES-009** — Exercise selection filters, rep range bounds, RIR floor, beginner eligibility gate — defined in rules_engine.md
- **RM-001 through RM-004** — Rest periods, session duration caps, cut-phase volume reduction, logged RIR deviation — defined in rules_engine.md
- **FM-001 through FM-005** — Bad session detection, reset logic, MRV approach, indirect overlap, post-deload immunity — FM-001 through FM-003 implemented via `countConsecutiveBadSessions()` and `badSessionThreshold` in progressionEngine.ts; FM-004/FM-005 defined in rules_engine.md
- **DL-001 through DL-010** — Full deload scheduling, protocols, RIR floor, quality gates — implemented in progressionEngine.ts (`isDeload` branch with strength vs. hypertrophy protocol split; RIR floor `Math.max(4, prescription.rir)`); DL-001 through DL-010 fully defined in rules_engine.md
- **AD-001 through AD-004** — Session length cap, minimum effective dose, floating cut split, missed session detection — defined in rules_engine.md
- **MV-001 through MV-005** — MEV floor validation, deload MEV preservation, cut muscle retention, inactivity threshold, maintenance phase floor — defined in rules_engine.md

---

## Informational Only

These items are background science, confidence upgrades, or philosophical framing with no direct computable impact on workout generation, volume, load, or scheduling.

- **Stretch-position loading upgraded to Near-Definitive (B-1)** — Confidence upgrade only; the underlying rule (prefer exercises that load the stretched position) is already expressed in ES-001 through ES-004 via slot priority and exercise taxonomy. No new logic needed.
- **5–30 rep range equivalence upgraded to Near-Definitive (B-2)** — Confidence upgrade only; rule ES-006 already encodes the 5-rep floor and 30-rep ceiling as hard bounds.
- **Leucine as primary MPS trigger (A-3 mechanism detail)** — Mechanistic rationale for protein targets. App cannot prescribe leucine thresholds independently of total protein; the coaching guidance (CG-009) is the actionable output.
- **Phase potentiation — Moderate Evidence deferred (E-2)** — Would require multi-block program architecture; insufficient evidence to implement. Informational pointer only.
- **Myo-reps operational definition (A-10)** — Moderate Evidence; definition useful for coaching text (CG-010) but operational conditions are inconsistent across sources (E-3 deferred). Not a deterministic rule.
- **8–12 week mesocycle blocks as valid structure (B-10)** — Valid for advanced users but deferred as a program-level option (D-2 not a contradiction). Background science until a multi-block program builder is implemented.
- **Strength is neuromuscular skill — advanced framing (A-12)** — Reinforcement of existing principle; actionable only as CG-006 coaching cue, not as a computable rule.
- **Post-workout protein timing precise window (E-6 deferred)** — Moderate Evidence only; flagged for CG-008 but not strong enough for a hard rule.
- **RIR-based intensity taper across mesocycle (E-4 deferred)** — Mechanistically coherent (start at RIR 3–4, taper to 0–1 by end of block) but limited hard evidence; current doctrine uses fixed RIR targets. No action until evidence matures.
