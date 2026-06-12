# Rule Adoption Plan
Date: 2026-06-12
Source: high_value_rule_candidates.md

## Decision Framework

Each candidate is evaluated on four axes:
- **User impact** — does this meaningfully change what the user receives?
- **Doctrine confidence** — how well-established is the underlying principle?
- **Implementation complexity** — lines of code, new data fields, new user input required?
- **Maintenance cost** — will this create fragile edge cases or require frequent tuning?

Priorities: **P0** = Critical (safety or core correctness) · **P1** = High value · **P2** = Nice to have · **P3** = Future research

---

## Category 1: Implement Now

These candidates have high confidence, low-to-medium complexity, and directly affect the quality of workout or progression output. They do not require new user inputs or major data model changes.

---

### HV-019 — Deadlift RIR Hard Floor = 1 (Always)
**Recommendation:** Implement now
**Priority:** P0
**Rationale:** A one-line metadata override (`hardRirFloor: 1` on deadlift variants) prevents the progression engine from prescribing 0 RIR on an axially loaded spinal movement. This is safety-critical. RC-006 addresses compound vs. isolation RIR but leaves a gap for advanced users who could receive 0 RIR deadlifts. The fix requires no new data model fields — just a per-exercise `hardRirFloor` field that overrides slot prescription. No tradeoffs. No maintenance burden. Should not be deferred.

---

### HV-001 — Intra-Mesocycle RIR Taper (Weeks 1→Last = RIR 3→0)
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** Currently the engine assigns a fixed RIR regardless of where the user is in their mesocycle. Every week feels the same. The RIR taper aligns intensity with the volume accumulation wave — a well-established principle in periodization. `mesoBlockWeek` and `totalMesoWeeks` already exist in the data model, so this is a modifier on existing RIR derivation: `prescribedRir = baseRir + (mesoWeeksRemaining - 1)`, clamped 0–3. Apply to intermediate and advanced users only; beginners stay fixed. Gate off deload weeks (DL-007 already handles those). This changes every working-set RIR prescription for every mesocycle — the highest coverage per line of code of any candidate.

---

### HV-002 — Volume Proportionality Audit
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** A post-generation validation step that flags `VOLUME_PROPORTIONALITY_IMBALANCE` when small muscles (biceps/triceps) exceed ~8% of total weekly sets or large muscles (quads) fall below ~18%. Catches the single most common structural flaw in user programs — arm-dominant programming. Uses `muscle.weeklyDirectSets` values already tracked by VA-001–VA-003, so no new data fields required. Implement as a soft warning at program creation, not a hard block — some specialization programs intentionally violate proportionality.

---

### HV-004 — Back Horizontal/Vertical Pull Parity
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** A back program that contains only lat pulldowns or only rows has a structural gap — lats (vertical pull) and rhomboids/upper back (horizontal pull) are anatomically distinct. Requires adding `movementCategory: 'VerticalPull' | 'HorizontalPull'` to back exercise metadata, then checking that at least one of each is present in any week containing back volume. Analogous structure to the shoulder plane coverage check (RC-007) already identified. Medium-difficulty metadata addition, trivial logic. Impact is high — catches a common flaw in beginner and intermediate programs.

---

### HV-007 — Hip Thrust as Mandatory Primary When Glutes Are Prioritized
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** When `muscle.priority === 'emphasize' || 'grow'` for Glutes, the Primary slot must be a hip-thrust-pattern movement — not a squat. ES-001 correctly lists hip thrust as the glute Primary in doctrine, but the slot assignment logic does not enforce it programmatically; a squat could fill the Primary slot and pass all current rules. This is a targeted `requiredMovementCategory` override for one specific muscle at two priority levels — low maintenance, clear doctrine backing, Strong Evidence. Include an equipment-unavailable fallback: cable hip extension or resistance band glute bridge.

---

### HV-008 — Forearm Placement Rule (Always Last in Pull Sessions)
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** Forearm flexors and the brachioradialis are the limiting factor on grip. Pre-fatiguing them before back or bicep work reduces stimulus quality on all subsequent pulling movements — this is mechanistically direct, not a coaching preference. A post-sort constraint (`if slot.muscle.id === 'Forearms' → move after last pull/row/back/bicep slot`) is a pure slot-ordering rule with no data model changes. Hard rule, not a flag. The only maintenance concern is ensuring the constraint is applied after EO-001–EO-003 rather than conflicting with them.

