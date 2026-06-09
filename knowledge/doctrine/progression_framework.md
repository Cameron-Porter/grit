# G.R.I.T. Progression Framework

> Deterministic progression rules derived from knowledge/distilled/ (24 files)
> Sources: Israetel (RP), Nippard, Schwarzenegger/Haney
> Implementation target: workout engine — no AI-dependent logic, no subjective inputs beyond logged session data

---

## Data Contract

All decisions operate exclusively on the following logged fields:

```
slot.completedReps          integer   — reps actually completed this session
slot.prescribedRepsMin      integer   — bottom of target rep band
slot.prescribedRepsMax      integer   — top of target rep band
slot.completedLoad          number    — weight used (lbs)
slot.previousLoad           number    — weight used last session for this slot
slot.previousReps           integer   — reps completed last session for this slot
slot.barSpeedDropped        boolean   — user-confirmed: bar slowed before set end
slot.technicalFailure       boolean   — user-confirmed: form broke down before set end
slot.role                   Primary | Secondary | Accessory
slot.rir                    integer   — prescribed RIR
slot.reportedRir            integer?  — self-reported RIR (null for beginners)
slot.consecutiveStallWeeks  integer   — weeks at same load+reps with no increase
slot.weeksOnThisExercise    integer   — consecutive weeks performing this exercise

muscle.id                   MuscleGroup
muscle.recoveryClass        fast | standard | slow

user.experienceLevel        beginner | intermediate | advanced
user.trainingPhase          build | cut | maintain
user.consecutiveBadSessions integer   — sessions where performance regressed
user.weeksSinceLastDeload   integer

program.mesoBlockWeek       integer   — week within current 4-week block (1–4)
program.isDeloadWeek        boolean
```

---

## State Definitions

Every slot is in exactly one progression state at any time:

```
PROGRESSING          — load or reps increased vs previous session
HOLDING              — same load, reps increasing toward ceiling
LOAD_INCREASE_READY  — reps hit ceiling cleanly; increase load next session
STALLED              — same load and same reps for consecutiveStallWeeks >= 2
PLATEAUED            — stall persisted through a deload (no rebound); true adaptation limit
REGRESSING           — load or reps decreased vs previous session at same prescribed RIR
DELOAD_ACTIVE        — program.isDeloadWeek = true; no progression logic runs
```

---

## Load Increment Table

Applied whenever a LOAD_INCREASE is triggered:

| Slot Role | Muscle Recovery Class | Increment |
|---|---|---|
| Primary | slow (Quads, Hamstrings) | 5 lbs |
| Primary | standard (Chest, Back, Glutes) | 5 lbs |
| Primary | fast (Shoulders, Abs, Calves) | 5 lbs |
| Secondary | any | 5 lbs |
| Accessory | any | 5 lbs |

All increments are multiples of 5. Users may enter any whole number manually.

---

## Section 1: Beginner Progression Rules

**Profile:** 0–2 years consistent training. Cannot reliably self-report RIR. Linear progression is appropriate — any additional load produces adaptation. Neural efficiency is the primary driver of early strength gains.

**Method:** Linear progression — add load every session when reps are completed with bar speed intact and no technical failure.

**Rep range:** 5–10 (narrow band — prevents metabolic burn from disrupting technique at higher reps; avoids fear at lower reps).

**Intensity proxy:** Bar speed (not RIR). Stop when bar speed drops noticeably before lockout. Leave 1–2 reps before that point.

---

### 1.1 Beginner Session Decision Tree

Run this for every Primary slot, every session:

```
INPUT: slot.completedReps, slot.barSpeedDropped, slot.technicalFailure

START
│
├── slot.technicalFailure = true?
│   └── YES → STOP SET (already done), flag TECHNIQUE_FAILURE
│       Action: Hold load. Do not advance.
│               Log: "Form broke down. Retry same load next session."
│               IF technicalFailure occurs 2 consecutive sessions at same load:
│                   → REDUCE_LOAD: subtract one increment (see table), restart
│
└── slot.technicalFailure = false
    │
    ├── slot.completedReps < slot.prescribedRepsMin?
    │   └── YES → Below rep floor. Cannot progress.
    │       Action: Hold load.
    │               IF this is 2nd consecutive session below rep floor at same load:
    │                   → REDUCE_LOAD: subtract one increment, restart
    │
    └── slot.completedReps >= slot.prescribedRepsMin
        │
        ├── slot.barSpeedDropped = true (before reaching prescribedRepsMax)?
        │   └── YES → Near failure. Rep ceiling not reached, but intensity correct.
        │       Action: Hold load. Continue next session at same load.
        │               Goal: increase reps until prescribedRepsMax is reached
        │               without bar speed drop before the final rep.
        │
        └── slot.barSpeedDropped = false
            │
            ├── slot.completedReps >= slot.prescribedRepsMax?
            │   └── YES → Rep ceiling hit, bar speed intact.
            │       Action: → ADVANCE_LOAD
            │               Apply increment from Load Increment Table
            │               Set slot.repsTarget back to prescribedRepsMin
            │               Reset slot.consecutiveStallWeeks = 0
            │
            └── slot.completedReps < slot.prescribedRepsMax
                └── Action: Hold load. Rep progress is occurring. Continue.
```

---

### 1.2 Beginner Plateau Trigger

```
CONDITION:
  slot.consecutiveStallWeeks >= 3
  AND slot.completedReps < slot.prescribedRepsMax
  AND slot.technicalFailure = false

→ PLATEAU_DETECTED (Beginner)

RESOLUTION SEQUENCE:
  Step 1: Is user.weeksSinceLastDeload >= 4?
          YES → Trigger SCHEDULED_DELOAD immediately (do not wait for week 4)
               Post-deload retest: same load, same rep target
               IF reps increase post-deload: was fatigue masking, not true plateau → resume
               IF reps do not increase post-deload: proceed to Step 2

  Step 2: REDUCE_LOAD by 10% (not one increment — 10% of current load)
          Reset slot.repsTarget to prescribedRepsMin
          Resume linear progression from lower starting point
          Log: "Load reset. Rebuild from new base."

  Step 3: If Step 2 load reduction produces no progress within 3 sessions:
          FLAG: TECHNIQUE_REVIEW_REQUIRED
          Recommend: Review exercise form before reloading
```

---

### 1.3 Beginner Deload Triggers

```
TRIGGER 1 — Scheduled:
  program.mesoBlockWeek = 6 (or mesoBlockWeek = 4 if 4-week meso configured)
  → SET program.isDeloadWeek = true
  Action: Reduce all sets by 50%, reduce all reps by 50%, maintain 100% load (first half)
          Reduce all sets by 50%, reduce all reps by 50%, reduce load 50% (second half)

TRIGGER 2 — Performance regression:
  user.consecutiveBadSessions >= 2
  (bad session = completedReps decreased OR completedLoad decreased vs previous session
   at same prescribedRir)
  → SET program.isDeloadWeek = true (immediate, regardless of meso week)
  Reset user.consecutiveBadSessions = 0

TRIGGER 3 — Technique collapse:
  slot.technicalFailure = true on 3 Primary slots in the same session
  → FLAG: SYSTEMIC_FATIGUE_SESSION
  → If this occurs 2 consecutive sessions: EARLY_DELOAD_TRIGGER
```

---

### 1.4 Beginner Progression Rules Summary

| Rule | Value |
|---|---|
| Method | Linear (load every session) |
| Rep range | 5–10 |
| Intensity proxy | Bar speed (no RIR) |
| Load increment — lower compound | +5.0 lbs |
| Load increment — upper compound | +5 lbs |
| Stall threshold | 3 consecutive sessions, same load+reps |
| Plateau resolution | 10% load reduction, restart |
| Scheduled deload | Every 6 weeks (beginners) |
| Early deload trigger | 2 consecutive bad sessions |
| Exercise change | Do NOT change for first 12–16 weeks |

---

## Section 2: Intermediate Progression Rules

**Profile:** 3–6 years training. Can estimate RIR within ~2 reps. Linear progression no longer works session-to-session. Adaptation rate has slowed — load increases occur weekly or bi-weekly, not every session.

**Method:** Double progression — increase reps within a target band at fixed load; when the rep ceiling is achieved at the prescribed RIR, increase load and reset to the rep floor.

**Rep range:** 5–15 across slots; isolations default to 10–20.

**Intensity proxy:** Self-reported RIR (±2 rep accuracy expected).

---

### 2.1 Intermediate Session Decision Tree

Run for every slot, every session:

```
INPUT: slot.completedReps, slot.previousReps, slot.completedLoad,
       slot.previousLoad, slot.reportedRir, slot.prescribedRir

START
│
├── slot.completedLoad > slot.previousLoad?
│   └── YES → PROGRESSING. Load increased.
│       Action: Reset slot.consecutiveStallWeeks = 0
│               Reset user.consecutiveBadSessions = 0
│               Verify slot.reportedRir is within 1 of slot.prescribedRir
│
└── slot.completedLoad = slot.previousLoad (same load)
    │
    ├── slot.completedReps > slot.previousReps?
    │   └── YES → REP_PROGRESS. Moving toward load increase.
    │       │
    │       ├── slot.completedReps >= slot.prescribedRepsMax?
    │       │   └── YES → LOAD_INCREASE_READY
    │       │       │
    │       │       ├── slot.reportedRir <= slot.prescribedRir + 1?
    │       │       │   └── YES → Confirmed near failure. ADVANCE_LOAD next session.
    │       │       │       Action: Apply increment from Load Increment Table
    │       │       │               Reset slot.repsTarget to prescribedRepsMin
    │       │       │               Reset slot.consecutiveStallWeeks = 0
    │       │       │
    │       │       └── slot.reportedRir > slot.prescribedRir + 1?
    │       │           └── Was set too easy. Do not advance load yet.
    │       │               Action: Tighten RIR next session (reduce slot.prescribedRir by 1)
    │       │                       Reattempt same load, aiming for true ceiling hit
    │       │
    │       └── slot.completedReps < slot.prescribedRepsMax → REP_PROGRESS continues
    │           Action: Hold load. Continue accumulating reps toward ceiling.
    │                   Reset slot.consecutiveStallWeeks = 0 (progress IS occurring)
    │
    └── slot.completedReps <= slot.previousReps (no rep increase)
        │
        ├── slot.reportedRir >= slot.prescribedRir + 2?
        │   └── YES → Set was too easy. RIR underestimated intensity.
        │       Action: UNDERTRAINING flag.
        │               Do NOT increment consecutiveStallWeeks.
        │               Cue: "Train closer to failure next session."
        │
        └── slot.reportedRir within 1 of slot.prescribedRir (training correctly)
            │
            ├── slot.completedReps < slot.previousReps?
            │   └── YES → REGRESSION. Increment user.consecutiveBadSessions.
            │       Action: IF user.consecutiveBadSessions >= 2 → DELOAD_TRIGGER
            │
            └── slot.completedReps = slot.previousReps (exact same)
                Action: Increment slot.consecutiveStallWeeks
                        IF consecutiveStallWeeks >= 3 → PLATEAU_TRIGGER (see 2.2)
```

---

### 2.2 Intermediate Plateau Decision Tree

```
ENTRY CONDITION: slot.consecutiveStallWeeks >= 3

START
│
├── STEP 1: Is fatigue masking possible?
│   Condition: user.weeksSinceLastDeload >= 3
│              OR user.consecutiveBadSessions >= 1
│              OR program.mesoBlockWeek >= 3
│   │
│   └── YES → DELOAD_FIRST protocol:
│             Trigger scheduled or early deload.
│             After deload, perform retest session at same load.
│             │
│             ├── Reps INCREASED post-deload?
│             │   └── YES → FATIGUE_MASKING confirmed. Not a true plateau.
│             │       Action: Resume double progression from retest performance.
│             │               Note: this was a fatigue plateau, not adaptation plateau.
│             │
│             └── Reps DID NOT increase post-deload?
│                 └── → Proceed to STEP 2 (true plateau)
│
└── STEP 2: True Plateau Resolution
    │
    ├── slot.weeksOnThisExercise >= 8?
    │   └── YES → ACCOMMODATION_PLATEAU likely.
    │       Action: FLAG exercise for rotation at next mesocycle boundary.
    │               Do NOT rotate mid-mesocycle.
    │               Continue current exercise until meso ends.
    │               At new meso start: replace with alternative from approved list.
    │
    └── slot.weeksOnThisExercise < 8
        │
        ├── OPTION A — Rep band shift:
        │   Drop to prescribedRepsMin from a 10% load reduction.
        │   Rebuild using double progression.
        │   Example: Was stuck at 100 lbs × 12 reps.
        │            New target: 90 lbs × 8 reps.
        │            Rebuild to 90 lbs × 12 reps, then advance to 92.5 lbs.
        │
        └── OPTION B — Volume manipulation:
            Add 1 set to this slot for 2 weeks.
            If reps begin moving again: volume was the missing stimulus.
            If no change: revert added set, proceed to OPTION A.
```

