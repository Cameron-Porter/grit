# High-Value Rule Candidates
Date: 2026-06-12
Source coverage: 68 distilled files read (63 hypertrophy, 5 strength); 14 raw-json files spot-checked for scientific_claims fields and confidence levels

---

## Executive Summary

Three clusters dominate. First, **intra-mesocycle RIR tapering** — starting each block at 3–4 RIR and progressively reducing to 0–1 RIR by the final hard week — appears in two sources with consistent mechanistic logic but is entirely absent from the engine; it would change RIR prescriptions for every slot every week without requiring new data fields. Second, **machines over barbells for hypertrophy primary slots** represents the clearest unresolved tension in the knowledge base: multiple files explicitly rate machines superior SFR for pure quad, chest, and back hypertrophy, yet the rules engine mandates barbell compounds in Primary slots — this is a conflict between doctrine and a consistent set of source claims that the engine never adjudicates. Third, **volume proportionality auditing** — the principle that weekly set counts should roughly mirror the anatomical size of muscle groups (quads ≈ 30% of body muscle, triceps < 4%) — has no expression anywhere in the rules engine and would catch the single most common structural flaw in user-generated programs.

---

## Ranked Findings

### HV-001 — Intra-Mesocycle RIR Taper: Start at 3–4 RIR, End at 0–1 RIR
**Domain:** Program generation | Weekly adaptation
**Principle:** Each mesocycle's working sets should start at RIR 3–4 in week 1 and progressively taper toward RIR 0–1 by the final hard week, aligning intensity with the volume accumulation wave (MEV → MRV) rather than holding RIR constant throughout.
**Why not yet captured:** All existing rules assign a fixed RIR from `SLOT_ROLE_CONFIGS` (typically 1–2) regardless of where the user is in their mesocycle. No rule modifies prescribed RIR based on `session.mesoBlockWeek`.
**Implementation:** In `progressionEngine.ts` (or wherever `SLOT_ROLE_CONFIGS` defaults are applied), add a `mesoWeekRirAdjustment` modifier: `prescribedRir = baseRir + (mesoWeeksRemaining - 1)`, clamped between 0 and 3. Example for a 4-week block: Week 1 → baseRir + 2; Week 2 → baseRir + 1; Week 3 → baseRir; Week 4 → deload (RIR ≥ 4, DL-007 already handles). This requires `session.mesoBlockWeek` and `program.totalMesoWeeks` — both already exist in the data model. Do not apply to deload weeks or cut phases. Guard: beginners remain at a fixed prescribed RIR range until intermediate; RIR taper is intermediate/advanced only.
**Impact:** 4/5 — changes every working-set RIR prescription across every mesocycle week; directly affects stimulus across all slots
**Confidence:** 4/5 — Strong Evidence in rir_intensity_autoregulation.md and training_intensity_failure_management.md; mechanistically consistent with volume-overload model; appears in 2+ files with identical direction
**Difficulty:** 2/5 — modifier on existing RIR derivation; no new data model fields required
**Composite score:** (4 × 4) / 2 = **8.0**
**Source files:** `rir_intensity_autoregulation.md`, `training_intensity_failure_management.md`, `rir_intensity_autoregulation.json`

---

### HV-002 — Volume Proportionality Audit: Cap Small-Muscle Volume Percentage
**Domain:** Program generation | Muscle group selection
**Principle:** Weekly set allocation should roughly mirror anatomical muscle size: quads account for ~30% of total body muscle, triceps <4%, biceps <4%. Programs where small muscles (arms) receive a disproportionate share of total weekly sets relative to large muscles (legs, back) are structurally flawed and should be flagged.
**Why not yet captured:** No rule in the engine tracks *proportional* set distribution across muscles. Rules VA-001–VA-003 enforce per-muscle MEV/MAV/MRV ceilings in isolation but never compare the relative allocation between a small muscle and a large muscle. A user assigning 20 sets/week to triceps and 6 sets/week to quads passes all current rules.
**Implementation:** Add a post-generation validation step (alongside existing MEV/MRV checks) that computes `program.largeMuscleSetsRatio` and `program.smallMuscleSetsRatio`. Flag `VOLUME_PROPORTIONALITY_IMBALANCE` when: `totalWeeklySets[Triceps] > 0.08 × totalWeeklySetsAll` OR `totalWeeklySets[Biceps] > 0.08 × totalWeeklySetsAll` OR `totalWeeklySets[Quads] < 0.18 × totalWeeklySetsAll`. Implement in the program-builder validation layer alongside RC-012 (posterior chain parity check). File: wherever program-level post-generation validation runs.
**Impact:** 4/5 — catches the most common structural flaw in user programs; directly affects program structure recommendations
**Confidence:** 4/5 — Strong Evidence (anatomical proportionality is established fact); cited across `training_intensity_sustainability_hypertrophy.md`, `training_intensity_sustainability_hypertrophy.json`, `exercise_selection_for_muscle_growth.md`; internal consistency with systemic fatigue doctrine
**Difficulty:** 2/5 — proportional ratio computation over existing `muscle.weeklyDirectSets` values; no new data model fields
**Composite score:** (4 × 4) / 2 = **8.0**
**Source files:** `training_intensity_sustainability_hypertrophy.md`, `training_intensity_sustainability_hypertrophy.json`, `exercise_selection_for_muscle_growth.md`

---

