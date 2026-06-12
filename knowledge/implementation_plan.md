# G.R.I.T. Implementation Plan
Date: 2026-06-12
Source: rule_adoption_plan.md (8 approved P0/P1 rules)

---

## Architecture Overview

The program generation pipeline flows through a chain of pure TypeScript modules in `src/rules/`. `programBuilder.ts` is the orchestrator: it calls `splitDeriver.ts` to pick a PPL/Upper-Lower/etc. structure, then `volumeBudget.ts` to compute weekly set targets per muscle, then `assignment.ts` to assign muscles to specific days, and finally `slotBuilder.ts` to build `ExerciseSlot[]` objects for each day. Each slot carries `{muscle, role, sets, repsMin, repsMax, rir, sortOrder}` but no `selectedExercise` — exercise selection happens later via `exerciseRecommender.ts` (used by `SlotExercisePicker` in the create-program UI). `validation.ts` runs after all weeks are generated and can push `ProgramValidationIssue` warnings into the `GeneratedProgram.validation` result shown in the UI.

Exercise metadata lives in two parallel stores. `src/data/exerciseDatabase.ts` is the in-app TypeScript source of truth (~100 exercises, typed as `ExerciseDefinition`). The `exercises` Supabase table holds the same exercise names for the exercise picker and history queries; it gained `movement_category`, `fatigue_rating`, and related taxonomy columns in migration `20260609000001_add_exercise_taxonomy.sql`. The `EXERCISE_DATABASE` entries have `movementPattern`, `exerciseType`, `fatigueCost`, `sfrTier`, and `varietyGroup` — but no `hardRirFloor`, `exerciseTag`, or `movementCategory` string field on the TypeScript side (the DB has `movement_category`; the TS type does not mirror it yet).

Progression targets are computed post-workout in `src/api/progression.ts`, which calls `recommendProgression()` from `src/rules/progressionEngine.ts`. The engine receives a `ProgressionContext` that already carries `mesoWeek`, `totalMesoWeeks`, `isDeload`, `experienceLevel`, and `programFocus` — but does not currently use `mesoWeek`/`totalMesoWeeks` to adjust the prescribed `rir`; the `rir` value is passed through unchanged from the slot prescription. The engine's output (`nextRir`) flows into `program_day_targets.rir` in the DB and is shown on the Day screen as the weekly RIR target.

---

## Rule Implementations

---

### HV-019 — Deadlift RIR Hard Floor = 1 (Always)
**Priority:** P0

#### Current Behavior
`recommendProgression()` returns `nextRir: prescription.rir` unchanged. If an advanced user's slot prescription has `rir: 0`, the engine outputs `nextRir: 0` on a deadlift — no guard exists.

#### Proposed Behavior
After computing `nextRir`, apply: `nextRir = Math.max(nextRir, exercise.hardRirFloor ?? 0)`. Exercises `'Deadlift'`, `'Sumo Deadlift'`, and `'Good Morning'` get `hardRirFloor: 1`. This cap applies regardless of experience level and regardless of deload status (deload already pushes RIR to 4, so it never conflicts).

#### Expected User Impact
Advanced users see RIR 1 minimum on deadlift slots even when the meso-week prescription would normally go to RIR 0. No change for beginner/intermediate who are already at RIR 2–3.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Exercise data (TS) | `src/data/exerciseDatabase.ts` | Add `hardRirFloor?: number` to the three deadlift-pattern entries: `hm-01` Romanian DL, `hm-02` Stiff-Leg DL, and `hm-03` Good Morning. Also the `Deadlift` and `Sumo Deadlift` entries are only in the DB, not in exerciseDatabase.ts — see DB section. |
| Types | `src/types/program.ts` | Add `hardRirFloor?: number` to `ExerciseDefinition` interface |
| Progression engine | `src/rules/progressionEngine.ts` | `SlotPrescription` gains optional `hardRirFloor?: number`; in `recommendProgression()`, after setting `base.nextRir`, apply `if (prescription.hardRirFloor !== undefined) base.nextRir = Math.max(base.nextRir, prescription.hardRirFloor)` |
| Progression API | `src/api/progression.ts` | Pass `hardRirFloor: exerciseDef?.hardRirFloor` into the `SlotPrescription` object at line 80 |
| Database | `exercises` table | Add `hard_rir_floor int` column; set to `1` for `'Deadlift'`, `'Sumo Deadlift'`, `'Good Morning'`, `'Good Morning (Hamstring Focus)'` |