---

### 2.3 Intermediate Deload Triggers

```
TRIGGER 1 — Scheduled (primary):
  program.mesoBlockWeek = 4 (4-week meso default)
  → SET program.isDeloadWeek = true
  Protocol: Hypertrophy Load Retention
    First 3 sessions of week: 50% sets, 50% reps, 100% load
    Last 2 sessions of week:  50% sets, 50% reps, 50% load
  All sets at RIR >= 4 (prescribed, not optional)

TRIGGER 2 — Consecutive regression:
  user.consecutiveBadSessions >= 2
  (where bad session = completedReps < previousReps at same prescribed RIR,
   OR completedLoad decreased to complete the prescribed reps)
  → EARLY_DELOAD (immediate, override meso schedule)
  Reset user.consecutiveBadSessions = 0

TRIGGER 3 — MRV approach:
  muscle.weeklyDirectSets >= muscle.weeklyDirectSetsMax * 0.90
  AND slot.consecutiveStallWeeks >= 2
  → MRV_DELOAD_TRIGGER
  Action: Trigger deload now. After deload, begin new meso at MEV not at peak volume.

TRIGGER 4 — Accumulated meso fatigue:
  user.weeksSinceLastDeload >= 6 (intermediate maximum regardless of performance)
  → MANDATORY_DELOAD regardless of current progress
```

---

### 2.4 Intermediate Volume Progression (Mesocycle Level)

```
WITHIN A SINGLE MESOCYCLE:

Week 1: muscle.weeklyDirectSetsTarget = MEV (baseline, e.g. 10 sets)
Week 2: muscle.weeklyDirectSetsTarget = Week 1 + 2 sets
Week 3: muscle.weeklyDirectSetsTarget = Week 2 + 2 sets (approaching MRV)
Week 4: DELOAD — muscle.weeklyDirectSetsTarget = Week 1 * 0.50

NEW MESOCYCLE (post-deload):
Week 1 target = previous meso Week 1 target (NOT previous meso peak)
Reset all slot.consecutiveStallWeeks = 0

ACROSS MESOCYCLES (progressive overload at meso level):
IF previous meso showed progression on >= 50% of Primary slots:
    New meso MEV = previous meso MEV + 1 set per muscle
IF previous meso showed NO progression on >= 50% of Primary slots:
    New meso MEV = previous meso MEV (hold)
    FLAG: INVESTIGATE_PLATEAU
```

---

### 2.5 Intermediate Progression Rules Summary

| Rule | Value |
|---|---|
| Method | Double progression (reps → load) |
| Rep range (compound) | 5–12 |
| Rep range (isolation) | 10–20 |
| Intensity proxy | Self-reported RIR (±2 accuracy) |
| Load increment — lower compound | +5.0 lbs |
| Load increment — upper compound | +5 lbs |
| Load increment — accessory/isolation | +5 lbs |
| Stall threshold | 3 consecutive weeks, same load+reps |
| Plateau resolution (fatigue) | Deload → retest |
| Plateau resolution (accommodation) | Exercise rotation at meso boundary |
| Scheduled deload | Every 4 weeks |
| Early deload trigger | 2 consecutive bad sessions |
| Volume progression | +2 sets/muscle/week within meso |
| Exercise change | At meso boundary (every 4–8 weeks) |

---

## Section 3: Advanced Progression Rules

**Profile:** 7+ years training. Can estimate RIR within ~1 rep. Linear and simple double progression are exhausted. Load increases occur over mesocycle blocks (4–8 weeks), not individual sessions. SFR tracking is essential. Volume is periodized within and across mesocycles.

**Method:** Periodized double progression within mesocycles, with cross-mesocycle load advancement at the MEV anchor point of each new block.

**Rep range:** 5–15 for compounds; 10–20 for isolation; micro-loading mandatory.

**Intensity proxy:** Precise RIR (±1 rep accuracy). Use actual RIR logged data to confirm prescribed targets are being met.

---

### 3.1 Advanced Session Decision Tree

