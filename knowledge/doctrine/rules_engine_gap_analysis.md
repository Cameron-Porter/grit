# Rules Engine Gap Analysis

> Scope: rules_engine.md (55 rules) vs. all doctrine files in knowledge/doctrine/
> Method: doctrine-first — identify what the doctrine says, then check whether the engine covers it
> Goal: incremental improvement only; no architecture changes

---

## 1. Existing Rules Already Supported by Doctrine

The following categories are well-covered with high-confidence rules that align cleanly with doctrine. No action needed.

| Category | Coverage | Notes |
|---|---|---|
| VA-001/002/003 | Volume landmarks (MEV/MAV/MRV by priority) | Directly from volume_landmarks.md — numbers match |
| VA-004/005/006 | Session hard caps (5 slots, 24 sets, 5 sets/exercise) | Matches hypertrophy.md session design rules |
| VA-007 | Junk volume gate (RIR >= 4) | Correct threshold; matches effective_training_principles.md |
| FA-003/001/004 | Recovery class assignment, 2× minimum, 48-hour gap | Matches recovery.md and frequency doctrine |
| DL-001/002/003 | Scheduled/early deload triggers and volume floor | Matches deloading_protocols.md exactly |
| DL-004/005/006 | All three deload protocols (Load Retention, Joint Healing, Strength) | Protocol values match doctrine precisely |
| DL-007 | Deload RIR floor >= 4 | Correct; matches doctrine |
| PR-005 | Progression inhibition during cut | Matches training_during_fat_loss.md |
| MV-001/003/005 | MEV enforcement, muscle retention during cut, maintenance targeting | All high confidence, well-sourced |
| EO-001/002/003 | Role and priority ordering within sessions | Matches exercise_selection.md |
| FM-001/002/004 | Bad session detection, reset, and indirect volume formula | Correctly structured |

---

## 2. Missing Rules Supported by Doctrine

Listed in priority order (Impact × Complexity). Highest priority first.

---

### MISS-01 — ES-007 / DL-007 Rule Conflict
**Source:** hypertrophy.md (ES-007: RIR max = 3), deloading_protocols.md (DL-007: RIR min = 4 during deload)
**Confidence:** High
**Impact:** Critical — these two rules directly contradict each other. During a deload session, ES-007 clamps RIR to max 3; DL-007 requires min 4. If ES-007 executes after DL-007, it overwrites the deload RIR, producing sets that are too hard and defeating the deload.
**Complexity:** Very Low — add one condition to ES-007

**Fix:** Add `session.isDeloadWeek = false` as a prerequisite condition to ES-007.

```json
{
  "ruleId": "ES-007",
  "conditions": [
    { "field": "slot.rir", "operator": "gte", "value": 4 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ]
}
```

---

### MISS-02 — PR-001 Double Progression RIR Condition is Too Restrictive
**Source:** progression_framework.md (Section 2.1 — load increase condition: `slot.reportedRir <= slot.prescribedRir + 1`)
**Confidence:** High
**Impact:** High — PR-001 hard-codes `slot.rir <= 2` as the RIR threshold to trigger a load increase. Accessory slots are legitimately prescribed at RIR 3. A user who hits the rep ceiling at exactly RIR 3 (correct effort for that slot type) will never trigger a load increase. This silently blocks progression on all Accessory slots.
**Complexity:** Very Low — change one condition value

**Fix:**
```json
{
  "ruleId": "PR-001",
  "conditions": [
    { "field": "progression.lastSessionReps", "operator": "gte", "value": "progression.targetRepsMax" },
    { "field": "slot.reportedRir", "operator": "lte", "formula": "slot.prescribedRir + 1" }
  ]
}
```

---