### HV-003 — Machine Primary Slots as a Valid Alternative for Hypertrophy Users
**Domain:** Program generation | Exercise recommendation
**Principle:** For users whose declared goal is hypertrophy (not strength or powerbuilding), machines and cable variations frequently offer superior stimulus-to-fatigue ratio for Primary slots compared to barbell compounds — specifically for quads (leg press/hack squat vs. barbell squat), chest (cable fly or machine press vs. barbell bench), and back (cable pulldown vs. barbell row) — because the machine's external stability shifts the limiting factor to the target muscle.
**Why not yet captured:** Rule ES-001 mandates that Primary slots must be filled from priority-1 exercises, which in practice means barbell compounds. The engine has no `programFocus`-conditional that allows machines to be elevated to Primary priority when the user's goal is pure hypertrophy. The conflict between doctrine (compounds first) and source files (machines offer higher SFR for hypertrophy) is explicit in the gap analysis (D-3) but has never been resolved into a rule.
**Implementation:** In the exercise-selection logic, add a `programFocus` modifier: if `programFocus === 'hypertrophy'` AND `muscle.id === 'Quads' OR 'Chest' OR 'Back'`, expand the Primary slot exercise filter to include `exercise.equipment === 'machine' OR 'cable'` with `exercise.sfr_rating >= 'high'` alongside existing priority-1 compounds. Do not apply when `programFocus === 'strength'` or `programFocus === 'powerbuilding'` (barbells remain default for those). Requires `exercise.sfr_rating` metadata field in exercise taxonomy. Guard: beginner users always default to barbell compounds for motor skill acquisition per ES-009. File: `exercise-selection validator` and exercise taxonomy metadata.
**Impact:** 4/5 — changes which exercises are prescribed for the majority of Primary slots for hypertrophy-focused users
**Confidence:** 3/5 — Moderate-Strong Evidence; consistent across `train_pure_muscle_growth.md`, `squat_vs_legpress_biomechanics.md`, `quad_hypertrophy.md`, `exercise_selection_for_muscle_growth.md`; however the existing doctrine explicitly disagrees, making this a live disagreement rather than a clear gap
**Difficulty:** 3/5 — requires `programFocus` flag (may or may not exist), `sfr_rating` metadata additions, and conditional logic in exercise-selection filter
**Composite score:** (4 × 3) / 3 = **4.0**
**Source files:** `train_pure_muscle_growth.md`, `squat_vs_legpress_biomechanics.md`, `quad_hypertrophy.md`, `exercise_selection_for_muscle_growth.md`, `squat_vs_legpress_biomechanics.json`

---

### HV-004 — Back Horizontal/Vertical Split Parity Validation
**Domain:** Program generation | Muscle group selection | Exercise recommendation
**Principle:** A complete back program must distribute volume across both planes: vertical pulling (lat pulldown, pull-up — for lat width) and horizontal pulling (rows — for upper back thickness and rhomboids). A back training week that contains only one plane type has a structural gap equivalent to training only one head of the bicep.
**Why not yet captured:** EO-005 validates push/pull/hinge/squat movement pattern balance at the weekly level, but it checks presence (at least one hinge, at least one pull) not balance within pull. There is no rule that requires both vertical and horizontal pull to appear in the weekly program, nor one that checks their relative distribution. The back is effectively treated as a single muscle group with no intra-group plane requirement.
**Implementation:** Add a back-specific plane balance validator analogous to RC-007 (shoulder plane coverage). When `muscle.id === 'Back'` is included in a weekly program: (a) check that at least one slot has `movementCategory === 'VerticalPull'` (lat pulldown, pull-up, cable pullover); (b) check that at least one slot has `movementCategory === 'HorizontalPull'` (row variations). If either is absent, flag `BACK_PLANE_COVERAGE_INCOMPLETE`. As a second-order check, flag `BACK_PLANE_IMBALANCE` when the ratio of horizontal-to-vertical pull sets exceeds 3:1 or falls below 1:3. File: session-builder / exercise-selection validator; requires `movementCategory` metadata on back exercises.
**Impact:** 4/5 — affects back program structure for any user who defaults to only rows or only pulldowns
**Confidence:** 4/5 — Strong Evidence; consistent across `back_training_hypertrophy.md`, `pull_day_biomechanics.md`, `pull_day_architecture.md`, `pull_day_biomechanics.json`; mechanistically clear (lats are vertical pullers; rhomboids/traps are horizontal pullers)
**Difficulty:** 2/5 — analogous structure to RC-007 already identified; metadata field `movementCategory` likely already exists
**Composite score:** (4 × 4) / 2 = **8.0**
**Source files:** `back_training_hypertrophy.md`, `pull_day_biomechanics.md`, `pull_day_architecture.md`, `pull_day_biomechanics.json`

---

### HV-005 — Lagging Muscle Prioritization: Move to Session Start
**Domain:** Weekly adaptation | Recovery management
**Principle:** Muscles tagged by the user as "lagging" or "priority" should be trained first in the session (before other non-priority muscles), not in standard EO-002 muscle-priority order. The distinction is: EO-002 orders by program-level priority; this rule overrides session slot order when the user has flagged specific muscles as needing catch-up, ensuring full neuromuscular drive is available for the weakest points.
**Why not yet captured:** EO-001 and EO-002 both order by slot role and muscle priority, but neither has a `user.lagFlag` that overrides position regardless of role. A user whose calves are lagging but assigned to an Accessory slot will always train calves last — after their energy and focus are depleted from Primary and Secondary work. The session-ordering rules assume the priority hierarchy is a complete guide to session placement, which fails for muscles the user has explicitly identified as needing disproportionate attention.
**Implementation:** Add a `muscle.lagFlag` boolean (user-set in program customization). In the session slot-ordering logic, apply a pre-sort step: `if (slot.muscle.lagFlag === true) slot.sortOrder = 0` (before all other ordering). This overrides EO-001 through EO-003 for flagged muscles only. If multiple muscles are flagged, they sort among themselves by role as usual. Guard: never move a `fatigue_rating = 'very_high'` exercise to the front on days with other high-fatigue exercises (VA-010 must still be respected). File: session-builder slot-ordering step.
**Impact:** 3/5 — meaningful for users with specific weak points; changes session order for those users; no impact for users with no lag flags set
**Confidence:** 4/5 — Strong Evidence in `stretch_mediated_hypertrophy.md` (calves placed first for lagging priority); consistent across `exercise_selection_for_muscle_growth.md`, `stretch_mediated_hypertrophy.json`; mechanistically sound (fatigue reduces stimulus quality)
**Difficulty:** 2/5 — requires `muscle.lagFlag` boolean field (simple user input) and a pre-sort step in session ordering
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `stretch_mediated_hypertrophy.md`, `stretch_mediated_hypertrophy.json`, `exercise_selection_for_muscle_growth.md`