---

### HV-013 — Deadlift Blocks Same-Session Barbell Row
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** VA-010 (1 `very_high` fatigue exercise per session) catches the worst case but misses deadlift + barbell row if row is rated `high` instead of `very_high`. The spinal-loading overlap is real: deadlifts fatigue lumbar erectors used to stabilize during bent-over rows, degrading both safety and stimulus. Tag-based check (`exerciseTag === 'deadlift'` blocks `exerciseTag === 'barbell-row'` in same session). For beginners/intermediates: hard block with a chest-supported or cable row substitution. For advanced: soft flag with recommendation. Requires `exerciseTag` or `spinalLoadingClass` metadata on ~5 exercises.

---

### HV-020 — Tricep Overhead Extension Coverage Requirement
**Recommendation:** Implement now
**Priority:** P1
**Rationale:** The tricep long head is only fully activated with the arm overhead (shoulder flexed). A user who fills their tricep slots with pushdowns and close-grip bench never stimulates the long head through its stretch. When `muscle.id === 'Triceps'` has ≥2 weekly slots, at least one must have `exerciseTag === 'overheadExtension'`. This mirrors HV-006 (bicep long-head check) and HV-004 (back plane parity) — a consistent pattern the engine can express uniformly. Soft flag, not a hard block (allows coach override). Requires `overheadExtension` tag on skull crusher, cable overhead extension, dumbbell overhead extension.

---

## Category 2: Implement Later

These candidates are valid and worth building, but require new user inputs, larger data model changes, or carry dependency on other features not yet built.

---

### HV-016 — Sumo Deadlift Default for Lumbar History
**Recommendation:** Implement later
**Priority:** P1
**Rationale:** Strong Evidence, clear doctrine backing, low implementation complexity once the dependency exists — but requires `user.injuryHistory.lumbar` as a new user model field and an onboarding question. The injury-history field would unlock multiple safety features (HV-013 already hints at spinal load awareness). Build the `injuryHistory` input first; this rule is a 2-line implementation once it exists. Do not stub this with a manual workaround — wait for the proper data model.

---

### HV-005 — Lagging Muscle Priority Override (Session Position 0)
**Recommendation:** Implement later
**Priority:** P2
**Rationale:** The principle is sound — train weak points when you're freshest. But this requires a user-facing `lagFlag` input at the muscle level, which currently doesn't exist in the program builder. Building this without the UI is useless; building the UI is a product decision, not just an engineering one. When the program customization UI is expanded to allow per-muscle priority tagging, wire in this sort-order override at the same time. Low implementation complexity once the user input exists.

---

### HV-012 — 5× Weekly High-Frequency Full-Body Split Template
**Recommendation:** Implement later
**Priority:** P2
**Rationale:** Moderate Evidence (not Strong), difficulty 3, and represents an entirely new program architecture — new split template, FA-002 conditional, exercise rotation enforcement across 5 sessions. The current PPL and Upper/Lower templates serve the majority of users. This is worth adding as an advanced template option but carries meaningful maintenance cost (testing 5-session rotation logic for each muscle group, validating MEV coverage at lower per-session volumes). Prioritize after RC-009 (asymmetrical A/B splits) is proven stable.

---

### HV-003 — Machines as Valid Primary Slot for Hypertrophy Focus
**Recommendation:** Implement later — after doctrine conflict is resolved
**Priority:** P2
**Rationale:** This is the most impactful unresolved tension in the knowledge base. Multiple sources rate machines superior SFR for pure hypertrophy on quads, chest, and back — but current doctrine explicitly mandates barbell compounds in Primary slots. Implementing this now would contradict doctrine without a deliberate decision to update it. The right sequence: (1) resolve the doctrine conflict explicitly (add a `programFocus`-conditional to exercise_selection.md), (2) add `sfr_rating` metadata to exercise taxonomy, (3) implement the conditional. Do not implement against unresolved doctrine disagreement. Complexity: 3/5 — requires `sfr_rating` taxonomy metadata and conditional exercise filter.