### MISS-03 — PR-001 Load Increment Uses Wrong Axis
**Source:** progression_framework.md (Load Increment Table: role × recoveryClass)
**Confidence:** High
**Impact:** High — PR-001 determines load increments from `muscle.recoveryClass` alone. But the doctrine table uses `slot.role` as the primary axis: Accessory = 1.25 lbs regardless of recovery class; Secondary = 2.5 lbs regardless; Primary uses recovery class. The current rule would prescribe 1.25 lbs for a fast-recovery Primary slot (e.g., overhead press), which is too small.
**Complexity:** Low — add role check as a priority condition

**Fix:** Before checking recoveryClass, check slot.role:
```
IF slot.role == 'Accessory': increment = 1.25 lbs
ELSE IF slot.role == 'Secondary': increment = 2.5 lbs
ELSE (Primary): use recoveryClass table (slow=5, standard/fast=2.5)
```

---

### MISS-04 — PR-004 Stall Threshold Not Differentiated by Experience Level
**Source:** progression_framework.md (Section 2.2: Intermediate stall = 3 weeks; Section 3.2: Advanced stall = 2 weeks)
**Confidence:** High
**Impact:** High — PR-004 applies a flat 3-week stall threshold for everyone. Advanced lifters should trigger plateau detection at 2 weeks because accommodation happens faster and they can distinguish fatigue-masking more accurately. Leaving advanced lifters at 3 weeks means real plateaus go undetected one extra week.
**Complexity:** Low — split one condition into two branches

**Fix:**
```json
{
  "ruleId": "PR-004",
  "conditions": [
    {
      "if": { "field": "user.experienceLevel", "operator": "eq", "value": "advanced" },
      "then": { "field": "progression.consecutiveStallWeeks", "operator": "gte", "value": 2 }
    },
    {
      "else": { "field": "progression.consecutiveStallWeeks", "operator": "gte", "value": 3 }
    }
  ]
}
```

---

### MISS-05 — NEW DL-009: Absolute Maximum Interval Between Deloads
**Source:** progression_framework.md (Section 1.3, 2.3, 3.3: "6 weeks maximum regardless of performance"), recovery.md
**Confidence:** High
**Impact:** High — DL-001 triggers deloads at week 4, and DL-002 triggers early deloads on 2 bad sessions. But neither rule prevents a scenario where performance stays artificially good (e.g., user is undertrained) and week 6+ is reached without a deload. A mandatory ceiling at 6 weeks is specified explicitly in doctrine.
**Complexity:** Low — one new rule, simple condition

**New Rule:**
```json
{
  "ruleId": "DL-009",
  "category": "DELOADING",
  "description": "Absolute maximum interval: if weeksSinceLastDeload >= 6, trigger mandatory deload regardless of performance. No performance metric exempts from this ceiling.",
  "confidence": "high",
  "sources": ["progression_framework.md", "recovery.md"],
  "conditions": [
    { "field": "user.weeksSinceLastDeload", "operator": "gte", "value": 6 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "set": "session.isDeloadWeek", "value": true },
    { "flag": "MANDATORY_DELOAD_MAX_INTERVAL" },
    { "apply": "DL-004" }
  ]
}
```

---

### MISS-06 — NEW ES-009: Beginner Exercise Eligibility Gate
**Source:** exercise_taxonomy.md (beginner_suitable field), strength.md ("Beginners should not train in the 1–4 rep range; requires technique precision that does not exist")
**Confidence:** High
**Impact:** High — the exercise taxonomy marks pull-ups, barbell rows, barbell back squat, front squat, deadlift, sumo deadlift as `beginner_suitable = false`. No rule in the engine currently prevents these from being assigned to beginner slots. A beginner who doesn't know better will have a barbell deadlift as their Primary Hip Hinge slot.
**Complexity:** Low — one new filter rule