---

### HV-006 — Bicep Long-Head Bias: Overhead Curl as a Mandatory Rotation Option
**Domain:** Exercise recommendation | Muscle group selection
**Principle:** The long head of the bicep (the outer "peak") is preferentially recruited when the shoulder is in extension or overhead flexion during curl variations — positions that place the bicep at its longest functional length. At least one bicep slot per mesocycle should include an overhead or incline curl variation to ensure the long head receives direct stretch-mediated stimulus.
**Why not yet captured:** The exercise_selection doctrine states that incline dumbbell curl and spider curl have "best SFR" for biceps due to elbow extension at the bottom (stretch position), but does not distinguish the long-head-specific overhead/incline position bias from a general stretch emphasis. No rule requires overhead or incline variations to be present in any bicep rotation. A user who only does standing curls and preacher curls will never receive the long-head-specific overhead stimulus.
**Implementation:** Add a bicep-specific exercise validator: when `muscle.id === 'Biceps'` has ≥2 slots in a weekly program, check that at least one slot uses an exercise tagged `bicepHeadBias === 'longHead'` (incline dumbbell curl, overhead cable curl, spider curl). If absent, flag `BICEP_LONG_HEAD_COVERAGE_ABSENT` and recommend rotating one existing slot to an incline or overhead variation. This is a soft flag (recommendation), not a hard block. Requires `bicepHeadBias` tag on exercise metadata. File: exercise-selection validator.
**Impact:** 3/5 — directly affects regional bicep development for users who lack overhead variations; changes exercise selection for a specific muscle group
**Confidence:** 3/5 — Moderate Evidence (bicep long-head bias via overhead position); cited in `pull_training_back_biceps.md`, `pull_training_back_biceps.json`, `bigger_arms.md`; anatomically coherent (long head crosses the shoulder joint)
**Difficulty:** 2/5 — requires `bicepHeadBias` metadata field and a per-muscle coverage check similar to RC-007
**Composite score:** (3 × 3) / 2 = **4.5**
**Source files:** `pull_training_back_biceps.md`, `pull_training_back_biceps.json`, `bigger_arms.md`

---

### HV-007 — Hip Thrust as Mandatory Glute Primary When Glutes Are Prioritized
**Domain:** Exercise recommendation | Muscle group selection
**Principle:** The barbell hip thrust produces significantly higher gluteus maximus EMG activation than the barbell back squat. When `muscle.id === 'Glutes'` is at `priority === 'emphasize'` or `'grow'`, the hip thrust (or cable/machine equivalent) must be included in the Primary slot — not merely as an option. Squats alone, even at high priority, do not adequately stimulate the glutes through the terminal hip extension range where peak glute activation occurs.
**Why not yet captured:** The exercise_selection doctrine lists hip thrust as the "Primary" for glutes, but the slot assignment logic (ES-001) only filters to priority-1 exercises — it does not enforce that a specific exercise *type* is mandatory for a specific muscle's Primary slot. A generated program could assign a squat pattern as the Primary glute exercise because it is a "multi-joint, high mechanical load" priority-1 movement, satisfying ES-001 without ever including a hip thrust.
**Implementation:** In the Primary slot exercise filter (ES-001 logic), add a muscle-specific override: when `muscle.id === 'Glutes'` AND `muscle.priority in ['emphasize', 'grow']`, set `requiredMovementCategory = 'HipThrust'` — meaning the approved exercise list for that slot is filtered to hip-thrust-pattern movements unless equipment is unavailable. Add a fallback: if no hip thrust equipment is available, allow cable hip extension or resistance band glute bridge with a flag `HIP_THRUST_UNAVAILABLE`. File: exercise-selection validator and slot assignment logic.
**Impact:** 3/5 — ensures glute-emphasized programs include the highest-activation glute exercise; changes Primary slot selection for glute-focus programs
**Confidence:** 4/5 — Strong Evidence (significantly higher EMG in upper and lower glute maximus vs. squat); cited across `barbell_hip_thrust_mechanics.md`, `barbell_hip_thrust_mechanics.json`; consistent with exercise_selection doctrine's existing recommendation
**Difficulty:** 2/5 — muscle-specific Primary slot movement category requirement; similar in structure to RC-007 plane coverage
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `barbell_hip_thrust_mechanics.md`, `barbell_hip_thrust_mechanics.json`, `exercise_selection.md` (existing doctrine)

---

### HV-008 — Forearm Training: Placement Rule (Session-End Mandatory)
**Domain:** Exercise recommendation | Recovery management
**Principle:** Forearm training must always be placed at the end of a Pull session (or any session involving back/bicep work). Pre-fatiguing forearm flexors and the brachioradialis reduces grip capacity, directly impairing stimulus quality on all subsequent pulling movements. This is a session-ordering safety rule, not a preference.
**Why not yet captured:** EO-001 through EO-003 order slots by role and priority but have no exercise-category constraint that prevents forearm isolation from appearing mid-session. A user who adds a forearm Accessory slot and has it ordered before their back Secondary rows (by muscle priority) would pre-fatigue their grip. No rule identifies the forearm as a "grip-affecting" muscle that must be placed after all pulling movements.
**Implementation:** Add a forearm-specific ordering constraint: when `session.slots` contains any slot with `muscle.id === 'Forearms'`, apply a post-sort override: move all forearm slots to after the last pull/row/back/bicep slot, regardless of the standard priority sort order. This is a hard rule (not a flag), applied in the session slot-ordering step after EO-001 through EO-003. File: session-builder slot-ordering step, implemented as a slot-category post-sort rule.
**Impact:** 3/5 — prevents a real stimulus-quality degradation pattern; affects session structure whenever forearms and pulling movements coexist
**Confidence:** 4/5 — Strong Evidence (brachioradialis grip fatigue mechanism is anatomically direct); cited in `accessory_training.md`, `accessory_training.json`; consistent with the general "target muscle must be the limiting factor" doctrine (C-02)
**Difficulty:** 2/5 — post-sort constraint on a specific muscle.id; low implementation complexity
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `accessory_training.md`, `accessory_training.json`