```
INPUT: all standard fields +
       slot.reportedRir (expected ±1 accuracy)
       slot.weeksOnThisExercise
       slot.sfr_pump_confirmed (bool: user confirmed pump in target muscle)
       slot.sfr_targetMuscleFailedFirst (bool)

START
│
├── program.isDeloadWeek = true?
│   └── YES → DELOAD_LOGIC only (see 3.3). No progression decisions.
│
└── program.isDeloadWeek = false
    │
    ├── SFR CHECK (advanced only, run before load decision):
    │   slot.sfr_pump_confirmed = false
    │   AND slot.sfr_targetMuscleFailedFirst = false
    │   AND slot.weeksOnThisExercise >= 3?
    │   └── YES → SFR_FAILURE. Exercise not producing correct stimulus.
    │       Action: FLAG exercise for immediate review.
    │               IF this occurs 2 consecutive sessions:
    │                   FLAG: EARLY_EXERCISE_ROTATION_CANDIDATE
    │                   (Can rotate before meso boundary if 3 consecutive SFR failures)
    │
    └── SFR confirmed (or week < 3)
        │
        ├── Load comparison: slot.completedLoad vs slot.previousLoad
        │   │
        │   ├── Load INCREASED:
        │   │   └── → PROGRESSING. 
        │   │       Verify: slot.reportedRir within 1 of slot.prescribedRir?
        │   │       YES → clean progression. Reset stall counter.
        │   │       NO (RIR too high) → load increase was premature. Flag.
        │   │
        │   └── Load SAME:
        │       │
        │       ├── Reps increased vs previous?
        │       │   ├── YES, reps < prescribedRepsMax → REP_PROGRESS. Hold load.
        │       │   │
        │       │   └── YES, reps >= prescribedRepsMax:
        │       │       │
        │       │       └── slot.reportedRir <= prescribedRir + 1?
        │       │           ├── YES → LOAD_INCREASE_READY. Advance next session.
        │       │           │   Apply increment from Load Increment Table.
        │       │           │   Reset to prescribedRepsMin.
        │       │           └── NO (RIR too high) → Tighten effort. Same load, same reps.
        │       │
        │       └── Reps same or decreased:
        │           │
        │           ├── slot.reportedRir >= prescribedRir + 2? → UNDERTRAINING flag
        │           │
        │           └── RIR within 1 of prescribed:
        │               Increment slot.consecutiveStallWeeks
        │               IF consecutiveStallWeeks >= 2 → PLATEAU_TRIGGER (see 3.2)
        │               (Advanced: threshold is 2 weeks, not 3 — accommodation faster)
```

---

### 3.2 Advanced Plateau Decision Tree

Advanced plateau management is more nuanced because multiple causes are possible and the lifter can distinguish between them more accurately.

```
ENTRY CONDITION: slot.consecutiveStallWeeks >= 2 (advanced threshold)

STEP 1: Fatigue Check
  Condition: program.mesoBlockWeek >= 3
             OR user.weeksSinceLastDeload >= 3
             OR user.consecutiveBadSessions >= 1
  │
  └── YES → FATIGUE_MASKING likely. Proceed to scheduled/early deload.
      Post-deload retest.
      Reps increase? → FATIGUE_MASKING confirmed. Not a plateau.
      Reps do not increase? → Proceed to Step 2.

STEP 2: SFR Assessment
  slot.sfr_pump_confirmed = false for 2+ sessions?
  OR slot.sfr_targetMuscleFailedFirst = false for 2+ sessions?
  │
  └── YES → ACCOMMODATION or POOR_SFR plateau.
      IF slot.weeksOnThisExercise >= 4:
          → IMMEDIATE_EXERCISE_ROTATION candidate
          (Advanced lifters: can rotate before meso boundary if SFR clearly failing)
          Select next exercise from approved list for same slot role.
          Continue mesocycle with new exercise.
          Reset slot.consecutiveStallWeeks = 0.
      IF slot.weeksOnThisExercise < 4:
          → TECHNIQUE_ISSUE more likely. Flag for form check.

STEP 3: Volume Insufficiency Check
  muscle.weeklyDirectSets < muscle.weeklyDirectSetsTarget?
  │
  └── YES → Volume may be below MAV. Add 1 set for 2 weeks.
      If progression resumes: volume was the limiter.
      If no change: revert, proceed to Step 4.

STEP 4: True Load Ceiling (Advanced)
  All prior steps ruled out. Lifter is genuinely at their current load ceiling
  for this exercise in this rep range.
  │
  ├── OPTION A — Rep band shift + small load reduction:
  │   Reduce load by 5%. Drop to prescribedRepsMin.
  │   Rebuild via double progression from new base.
  │   When rebuilt to original load at higher reps → advance.
  │
  ├── OPTION B — Intra-set technique refinement:
  │   Extend eccentric to 3–4 seconds at current load.
  │   Add 0.5-second pause at stretch position.
  │   This increases effective stimulus at same absolute load.
  │   After 2 weeks of tempo manipulation, retest load ceiling.
  │
  └── OPTION C — Cross-mesocycle reset:
      End current mesocycle early. Full deload.
      New mesocycle: return to MEV volume, slightly lower starting load (+5 lbs below plateau point).
      Approach plateau load again over 3-week progressive build.
      (Accumulation of fatigue over meso often prevents full expression — fresh approach often breaks it)
```