**New Rule:**
```json
{
  "ruleId": "ES-009",
  "category": "EXERCISE_SELECTION",
  "description": "Filter exercise candidates by beginner_suitable flag when user.experienceLevel = beginner. Exercises marked beginner_suitable = false must not appear in the picker for beginner Primary slots.",
  "confidence": "high",
  "sources": ["exercise_taxonomy.md", "strength.md", "training_for_muscle_growth_beginner_to_advanced.md"],
  "conditions": [
    { "field": "user.experienceLevel", "operator": "eq", "value": "beginner" }
  ],
  "actions": [
    { "filter": "approved_exercises", "by": "exercise.beginner_suitable", "operator": "eq", "value": true }
  ]
}
```

---

### MISS-07 — NEW VA-010: Very-High Fatigue Exercise Cap Per Session
**Source:** exercise_taxonomy.md (fatigue point system: very_high = 4, session cap = 12 points)
**Confidence:** High
**Impact:** Medium-High — deadlifts and barbell squats are both tagged `very_high` fatigue. Pairing them in the same session (e.g., squat + deadlift) is a well-known programming error that produces excessive CNS fatigue with poor recovery. VA-004 and VA-005 cap slots and sets but not by fatigue class. The taxonomy explicitly says max 1 very_high per session.
**Complexity:** Low — simple count constraint

**New Rule:**
```json
{
  "ruleId": "VA-010",
  "category": "VOLUME_ALLOCATION",
  "description": "Hard cap at 1 exercise with fatigue_rating = very_high per session. Pairing two very_high fatigue movements (e.g., deadlift + barbell squat) produces systemic fatigue that outpaces any additional hypertrophic benefit.",
  "confidence": "high",
  "sources": ["exercise_taxonomy.md", "recovery.md", "quad_specialization.md"],
  "conditions": [
    { "field": "session.veryHighFatigueSlotCount", "operator": "gt", "value": 1 }
  ],
  "actions": [
    { "trim": "slots", "strategy": "remove_second_very_high_fatigue_slot" },
    { "flag": "VERY_HIGH_FATIGUE_LIMIT_EXCEEDED" }
  ]
}
```

---

### MISS-08 — NEW FM-005: Post-Deload Bad Session Immunity Window
**Source:** strength.md ("expect 5–10% performance dip immediately after deload; full expression returns within 1–2 sessions"), progression_framework.md (Section 4.3)
**Confidence:** Moderate-High
**Impact:** Medium-High — FM-001 increments `consecutiveBadSessions` on any performance regression. If a user's first post-deload session performs at 95% (a normal deload rebound lag), FM-001 fires incorrectly. Two mildly low post-deload sessions could immediately trigger DL-002 (early deload), creating a deload loop.
**Complexity:** Low — one additional condition on FM-001

**Fix:** Add condition to FM-001:
```json
{
  "additional_condition": {
    "field": "user.sessionsSinceLastDeload",
    "operator": "gt",
    "value": 1
  }
}
```
Do not increment `consecutiveBadSessions` until session 2+ after a deload completes.

---

### MISS-09 — NEW PR-009: Cross-Mesocycle Load Carry-Forward
**Source:** progression_framework.md (Section 3.4 Advanced — "New meso Week 1 load = highest load reached in previous meso")
**Confidence:** High
**Impact:** High — PR-007 resets weekly volume target to MEV at the start of a new mesocycle. But it says nothing about load. Without a carry-forward rule, the engine has no way to track that the load at Week 1 of Meso 2 should begin from where Meso 1 peaked — not from where Meso 1 started. This is essential for intermediate and advanced progression.
**Complexity:** Medium — requires tracking `slot.peakLoadPreviousMeso`

**New Rule:**
```json
{
  "ruleId": "PR-009",
  "category": "PROGRESSION",
  "description": "Cross-mesocycle load carry-forward for intermediate and advanced lifters: the starting load at Week 1 of a new mesocycle equals the highest load achieved on that slot in the previous mesocycle. This prevents losing intra-mesocycle progression gains at the meso boundary.",
  "confidence": "high",
  "sources": ["progression_framework.md", "progression.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "eq", "value": 1 },
    { "field": "program.weekNumber", "operator": "gt", "value": 4 },
    { "field": "user.experienceLevel", "operator": "in", "value": ["intermediate", "advanced"] }
  ],
  "actions": [
    {
      "set": "slot.startingLoad",
      "formula": "slot.peakLoadPreviousMeso",
      "fallback": "slot.currentLoad"
    }
  ]
}
```