---

### HV-009 — Trap Shrug Technique: Forward Lean to Match Fiber Orientation
**Domain:** Exercise recommendation
**Principle:** A slight forward lean (15–30°) during barbell or dumbbell shrugs better aligns the resistance vector with the upper trap fiber orientation (fibers run at an angle, not straight vertical), producing superior upper trap recruitment versus upright shrugs. Upright shrugs with a shoulder roll add no stimulus and increase AC joint stress.
**Why not yet captured:** The exercise_selection doctrine (Traps section) notes that "shrugs" are the upper trap primary exercise but provides no technique specification for torso angle or the shrug-roll prohibition. No technique cue exists in the exercise taxonomy for trap shrug positioning. The AC joint risk from shoulder rolling is absent from any doctrine file.
**Implementation:** Add exercise-metadata technique cues to the trap shrug entry in the exercise taxonomy: `techniqueCue: "Lean forward 15–30° to align resistance with upper trap fiber direction. Do not roll shoulders forward or backward at lockout — pure elevation and controlled descent only."` Also add `injuryRisk: "AC joint impingement risk from shoulder roll"` as an exercise-level safety flag. These surface in the workout UI as cue cards. File: exercise taxonomy metadata and workout UI cue delivery system.
**Impact:** 3/5 — changes stimulus quality for any user doing trap shrugs; also prevents an AC joint injury pattern
**Confidence:** 4/5 — Strong Evidence (trap fiber orientation requiring lean-forward shrugs); cited in `accessory_training.md`, `accessory_training.json`
**Difficulty:** 1/5 — metadata addition to exercise taxonomy; no logic changes
**Composite score:** (3 × 4) / 1 = **12.0** *(adjusted to 6.0 after capping per implementation scope — this is a metadata cue, not a rules engine change)*
**Composite score:** (3 × 4) / 1 = **12.0** — however impact is bounded to UI-level technique delivery; applying a practical difficulty of 1.5 for metadata + UI surface: **8.0**
**Source files:** `accessory_training.md`, `accessory_training.json`

---

### HV-010 — Calf Raise Deep-Stretch Protocol: Full Stretch > Full Concentric Lockout
**Domain:** Exercise recommendation | Muscle group selection
**Principle:** For calf training, the deep stretch at the bottom of the calf raise is the most crucial part of the ROM for growth — not the full concentric lockout (rising onto toes). Calf bouncing (using Achilles elastic rebound instead of muscle contraction) eliminates the primary hypertrophic stimulus. A loaded 30-second stretch at the bottom of the final set provides additional hypertrophy signal rated Moderate Evidence.
**Why not yet captured:** The exercise_selection doctrine entry for calves states "Full range of motion at the bottom (complete stretch) is necessary" but does not specify that the concentric lockout is relatively less important, nor does it mention that fast/bouncy reps specifically defeat the purpose (Achilles tendon stores and releases elastic energy, bypassing the muscle). No technique cue or progression variant exists for the "loaded stretch hold" at session end for calves.
**Implementation:** (1) Add to calf raise exercise metadata: `techniqueCue: "Own the bottom stretch on every rep. Slow eccentric into maximum stretch, pause for 1 second, then controlled concentric. Do not bounce — bouncing uses Achilles elastic energy and bypasses the calf muscle."` (2) Add a `loadedStretchProtocol` flag to the calf raise exercise entry: at the end of the final working set, the app surfaces a 30-second loaded stretch prompt — `stretchCue: "Hold the bottom position under load for 30 seconds after your last rep. This stretch is its own hypertrophic stimulus."` (3) If `muscle.lagFlag === true` for Calves, move calf work to session start (HV-005 interaction). File: exercise taxonomy metadata; workout UI rest-period overlay system.
**Impact:** 3/5 — calves are among the most commonly undertrained muscles with poor technique; correct technique fundamentally changes the stimulus
**Confidence:** 4/5 — Strong Evidence for deep-stretch superiority; Moderate Evidence for 30-second loaded stretch benefit; cited in `stretch_mediated_hypertrophy.md`, `stretch_mediated_hypertrophy.json`
**Difficulty:** 1/5 — metadata and UI cue additions; no rules logic changes
**Composite score:** (3 × 4) / 1 = **12.0** — practical bound: **(7.0)** applying implementation scope adjustment
**Source files:** `stretch_mediated_hypertrophy.md`, `stretch_mediated_hypertrophy.json`

---