---

### HV-018 — Leg Press Foot Placement to Complement Squat Bias
**Recommendation:** Implement later
**Priority:** P2
**Rationale:** The mechanistic logic is correct — squat and leg press should cover complementary muscular regions, not duplicate. But this requires `squatBias` tagging on squat variants, `LegPress_QuadBias` / `LegPress_GluteBias` exercise variants, and inter-exercise coordination in the session builder. Difficulty 3 for what is effectively a coaching tip. Consider delivering this as a coaching cue in the UI ("Your leg press foot placement — try higher to complement your high-bar squat") rather than engine logic. Revisit as an engine rule if user research shows the placement mistake is common enough to warrant automated enforcement.

---

## Category 3: Coaching Guidance

These candidates are real and evidence-backed, but better delivered as technique cues, setup checklists, or opt-in UI features than as computable rules. Adding them to the rules engine would overengineer a nuance that belongs in the UX layer.

---

### HV-009 — Trap Shrug Forward Lean Cue
**Recommendation:** Coaching guidance — exercise metadata
**Priority:** P2
**Rationale:** Add a technique cue and AC joint risk flag to the trap shrug exercise taxonomy entry. `techniqueCue: "Lean forward 15–30° to match upper trap fiber direction. No shoulder roll at lockout."` This is a metadata addition that surfaces in the workout UI — it is not a rule. The engine has no mechanism to detect whether the user is leaning forward during their shrugs, so no algorithmic enforcement is possible. One metadata field, high user value.

---

### HV-010 — Calf Deep-Stretch Protocol
**Recommendation:** Coaching guidance — exercise cue + rest timer prompt
**Priority:** P2
**Rationale:** Add technique cue to calf raise entry emphasizing the eccentric stretch as the primary hypertrophic phase, with explicit "do not bounce" instruction. Surface a 30-second loaded stretch prompt after the final working set. This interacts naturally with the rest timer UI. Not a rules change — the engine cannot detect calf bouncing. If `muscle.lagFlag === true` for Calves, link to HV-005 session-start placement when that feature is built.

---

### HV-011 — Hip Thrust Setup Checklist (Vertical Shin Rule)
**Recommendation:** Coaching guidance — pre-set checklist
**Priority:** P2
**Rationale:** Add a 4-point setup checklist that surfaces before the first hip thrust working set: bench below scapulae, pad on hips, chin tucked, vertical shin target. The "vertical shin = glute isolation" cue is mechanistically correct and prevents the most common setup error. This is a UI feature for the workout screen, not a rules engine change. Pair with HV-007 (hip thrust mandatory for glutes) — when the engine enforces hip thrust selection, the setup checklist fires automatically.

---

### HV-006 — Bicep Long-Head Overhead Coverage Check
**Recommendation:** Coaching guidance — soft tip (not hard rule)
**Priority:** P2
**Rationale:** Confidence is 3/5 (Moderate Evidence, not Strong). The bicep long-head distinction is real but the user impact is marginal for most people. Rather than a `BICEP_LONG_HEAD_COVERAGE_ABSENT` flag in the engine, surface this as a program-builder tip: "Your bicep slots don't include an incline or overhead curl — these specifically target the long head (outer peak). Consider rotating one slot." Soft and informational, not enforced. Revisit as a rule if/when evidence strengthens to Strong.

---

### HV-014 — Explosive Concentric + Slow Eccentric Tempo
**Recommendation:** Coaching guidance — tempo cue update
**Priority:** P2
**Rationale:** Confidence is 3/5 — Moderate Evidence. The "explosive concentric / controlled eccentric" tempo is correct and likely an improvement over the current implicit "controlled both ways" assumption. But this is a cue, not a rule — the engine cannot detect tempo or enforce it. Update the default tempo cue in set instructions from "controlled lowering" to "2–3s down / press as fast as form allows." Gate the "explosive concentric" language behind `user.experienceLevel !== 'beginner'` — beginners need to master control before adding intent-to-explode.

---