---

### MISS-10 — NEW PR-010: Fat Loss Phase Rep Floor Enforcement
**Source:** progression_framework.md (Section 4.4: "All Primary slots: prescribedRepsMin >= 8 during cut"), strength.md, training_during_fat_loss.md
**Confidence:** High
**Impact:** Medium — ES-006 enforces the universal rep floor of 5. But doctrine specifically requires that during a cut, no Primary slot should be assigned below 8 reps. The risk is disproportionate injury from heavy loading in an energy-restricted state.
**Complexity:** Very Low — simple condition override

**New Rule:**
```json
{
  "ruleId": "PR-010",
  "category": "PROGRESSION",
  "description": "During fat loss phase, enforce repsMin >= 8 on all Primary slots. Caloric deficit plus heavy loading (5–7 reps) creates disproportionate injury risk with no additional hypertrophy benefit over the 8–12 rep range.",
  "confidence": "high",
  "sources": ["training_during_fat_loss.md", "progression_framework.md", "strength.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" },
    { "field": "slot.role", "operator": "eq", "value": "Primary" },
    { "field": "slot.repsMin", "operator": "lt", "value": 8 }
  ],
  "actions": [
    { "set": "slot.repsMin", "operator": "clamp_min", "value": 8 }
  ]
}
```

---

### MISS-11 — NEW EO-005: Weekly Push/Pull/Hinge/Squat Balance Check
**Source:** exercise_taxonomy.md (Push/Pull/Hinge/Squat balance table), exercise_selection.md, foundational_beliefs.md (U-03)
**Confidence:** High
**Impact:** Medium — The taxonomy specifies that every week must contain Push (horizontal + vertical), Pull (horizontal + vertical), Hinge, and Squat movement patterns. No rule validates this. A program could have 4 chest sessions and no hinge work without triggering any flag.
**Complexity:** Low — pattern-based flag, no trimming required

**New Rule:**
```json
{
  "ruleId": "EO-005",
  "category": "EXERCISE_ORDERING",
  "description": "Validate weekly session plan for push/pull/hinge/squat movement balance. Flag any week missing one of the four fundamental movement patterns for 2+ consecutive weeks.",
  "confidence": "high",
  "sources": ["exercise_taxonomy.md", "exercise_selection.md"],
  "conditions": [
    { "field": "program.weekMovementPatterns", "operator": "missing_any", "value": ["Horizontal Press OR Incline Press OR Vertical Press", "Horizontal Pull OR Vertical Pull", "Hip Hinge", "Quad Dominant"] },
    { "field": "program.consecutiveWeeksMissingPattern", "operator": "gte", "value": 2 }
  ],
  "actions": [
    { "flag": "MOVEMENT_PATTERN_IMBALANCE" },
    { "recommend": "add_session_covering_missing_pattern" }
  ]
}
```

---

## 3. Rules That Should Be Modified

### MOD-01: DL-003 — Volume Floor Should Be a Range, Not Fixed Point
**Source:** recovery.md ("Adequate volume cut for most athletes: 50–70%")
**Confidence:** Moderate
**Impact:** Low-Medium — the current rule sets deload volume at exactly 50% of peak. The doctrine allows 50–70% depending on the individual. This should be expressed as a target range so the engine can adapt based on performance indicators.

**Change:** Replace `"value": 0.50` with `"range": [0.50, 0.70]` and default to 0.50. Flag if user performed too hard during deload (DL-007 violation) and recommend moving toward 0.70 for next deload.

---