#### Database Changes
New migration required: `alter table exercises add column if not exists hard_rir_floor int;` + four `update` statements setting `hard_rir_floor = 1`.

#### UI Changes
None. The RIR value shown on the Day screen and in ExerciseCard already reads from `program_day_targets.rir` — it will simply never show 0 for these exercises.

#### Migration Requirements
New migration file. No data backfill needed on existing rows (NULL = no floor, engine treats as 0).

#### Test Requirements
- `recommendProgression({..., rir: 0, hardRirFloor: 1}, sessions, {experienceLevel: 'advanced', ...})` → `nextRir === 1`
- `recommendProgression({..., rir: 0, hardRirFloor: 1}, sessions, {isDeload: true, ...})` → `nextRir === 4` (deload wins because it's already higher)
- `recommendProgression({..., rir: 2, hardRirFloor: 1}, sessions, {...})` → `nextRir === 2` (floor doesn't lower)

#### Implementation Complexity
Low — one metadata field, one `Math.max` line in `recommendProgression`, one migration.

---

### HV-001 — Intra-Mesocycle RIR Taper
**Priority:** P1

#### Current Behavior
`applyWeekParams()` in `slotBuilder.ts` already has a partial RIR taper for `emphasize`/`grow` muscles: `rir = Math.max(1, (baseRir + 1) - (weekNumber - 1))`. However this only applies during program generation (the `ExerciseSlot.rir` values written to the DB). The *progression engine* in `progressionEngine.ts` then overwrites the RIR independently via `base.nextRir = prescription.rir` — it does not re-apply any week-based adjustment. So week 2+ target RIRs computed by the progression engine ignore the taper.

Additionally, the taper floor is hard-coded at `Math.max(1, ...)`, which means advanced users can never receive 0 RIR even for non-deadlift exercises. This is correct doctrine per RC-006 for most users, but the taper should properly reach 0 for advanced users on isolation exercises.

#### Proposed Behavior
In `progressionEngine.ts`, after computing `base.nextRir` from `prescription.rir`, apply a meso-week RIR adjustment for intermediate/advanced users on non-deload weeks:

```
mesoWeeksRemaining = totalMesoWeeks - mesoWeek  // 0 on last training week
if (!isDeload && experienceLevel !== 'beginner' && musclePriority in ['emphasize','grow']) {
  base.nextRir = Math.max(0, prescription.rir - mesoWeeksRemaining)
}
```

This yields: week 1 of a 4-week meso (3 training + 1 deload): `prescription.rir - 2`; week 2: `- 1`; week 3: `- 0`. Clamped at 0 from below. The `hardRirFloor` from HV-019 then raises it back to 1 for deadlifts, so sequencing matters: taper first, floor second.

#### Expected User Impact
Every working set for intermediate/advanced users gets a progressively lower RIR target each week of the meso, aligning effort with the accumulation wave. Week 1 feels easier (higher RIR), week 3 feels hardest (lowest RIR). Beginners see no change.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Progression engine | `src/rules/progressionEngine.ts` | In `recommendProgression()`, add meso-week RIR adjustment after computing `base.nextRir`, before the deload/maintenance short-circuit paths. Requires `ctx.mesoWeek` and `ctx.totalMesoWeeks` (both already exist in `ProgressionContext`). |
| Slot builder | `src/rules/slotBuilder.ts` | The existing `applyWeekParams()` taper already fires during generation. Ensure the floor in `Math.max(1, ...)` is changed to `Math.max(0, ...)` for advanced users — currently the generated slots can never hit RIR 0 even for non-deadlift exercises. Add an `experienceLevel` parameter to `buildDaySlots()` or `applyWeekParams()`. |

#### Database Changes
None. `mesoWeek` and `totalMesoWeeks` are already passed through `ProgressionContext` in `src/api/progression.ts`.

#### UI Changes
None. The RIR target displayed on the Day screen reads from `program_day_targets.rir` as before.

#### Migration Requirements
None.

#### Test Requirements
- 4-week meso, week 1, intermediate, grow priority, `prescription.rir = 2`: → `nextRir = 0` (2 - 2 = 0, but `Math.max(0, ...)` = 0). Wait — re-check formula: `mesoWeeksRemaining = totalMesoWeeks(4) - mesoWeek(1) - 1(deload) = 2`. Validate expected outputs for all 4 weeks.
- Beginner user: RIR taper does NOT apply; output equals `prescription.rir`.
- Deload week: short-circuits before taper; output is `Math.max(4, prescription.rir)`.
- Deadlift + taper to 0 → HV-019 floor raises to 1 (integration test).

#### Implementation Complexity
Medium — `applyWeekParams()` needs an experience-level parameter, and the progression engine needs to replicate the taper logic using the already-available context fields. The key risk is divergence between slot-generation RIR (from `slotBuilder.ts`) and progression-target RIR (from `progressionEngine.ts`) — they must use identical math.

---

### HV-002 — Volume Proportionality Audit
**Priority:** P1

#### Current Behavior
`validateProgram()` in `src/rules/validation.ts` checks per-muscle emphasize targets against weekly effective sets, session counts, and movement pattern presence — but never compares the *proportional share* of total sets across muscles. A program with 20 Tricep sets and 6 Quad sets passes all current checks.

#### Proposed Behavior
Add a proportionality check to `validateProgram()`. After computing `weeklyEffectiveSets`, sum all sets across all muscles. Then:
- If `weeklyEffectiveSets['Triceps'] / total > 0.08` → push `VOLUME_PROPORTIONALITY_IMBALANCE` warning for Triceps
- If `weeklyEffectiveSets['Biceps'] / total > 0.08` → same for Biceps
- If `weeklyEffectiveSets['Quads'] / total < 0.18` AND total > 0 AND Quads are in the program → push warning

Severity: `'warning'`, not `'error'` — specialization programs can intentionally exceed this.

#### Expected User Impact
Program creation screen shows a warning banner when the user's muscle selection creates disproportionate arm volume or inadequate quad volume. User can proceed anyway (soft block only).

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Validation | `src/rules/validation.ts` | Add proportionality check block after the existing movement-balance check. Uses already-computed `weeklyEffectiveSets`. Add new `type` value `'proportionality'` to `ProgramValidationIssue['type']`. |
| Types | `src/types/program.ts` | Add `'proportionality'` to the `ProgramValidationIssue.type` union |
| UI | `app/programs/create.tsx` | The validation result is already displayed (check how the create screen renders `validation.issues`) — no UI change needed if warnings already surface. Verify that `type: 'proportionality'` warnings display in the existing issues list. |

#### Database Changes
None.

#### UI Changes
Minimal — only if the create screen filters on `type` to decide which warnings to show. Currently the create screen calls `buildProgram()` and passes the result; need to check whether the issues list is rendered in `create.tsx`. If it is, this works automatically.

#### Migration Requirements
None.

#### Test Requirements
- Program with 3×Triceps + 1×Quads: expect `VOLUME_PROPORTIONALITY_IMBALANCE` warning for Triceps and Quads
- Program with 2×Triceps + 6×Quads: no warning
- Program with 0 total sets (no muscles): no crash, no warning
- Arm-specialization program (intentional): warning fires but does not block save

#### Implementation Complexity
Low — pure computation over existing `weeklyEffectiveSets` map, one new check block in `validateProgram()`.

---

### HV-004 — Back Horizontal/Vertical Pull Parity Validation
**Priority:** P1

#### Current Behavior
`validateProgram()` checks that a Pull session type exists (EO-005) but never inspects whether the Back exercises within that session cover both `'Vertical Pull'` and `'Horizontal Pull'` movement categories. A user who adds only Lat Pulldowns (vertical) or only Rows (horizontal) passes all current validation.

#### Proposed Behavior
Add a back plane coverage check to `validateProgram()`. For each week-1 day that contains Back slots:
1. Collect all selected exercises for Back slots on that day (via `slot.selectedExercise`).
2. Look up each exercise in `EXERCISE_DATABASE` for `movementPattern`.
3. If all Back slots have `movementPattern === 'vertical-pull'` and none have `'horizontal-pull'` → flag `BACK_PLANE_COVERAGE_INCOMPLETE` (warning): "Back training on [day] has no horizontal pull (rows) — add a row variation for upper back thickness."
4. Reverse case: all horizontal, no vertical → same warning for missing lat work.

Note: `ExerciseSlot.selectedExercise` is optional and may be `undefined` at validation time (the user picks exercises after generation). The check should run only when exercises are selected (i.e., at program-save time or when the day screen has selections). If `selectedExercise` is absent, skip the check.

The DB `exercises` table already has `movement_category` with `'Horizontal Pull'` and `'Vertical Pull'` values from migration `20260609000001`. The `EXERCISE_DATABASE` in TypeScript already has `movementPattern: 'horizontal-pull' | 'vertical-pull'` on Back entries — no new metadata needed.

#### Expected User Impact
When saving a program where a Pull/Upper day has only rows or only pulldowns selected, a soft warning appears. No hard block.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Validation | `src/rules/validation.ts` | Add back-plane check after proportionality check. Import `EXERCISE_DATABASE` or `getExerciseByName` from `src/data/exerciseDatabase.ts`. Iterate `program.days`, filter slots with `muscle === 'Back'`, look up `movementPattern`, flag if only one plane present. |
| Types | `src/types/program.ts` | Add `'back_plane'` to `ProgramValidationIssue.type` union |

#### Database Changes
None. The `exercises.movement_category` column already distinguishes `'Horizontal Pull'` / `'Vertical Pull'`.

#### UI Changes
None beyond existing validation issue rendering.

#### Migration Requirements
None.

#### Test Requirements
- Day with Back-Primary = `'Pull-Up'` (vertical) + Back-Secondary = `'Seated Cable Row'` (horizontal): no warning
- Day with Back-Primary = `'Pull-Up'` + Back-Secondary = `'Lat Pulldown'` (both vertical): warning fires
- Day with Back-Primary = `'Barbell Row'` + Back-Secondary = `'Seated Cable Row'` (both horizontal): warning fires
- Day with no Back slots: no warning
- Day with Back slots but no `selectedExercise`: check silently skipped (no crash)

#### Implementation Complexity
Low — uses existing `movementPattern` field already on `ExerciseDefinition`. The logic mirrors the movement_balance check already in `validateProgram()`.

---

### HV-007 — Hip Thrust as Mandatory Primary Slot When Glutes Are Prioritized
**Priority:** P1

#### Current Behavior
`exerciseRecommender.ts` (`getRecommendedExercises()`) ranks all exercises with `primaryMuscles.includes('Glutes')` by SFR, equipment, experience, and progression scores. Hip thrust variants have `sfrTier: 'tier1'` and rank highest — but the recommender does not *filter* the approved list to hip-thrust-only when Glutes are at `emphasize` or `grow` priority. The `SlotExercisePicker` UI presents all ranked options and the user can pick a squat.

#### Proposed Behavior
When `ctx.muscle === 'Glutes'` AND `ctx.role === 'Primary'` AND the caller signals that Glutes are prioritized (new optional `ctx.requiredMovementPattern?: MovementPattern`), filter the candidate pool to exercises with `movementPattern === 'hip-extension'` before scoring. If that filter leaves zero candidates (equipment unavailable), fall back to the full pool and add a `HIP_THRUST_UNAVAILABLE` flag in the result.

The `PickerContext` gains an optional `requiredMovementPattern` field. The call site in `create.tsx` (the `SlotExercisePicker`) passes `requiredMovementPattern: 'hip-extension'` when it detects Glutes Primary + priority in `['emphasize', 'grow']`.

#### Expected User Impact
When Glutes are set to Emphasize or Grow, the Primary slot exercise picker only shows hip-thrust pattern exercises (Barbell Hip Thrust, Dumbbell Hip Thrust, Machine Hip Thrust). A note "Glutes prioritized — hip thrust required for Primary slot" appears in the picker header. If the user's equipment list excludes all hip thrust options, the picker falls back to showing all glute exercises with a soft warning.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Exercise recommender | `src/rules/exerciseRecommender.ts` | Add `requiredMovementPattern?: MovementPattern` to `PickerContext`. In `getRecommendedExercises()`, after building `candidates`, apply: `if (ctx.requiredMovementPattern) { const strict = candidates.filter(ex => ex.movementPattern === ctx.requiredMovementPattern); if (strict.length > 0) pool = strict; }` |
| UI (create flow) | `app/programs/create.tsx` | Where `SlotExercisePicker` is rendered for a Glutes Primary slot, check `musclePriorities['Glutes']` — if `'emphasize'` or `'grow'`, pass `requiredMovementPattern: 'hip-extension'` to the picker context |
| Types | `src/types/program.ts` | `PickerContext` is defined in `exerciseRecommender.ts`, not `program.ts` — update there directly |

#### Database Changes
None. `movementPattern: 'hip-extension'` already exists on `gl-01`, `gl-02`, `gl-03` in `EXERCISE_DATABASE`.

#### UI Changes
`SlotExercisePicker` should display a header note when `requiredMovementPattern` is set: "Hip thrust required — Glutes emphasized." Locate `SlotExercisePicker` source to confirm where to add this.

#### Migration Requirements
None.

#### Test Requirements
- `getRecommendedExercises({muscle: 'Glutes', role: 'Primary', requiredMovementPattern: 'hip-extension', ...})` → only returns exercises with `movementPattern === 'hip-extension'`
- Same call with `availableEquipment: ['Bodyweight']` (no barbell/machine) → falls back to full glute pool (zero hip-thrust exercises available with bodyweight only, since all hip thrust variants need Barbell/Dumbbell/Machine)
- No `requiredMovementPattern` set → full original behavior

#### Implementation Complexity
Low — one filter in `getRecommendedExercises()` and one conditional prop at the call site.

---

### HV-008 — Forearm Placement Rule (Always Last in Pull Sessions)
**Priority:** P1

#### Current Behavior
`SESSION_TEMPLATES['Pull']` already places `Forearms` last (`sortOrder: 6`) in the template slot list. However `buildDaySlots()` uses the template's `sortOrder` via iteration order through `template.slots` — so as long as the `Pull` template keeps Forearms last, they'll appear last in generated programs. The risk is: (a) user manually reorders exercises via `moveExerciseUp/Down` in `useWorkoutStore`, and (b) the `FullBody` / `Upper` session templates may not enforce Forearms-last.

#### Proposed Behavior
Add a post-sort constraint to `buildDaySlots()`: after constructing `result`, if any slot has `muscle === 'Forearms'`, move all Forearms slots to after the last Back/Biceps/Traps slot. This is a deterministic reorder, not just a template ordering trust. This enforces the rule regardless of template changes.

For the `FullBody` and `Upper` session templates, verify Forearms placement and add Forearms slot spec at the end if not already present.

#### Expected User Impact
Forearm exercises always appear last in generated Pull and any session containing pull movements. Users who manually reorder exercises in the workout screen can still move forearms up — the constraint only applies at generation time.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Slot builder | `src/rules/slotBuilder.ts` | After building `result` array in `buildDaySlots()`, add a post-sort: find all Forearm slots, find the index of the last non-Forearm pull-type slot (Back/Biceps/Traps), move Forearms to after it. Recompute `sortOrder` values. |
| Session templates | `src/data/sessionTemplates.ts` | Verify `Pull` template has Forearms at end (it does, `sortOrder: 6`). Check `FullBody` and `Upper` templates — if they include Forearms, ensure they're at the end of the template spec list. |

#### Database Changes
None.

#### UI Changes
None.

#### Migration Requirements
None.

#### Test Requirements
- `buildDaySlots()` with Forearms and Back/Biceps muscles → Forearms slots have `sortOrder` greater than all Back and Biceps slots
- `buildDaySlots()` with Forearms only (no pull muscles) → Forearms stays wherever it is (no crash)
- `buildDaySlots()` with no Forearms → no change to existing sort

#### Implementation Complexity
Low — a post-sort array manipulation with no new data model changes.

---

### HV-013 — Deadlift Blocks Same-Session Barbell Row
**Priority:** P1

#### Current Behavior
No intra-session compatibility check exists between deadlift-pattern and barbell-row exercises. The session templates do not co-assign deadlifts and barbell rows on the same day (deadlifts are a Back/Hamstrings hinge movement; rows are also Back), but a user can manually add both to the same day via the `+ Add Exercise` button in the Day screen.

There is no `exerciseTag` field on `ExerciseDefinition`. The fatigue check (`fatigueCost`) exists on the TS side but is not used in any current validation.

#### Proposed Behavior
Add an `exerciseTags?: string[]` field to `ExerciseDefinition`. Tag exercises:
- `'deadlift'`: `'Deadlift'` (DB-only), `'Sumo Deadlift'` (DB-only), `hm-02` Stiff-Leg Deadlift
- `'barbell-row'`: `ba-04` Barbell Row, `ba-05` T-Bar Row

Add a new `validateDayExercises()` function in `src/rules/validation.ts` (or a new `src/rules/sessionValidator.ts`). When called with a list of exercise names for a session:
1. Check if any exercise has tag `'deadlift'`
2. Check if any other exercise has tag `'barbell-row'`
3. If both present: for `beginner`/`intermediate` → push `SPINAL_LOADING_OVERLAP` error recommending swap of the barbell row to `'Seated Cable Row'` or `'Chest-Supported Row'`; for `advanced` → push warning only

Call this validator from the Day screen when the user adds an exercise (in `handleAddExercise` in `app/programs/[id]/day/[dayId].tsx`).

#### Expected User Impact
When a beginner or intermediate user tries to add a Barbell Row to a day that already contains a Deadlift (or vice versa), an alert fires: "Deadlift + Barbell Row on the same day overloads the lumbar spine. Replace the row with Chest-Supported Row or Seated Cable Row." Advanced users see a softer advisory, not a block.

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Exercise data (TS) | `src/data/exerciseDatabase.ts` | Add `exerciseTags?: string[]` to the 4 affected entries |
| Types | `src/types/program.ts` | Add `exerciseTags?: string[]` to `ExerciseDefinition` |
| Validation | `src/rules/validation.ts` | New exported function `validateDayExercises(exerciseNames: string[], experienceLevel: ExperienceLevel): ProgramValidationIssue[]` |
| UI (day screen) | `app/programs/[id]/day/[dayId].tsx` | In `handleAddExercise`, after calling `addProgramExercise`, call `validateDayExercises([...exercises.map(e => e.exercise_name), name], experienceLevel)` and show `Alert` if issues present |

#### Database Changes
New column `exercise_tags text[]` on `exercises` table. Migration sets `exercise_tags = ARRAY['deadlift']` for Deadlift/Sumo Deadlift/Stiff-Leg Deadlift, and `exercise_tags = ARRAY['barbell-row']` for Barbell Row (Bent Over)/T-Bar Row.

#### UI Changes
`Alert.alert()` in `handleAddExercise` in the Day screen — already used elsewhere in that file.

#### Migration Requirements
New migration: `alter table exercises add column if not exists exercise_tags text[];` + targeted updates.

#### Test Requirements
- `validateDayExercises(['Deadlift', 'Barbell Row (Bent Over)'], 'intermediate')` → 1 error issue
- `validateDayExercises(['Deadlift', 'Barbell Row (Bent Over)'], 'advanced')` → 1 warning issue
- `validateDayExercises(['Deadlift', 'Seated Cable Row'], 'intermediate')` → no issues
- `validateDayExercises(['Seated Cable Row', 'Barbell Row (Bent Over)'], 'beginner')` → no issues (no deadlift)
- `validateDayExercises([], 'beginner')` → no crash

#### Implementation Complexity
Medium — requires new `exerciseTags` field, a new validation function, a new DB column, and wiring the check into the Day screen's add-exercise flow.

---

### HV-020 — Tricep Overhead Extension Coverage Requirement
**Priority:** P1

#### Current Behavior
`exerciseRecommender.ts` ranks Tricep exercises by SFR tier and equipment. `'Dumbbell Overhead Tricep Extension'` (tr-02) and `'Cable Overhead Tricep Extension'` (tr-03) are `sfrTier: 'tier1'` and will score highest — but there is no enforcement that an overhead variant must appear when the user has ≥2 Tricep slots. A user can pick pushdowns for both slots and no warning fires.

#### Proposed Behavior
Add to `validateProgram()` in `src/rules/validation.ts`: when a day has ≥2 Triceps slots AND all selected exercises have `movementPattern === 'tricep-extension'` but none have an `exerciseTag` of `'overheadExtension'` (or equivalently, none match exercise IDs `tr-01`, `tr-02`, `tr-03`), flag `TRICEP_LONG_HEAD_COVERAGE_ABSENT` (warning).

Since `exerciseTags` will be added for HV-013, use the same mechanism. Tag `tr-01` (Skull Crusher), `tr-02` (Dumbbell Overhead), `tr-03` (Cable Overhead) with `exerciseTags: ['overheadExtension']`.

Like HV-004, this check only fires when `selectedExercise` is populated on slots.

#### Expected User Impact
When saving or previewing a program where both Tricep slots use pushdowns/close-grip bench, a soft warning appears: "No overhead tricep extension in your program — the long head is only stretched overhead. Consider replacing one slot with Skull Crusher or Overhead Extension."

#### Affected Components
| Layer | File | Change required |
|---|---|---|
| Exercise data (TS) | `src/data/exerciseDatabase.ts` | Add `exerciseTags: ['overheadExtension']` to `tr-01`, `tr-02`, `tr-03` |
| Types | `src/types/program.ts` | `exerciseTags` already added by HV-013 — no additional change |
| Validation | `src/rules/validation.ts` | Add tricep coverage check after back-plane check. Count Triceps slots with selected exercises. Check that at least one has an exercise with `exerciseTags?.includes('overheadExtension')`. If ≥2 Triceps slots and none overhead → push `'weekly_volume'` type warning (or add new `'muscle_coverage'` type). |
| Database | `exercises` table | Set `exercise_tags = array_append(exercise_tags, 'overheadExtension')` for `'Skull Crusher (Barbell)'`, `'Skull Crusher (EZ-Bar)'`, `'Overhead Tricep Extension (Cable)'`, `'Overhead Tricep Extension (Dumbbell)'` |

#### Database Changes
Covered by HV-013's `exercise_tags` migration — just additional `update` statements for the overhead extension exercises.

#### UI Changes
None beyond existing validation issue rendering.

#### Migration Requirements
Batched into HV-013's migration.

#### Test Requirements
- 2 Tricep slots, both `'Tricep Pushdown (Rope)'`: warning fires
- 2 Tricep slots, one `'Tricep Pushdown (Rope)'` + one `'Skull Crusher (Barbell)'`: no warning
- 1 Tricep slot only: no warning (requirement is ≥2 slots)
- No Tricep slots: no crash

#### Implementation Complexity
Low — uses the `exerciseTags` infrastructure from HV-013, one check block in `validateProgram()`.

---

## Implementation Sequence

1. **HV-019 (P0, standalone)** — `hardRirFloor` on 3 exercises + one line in `progressionEngine.ts`. No dependencies. Ship first.

2. **HV-001 (P1, RIR logic)** — Extends the progression engine using already-present `mesoWeek`/`totalMesoWeeks` context. Do immediately after HV-019 so the floor and taper compose correctly (taper first, floor second in the engine). Also fixes the `Math.max(1, ...)` floor in `slotBuilder.ts::applyWeekParams()` for advanced users.

3. **HV-008 (P1, sort-only)** — Pure post-sort in `buildDaySlots()`. No metadata, no DB. Can be done in 20 minutes. Do before the metadata pass so the sort constraint is proven stable before more slots are added.

4. **HV-013 + HV-020 (P1, batch)** — Both require `exerciseTags?: string[]` on `ExerciseDefinition` and the `exercises.exercise_tags` DB column. Do the shared taxonomy metadata work once, then implement both validators in the same PR. HV-013 adds `validateDayExercises()` (runtime, day screen); HV-020 adds a check inside existing `validateProgram()` (generation time).

5. **HV-004 (P1, back plane)** — Uses existing `movementPattern` field on `ExerciseDefinition`, no new metadata. Add check to `validateProgram()`. Can be done alongside step 4 if the reviewer is comfortable with a larger PR, or as a follow-on.

6. **HV-007 (P1, exercise filter)** — Requires no new metadata (hip-extension pattern already on glute exercises). Add `requiredMovementPattern` to `PickerContext`, wire into `SlotExercisePicker` call site. Do after step 5 so the general exercise recommender pattern is clean.

7. **HV-002 (P1, post-generation audit)** — Pure proportionality math in `validateProgram()`. Completely independent. Do last so all generation rules are stable and the baseline set counts are correct before adding the proportionality thresholds.

---

## Shared Infrastructure Work

These items are prerequisites shared by multiple rules and should be completed before the rules that depend on them:

### 1. `exerciseTags?: string[]` on `ExerciseDefinition`
**Used by:** HV-013 (deadlift/barbell-row tags), HV-020 (overheadExtension tag)
**Where:** `src/types/program.ts` (`ExerciseDefinition` interface) + `src/data/exerciseDatabase.ts` (data entries) + new DB migration for `exercises.exercise_tags text[]`
**Exercises to tag in this pass:** Deadlift/Sumo Deadlift/Stiff-Leg DL (`'deadlift'`), Barbell Row/T-Bar Row (`'barbell-row'`), Skull Crusher ×2 / Overhead Extension ×2 (`'overheadExtension'`)

### 2. `hardRirFloor?: number` on `ExerciseDefinition`
**Used by:** HV-019 (deadlift floor) — also a prerequisite for HV-001 so the taper + floor compose correctly
**Where:** `src/types/program.ts`, `src/data/exerciseDatabase.ts`, `src/rules/progressionEngine.ts` (`SlotPrescription`), `src/api/progression.ts`, new DB migration for `exercises.hard_rir_floor int`

### 3. `'proportionality' | 'back_plane' | 'muscle_coverage'` in `ProgramValidationIssue.type`
**Used by:** HV-002, HV-004, HV-020
**Where:** `src/types/program.ts` — add all three to the union in one pass before implementing the validation checks

### 4. `requiredMovementPattern?: MovementPattern` in `PickerContext`
**Used by:** HV-007
**Where:** `src/rules/exerciseRecommender.ts` — add to the `PickerContext` interface