### HV-011 — Hip Thrust Foot Placement: Vertical Shin Rule for Glute Isolation
**Domain:** Exercise recommendation
**Principle:** During the barbell hip thrust, a vertical shin angle at the top of the movement isolates the glutes maximally. Feet too far forward bias the hamstrings; feet too close bias the quadriceps. This foot-placement principle should be encoded as a setup cue that prevents users from accidentally transforming a glute exercise into a hamstring or quad exercise.
**Why not yet captured:** The exercise_selection doctrine for glutes lists hip thrust as the Primary exercise but provides no setup specifications. No technique cue for foot placement or shin angle exists in the exercise taxonomy. The consequence of incorrect foot placement (stimulus shifting from target muscle) violates doctrine's "target muscle must be the limiting factor" (C-02) but the engine has no mechanism to detect or prevent this.
**Implementation:** Add exercise-metadata setup cues to the hip thrust entry: `setupCue: "Position feet so shin is vertical at full hip extension. Feet too far = hamstring bias; too close = quad bias. Use vertical shin as your calibration marker."` Add a pre-workout setup checklist prompt (analogous to existing checklist suggestions for deload weeks): when `muscle.id === 'Glutes'` is Primary and hip thrust is selected, surface a 4-point setup checklist before set 1: bench below scapulae, pad on hips, chin tucked, vertical shin target. File: exercise taxonomy metadata; workout UI pre-set checklist system.
**Impact:** 3/5 — directly affects glute stimulus quality for all hip thrust users; prevents common setup errors that shift stimulus away from the target muscle
**Confidence:** 4/5 — Strong Evidence (foot placement alters moment arms and shifts primary load between glutes/hamstrings/quads); cited in `barbell_hip_thrust_mechanics.md`, `barbell_hip_thrust_mechanics.json`
**Difficulty:** 1/5 — metadata addition and pre-set checklist UI; no rules logic
**Composite score:** (3 × 4) / 1 = **12.0** — practical bound: **(6.5)** applying scope adjustment
**Source files:** `barbell_hip_thrust_mechanics.md`, `barbell_hip_thrust_mechanics.json`

---

### HV-012 — High-Frequency Training (5× Per Week) as a Valid Advanced Split
**Domain:** Program generation | Muscle group selection
**Principle:** For intermediate/advanced users, training each major muscle group 5 days per week using a full-body split can produce superior hypertrophy outcomes compared to standard 2–3× frequency by optimizing the number of muscle protein synthesis events per week. This requires autoregulation (RPE 7–9 targets, not failure daily), exercise rotation to prevent overuse, and prior training experience to manage cumulative fatigue.
**Why not yet captured:** The existing frequency rules (FA-001, FA-002) cap muscle-group frequency at 3–4× for fast-recovering muscles and 3× for standard muscles. No program template or split type supports 5× per muscle per week. The rules engine would currently block or flag any program attempting this frequency. The distilled source data rates 5× weekly frequency as "Moderate Evidence" for MPS optimization in intermediate/advanced trainees — a legitimate alternative outside the current rule ceiling.
**Implementation:** Add a `'highFrequency'` option to the split template system (alongside existing `'UpperLower'`, `'PPL'`, `'FullBody'`). When selected: (a) gate behind `user.experienceLevel in ['intermediate', 'advanced']`; (b) set FA-002 `muscle.weeklySessionsMax` to 5 for all muscles when `split === 'highFrequency'`; (c) require exercise rotation between sessions for the same muscle to prevent overuse (enforce RC-010 asymmetrical A/B principle with minimum 3 different exercises across 5 sessions for major muscles); (d) set RIR floor to 1 for all slots (never prescribe 0 RIR/absolute failure when sessions are this frequent). File: program generator split-type logic; FA-002 frequency cap conditional.
**Impact:** 4/5 — introduces a new program architecture with meaningfully different frequency prescriptions
**Confidence:** 3/5 — Moderate Evidence for MPS optimization at 5× frequency; Strong Evidence that reduced per-session volume per muscle reduces soreness and maintains set quality; cited in `high_frequency_full_body.md`, `high_frequency_full_body.json`
**Difficulty:** 3/5 — requires new split template, FA-002 conditional, exercise rotation enforcement across 5 sessions
**Composite score:** (4 × 3) / 3 = **4.0**
**Source files:** `high_frequency_full_body.md`, `high_frequency_full_body.json`

---

### HV-013 — Deadlift CNS Fatigue: Block Subsequent Barbell Row Same Day
**Domain:** Recovery management | Program generation
**Principle:** Conventional and sumo deadlifts generate disproportionately high CNS fatigue. When a deadlift-pattern movement is in a session, no barbell row or any movement requiring high spinal loading should be scheduled in the same session. The 48-hour recovery rule (FA-004) already applies between sessions, but no intra-session rule prevents pairing deadlifts with barbell rows in the same workout.
**Why not yet captured:** VA-010 (hard cap at 1 `very_high` fatigue exercise per session) would catch the most extreme version of this pairing, but only if both are rated `very_high`. If one is `very_high` (deadlift) and one is `high` (barbell row), VA-010 does not fire. No rule specifically targets the spinal-loading overlap between deadlift and barbell row when both appear in a single session, despite this being one of the most common overuse injury patterns.
**Implementation:** Add a spinal-loading overlap rule: when `session.slots` contains a deadlift-pattern slot (`exerciseTag === 'deadlift'`) AND any slot with `exerciseTag === 'barbell-row'` OR `exerciseTag === 't-bar-row'`, flag `SPINAL_LOADING_OVERLAP` and recommend replacing the row with a `chest-supported-row` or `cable-row` variant (which remove spinal loading). This is a soft flag (recommendation), not a hard removal, because some advanced athletes specifically program this combination. For beginners and intermediates, apply as a hard block: `if user.experienceLevel in ['beginner', 'intermediate'] → remove barbell_row slot and replace with chest-supported alternative`. File: session-builder / exercise-selection validator. Requires `exerciseTag` or `spinalLoadingClass` metadata.
**Impact:** 3/5 — prevents a common injury pattern; affects program generation whenever deadlifts and rows are programmed together
**Confidence:** 4/5 — Strong Evidence (deadlift generates disproportionate CNS fatigue requiring 48–72h recovery; spinal loading mechanism clear); cited in `conventional_deadlift_mechanics.md`, `conventional_deadlift_mechanics.json`; consistent with existing VA-010 fatigue doctrine
**Difficulty:** 2/5 — tag-based intra-session compatibility check; analogous structure to VA-010 but using exercise tags instead of fatigue_rating
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `conventional_deadlift_mechanics.md`, `conventional_deadlift_mechanics.json`

---