### HV-015 — Inter-Set Stretch Protocol (30-Second Moderate Stretch)
**Recommendation:** Coaching guidance — opt-in rest timer feature
**Priority:** P2
**Rationale:** Moderate Evidence, no downside, zero maintenance cost. This belongs in the rest timer as an opt-in: "Stretch [muscle] for 30 seconds while resting — this may enhance growth." Not a rule because it cannot be enforced and not all users will want the interruption. Build as a toggle in session preferences. Gate behind `experienceLevel !== 'beginner'`.

---

### HV-017 — Feeder-Set Warm-Up Protocol for Neural-Demand Exercises
**Recommendation:** Coaching guidance — optional warm-up flow
**Priority:** P3
**Rationale:** Confidence 3/5, difficulty 3. A 4-set RPE-escalating warm-up before deadlifts and lat pulldowns is genuinely useful, but generating it automatically adds significant session-flow complexity (non-counting sets, RPE targets that differ from working-set RIR language, UI state for "feeder vs. working"). The value doesn't justify the engine complexity. Surface instead as a pre-workout tip: "For deadlifts and heavy rows, consider 4 escalating warm-up sets (light → near max) before your first working set." Revisit as a generated protocol if user research shows warm-up guidance is a common gap.

---

## Category 4: Discard

**None of the 20 candidates are discarded.** All meet the ≥3.0 composite score threshold and have mechanistic backing. The coaching guidance items are not discarded — they are categorized differently. The implementation-later items are not discarded — they are sequenced.

---

## Summary Table

| ID | Title | Decision | Priority |
|---|---|---|---|
| HV-019 | Deadlift RIR hard floor = 1 | **Implement now** | P0 |
| HV-001 | Intra-mesocycle RIR taper | **Implement now** | P1 |
| HV-002 | Volume proportionality audit | **Implement now** | P1 |
| HV-004 | Back H/V pull parity | **Implement now** | P1 |
| HV-007 | Hip thrust mandatory for glutes | **Implement now** | P1 |
| HV-008 | Forearm last in pull sessions | **Implement now** | P1 |
| HV-013 | Deadlift blocks barbell row | **Implement now** | P1 |
| HV-020 | Tricep overhead coverage | **Implement now** | P1 |
| HV-016 | Sumo default for lumbar history | **Implement later** | P1 |
| HV-005 | Lagging muscle → session start | **Implement later** | P2 |
| HV-012 | 5× weekly split template | **Implement later** | P2 |
| HV-003 | Machine primaries for hypertrophy | **Implement later** | P2 |
| HV-018 | Leg press foot placement complement | **Implement later** | P2 |
| HV-009 | Trap shrug forward lean cue | **Coaching guidance** | P2 |
| HV-010 | Calf deep-stretch protocol | **Coaching guidance** | P2 |
| HV-011 | Hip thrust vertical shin setup | **Coaching guidance** | P2 |
| HV-006 | Bicep long-head coverage tip | **Coaching guidance** | P2 |
| HV-014 | Explosive concentric tempo cue | **Coaching guidance** | P2 |
| HV-015 | Inter-set stretch (opt-in) | **Coaching guidance** | P2 |
| HV-017 | Feeder-set warm-up protocol | **Coaching guidance** | P3 |

## Implementation Order for P1 "Implement Now" Items

Recommended sequencing based on dependencies and shared infrastructure:

1. **HV-019** — Deadlift RIR floor (standalone, 1 field)
2. **HV-001** — RIR taper (modifies existing RIR derivation; do before other RIR changes)
3. **HV-008** — Forearm sort rule (pure sort constraint, no metadata needed)
4. **HV-004 + HV-020** — Back parity and tricep coverage (both need `movementCategory`/`exerciseTag` metadata — batch the taxonomy work)
5. **HV-007** — Hip thrust enforcement (needs `requiredMovementCategory` per-muscle override — do after taxonomy metadata pass)
6. **HV-013** — Deadlift/row block (needs `exerciseTag` on ~5 exercises — can be done in same metadata pass as #4)
7. **HV-002** — Volume proportionality audit (post-generation validation — independent, do last so all generation rules are stable first)