---

### 3.3 Advanced Deload Triggers

```
TRIGGER 1 — Scheduled (mandatory):
  program.mesoBlockWeek = 4
  → DELOAD_WEEK
  Protocol selection:
    IF user.jointStressFlag = true (user-reported): Joint Healing Protocol
    ELSE: Load Retention Protocol
  
  Load Retention (default):
    Sessions 1–2: 50% sets, 50% reps, 100% load, RIR >= 4
    Sessions 3–5: 50% sets, 50% reps, 50% load, RIR >= 4
  
  Joint Healing:
    Sessions 1–2: 100% sets, normal reps, 50% load, RIR >= 4
    Sessions 3–5: 50% sets, normal reps, 50% load, RIR >= 4

TRIGGER 2 — Consecutive regression (same as intermediate):
  user.consecutiveBadSessions >= 2
  → EARLY_DELOAD
  Reset user.consecutiveBadSessions = 0

TRIGGER 3 — MRV confirmed:
  muscle.weeklyDirectSets >= muscle.weeklyDirectSetsMax
  AND slot.consecutiveStallWeeks >= 2
  → END_MESO_DELOAD (trigger deload now regardless of meso week)

TRIGGER 4 — Absolute maximum between deloads:
  user.weeksSinceLastDeload >= 6 (advanced absolute ceiling — no exceptions)
  → MANDATORY_DELOAD

DELOAD QUALITY GATE (enforced):
  During deload week: slot.prescribedRir must be >= 4 for all slots.
  If user logs slot.reportedRir < 4 during a deload session:
  → FLAG: DELOAD_TOO_INTENSE. Log for review.
```

---

### 3.4 Advanced Volume Progression (Mesocycle + Cross-Mesocycle)

```
WITHIN-MESOCYCLE VOLUME WAVE:

Week 1: muscle.weeklyDirectSetsTarget = previousMesoWeek1Target (MEV anchor)
Week 2: += 2 sets per emphasized muscle; += 1 set per grow/maintain muscle
Week 3: += 2 sets per emphasized muscle; += 1 set per grow/maintain muscle
        [This approaches MRV — expect performance plateau/regression to appear]
Week 4: DELOAD — 50% of Week 1 target

CROSS-MESOCYCLE LOAD ADVANCEMENT:

At start of new mesocycle (post-deload):
  For each Primary slot:
    IF previous meso showed load increase on this exercise (or equivalent):
        New meso Week 1 load = highest load reached in previous meso
        (Start new meso at prior meso peak — not prior meso Week 1)
    IF previous meso showed no load increase:
        New meso Week 1 load = prior meso Week 1 load
        FLAG: CROSS_MESO_PLATEAU (investigate via 3.2)

CROSS-MESOCYCLE VOLUME ADVANCEMENT:

IF previous meso: Primary slots showed progression on >= 60% of muscles:
    New meso MEV = previous meso MEV + 1 set per prioritized muscle
    (Gradual MEV creep as adaptation requires more stimulus)

IF previous meso: Primary slots showed progression on < 40% of muscles:
    New meso MEV = previous meso MEV - 1 set per muscle
    (Pull back — possible MRV overshoot in prior meso)

IF between 40–60% of muscles progressed:
    New meso MEV = same as previous meso MEV (hold)
```

---