### HV-014 — Explosive Concentric Tempo Paired with Slow Eccentric
**Domain:** Exercise recommendation | Progression
**Principle:** The optimal hypertrophy tempo is a slow, controlled eccentric (2–3 seconds) paired with an *explosive* concentric — not a controlled slow concentric. Slow concentrics do not produce additional hypertrophic benefit over fast concentrics and unnecessarily extend set duration, reducing total mechanical output. The eccentric phase is where primary muscle damage and mechanical tension accrue; the concentric should be fast and forceful to maximize motor unit recruitment at the point of highest mechanical challenge.
**Why not yet captured:** Doctrine's foundational_beliefs.md and hypertrophy.md specify a "2–3 second controlled eccentric" but say nothing about concentric tempo. The implicit assumption is controlled lowering + controlled rising. The "explosive concentric" pairing is identified in `training_intensity_sustainability_hypertrophy.md` at Moderate Evidence and is consistent with motor unit recruitment principles, but it is entirely absent from any doctrine tempo recommendation.
**Implementation:** Update the eccentric tempo cue across slot prescriptions: current cue "Lower in 3 seconds" should become "Lower in 2–3 seconds / Press/curl as fast as form allows." In the `progressionEngine.ts` or wherever tempo cues are generated, add a `concentricTempo: 'explosive'` field alongside `eccentricSeconds: 2-3`. Surface in the workout UI as a two-part tempo instruction: "3 down / fast up." Guard: beginners should use a controlled concentric until they can distinguish form breakdown from force production; apply explosive concentric cue only when `user.experienceLevel !== 'beginner'`. File: exercise metadata tempo defaults; workout UI cue system.
**Impact:** 3/5 — changes tempo prescription for all intermediate/advanced working sets; directly affects mechanical output quality within sets
**Confidence:** 3/5 — Moderate Evidence for superior hypertrophy from explosive concentric + slow eccentric pairing; cited in `train_pure_muscle_growth.md`, `training_intensity_sustainability_hypertrophy.md`; consistent with motor unit recruitment theory
**Difficulty:** 2/5 — tempo metadata field addition and UI cue update; no new data model fields
**Composite score:** (3 × 3) / 2 = **4.5**
**Source files:** `train_pure_muscle_growth.md`, `training_intensity_sustainability_hypertrophy.json`

---

### HV-015 — Inter-Set Stretch Protocol: 30-Second Moderate Stretch Between Sets
**Domain:** Program generation | Weekly adaptation
**Principle:** Performing a 30-second static stretch at moderate intensity (~7/10) between sets of the same muscle may enhance muscle growth without reducing strength for subsequent sets. This is distinct from post-workout stretching and from lengthened-position partials — it is an inter-set recovery period activity. Static stretching ≤60–90 seconds does not interfere with subsequent set strength.
**Why not yet captured:** Doctrine has no reference to inter-set stretching as a hypertrophy technique or recovery tool. The rest period doctrine (RM-001) prescribes rest times but says nothing about how that rest time should be used. The Moderate Evidence rating for this technique is enough to offer it as an opt-in feature for intermediate/advanced users without mandating it.
**Implementation:** Add an optional `interSetStretch` flag to session templates. When enabled: after completing each working set for a muscle, the rest timer UI prompts: "Optional: 30-second moderate stretch of [muscle name] while resting. Hold at ~7/10 intensity — not painful." Include a note that this does not replace rest time — the clock continues during the stretch. Gate behind `user.experienceLevel !== 'beginner'` (beginners need to focus on form, not multi-task recovery activities). This is an opt-in UI feature, not a program rule. File: workout UI rest timer; session template opt-in flag.
**Impact:** 3/5 — potential hypertrophy enhancement with no downside cost; affects session experience for users who adopt it
**Confidence:** 3/5 — Moderate Evidence; cited in `ultimate_push_workout.md`, `ultimate_push_workout.json`; static stretch ≤90s non-interference is Moderate Evidence
**Difficulty:** 2/5 — UI rest timer enhancement; no rules engine changes
**Composite score:** (3 × 3) / 2 = **4.5**
**Source files:** `ultimate_push_workout.md`, `ultimate_push_workout.json`

---

### HV-016 — Sumo Deadlift as a Lower-Back-History Alternative for Primary Hinge
**Domain:** Program generation | Exercise recommendation
**Principle:** For users with a history of lower back pain or short arms relative to torso length, the sumo deadlift should be the preferred primary hinge-pattern movement over conventional deadlift. The sumo's upright torso reduces shear force and torque on the lumbar spine while maintaining equivalent mechanical work and hypertrophic stimulus. This is a user-history-dependent exercise substitution rule.
**Why not yet captured:** The exercise taxonomy lists both conventional and sumo deadlifts, and both are available as Primary slot options for back/hinge patterns. No rule uses `user.injuryHistory` or `user.jointHistory` to preference one over the other. The engine cannot currently distinguish between a user who has had lumbar disc issues (for whom sumo is strongly preferred) and one who has not.
**Implementation:** Add `user.injuryHistory` or `user.jointStressHistory` with a `lumbar` flag (alongside existing `user.jointStressFlag` used in DL-005). When `user.jointStressHistory.lumbar === true`, add a preference weight to the sumo deadlift in exercise selection for `movementCategory === 'HipHinge' OR 'Deadlift'`: `if exercise.name === 'Sumo Deadlift' → exercise.selectionPriority += 2`. Also add to the beginner exercise onboarding questionnaire: "Do you have a history of lower back pain? (Y/N)" — if yes, default the hinge pattern Primary slot to sumo or trap bar deadlift instead of conventional. File: exercise taxonomy metadata, user onboarding flow, exercise-selection priority scoring.
**Impact:** 3/5 — directly affects exercise selection for a subset of users with lumbar history; prevents injury-risk exercise prescription
**Confidence:** 4/5 — Strong Evidence (sumo significantly reduces shear force on lumbar spine vs. conventional); cited in `sumo_dl_biomechanics.md`, `sumo_dl_biomechanics.json`
**Difficulty:** 2/5 — user history flag addition and exercise priority scoring; analogous to existing joint stress flag logic
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `sumo_dl_biomechanics.md`, `sumo_dl_biomechanics.json`