### MOD-02: VA-009 — Experience Volume Multiplier Applied to Wrong Field
**Source:** volume_landmarks.md, training_for_muscle_growth_beginner_to_advanced.md
**Confidence:** Moderate
**Impact:** Low — VA-009 applies the multiplier to `muscle.weeklyDirectSetsMin`. But it should also scale `muscle.weeklyDirectSetsMax` (MRV) and `muscle.weeklyDirectSetsTarget` (MAV). A beginner with a scaled MEV but unscaled MRV could theoretically be pushed to 20+ sets, which exceeds recovery capacity.

**Change:** Apply the same multiplier to all three fields: `weeklyDirectSetsMin`, `weeklyDirectSetsTarget`, `weeklyDirectSetsMax`.

---

### MOD-03: PR-002 — Beginner Linear Progression Lacks Technical Failure Gate
**Source:** progression_framework.md (Section 1.1 — TECHNIQUE_FAILURE branch: hold load, then reduce if 2 consecutive)
**Confidence:** High
**Impact:** Medium — PR-002 has a note saying "Stop linear increase when technical failure is reached" but does not formalize this as a condition/action. It currently relies on the user's judgment. The doctrine provides exact logic: hold → then reduce if 2 consecutive failures.

**Change:** Convert the `note` in PR-002 into a formal condition:
```json
{
  "if": { "field": "slot.technicalFailure", "operator": "eq", "value": true },
  "then": { "set": "progression.autoIncrementEnabled", "value": false }
},
{
  "if": { "field": "slot.consecutiveTechnicalFailures", "operator": "gte", "value": 2 },
  "then": { "decrement": "progression.currentLoad", "by": "loadIncrementSize" }
}
```

---

### MOD-04: PR-004 — Missing Fatigue Masking Disambiguation Step
**Source:** progression_framework.md (Section 2.2 — STEP 1: "Check if fatigue masking is possible before treating as true plateau")
**Confidence:** High
**Impact:** Medium — PR-004 currently fires `PROGRESSION_STALL` and recommends exercise rotation without first checking whether the stall is fatigue-masking. The doctrine is explicit: deload first if `weeksSinceLastDeload >= 3` or `mesoBlockWeek >= 3`, then retest. Only if performance doesn't rebound post-deload should exercise rotation be recommended.

**Change:** Add a branch to PR-004 actions:
```json
{
  "before_rotation_check": {
    "if": [
      { "field": "user.weeksSinceLastDeload", "operator": "gte", "value": 3 },
      { "OR": { "field": "session.mesoBlockWeek", "operator": "gte", "value": 3 } }
    ],
    "then": {
      "flag": "STALL_FATIGUE_MASKING_SUSPECTED",
      "recommend": "deload_then_retest_before_rotating_exercise"
    },
    "else": {
      "flag": "PROGRESSION_STALL",
      "recommend": "rotate_exercise_at_next_mesocycle_boundary"
    }
  }
}
```

---

## 4. Rules That Should Be Removed

### REMOVE-01: ES-007 Conflicts with DL-007 (Merge Rather Than Remove)
See MISS-01 above. ES-007 itself is correct for non-deload sessions; it should not be removed, only guarded with a deload condition. This is the most critical fix in the entire analysis.

### REMOVE-02: AD-001 and RM-002 — Partial Overlap
Both rules enforce the 120-minute session cap with the same trim action. They are not causing a bug (duplicate flags are harmless), but could be consolidated into one rule with both the 90-minute soft warning and 120-minute hard cap. Low priority — not harmful as-is.

---

## 5. Opportunities to Improve Decision Quality

### OPP-01: Deload Protocol Selection Logic is Missing
**Source:** progression_framework.md (Section 3.3 — "Protocol selection: if user.jointStressFlag = true → Joint Healing; else → Load Retention")
**Impact:** Medium — DL-004 and DL-005 exist as separate rules that users must opt into. There is no automatic protocol selector. The engine should have one rule that routes to the correct deload protocol based on `user.experienceLevel` and `user.jointStressFlag`. Currently the routing lives only in DL-001 (which calls DL-004 directly, ignoring advanced users who should get DL-005).
**Complexity:** Low — a routing rule