### 3.5 Advanced Progression Rules Summary

| Rule | Value |
|---|---|
| Method | Periodized double progression within + across mesocycles |
| Rep range (compound) | 5–12 |
| Rep range (isolation) | 10–20 |
| Intensity proxy | Self-reported RIR ±1 |
| Load increment — lower compound | +5.0 lbs |
| Load increment — upper compound | +5 lbs |
| Load increment — isolation | +5 lbs |
| Stall threshold | 2 consecutive weeks (tighter than intermediate) |
| Plateau resolution step 1 | Deload → retest |
| Plateau resolution step 2 | SFR assessment → possible early exercise swap |
| Plateau resolution step 3 | Volume manipulation ±1 set |
| Plateau resolution step 4 | Load reduction + rebuild OR tempo manipulation |
| Scheduled deload | Every 4 weeks (mandatory) |
| Early deload trigger | 2 consecutive bad sessions |
| Cross-meso load advancement | New meso Week 1 = prior meso peak load |
| Cross-meso volume advancement | +1 set MEV if ≥60% muscles progressed |
| Exercise change | Meso boundary (4 weeks) OR 3 consecutive SFR failures |
| Max weeks without deload | 6 (absolute ceiling) |

---

## Section 4: Universal Progression Triggers (All Levels)

These triggers apply regardless of experience level:

---

### 4.1 Progression Trigger Hierarchy

When multiple conditions are true simultaneously, apply in this priority order:

```
Priority 1 (highest): SAFETY
  slot.technicalFailure = true → Stop set. Do not count reps after failure.
  
Priority 2: DELOAD REQUIRED
  user.consecutiveBadSessions >= 2 → Immediate deload. Overrides everything.
  
Priority 3: FATIGUE MASKING SUSPECTED
  user.weeksSinceLastDeload >= mesocycleLength AND slot.consecutiveStallWeeks >= 2
  → Deload before plateau resolution.
  
Priority 4: PROGRESSION DECISION
  Normal session: run appropriate decision tree for experience level.
  
Priority 5: VOLUME ADJUSTMENT
  End-of-week: adjust next week's volume targets per mesocycle progression rules.
```

---

### 4.2 Bad Session Definition (All Levels)

A session qualifies as a "bad session" (increments user.consecutiveBadSessions) when ALL of the following are true:

```
1. slot.completedLoad is equal to or less than slot.previousLoad
   (no load increase occurred, or load was reduced)

AND

2. slot.completedReps < slot.previousReps
   (fewer reps completed than last time at the same or lower load)

AND

3. slot.prescribedRir is the same as the previous session for this slot
   (prescribed effort was identical — rules out intentional easy session)

AND

4. program.isDeloadWeek = false
   (deload sessions never count as bad sessions)

IF all 4 conditions are true → increment user.consecutiveBadSessions
IF any condition is false → do NOT increment (not a genuine regression)
```

---

### 4.3 Plateau vs. Fatigue Masking Disambiguation

The most important distinction in plateau management. Misidentifying fatigue masking as a true plateau leads to unnecessary load reductions.

```
DISAMBIGUATION PROTOCOL:

Question: Has the user deloaded within the last 3 weeks?
├── NO → Fatigue masking is possible. Deload first. Test after.
└── YES (deloaded within 3 weeks):
    Question: Did performance rebound in the session AFTER the deload?
    ├── YES → Deload worked. Fatigue was the issue. Not a plateau.
    └── NO (no rebound post-deload):
        → TRUE PLATEAU. Proceed to exercise rotation or load reset.

RULE: Never execute load reduction as a plateau response
      without first ruling out fatigue masking via a completed deload.
```

---

### 4.4 Fat Loss Phase Progression Modifications

During user.trainingPhase = 'cut':

```
MODIFICATIONS (applied on top of experience-level rules):

1. Progressive overload auto-increment: DISABLED
   Target: maintain current load and reps (not increase)
   Success criteria: same performance = success

2. Bad session threshold: RAISED
   Require 3 consecutive bad sessions (not 2) before triggering deload
   Reason: caloric deficit produces 1–2 bad sessions naturally without
           indicating accumulated training fatigue

3. Load increase: ALLOWED but not prompted
   IF user organically hits rep ceiling and RIR is within range:
       Offer load increase as optional, not automatic

4. Rep range: Floor raised to 8 (not 5)
   Heavy loading (5–7 reps) during cut = elevated injury risk
   All Primary slots: prescribedRepsMin >= 8 during cut

5. Volume: Reduce by 15% from build-phase targets
   Apply to session.totalSets only; maintain frequency
```