---

### HV-017 — Feeder-Set Warm-Up Protocol for Compound Back/Leg Movements
**Domain:** Program generation | Exercise recommendation
**Principle:** For neurologically complex compound movements where mind-muscle connection is a known bottleneck (lat pulldowns, deadlifts, heavy rows), a 4–5 set feeder-set warm-up protocol — progressively escalating from RPE 4–5 to RPE 10 before the working set — produces better first-set quality than standard 1–2 warm-up sets. Feeder sets are neurological priming, not volume accumulation.
**Why not yet captured:** The engine prescribes working sets with no concept of a graded warm-up ramp. Rule EO-001 orders by role but does not distinguish between warm-up (non-counting) sets and working sets. The workout UI presumably shows warm-up sets but there is no structured "feeder set" protocol (4 progressively heavier sets targeting RPE escalation) that the engine generates for specific high-skill movements.
**Implementation:** Add a `feederSetProtocol` flag to high-skill exercise entries in the taxonomy: exercises tagged `neuralPrimingRequired: true` (deadlift, conventional/sumo; lat pulldown; heavy barbell row) receive a `feederSetConfig: { sets: 4, rpeTargets: [5, 7, 8, 10] }`. The session UI, when the user begins the first Primary slot slot that is `neuralPrimingRequired`, walks them through 4 feeder sets before the working sets. Feeder sets do not count toward `muscle.weeklyDirectSets`. This is an enhancement to the existing warm-up/working set distinction. File: exercise taxonomy (`neuralPrimingRequired` flag), workout UI session flow.
**Impact:** 3/5 — improves first-set quality on the highest-impact exercises; affects session structure for any program containing deadlifts or lat-focused compounds
**Confidence:** 3/5 — Moderate Evidence for feeder set superiority over standard warm-ups for neurologically complex movements; cited in `pull_training_back_biceps.md`, `pull_training_back_biceps.json`; mechanistically coherent (motor unit priming)
**Difficulty:** 3/5 — requires `neuralPrimingRequired` metadata, `feederSetConfig` data structure, and session UI flow changes
**Composite score:** (3 × 3) / 3 = **3.0**
**Source files:** `pull_training_back_biceps.md`, `pull_training_back_biceps.json`

---

### HV-018 — Leg Press Foot Placement: Match to Offset Squat Bias
**Domain:** Exercise recommendation | Muscle group selection
**Principle:** When both a squat-pattern and a leg press are present in the same session or program week, the leg press foot placement should differ from the squat bias to maximize total quad/glute coverage — not duplicate it. If the squat is quad-dominant (high-bar, heel-elevated), the leg press should use a higher/wider foot placement to bias the glutes. If the squat is hip-dominant (low-bar), the leg press foot placement should be low-center to bias quads.
**Why not yet captured:** The engine assigns leg press as a Secondary or Accessory slot with no awareness of which squat variant occupies the Primary slot. No rule coordinates foot placement intent between squat and leg press within the same program week. A user who does heel-elevated high-bar squats (quad dominant) followed by low-foot leg press (also quad dominant) is simply duplicating the stimulus rather than covering complementary regions.
**Implementation:** Add a `squatBias` field to leg press exercise variants in the taxonomy: `LegPress_QuadBias` (low/center foot placement) and `LegPress_GluteBias` (high/wide foot placement). In the session or weekly program generator, when both `movementCategory === 'QuadDominant' (squat)` AND `movementCategory === 'LegPress'` are present: if squat variant is `squatBias === 'quad'` (high-bar, heel-elevated, front squat), assign `LegPress_GluteBias`; if squat variant is `squatBias === 'hip'` (low-bar, sumo), assign `LegPress_QuadBias`. Flag `LEG_PRESS_SQUAT_REDUNDANCY` if both are quad-dominant without a complementary variant. File: exercise taxonomy (squat/leg press bias tags), session slot assignment logic.
**Impact:** 3/5 — changes leg press exercise variant selection based on squat complement logic; directly improves lower-body stimulus coverage
**Confidence:** 4/5 — Strong Evidence (foot placement alters moment arms and shifts muscular load between quad/glute/hamstring); cited in `squat_vs_legpress_biomechanics.md`, `squat_vs_legpress_biomechanics.json`
**Difficulty:** 3/5 — requires bias tagging in taxonomy and inter-exercise coordination logic in session builder
**Composite score:** (3 × 4) / 3 = **4.0**
**Source files:** `squat_vs_legpress_biomechanics.md`, `squat_vs_legpress_biomechanics.json`

---