**Suggestion:** Add a `DL-010` routing rule that evaluates experience level and joint stress flag and applies the appropriate protocol, replacing the hardcoded `apply: DL-004` in DL-001 and DL-002.

---

### OPP-02: Cross-Mesocycle Volume Advancement Not Tracked
**Source:** progression_framework.md (Section 2.4 / 3.4 — "If >= 60% of muscles progressed, new meso MEV = prior MEV + 1 set")
**Impact:** Medium — PR-007 resets MEV at the start of each meso but never considers whether MEV itself should increase. Without this, the engine would give a lifter the same MEV forever. This is the cross-mesocycle volume overload mechanism.
**Complexity:** Medium — requires tracking per-muscle progression rates across mesocycles

**Suggestion:** New `PR-011` rule that evaluates whether MEV should be incremented at meso start based on prior meso progression rate.

---

### OPP-03: RM-004 (Logged RIR Deviation) Only Fires When RIR is Logged
**Source:** effective_training_principles.md
**Impact:** Low-Medium — RM-004 currently requires `slot.actualRirLogged != null`. For users who don't log RIR, this rule never fires. Consider adding a lower-frequency fallback: if progression.lastSessionReps consistently exceeds targetRepsMax by >= 3 reps, infer undertraining without requiring explicit RIR logging.
**Complexity:** Medium

---

### OPP-04: PR-006 Tempo Progression Depends on Untracked Field
**Source:** progression_framework.md
**Impact:** Low — PR-006 fires when `progression.loadIncreaseBlocked = true`. This field is not defined in the rules engine data model. Without a producer for this field, PR-006 can never fire. Define when `loadIncreaseBlocked` is set to `true` (e.g., when using fixed-weight equipment like a cable stack at its maximum plate).
**Complexity:** Low — add a producer rule or document the field trigger

---

## Priority Matrix

| ID | Title | Impact | Complexity | Priority |
|---|---|---|---|---|
| MISS-01 | Fix ES-007/DL-007 deload conflict | Critical | Very Low | **P0** |
| MISS-02 | Fix PR-001 RIR condition | High | Very Low | **P1** |
| MISS-03 | Fix PR-001 load increment axis | High | Low | **P1** |
| MISS-04 | Split PR-004 stall threshold by experience | High | Low | **P1** |
| MISS-05 | Add DL-009 absolute deload ceiling (6 weeks) | High | Low | **P1** |
| MISS-06 | Add ES-009 beginner exercise eligibility gate | High | Low | **P1** |
| MISS-07 | Add VA-010 very_high fatigue cap per session | Medium-High | Low | **P2** |
| MISS-08 | Add FM-005 post-deload bad session immunity | Medium-High | Low | **P2** |
| MOD-03 | Formalize PR-002 technical failure gate | Medium | Low | **P2** |
| MOD-04 | Add fatigue masking disambiguation to PR-004 | Medium | Medium | **P2** |
| MISS-09 | Add PR-009 cross-meso load carry-forward | High | Medium | **P2** |
| MISS-10 | Add PR-010 fat loss rep floor (repsMin >= 8) | Medium | Very Low | **P2** |
| MISS-11 | Add EO-005 push/pull/hinge/squat balance | Medium | Low | **P3** |
| MOD-01 | DL-003 volume floor as range not fixed | Low-Medium | Low | **P3** |
| MOD-02 | VA-009 apply multiplier to all three volume fields | Low | Low | **P3** |
| OPP-01 | Add DL-010 deload protocol router | Medium | Low | **P3** |
| OPP-02 | Add PR-011 cross-meso MEV advancement | Medium | Medium | **P3** |
| MISS-08 / OPP-03/04 | Remaining enhancements | Low | Medium | **P4** |