---

### 4.5 Deload Quality Enforcement

Applies during any deload week regardless of experience level:

```
DELOAD VALIDITY CHECK (run each deload session):

slot.prescribedRir during deload must be >= 4
IF slot.reportedRir < 4:
    → FLAG: DELOAD_INTENSITY_VIOLATION
    Log: "Deload set too hard. Fatigue will not clear at this effort level."

session.totalSets must be <= 50% of peak meso week sets
IF session.totalSets > peakMesoSets * 0.50:
    → FLAG: DELOAD_VOLUME_VIOLATION
    Trim slots until compliant

session.estimatedMinutes should be <= 45 minutes
(Deload sessions should be noticeably shorter than normal sessions)
IF estimatedMinutes > 60:
    → FLAG: DELOAD_DURATION_WARNING
```

---

## Section 5: Cross-Reference Tables

### 5.1 Experience Level Quick Reference

| Variable | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Progression method | Linear | Double progression | Periodized double |
| Load frequency | Every session | Every 1–3 weeks | Every 4–8 weeks (meso level) |
| Rep range (compound) | 5–10 | 5–12 | 5–12 |
| Rep range (isolation) | 8–15 | 10–20 | 10–20 |
| Intensity tracking | Bar speed | RIR ±2 | RIR ±1 |
| Stall threshold | 3 sessions | 3 weeks | 2 weeks |
| Deload frequency | Every 6 weeks | Every 4 weeks | Every 4 weeks |
| Early deload trigger | 2 bad sessions | 2 bad sessions | 2 bad sessions |
| Exercise rotation | Every 12–16 weeks | Every 4–8 weeks | Every 4 weeks (or 3 SFR failures) |
| Micro-loading required | No | Accessory only | All secondary + accessory |
| SFR tracking | No | No | Yes |

---

### 5.2 Plateau Resolution Sequence by Level

| Step | Beginner | Intermediate | Advanced |
|---|---|---|---|
| 1 | Deload → retest | Deload → retest | Deload → retest |
| 2 | 10% load reduction | Exercise rotation (meso boundary) | SFR assessment → possible early rotation |
| 3 | Technique review | Rep band shift OR volume +1 set | Volume manipulation ±1 set |
| 4 | — | — | Tempo manipulation OR cross-meso reset |

---

### 5.3 Trigger Threshold Summary

| Trigger | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Scheduled deload | Week 6 | Week 4 | Week 4 |
| Early deload | 2 bad sessions | 2 bad sessions | 2 bad sessions |
| Max without deload | 8 weeks | 6 weeks | 6 weeks |
| Stall → plateau | 3 sessions | 3 weeks | 2 weeks |
| Volume ceiling (MRV) | 14 sets/wk | 18–20 sets/wk | 20–25 sets/wk |
| Exercise rotation | 12–16 weeks | 4–8 weeks | 4 weeks / 3 SFR failures |

---

## Section 6: Implementation Notes

### What This Framework Does Not Cover

The following require AI coaching (longitudinal pattern recognition) and are explicitly excluded from deterministic logic:

- Recommending which specific exercises to rotate to (the engine presents options; user selects)
- Interpreting user-reported subjective fatigue beyond logged session data
- Distinguishing life stress from training fatigue (requires context the engine cannot access)
- SFR scoring beyond binary pump/target-muscle-failure flags (qualitative calibration is individual)

### Session Log Requirements

This framework is only executable with complete session logs. Minimum required fields per set:
- `completedReps` (integer)
- `completedLoad` (number)
- `barSpeedDropped` (boolean — beginner proxy for RIR)
- `reportedRir` (integer — intermediate/advanced)
- `technicalFailure` (boolean)

Without `completedReps` and `completedLoad` from at least one previous session for the same slot, no progression decision can be made. The framework must treat the slot as a new slot and default to prescribedRepsMin at the lowest recommended load.

### Warm-Up Sets

Warm-up sets are never evaluated by this framework. Only working sets (sets that meet the prescribed RIR target) feed into the progression decision trees. The engine must distinguish warm-up sets from working sets in the session log schema.