### HV-019 — Deadlift RIR Safety Floor: Compound Hinge Minimum RIR = 1
**Domain:** Exercise recommendation | Recovery management
**Principle:** Conventional and sumo deadlifts should never be prescribed at RIR 0 (absolute failure). The combination of heavy axial spinal load + form breakdown at failure creates injury risk that is categorically different from isolation exercises. The RIR floor for any deadlift-pattern movement should be 1, not 0 — even for advanced users who otherwise may be prescribed 0 RIR on isolation exercises under RC-006.
**Why not yet captured:** RC-006 (already identified in rule_candidate_updates.md) distinguishes RIR by movement type, allowing isolation exercises to be prescribed at RIR 0–1 and compound lifts at RIR 1–2. However, RC-006 sets the general compound floor at "never prescribe RIR 0 on compounds for non-advanced users" — it does not have a hard floor specifically for deadlift-pattern movements that applies even to advanced users. Rule ES-007 floors RIR at 0 (not 3) for non-deload sessions, meaning an advanced user could receive RIR 0 on a deadlift.
**Implementation:** Add a `hardRirFloor` metadata field to high-risk barbell exercises: `conventional_deadlift.hardRirFloor = 1`, `sumo_deadlift.hardRirFloor = 1`, `barbell_good_morning.hardRirFloor = 1`. In the slot prescription logic, after applying RC-006's compound RIR floor, apply an additional override: `slot.rir = Math.max(slot.rir, exercise.hardRirFloor)`. This is independent of user experience level — even advanced users should not take a deadlift to 0 RIR (technical failure with heavy spinal load). File: exercise taxonomy (`hardRirFloor` field), slot prescription logic.
**Impact:** 3/5 — prevents a specific high-injury-risk scenario for advanced users who receive 0 RIR prescriptions on deadlifts
**Confidence:** 4/5 — Strong Evidence (barbell spinal load + form breakdown at failure = exponentially elevated disc injury risk); cited in `conventional_deadlift_mechanics.md`, `sumo_dl_biomechanics.md`, both JSON files
**Difficulty:** 1/5 — `hardRirFloor` metadata field on 3 exercises; one-line override in slot prescription
**Composite score:** (3 × 4) / 1 = **12.0** — practical bound: **(6.0)** (impact is specific and bounded)
**Source files:** `conventional_deadlift_mechanics.md`, `conventional_deadlift_mechanics.json`, `sumo_dl_biomechanics.md`, `sumo_dl_biomechanics.json`

---

### HV-020 — Tricep Overhead Extension as Mandatory Long-Head Coverage
**Domain:** Exercise recommendation | Muscle group selection
**Principle:** The tricep long head crosses the shoulder joint in addition to the elbow joint. It only achieves full stretch when the shoulder is flexed (arm overhead). Tricep exercises with the arm at the side (pushdowns, kickbacks, close-grip bench) do not place the long head under stretch. For complete tricep development, at least one overhead tricep extension variant (skull crusher, cable overhead extension, dumbbell overhead extension) must appear in any tricep-emphasis program.
**Why not yet captured:** The exercise_selection doctrine lists "Overhead extension" as the tricep Primary exercise, which is correct. However, the slot assignment logic (ES-001 through ES-003) does not enforce that a *shoulder-flexed* overhead variant is present — a user could fill their tricep Primary slot with a pushdown (classified priority-1 by muscle function) and their Secondary with close-grip bench, and never receive overhead extension. The long-head coverage requirement has no rule, only a doctrine recommendation.
**Implementation:** Add a tricep-specific coverage check: when `muscle.id === 'Triceps'` has ≥2 slots in a weekly program, verify that at least one slot has `exerciseTag === 'overheadExtension'` (skull crusher, cable overhead, dumbbell overhead extension). If absent, flag `TRICEP_LONG_HEAD_COVERAGE_ABSENT` and recommend replacing one existing slot with an overhead extension variant. This mirrors the bicep long-head check (HV-006). Requires `exerciseTag: 'overheadExtension'` metadata on relevant exercises. File: exercise-selection validator; exercise taxonomy.
**Impact:** 3/5 — directly affects tricep long-head development for users who default to pushdowns/close-grip bench only
**Confidence:** 4/5 — Strong Evidence (long head requires shoulder flexion for full stretch; overhead position directly activates long head maximally); cited in `ultimate_push_workout.md`, `ultimate_push_workout.json`; consistent with existing doctrine (tricep primary = overhead extension)
**Difficulty:** 2/5 — analogous to HV-006 bicep long-head check; metadata tag addition and validator check
**Composite score:** (3 × 4) / 2 = **6.0**
**Source files:** `ultimate_push_workout.md`, `ultimate_push_workout.json`, `exercise_selection.md` (existing doctrine Triceps section)

---

## Summary Table

| ID | Title | Impact | Confidence | Difficulty | Composite |
|---|---|---|---|---|---|
| HV-001 | Intra-Mesocycle RIR Taper | 4 | 4 | 2 | 8.0 |
| HV-002 | Volume Proportionality Audit | 4 | 4 | 2 | 8.0 |
| HV-004 | Back Horizontal/Vertical Parity | 4 | 4 | 2 | 8.0 |
| HV-009 | Trap Shrug Forward Lean Cue | 3 | 4 | 1 | ~8.0 (metadata) |
| HV-010 | Calf Deep-Stretch Protocol | 3 | 4 | 1 | ~7.0 (metadata) |
| HV-011 | Hip Thrust Vertical Shin Rule | 3 | 4 | 1 | ~6.5 (metadata) |
| HV-005 | Lagging Muscle → Session Start | 3 | 4 | 2 | 6.0 |
| HV-007 | Hip Thrust Mandatory for Glutes | 3 | 4 | 2 | 6.0 |
| HV-008 | Forearm Last in Pull Sessions | 3 | 4 | 2 | 6.0 |
| HV-013 | Deadlift Blocks Same-Session Barbell Row | 3 | 4 | 2 | 6.0 |
| HV-016 | Sumo Default for Lumbar History | 3 | 4 | 2 | 6.0 |
| HV-019 | Deadlift RIR Floor = 1 (Always) | 3 | 4 | 1 | 6.0 |
| HV-020 | Tricep Overhead Extension Coverage | 3 | 4 | 2 | 6.0 |
| HV-006 | Bicep Long-Head Overhead Coverage | 3 | 3 | 2 | 4.5 |
| HV-014 | Explosive Concentric + Slow Eccentric | 3 | 3 | 2 | 4.5 |
| HV-015 | Inter-Set Stretch Protocol | 3 | 3 | 2 | 4.5 |
| HV-003 | Machine Primary Slots for Hypertrophy | 4 | 3 | 3 | 4.0 |
| HV-012 | 5× Weekly High-Frequency Split | 4 | 3 | 3 | 4.0 |
| HV-018 | Leg Press Foot Placement Complement | 3 | 4 | 3 | 4.0 |
| HV-017 | Feeder-Set Warm-Up Protocol | 3 | 3 | 3 | 3.0 |

All 20 findings clear the ≥3.0 composite threshold.
