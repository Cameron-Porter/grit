# G.R.I.T. Rules Engine — Deterministic Rule Candidates

> Generated from: knowledge/distilled/ (24 files) + knowledge/doctrine/ (8 doctrine files)
> Sources: Israetel (RP), Nippard, Schwarzenegger/Haney
> Purpose: Programmatic implementation reference for the G.R.I.T. workout engine
> Format: Each rule is a self-contained logic unit with conditions and actions
> Last updated: gap analysis applied — 11 new rules added, 6 existing rules modified

---

## Data Model Assumptions

Rules operate on the following context fields:

```
user.experienceLevel          'beginner' | 'intermediate' | 'advanced'
user.trainingPhase            'build' | 'cut' | 'maintain'
user.weeksSinceLastDeload     number
user.consecutiveBadSessions   number  (sessions where load or reps regressed at same RIR)
user.sessionsSinceLastDeload  number  (resets to 0 when deload ends; used by FM-005)

muscle.id                     MuscleGroup
muscle.priority               'emphasize' | 'grow' | 'maintain' | 'mev'
muscle.recoveryClass          'fast' | 'standard' | 'slow'
muscle.weeklyDirectSets       number  (accumulated this week)
muscle.weeklyEffectiveSets    number  (direct + indirect × role multiplier)
muscle.sessionsThisWeek       number

session.totalSlots            number
session.totalSets             number
session.estimatedMinutes      number
session.isDeloadWeek          boolean
session.mesoBlockWeek         number  (1–4 within current 4-week block)
session.veryHighFatigueSlotCount  number  (count of slots with fatigue_rating = 'very_high' this session)

slot.role                     'Primary' | 'Secondary' | 'Accessory'
slot.sets                     number
slot.repsMin                  number
slot.repsMax                  number
slot.rir                      number  (prescribed RIR)
slot.actualRirLogged          number?  (self-reported RIR after completing the set; null if not logged)
slot.technicalFailure         boolean  (user-confirmed: form broke down before set end)
slot.consecutiveTechnicalFailures  number  (consecutive sessions with technicalFailure = true at same load)

progression.lastSessionReps        number
progression.targetRepsMax          number
progression.consecutiveStallWeeks  number
progression.currentLoad            number
progression.lastLoadIncrease       number  (weeks ago)
progression.loadIncrementSize      number  (lbs; role-derived increment applied on LOAD_INCREASE)
progression.peakLoadPreviousMeso   number  (highest load achieved on this slot in the prior mesocycle)

program.weekNumber            number
program.totalWeeks            number
program.mesoBlockWeek         number  (1–n within current block)
```

---

## Category: VOLUME_ALLOCATION

```json
{
  "ruleId": "VA-001",
  "category": "VOLUME_ALLOCATION",
  "description": "Enforce minimum weekly direct sets (MEV floor) per muscle based on priority. Below MEV, no meaningful hypertrophy signal is produced.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "volume_landmarks_effective_training.md", "hypertrophy.md"],
  "conditions": [
    { "field": "muscle.priority", "operator": "in", "value": ["emphasize", "grow", "maintain", "mev"] }
  ],
  "actions": [
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "emphasize" },
      "then": { "set": "muscle.weeklyDirectSetsMin", "value": 12 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "grow" },
      "then": { "set": "muscle.weeklyDirectSetsMin", "value": 10 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "maintain" },
      "then": { "set": "muscle.weeklyDirectSetsMin", "value": 8 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "mev" },
      "then": { "set": "muscle.weeklyDirectSetsMin", "value": 4 }
    }
  ]
}
```

```json
{
  "ruleId": "VA-002",
  "category": "VOLUME_ALLOCATION",
  "description": "Set target weekly direct sets (MAV) per muscle by priority. This is the volume the engine should aim to distribute across sessions.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "hypertrophy.md", "not_growing_not_training_enough.md"],
  "conditions": [
    { "field": "muscle.priority", "operator": "in", "value": ["emphasize", "grow", "maintain", "mev"] }
  ],
  "actions": [
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "emphasize" },
      "then": { "set": "muscle.weeklyDirectSetsTarget", "value": 16 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "grow" },
      "then": { "set": "muscle.weeklyDirectSetsTarget", "value": 13 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "maintain" },
      "then": { "set": "muscle.weeklyDirectSetsTarget", "value": 10 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "mev" },
      "then": { "set": "muscle.weeklyDirectSetsTarget", "value": 6 }
    }
  ]
}
```

```json
{
  "ruleId": "VA-003",
  "category": "VOLUME_ALLOCATION",
  "description": "Enforce MRV ceiling per muscle per week. Sets beyond MRV produce fatigue without additional hypertrophic adaptation.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "effective_training_principles.md", "hypertrophy.md"],
  "conditions": [
    { "field": "muscle.priority", "operator": "in", "value": ["emphasize", "grow", "maintain", "mev"] }
  ],
  "actions": [
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "emphasize" },
      "then": { "set": "muscle.weeklyDirectSetsMax", "value": 20 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "grow" },
      "then": { "set": "muscle.weeklyDirectSetsMax", "value": 18 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "maintain" },
      "then": { "set": "muscle.weeklyDirectSetsMax", "value": 14 }
    },
    {
      "if": { "field": "muscle.priority", "operator": "eq", "value": "mev" },
      "then": { "set": "muscle.weeklyDirectSetsMax", "value": 8 }
    }
  ]
}
```

```json
{
  "ruleId": "VA-004",
  "category": "VOLUME_ALLOCATION",
  "description": "Hard cap session slot count at 5. Diminishing returns begin at set 5 per exercise per session; exceeding 5 total slots also violates systemic fatigue limits.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "volume_landmarks_effective_training.md", "hypertrophy.md"],
  "conditions": [
    { "field": "session.totalSlots", "operator": "gt", "value": 5 }
  ],
  "actions": [
    { "set": "session.totalSlots", "operator": "clamp_max", "value": 5 },
    { "trim": "slots", "strategy": "remove_lowest_priority_first" }
  ]
}
```

```json
{
  "ruleId": "VA-005",
  "category": "VOLUME_ALLOCATION",
  "description": "Hard cap total session sets at 24. Beyond 24 sets, quality degrades and systemic fatigue accumulation outpaces hypertrophic stimulus.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "hypertrophy.md", "sessionTrimmer.ts"],
  "conditions": [
    { "field": "session.totalSets", "operator": "gt", "value": 24 }
  ],
  "actions": [
    { "trim": "sets", "strategy": "reduce_lowest_priority_slot_by_1_set_until_compliant" },
    { "when": "slot.sets < 2", "then": "remove_slot" }
  ]
}
```

```json
{
  "ruleId": "VA-006",
  "category": "VOLUME_ALLOCATION",
  "description": "Hard cap sets per exercise per session at 5. Returns diminish sharply after the 5th set on any single exercise within a session.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "volume_landmarks_effective_training.md", "optimal_delt_growth.md"],
  "conditions": [
    { "field": "slot.sets", "operator": "gt", "value": 5 }
  ],
  "actions": [
    { "set": "slot.sets", "operator": "clamp_max", "value": 5 }
  ]
}
```

```json
{
  "ruleId": "VA-007",
  "category": "VOLUME_ALLOCATION",
  "description": "Gate effective volume by RIR. Any set performed at RIR >= 4 is classified as junk volume and does not count toward weekly MEV/MRV accumulation.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "volume_landmarks_effective_training.md", "hypertrophy.md"],
  "conditions": [
    { "field": "slot.rir", "operator": "gte", "value": 4 }
  ],
  "actions": [
    { "set": "slot.countsAsEffectiveVolume", "value": false },
    { "flag": "JUNK_VOLUME_WARNING" }
  ]
}
```

```json
{
  "ruleId": "VA-008",
  "category": "VOLUME_ALLOCATION",
  "description": "Increase weekly volume per muscle by 1–2 sets with each successive mesocycle week. Volume should progress within the mesocycle from MEV toward MRV.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "hypertrophy.md", "progression.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "gt", "value": 1 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    {
      "set": "muscle.weeklyDirectSetsTarget",
      "formula": "baseWeeklyTarget + ((session.mesoBlockWeek - 1) * 1.5)",
      "clamp_max": "muscle.weeklyDirectSetsMax"
    }
  ]
}
```

```json
{
  "ruleId": "VA-009",
  "category": "VOLUME_ALLOCATION",
  "description": "Scale starting MEV upward by experience level. Advanced lifters require more total volume for adaptation; beginners respond to lower volumes.",
  "confidence": "moderate",
  "sources": ["training_for_muscle_growth_beginner_to_advanced.md", "volume_landmarks.md"],
  "conditions": [
    { "field": "user.experienceLevel", "operator": "in", "value": ["beginner", "intermediate", "advanced"] }
  ],
  "actions": [
    {
      "if": { "field": "user.experienceLevel", "operator": "eq", "value": "beginner" },
      "then": [
        { "multiply": "muscle.weeklyDirectSetsMin", "by": 0.8 },
        { "multiply": "muscle.weeklyDirectSetsTarget", "by": 0.8 },
        { "multiply": "muscle.weeklyDirectSetsMax", "by": 0.8 }
      ]
    },
    {
      "if": { "field": "user.experienceLevel", "operator": "eq", "value": "intermediate" },
      "then": [
        { "multiply": "muscle.weeklyDirectSetsMin", "by": 1.0 },
        { "multiply": "muscle.weeklyDirectSetsTarget", "by": 1.0 },
        { "multiply": "muscle.weeklyDirectSetsMax", "by": 1.0 }
      ]
    },
    {
      "if": { "field": "user.experienceLevel", "operator": "eq", "value": "advanced" },
      "then": [
        { "multiply": "muscle.weeklyDirectSetsMin", "by": 1.2 },
        { "multiply": "muscle.weeklyDirectSetsTarget", "by": 1.2 },
        { "multiply": "muscle.weeklyDirectSetsMax", "by": 1.2 }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "VA-010",
  "category": "VOLUME_ALLOCATION",
  "description": "Hard cap at 1 exercise with fatigue_rating = very_high per session. Deadlift + barbell back squat in the same session generates systemic fatigue that outpaces any additional hypertrophic benefit and impairs recovery for 72+ hours.",
  "confidence": "high",
  "sources": ["exercise_taxonomy.md", "recovery.md", "quad_specialization.md"],
  "conditions": [
    { "field": "session.veryHighFatigueSlotCount", "operator": "gt", "value": 1 }
  ],
  "actions": [
    { "trim": "slots", "strategy": "remove_second_very_high_fatigue_slot_lowest_priority_first" },
    { "flag": "VERY_HIGH_FATIGUE_LIMIT_EXCEEDED" }
  ]
}
```

---

## Category: FREQUENCY_ALLOCATION

```json
{
  "ruleId": "FA-001",
  "category": "FREQUENCY_ALLOCATION",
  "description": "Enforce minimum 2 sessions per muscle per week for all non-MEV muscles. Once-per-week frequency consistently underperforms twice-per-week at identical weekly volume.",
  "confidence": "high",
  "sources": ["hypertrophy.md", "training_for_muscle_growth_beginner_to_advanced.md", "effective_training_principles.md"],
  "conditions": [
    { "field": "muscle.priority", "operator": "in", "value": ["emphasize", "grow", "maintain"] }
  ],
  "actions": [
    { "set": "muscle.weeklySessionsMin", "value": 2 },
    {
      "if": { "field": "muscle.sessionsThisWeek", "operator": "lt", "value": 2 },
      "then": { "flag": "FREQUENCY_BELOW_MINIMUM" }
    }
  ]
}
```

```json
{
  "ruleId": "FA-002",
  "category": "FREQUENCY_ALLOCATION",
  "description": "Set maximum weekly session frequency by muscle recovery class. Fast-recovering muscles (delts, calves, abs) tolerate 3–4× per week; standard muscles 2–3×; slow-recovering muscles (quads, hamstrings) max 3×.",
  "confidence": "moderate",
  "sources": ["optimal_delt_growth.md", "abdominal_hypertrophy.md", "quad_specialization.md", "hypertrophy.md"],
  "conditions": [
    { "field": "muscle.recoveryClass", "operator": "in", "value": ["fast", "standard", "slow"] }
  ],
  "actions": [
    {
      "if": { "field": "muscle.recoveryClass", "operator": "eq", "value": "fast" },
      "then": { "set": "muscle.weeklySessionsMax", "value": 4 }
    },
    {
      "if": { "field": "muscle.recoveryClass", "operator": "eq", "value": "standard" },
      "then": { "set": "muscle.weeklySessionsMax", "value": 3 }
    },
    {
      "if": { "field": "muscle.recoveryClass", "operator": "eq", "value": "slow" },
      "then": { "set": "muscle.weeklySessionsMax", "value": 3 }
    }
  ]
}
```

```json
{
  "ruleId": "FA-003",
  "category": "FREQUENCY_ALLOCATION",
  "description": "Assign recovery class to muscles. Delts, calves, abs = fast. Biceps, triceps, traps, forearms = standard. Quads, hamstrings, glutes, chest, back = standard-to-slow. Quads and hamstrings = slow.",
  "confidence": "moderate",
  "sources": ["optimal_delt_growth.md", "quad_specialization.md", "recovery.md"],
  "conditions": [],
  "actions": [
    { "if": { "field": "muscle.id", "operator": "in", "value": ["Shoulders", "Calves", "Abs"] }, "then": { "set": "muscle.recoveryClass", "value": "fast" } },
    { "if": { "field": "muscle.id", "operator": "in", "value": ["Biceps", "Triceps", "Traps", "Forearms"] }, "then": { "set": "muscle.recoveryClass", "value": "standard" } },
    { "if": { "field": "muscle.id", "operator": "in", "value": ["Chest", "Back", "Glutes"] }, "then": { "set": "muscle.recoveryClass", "value": "standard" } },
    { "if": { "field": "muscle.id", "operator": "in", "value": ["Quads", "Hamstrings"] }, "then": { "set": "muscle.recoveryClass", "value": "slow" } }
  ]
}
```

```json
{
  "ruleId": "FA-004",
  "category": "FREQUENCY_ALLOCATION",
  "description": "Enforce minimum 48-hour gap between sessions that train the same muscle group. Lower-body sessions (squats, deadlifts) require 48–72 hours minimum.",
  "confidence": "high",
  "sources": ["recovery.md", "training_during_fat_loss.md"],
  "conditions": [
    { "field": "muscle.lastSessionHoursAgo", "operator": "lt", "value": 48 }
  ],
  "actions": [
    { "flag": "INSUFFICIENT_RECOVERY_GAP" },
    { "recommend": "move_session_to_next_available_day_with_48hr_gap" }
  ]
}
```

```json
{
  "ruleId": "FA-005",
  "category": "FREQUENCY_ALLOCATION",
  "description": "Prevent consecutive lower-body sessions. Quads and hamstrings generate high systemic fatigue. Back-to-back lower sessions impair recovery for both.",
  "confidence": "high",
  "sources": ["recovery.md", "hypertrophy.md", "training_during_fat_loss.md"],
  "conditions": [
    { "field": "session.sessionType", "operator": "in", "value": ["Lower", "LowerQuadFocus", "LowerPosteriorChain", "LowerGluteQuad"] },
    { "field": "previousSession.sessionType", "operator": "in", "value": ["Lower", "LowerQuadFocus", "LowerPosteriorChain", "LowerGluteQuad"] }
  ],
  "actions": [
    { "flag": "CONSECUTIVE_LOWER_SESSIONS" },
    { "recommend": "insert_upper_or_rest_day_between_lower_sessions" }
  ]
}
```

```json
{
  "ruleId": "FA-006",
  "category": "FREQUENCY_ALLOCATION",
  "description": "During fat loss phase, maintain minimum 2× per muscle per week frequency to signal muscle retention. Falling below this threshold accelerates muscle catabolism.",
  "confidence": "high",
  "sources": ["training_during_fat_loss.md", "recovery.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" },
    { "field": "muscle.weeklySessionsPlanned", "operator": "lt", "value": 2 }
  ],
  "actions": [
    { "flag": "MUSCLE_LOSS_RISK_LOW_FREQUENCY" },
    { "set": "muscle.weeklySessionsMin", "value": 2 }
  ]
}
```

---

## Category: PROGRESSION

```json
{
  "ruleId": "PR-001",
  "category": "PROGRESSION",
  "description": "Double progression trigger: when reps achieved in last session equal or exceed the target rep ceiling, increase load next session and reset to bottom of rep range.",
  "confidence": "high",
  "sources": ["optimal_rep_range_for_hypertrophy.md", "progression.md", "dumbbell_hypertrophy.md"],
  "conditions": [
    { "field": "progression.lastSessionReps", "operator": "gte", "value": "progression.targetRepsMax" },
    { "field": "slot.actualRirLogged", "operator": "lte", "formula": "slot.rir + 1" }
  ],
  "actions": [
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Accessory" },
      "then": { "increment": "progression.currentLoad", "by": 1.25, "unit": "lbs" }
    },
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Secondary" },
      "then": { "increment": "progression.currentLoad", "by": 2.5, "unit": "lbs" }
    },
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Primary" },
      "then": {
        "if": { "field": "muscle.recoveryClass", "operator": "eq", "value": "slow" },
        "then": { "increment": "progression.currentLoad", "by": 5.0, "unit": "lbs" },
        "else": { "increment": "progression.currentLoad", "by": 2.5, "unit": "lbs" }
      }
    },
    { "set": "slot.repsMin", "value": "original_rep_range_min" },
    { "set": "progression.consecutiveStallWeeks", "value": 0 }
  ]
}
```

```json
{
  "ruleId": "PR-002",
  "category": "PROGRESSION",
  "description": "Beginner linear progression: increase load every session when form holds. Do not apply double progression for beginners — they respond to simpler linear loading.",
  "confidence": "high",
  "sources": ["training_for_muscle_growth_beginner_to_advanced.md", "progression.md"],
  "conditions": [
    { "field": "user.experienceLevel", "operator": "eq", "value": "beginner" },
    { "field": "slot.role", "operator": "eq", "value": "Primary" }
  ],
  "actions": [
    {
      "if": { "field": "slot.technicalFailure", "operator": "eq", "value": true },
      "then": [
        { "set": "progression.autoIncrementEnabled", "value": false },
        { "flag": "TECHNIQUE_FAILURE_HOLD" }
      ]
    },
    {
      "if": { "field": "slot.consecutiveTechnicalFailures", "operator": "gte", "value": 2 },
      "then": [
        { "decrement": "progression.currentLoad", "by": "progression.loadIncrementSize" },
        { "set": "slot.consecutiveTechnicalFailures", "value": 0 },
        { "flag": "LOAD_REDUCED_TECHNIQUE_RESET" }
      ]
    },
    {
      "if": { "field": "slot.technicalFailure", "operator": "eq", "value": false },
      "then": [
        {
          "if": { "field": "muscle.id", "operator": "in", "value": ["Quads", "Hamstrings", "Glutes"] },
          "then": { "increment": "progression.currentLoad", "by": 5.0, "unit": "lbs", "frequency": "every_session" }
        },
        {
          "else": { "increment": "progression.currentLoad", "by": 2.5, "unit": "lbs", "frequency": "every_session" }
        }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "PR-003",
  "category": "PROGRESSION",
  "description": "Micro-loading requirement for isolation movements: isolation exercises advance in 1.25 lb increments. Standard 2.5 lb jumps are too large for small isolation movements and cause premature technique failure.",
  "confidence": "moderate",
  "sources": ["optimal_delt_growth.md", "training_during_fat_loss.md", "progression.md"],
  "conditions": [
    { "field": "slot.role", "operator": "eq", "value": "Accessory" },
    { "field": "user.experienceLevel", "operator": "in", "value": ["intermediate", "advanced"] }
  ],
  "actions": [
    { "set": "progression.loadIncrementSize", "value": 1.25, "unit": "lbs" }
  ]
}
```

```json
{
  "ruleId": "PR-004",
  "category": "PROGRESSION",
  "description": "Stall detection: flag when reps and load have not increased for the experience-level threshold. Advanced = 2 weeks (faster accommodation); beginner/intermediate = 3 weeks. Before recommending exercise rotation, check if fatigue masking explains the stall.",
  "confidence": "moderate",
  "sources": ["progression.md", "optimal_chest_growth.md", "progression_framework.md"],
  "conditions": [
    {
      "if": { "field": "user.experienceLevel", "operator": "eq", "value": "advanced" },
      "then": { "field": "progression.consecutiveStallWeeks", "operator": "gte", "value": 2 }
    },
    {
      "else": { "field": "progression.consecutiveStallWeeks", "operator": "gte", "value": 3 }
    }
  ],
  "actions": [
    {
      "if": [
        { "field": "user.weeksSinceLastDeload", "operator": "gte", "value": 3 },
        { "OR": { "field": "session.mesoBlockWeek", "operator": "gte", "value": 3 } }
      ],
      "then": [
        { "flag": "STALL_FATIGUE_MASKING_SUSPECTED" },
        { "recommend": "deload_then_retest_before_rotating_exercise" }
      ]
    },
    {
      "else": [
        { "flag": "PROGRESSION_STALL" },
        { "recommend": "rotate_exercise_at_next_mesocycle_boundary" }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "PR-005",
  "category": "PROGRESSION",
  "description": "Progression inhibition during fat loss: do not auto-prescribe load increases during a caloric deficit. Muscle retention is the success metric; any load increase is a bonus, not a target.",
  "confidence": "high",
  "sources": ["training_during_fat_loss.md", "progression.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" }
  ],
  "actions": [
    { "set": "progression.autoIncrementEnabled", "value": false },
    { "set": "progression.successCriteria", "value": "maintain_load_and_reps" }
  ]
}
```

```json
{
  "ruleId": "PR-006",
  "category": "PROGRESSION",
  "description": "Tempo progression fallback: when load cannot be increased (fixed equipment or technique ceiling), extend eccentric phase to 3–4 seconds as the next progression method.",
  "confidence": "moderate",
  "sources": ["dumbbell_hypertrophy.md", "dumbbell_leg_hypertrophy.md", "time_limited_training.md"],
  "conditions": [
    { "field": "progression.loadIncreaseBlocked", "operator": "eq", "value": true },
    { "field": "slot.eccentricSeconds", "operator": "lt", "value": 3 }
  ],
  "actions": [
    { "set": "slot.eccentricSeconds", "value": 3 },
    { "note": "Increase to 4s after 1–2 weeks if load still cannot increase" }
  ]
}
```

```json
{
  "ruleId": "PR-007",
  "category": "PROGRESSION",
  "description": "Meso volume baseline reset: at the start of a new mesocycle (post-deload), reset weekly volume target back to MEV baseline, not the peak volume of the prior mesocycle.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "progression.md", "deloading_protocols.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "eq", "value": 1 },
    { "field": "program.weekNumber", "operator": "gt", "value": 4 }
  ],
  "actions": [
    { "set": "muscle.weeklyDirectSetsTarget", "value": "muscle.weeklyDirectSetsMin" },
    { "note": "New mesocycle begins fresh from MEV; volume overload resumes in weeks 2–3" }
  ]
}
```

```json
{
  "ruleId": "PR-009",
  "category": "PROGRESSION",
  "description": "Cross-mesocycle load carry-forward for intermediate and advanced: Week 1 of a new mesocycle starts at the highest load achieved on that slot in the previous mesocycle, not at prior Week 1 load. Prevents losing intra-meso gains at meso boundaries.",
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
      "formula": "progression.peakLoadPreviousMeso",
      "fallback": "progression.currentLoad"
    }
  ]
}
```

```json
{
  "ruleId": "PR-010",
  "category": "PROGRESSION",
  "description": "Fat loss phase rep floor: during a caloric deficit, enforce repsMin >= 8 on all Primary slots. Heavy loading (5–7 reps) during a cut creates disproportionate injury risk with no additional hypertrophy benefit over the 8–12 rep range.",
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

```json
{
  "ruleId": "PR-011",
  "category": "PROGRESSION",
  "description": "Cross-mesocycle MEV advancement: if >= 60% of Primary muscles showed load progression in the prior mesocycle, increment MEV by 1 set per muscle for the new mesocycle. If < 40% progressed, decrement by 1 set. Gradual MEV creep matches increasing adaptation threshold.",
  "confidence": "moderate",
  "sources": ["progression_framework.md", "volume_landmarks.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "eq", "value": 1 },
    { "field": "program.weekNumber", "operator": "gt", "value": 4 }
  ],
  "actions": [
    {
      "if": { "field": "program.priorMesoPrimaryProgressionRate", "operator": "gte", "value": 0.60 },
      "then": { "increment": "muscle.weeklyDirectSetsMin", "by": 1, "note": "MEV advances by 1 set when majority of muscles progressed" }
    },
    {
      "if": { "field": "program.priorMesoPrimaryProgressionRate", "operator": "lt", "value": 0.40 },
      "then": { "decrement": "muscle.weeklyDirectSetsMin", "by": 1, "clamp_min": "muscle.weeklyDirectSetsMinAbsolute" }
    }
  ]
}
```

---

## Category: EXERCISE_ORDERING

```json
{
  "ruleId": "EO-001",
  "category": "EXERCISE_ORDERING",
  "description": "Order slots within a session by role: Primary slots first, Secondary second, Accessory last. This ensures peak neural drive is available for the highest-stimulus movements.",
  "confidence": "high",
  "sources": ["exercise_selection.md", "training_for_muscle_growth_beginner_to_advanced.md", "effective_training_principles.md"],
  "conditions": [
    { "field": "user.experienceLevel", "operator": "in", "value": ["beginner", "intermediate"] }
  ],
  "actions": [
    { "sort": "session.slots", "by": "role", "order": ["Primary", "Secondary", "Accessory"] }
  ]
}
```

```json
{
  "ruleId": "EO-002",
  "category": "EXERCISE_ORDERING",
  "description": "Within the same slot role, order muscles by descending priority: emphasize > grow > maintain > mev. Higher-priority muscles should be trained when fatigue is lowest.",
  "confidence": "high",
  "sources": ["exercise_selection.md", "hypertrophy.md"],
  "conditions": [],
  "actions": [
    {
      "sort": "session.slots",
      "by": "muscle.priority",
      "order_secondary": { "emphasize": 0, "grow": 1, "maintain": 2, "mev": 3 }
    }
  ]
}
```

```json
{
  "ruleId": "EO-003",
  "category": "EXERCISE_ORDERING",
  "description": "Within the same muscle group in a session, Primary slot precedes Secondary which precedes Accessory. This preserves the compound-to-isolation progression within each muscle.",
  "confidence": "high",
  "sources": ["exercise_selection.md", "sessionTemplates.ts"],
  "conditions": [
    { "field": "muscle.slotsThisSession", "operator": "gt", "value": 1 }
  ],
  "actions": [
    {
      "sort": "slots_for_same_muscle",
      "by": "slot.role",
      "order": ["Primary", "Secondary", "Accessory"]
    }
  ]
}
```

```json
{
  "ruleId": "EO-004",
  "category": "EXERCISE_ORDERING",
  "description": "Do not schedule back-to-back compound movements for overlapping muscle groups within the same session. E.g., bench press immediately followed by overhead press — both load anterior deltoid and triceps — impairs stimulus quality on the second movement.",
  "confidence": "moderate",
  "sources": ["effective_training_principles.md", "exercise_selection.md"],
  "conditions": [
    { "field": "consecutiveSlots.role", "operator": "eq", "value": ["Primary", "Primary"] },
    { "field": "consecutiveSlots.muscleOverlap", "operator": "gt", "value": 0.3 }
  ],
  "actions": [
    { "flag": "CONSECUTIVE_OVERLAPPING_COMPOUNDS" },
    { "recommend": "insert_non_overlapping_slot_between_or_reorder" }
  ]
}
```

```json
{
  "ruleId": "EO-005",
  "category": "EXERCISE_ORDERING",
  "description": "Weekly movement balance validation: flag any program week that is missing one of the four fundamental movement patterns (Push, Pull, Hinge, Squat) for 2 or more consecutive weeks. Structural imbalance increases injury risk and produces muscular development gaps.",
  "confidence": "high",
  "sources": ["exercise_taxonomy.md", "exercise_selection.md"],
  "conditions": [
    {
      "field": "program.consecutiveWeeksMissingPattern",
      "operator": "gte",
      "value": 2,
      "patterns": [
        "Horizontal Press OR Incline Press OR Vertical Press",
        "Horizontal Pull OR Vertical Pull",
        "Hip Hinge",
        "Quad Dominant"
      ]
    }
  ],
  "actions": [
    { "flag": "MOVEMENT_PATTERN_IMBALANCE" },
    { "recommend": "add_session_covering_missing_movement_pattern" }
  ]
}
```

---

## Category: EXERCISE_SELECTION

```json
{
  "ruleId": "ES-001",
  "category": "EXERCISE_SELECTION",
  "description": "Primary slots must be filled from priority-1 exercises (main compound patterns). Isolations are never assigned to Primary slots.",
  "confidence": "high",
  "sources": ["slotTemplates.ts", "exercise_selection.md"],
  "conditions": [
    { "field": "slot.role", "operator": "eq", "value": "Primary" }
  ],
  "actions": [
    { "filter": "approved_exercises", "by": "template.priority", "operator": "eq", "value": 1 }
  ]
}
```

```json
{
  "ruleId": "ES-002",
  "category": "EXERCISE_SELECTION",
  "description": "Secondary slots may be filled from priority-1 or priority-2 exercises (compounds and compound variations). Strict isolations are excluded from Secondary slots.",
  "confidence": "high",
  "sources": ["slotTemplates.ts", "exercise_selection.md"],
  "conditions": [
    { "field": "slot.role", "operator": "eq", "value": "Secondary" }
  ],
  "actions": [
    { "filter": "approved_exercises", "by": "template.priority", "operator": "lte", "value": 2 }
  ]
}
```

```json
{
  "ruleId": "ES-003",
  "category": "EXERCISE_SELECTION",
  "description": "Accessory slots may be filled from any priority level (1, 2, or 3), but prefer priority-3 isolation exercises to provide a different stimulus stimulus profile than Primary/Secondary slots for the same muscle.",
  "confidence": "high",
  "sources": ["slotTemplates.ts", "exercise_selection.md"],
  "conditions": [
    { "field": "slot.role", "operator": "eq", "value": "Accessory" }
  ],
  "actions": [
    { "filter": "approved_exercises", "by": "template.priority", "operator": "lte", "value": 3 },
    { "prefer": "template.priority", "value": 3 }
  ]
}
```

```json
{
  "ruleId": "ES-004",
  "category": "EXERCISE_SELECTION",
  "description": "Apply default rep range by slot role × muscle priority from SLOT_ROLE_CONFIGS. Do not override with flat rep ranges.",
  "confidence": "high",
  "sources": ["slotRoleConfig.ts", "hypertrophy.md", "optimal_rep_range_for_hypertrophy.md"],
  "conditions": [],
  "actions": [
    {
      "lookup": "SLOT_ROLE_CONFIGS",
      "key": "[slot.role][muscle.priority]",
      "apply": ["slot.sets", "slot.repsMin", "slot.repsMax", "slot.rir"]
    }
  ]
}
```

```json
{
  "ruleId": "ES-005",
  "category": "EXERCISE_SELECTION",
  "description": "For small/joint-sensitive muscles (Shoulders, Calves, Abs, Biceps, Triceps), enforce rep range minimum of 10. Heavy loading of these muscles in the 5–8 rep range produces disproportionate joint stress with no additional hypertrophic benefit.",
  "confidence": "moderate",
  "sources": ["optimal_delt_growth.md", "dumbbell_lateral_raise_guide.md", "exercise_selection.md"],
  "conditions": [
    { "field": "muscle.id", "operator": "in", "value": ["Shoulders", "Calves", "Abs", "Biceps", "Triceps"] },
    { "field": "slot.role", "operator": "in", "value": ["Secondary", "Accessory"] }
  ],
  "actions": [
    { "set": "slot.repsMin", "operator": "clamp_min", "value": 10 }
  ]
}
```

```json
{
  "ruleId": "ES-006",
  "category": "EXERCISE_SELECTION",
  "description": "Enforce rep range hard bounds: repsMin >= 5, repsMax <= 30. Outside this range, the set's hypertrophy-to-fatigue ratio degrades significantly.",
  "confidence": "high",
  "sources": ["optimal_rep_range_for_hypertrophy.md", "hypertrophy.md"],
  "conditions": [],
  "actions": [
    { "set": "slot.repsMin", "operator": "clamp_min", "value": 5 },
    { "set": "slot.repsMax", "operator": "clamp_max", "value": 30 }
  ]
}
```

```json
{
  "ruleId": "ES-007",
  "category": "EXERCISE_SELECTION",
  "description": "Enforce RIR hard floor: no slot may be assigned rir >= 4. Sets at 4+ RIR are junk volume by definition and should not be prescribed.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "hypertrophy.md", "consensus_principles.md"],
  "conditions": [
    { "field": "slot.rir", "operator": "gte", "value": 4 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "set": "slot.rir", "operator": "clamp_max", "value": 3 },
    { "flag": "RIR_ADJUSTED_TO_EFFECTIVE_THRESHOLD" }
  ]
}
```

```json
{
  "ruleId": "ES-008",
  "category": "EXERCISE_SELECTION",
  "description": "Trigger exercise rotation at mesocycle boundary (every 4–8 weeks). Accommodation to a specific movement pattern begins reducing SFR after 4–8 weeks; rotating exercises reintroduces novelty stimulus.",
  "confidence": "moderate",
  "sources": ["optimal_chest_growth.md", "progression.md", "exercise_selection.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "eq", "value": 1 },
    { "field": "slot.weeksOnCurrentExercise", "operator": "gte", "value": 4 }
  ],
  "actions": [
    { "flag": "EXERCISE_ROTATION_DUE" },
    { "recommend": "present_alternative_approved_exercises_for_slot" }
  ]
}
```

```json
{
  "ruleId": "ES-009",
  "category": "EXERCISE_SELECTION",
  "description": "Beginner exercise eligibility gate: filter exercise candidates to only those with beginner_suitable = true when user.experienceLevel = beginner. Prevents beginner Primary slots from receiving deadlifts, unassisted pull-ups, barbell squats, and barbell rows before technique prerequisites are met.",
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

## Category: RECOVERY_MANAGEMENT

```json
{
  "ruleId": "RM-001",
  "category": "RECOVERY_MANAGEMENT",
  "description": "Assign default rest periods by slot role. Primary (compound) slots require 3–5 minutes. Secondary slots 2–3 minutes. Accessory (isolation) slots 60–120 seconds.",
  "confidence": "high",
  "sources": ["recovery.md", "effective_training_principles.md"],
  "conditions": [],
  "actions": [
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Primary" },
      "then": { "set": "slot.restSeconds", "range": [180, 300] }
    },
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Secondary" },
      "then": { "set": "slot.restSeconds", "range": [120, 180] }
    },
    {
      "if": { "field": "slot.role", "operator": "eq", "value": "Accessory" },
      "then": { "set": "slot.restSeconds", "range": [60, 120] }
    }
  ]
}
```

```json
{
  "ruleId": "RM-002",
  "category": "RECOVERY_MANAGEMENT",
  "description": "Soft warning when estimated session duration exceeds 90 minutes. Hard cap at 120 minutes — session quality degrades beyond this point and systemic fatigue accumulation outpaces stimulus value.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "time_limited_training.md", "hypertrophy.md"],
  "conditions": [
    { "field": "session.estimatedMinutes", "operator": "gt", "value": 90 }
  ],
  "actions": [
    {
      "if": { "field": "session.estimatedMinutes", "operator": "between", "value": [90, 120] },
      "then": { "flag": "SESSION_DURATION_WARNING" }
    },
    {
      "if": { "field": "session.estimatedMinutes", "operator": "gt", "value": 120 },
      "then": { "flag": "SESSION_DURATION_EXCEEDED", "trim": "lowest_priority_slots_until_compliant" }
    }
  ]
}
```

```json
{
  "ruleId": "RM-003",
  "category": "RECOVERY_MANAGEMENT",
  "description": "During fat loss phase, reduce total session volume by 10–20% from the build phase baseline. Recovery capacity is reduced under caloric deficit.",
  "confidence": "high",
  "sources": ["training_during_fat_loss.md", "recovery.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" }
  ],
  "actions": [
    { "multiply": "session.totalSets", "by": 0.85 },
    { "set": "session.totalSets", "operator": "round", "direction": "down" }
  ]
}
```

```json
{
  "ruleId": "RM-004",
  "category": "RECOVERY_MANAGEMENT",
  "description": "Log-derived RIR tracking: when a user logs actual RIR on sets, compare against prescribed RIR. If actual RIR consistently exceeds prescribed by >= 2, flag as undertraining. If consistently below prescribed by >= 2, flag as overtraining risk.",
  "confidence": "moderate",
  "sources": ["effective_training_principles.md", "volume_landmarks_effective_training.md"],
  "conditions": [
    { "field": "slot.actualRirLogged", "operator": "neq", "value": null }
  ],
  "actions": [
    {
      "if": { "field": "slot.actualRirLogged - slot.rir", "operator": "gte", "value": 2 },
      "then": { "flag": "UNDERTRAINING_RIR_DEVIATION" }
    },
    {
      "if": { "field": "slot.rir - slot.actualRirLogged", "operator": "gte", "value": 2 },
      "then": { "flag": "OVERTRAINING_RIR_DEVIATION" }
    }
  ]
}
```

---

## Category: FATIGUE_MANAGEMENT

```json
{
  "ruleId": "FM-001",
  "category": "FATIGUE_MANAGEMENT",
  "description": "Performance regression detection: if load or reps achieved in two consecutive sessions decreased at identical prescribed RIR, increment consecutiveBadSessions counter.",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "fatigue management — recovery.md"],
  "conditions": [
    { "field": "session.performanceDeltaVsPrevious", "operator": "lt", "value": 0 },
    { "field": "session.prescribedRir", "operator": "eq", "value": "previousSession.prescribedRir" }
  ],
  "actions": [
    { "increment": "user.consecutiveBadSessions", "by": 1 },
    {
      "if": { "field": "user.consecutiveBadSessions", "operator": "eq", "value": 1 },
      "then": { "flag": "SINGLE_BAD_SESSION_NOTED" }
    },
    {
      "if": { "field": "user.consecutiveBadSessions", "operator": "gte", "value": 2 },
      "then": { "flag": "EARLY_DELOAD_TRIGGER", "trigger": "DL-002" }
    }
  ]
}
```

```json
{
  "ruleId": "FM-002",
  "category": "FATIGUE_MANAGEMENT",
  "description": "Reset consecutiveBadSessions to 0 when a session shows performance improvement or stable performance at or below prescribed RIR.",
  "confidence": "high",
  "sources": ["deloading_protocols.md"],
  "conditions": [
    { "field": "session.performanceDeltaVsPrevious", "operator": "gte", "value": 0 }
  ],
  "actions": [
    { "set": "user.consecutiveBadSessions", "value": 0 }
  ]
}
```

```json
{
  "ruleId": "FM-003",
  "category": "FATIGUE_MANAGEMENT",
  "description": "MRV approach detection: if weekly direct sets for a muscle reach >= 90% of MRV AND progression has stalled for >= 2 weeks, the user has likely hit MRV for this muscle. Do not add further volume.",
  "confidence": "moderate",
  "sources": ["volume_landmarks.md", "not_growing_not_training_enough.md"],
  "conditions": [
    { "field": "muscle.weeklyDirectSets", "operator": "gte", "formula": "muscle.weeklyDirectSetsMax * 0.9" },
    { "field": "progression.consecutiveStallWeeks", "operator": "gte", "value": 2 }
  ],
  "actions": [
    { "flag": "MRV_APPROACH_DETECTED" },
    { "set": "muscle.volumeIncrementBlocked", "value": true },
    { "recommend": "deload_then_reduce_next_meso_max_volume_by_2_sets" }
  ]
}
```

```json
{
  "ruleId": "FM-004",
  "category": "FATIGUE_MANAGEMENT",
  "description": "Indirect overlap contribution to fatigue: when computing total effective sets for a muscle, include indirect sets from other muscles' slots using PRIMARY_ROLE_OVERLAP coefficients, scaled by slot role multiplier.",
  "confidence": "high",
  "sources": ["roleOverlap.ts", "volumeBudget.ts", "hypertrophy.md"],
  "conditions": [],
  "actions": [
    {
      "formula": "indirectSets += slot.sets × PRIMARY_ROLE_OVERLAP[slot.muscle][targetMuscle] × roleMultiplier",
      "where": {
        "roleMultiplier": {
          "Primary": 1.0,
          "Secondary": 0.60,
          "Accessory": 0.30
        }
      }
    },
    { "set": "muscle.weeklyEffectiveSets", "formula": "weeklyDirectSets + indirectSets" }
  ]
}
```

```json
{
  "ruleId": "FM-005",
  "category": "FATIGUE_MANAGEMENT",
  "description": "Post-deload bad session immunity: do not increment consecutiveBadSessions during the first session after a deload ends. A 5–10% performance dip immediately post-deload is expected as neuromuscular coordination and glycogen levels normalize — this is not a genuine regression signal.",
  "confidence": "moderate",
  "sources": ["strength.md", "progression_framework.md", "deloading_protocols.md"],
  "conditions": [
    { "field": "session.performanceDeltaVsPrevious", "operator": "lt", "value": 0 },
    { "field": "user.sessionsSinceLastDeload", "operator": "lte", "value": 1 }
  ],
  "actions": [
    { "block": "consecutiveBadSessions_increment" },
    { "flag": "POST_DELOAD_PERFORMANCE_DIP_EXPECTED" }
  ]
}
```

---

## Category: DELOADING

```json
{
  "ruleId": "DL-001",
  "category": "DELOADING",
  "description": "Scheduled deload: automatically flag week 4 of every 4-week mesocycle block as a deload week. Programs of 5–6 weeks deload at week 5 or 6 depending on training age (beginners: week 6; intermediate/advanced: week 5).",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "volume_landmarks.md", "recovery.md"],
  "conditions": [
    { "field": "session.mesoBlockWeek", "operator": "eq", "value": 4 }
  ],
  "actions": [
    { "set": "session.isDeloadWeek", "value": true },
    { "apply": "DL-010" }
  ]
}
```

```json
{
  "ruleId": "DL-002",
  "category": "DELOADING",
  "description": "Early deload trigger: when consecutiveBadSessions >= 2 (performance regressed in 2 consecutive sessions at identical RIR), trigger an unscheduled deload immediately.",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "recovery.md"],
  "conditions": [
    { "field": "user.consecutiveBadSessions", "operator": "gte", "value": 2 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "set": "session.isDeloadWeek", "value": true },
    { "flag": "EARLY_DELOAD_TRIGGERED" },
    { "apply": "DL-010" },
    { "reset": "user.consecutiveBadSessions", "value": 0 }
  ]
}
```

```json
{
  "ruleId": "DL-003",
  "category": "DELOADING",
  "description": "Deload minimum volume reduction: during any deload week, total weekly sets per muscle must be <= 50% of the peak mesocycle week's volume. Cutting less than 50% does not clear sufficient fatigue.",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "recovery.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true }
  ],
  "actions": [
    { "set": "muscle.weeklyDirectSetsMax", "formula": "muscle.peakMesoWeekSets * 0.50" },
    { "set": "muscle.weeklyDirectSetsTarget", "formula": "muscle.peakMesoWeekSets * 0.50", "note": "Floor is 50%; adequate range is 50–70% of peak. Move toward 0.70 if user trained too hard during the prior deload (DL-007 violations recorded)." }
  ]
}
```

```json
{
  "ruleId": "DL-004",
  "category": "DELOADING",
  "description": "Hypertrophy deload — Load Retention protocol (beginner/intermediate): first half of deload week use 50% sets, 50% reps, 100% load. Second half: 50% sets, 50% reps, 50% load.",
  "confidence": "high",
  "sources": ["deloading_protocols.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true },
    { "field": "user.experienceLevel", "operator": "in", "value": ["beginner", "intermediate"] },
    { "field": "user.trainingPhase", "operator": "neq", "value": "strength" }
  ],
  "actions": [
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 1 },
      "then": [
        { "multiply": "slot.sets", "by": 0.5 },
        { "multiply": "slot.repsMin", "by": 0.5 },
        { "multiply": "slot.repsMax", "by": 0.5 },
        { "set": "slot.load", "value": "100% normal" }
      ]
    },
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 2 },
      "then": [
        { "multiply": "slot.sets", "by": 0.5 },
        { "multiply": "slot.repsMin", "by": 0.5 },
        { "multiply": "slot.repsMax", "by": 0.5 },
        { "set": "slot.load", "value": "50% normal" }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "DL-005",
  "category": "DELOADING",
  "description": "Hypertrophy deload — Joint Healing protocol (advanced / high volume): first half: 100% sets, normal reps, 50% load. Second half: 50% sets, normal reps, 50% load. Used when connective tissue is the primary concern.",
  "confidence": "high",
  "sources": ["deloading_protocols.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true },
    { "field": "user.experienceLevel", "operator": "eq", "value": "advanced" },
    { "field": "user.jointStressFlag", "operator": "eq", "value": true }
  ],
  "actions": [
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 1 },
      "then": [
        { "set": "slot.sets", "value": "100% normal" },
        { "set": "slot.reps", "value": "normal" },
        { "set": "slot.load", "value": "50% normal" }
      ]
    },
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 2 },
      "then": [
        { "multiply": "slot.sets", "by": 0.5 },
        { "set": "slot.reps", "value": "normal" },
        { "set": "slot.load", "value": "50% normal" }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "DL-006",
  "category": "DELOADING",
  "description": "Strength deload — Standard protocol: first half: 50% sets, normal reps, load -10%. Second half: 50% sets, normal reps, load -50%. Neuromuscular pattern must be maintained; volume (not reps) is reduced.",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "strength.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true },
    { "field": "user.trainingPhase", "operator": "eq", "value": "strength" }
  ],
  "actions": [
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 1 },
      "then": [
        { "multiply": "slot.sets", "by": 0.5 },
        { "set": "slot.reps", "value": "normal" },
        { "multiply": "slot.load", "by": 0.90 }
      ]
    },
    {
      "if": { "field": "session.deloadHalf", "operator": "eq", "value": 2 },
      "then": [
        { "multiply": "slot.sets", "by": 0.5 },
        { "set": "slot.reps", "value": "normal" },
        { "multiply": "slot.load", "by": 0.50 }
      ]
    }
  ]
}
```

```json
{
  "ruleId": "DL-007",
  "category": "DELOADING",
  "description": "Deload RIR floor: all slots during deload week must be prescribed at RIR >= 4. Proximity to failure during a deload prevents fatigue from dissipating. If a deload set ends at RIR < 4, the deload is too intense.",
  "confidence": "high",
  "sources": ["deloading_protocols.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true }
  ],
  "actions": [
    { "set": "slot.rir", "operator": "clamp_min", "value": 4 },
    { "set": "slot.countsAsEffectiveVolume", "value": false }
  ]
}
```

```json
{
  "ruleId": "DL-008",
  "category": "DELOADING",
  "description": "Post-deload mesocycle lock: prevent a new mesocycle from beginning until the deload week is completed (all 7 days, not just a single reduced session). Partial deloads do not clear sufficient fatigue.",
  "confidence": "moderate",
  "sources": ["deloading_protocols.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true },
    { "field": "deload.daysCompleted", "operator": "lt", "value": 5 }
  ],
  "actions": [
    { "block": "start_new_mesocycle" },
    { "flag": "DELOAD_NOT_YET_COMPLETE" }
  ]
}
```

```json
{
  "ruleId": "DL-009",
  "category": "DELOADING",
  "description": "Absolute maximum interval between deloads: if weeksSinceLastDeload >= 6, trigger a mandatory deload regardless of current performance. No performance metric exempts from this ceiling. Chronic fatigue accumulation above 6 weeks outpaces all recovery systems even when performance appears stable.",
  "confidence": "high",
  "sources": ["progression_framework.md", "recovery.md"],
  "conditions": [
    { "field": "user.weeksSinceLastDeload", "operator": "gte", "value": 6 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "set": "session.isDeloadWeek", "value": true },
    { "flag": "MANDATORY_DELOAD_MAX_INTERVAL_REACHED" },
    { "apply": "DL-010" }
  ]
}
```

```json
{
  "ruleId": "DL-010",
  "category": "DELOADING",
  "description": "Deload protocol router: select the appropriate deload protocol based on experience level and joint stress flag. Centralises protocol selection so DL-001, DL-002, and DL-009 all delegate here rather than hardcoding DL-004.",
  "confidence": "high",
  "sources": ["deloading_protocols.md", "progression_framework.md", "recovery.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true }
  ],
  "actions": [
    {
      "if": [
        { "field": "user.experienceLevel", "operator": "eq", "value": "advanced" },
        { "AND": { "field": "user.jointStressFlag", "operator": "eq", "value": true } }
      ],
      "then": { "apply": "DL-005" }
    },
    {
      "if": { "field": "user.trainingPhase", "operator": "eq", "value": "strength" },
      "then": { "apply": "DL-006" }
    },
    {
      "else": { "apply": "DL-004" }
    }
  ]
}
```

---

## Category: ADHERENCE

```json
{
  "ruleId": "AD-001",
  "category": "ADHERENCE",
  "description": "Session length hard cap: if estimated session duration exceeds 120 minutes, trim lowest-priority slots until duration is within bounds. Long sessions correlate with lower completion rates and are a structural adherence barrier.",
  "confidence": "high",
  "sources": ["effective_training_principles.md", "time_limited_training.md", "hypertrophy.md"],
  "conditions": [
    { "field": "session.estimatedMinutes", "operator": "gt", "value": 120 }
  ],
  "actions": [
    { "trim": "session.slots", "strategy": "remove_lowest_priority_until_duration_lte_120min" }
  ]
}
```

```json
{
  "ruleId": "AD-002",
  "category": "ADHERENCE",
  "description": "Minimum effective dose during disruption: when a user cannot complete a full session, a reduced session of 2 slots at full intensity maintains the hypertrophic signal and training momentum. Do not cancel — truncate.",
  "confidence": "moderate",
  "sources": ["high_efficiency_hypertrophy.md", "time_limited_training.md", "mindset.md"],
  "conditions": [
    { "field": "session.availableMinutes", "operator": "lt", "value": 45 }
  ],
  "actions": [
    { "trim": "session.slots", "to": 2, "strategy": "retain_highest_priority_only" },
    { "set": "slot.rir", "value": 1, "note": "Maximize stimulus per slot when total slots are constrained" }
  ]
}
```

```json
{
  "ruleId": "AD-003",
  "category": "ADHERENCE",
  "description": "Fat loss floating split: during a cut, do not enforce fixed calendar day scheduling. Schedule sessions on any day with adequate recovery, not a predetermined day of the week. Rigid scheduling during caloric deficit leads to excessive missed sessions.",
  "confidence": "moderate",
  "sources": ["training_during_fat_loss.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" }
  ],
  "actions": [
    { "set": "program.scheduleType", "value": "floating" },
    { "set": "program.minimumGapBetweenSessions", "value": "48hrs" },
    { "set": "program.maximumGapBetweenSessions", "value": "96hrs" }
  ]
}
```

```json
{
  "ruleId": "AD-004",
  "category": "ADHERENCE",
  "description": "Consecutive missed sessions flag: if 2 or more programmed sessions are skipped in a row (not deloaded — skipped entirely), flag for schedule review. 3+ consecutive missed sessions indicates a structural barrier, not a willpower issue.",
  "confidence": "moderate",
  "sources": ["mindset.md"],
  "conditions": [
    { "field": "user.consecutiveSkippedSessions", "operator": "gte", "value": 2 }
  ],
  "actions": [
    { "flag": "CONSECUTIVE_SESSIONS_MISSED" },
    {
      "if": { "field": "user.consecutiveSkippedSessions", "operator": "gte", "value": 3 },
      "then": { "flag": "SCHEDULE_REVIEW_REQUIRED" }
    }
  ]
}
```

---

## Category: MAINTENANCE_VOLUME

```json
{
  "ruleId": "MV-001",
  "category": "MAINTENANCE_VOLUME",
  "description": "MEV (Minimum Effective Volume) floor: muscles receiving fewer than MEV weekly sets receive no meaningful hypertrophic signal. Below MEV = maintenance or atrophy, not growth. Validate weekly plans against MEV minimums.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "recovery.md", "progression.md"],
  "conditions": [
    { "field": "muscle.weeklyDirectSets", "operator": "lt", "value": "muscle.weeklyDirectSetsMin" },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "flag": "BELOW_MEV_WARNING" },
    { "recommend": "add_session_or_sets_for_muscle_to_reach_mev" }
  ]
}
```

```json
{
  "ruleId": "MV-002",
  "category": "MAINTENANCE_VOLUME",
  "description": "Deload MEV preservation: during deload weeks, maintain at least 40% of MEV (not 0 sets). Complete elimination of a muscle during a deload allows more detraining than necessary. The goal is fatigue reduction, not stimulus elimination.",
  "confidence": "moderate",
  "sources": ["deloading_protocols.md", "volume_landmarks.md"],
  "conditions": [
    { "field": "session.isDeloadWeek", "operator": "eq", "value": true },
    { "field": "muscle.weeklyDirectSetsDeload", "operator": "lt", "formula": "muscle.weeklyDirectSetsMin * 0.4" }
  ],
  "actions": [
    { "set": "muscle.weeklyDirectSetsDeload", "formula": "muscle.weeklyDirectSetsMin * 0.4" }
  ]
}
```

```json
{
  "ruleId": "MV-003",
  "category": "MAINTENANCE_VOLUME",
  "description": "Muscle retention minimum during fat loss: weekly effective sets must remain >= MEV for all muscles. Falling below MEV during a cut causes detectable muscle loss within 2–3 weeks.",
  "confidence": "high",
  "sources": ["training_during_fat_loss.md", "volume_landmarks.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "cut" },
    { "field": "muscle.weeklyEffectiveSets", "operator": "lt", "value": "muscle.weeklyDirectSetsMin" }
  ],
  "actions": [
    { "flag": "MUSCLE_LOSS_RISK_BELOW_MEV_CUT" },
    { "recommend": "increase_frequency_or_add_mev_session_for_muscle" }
  ]
}
```

```json
{
  "ruleId": "MV-004",
  "category": "MAINTENANCE_VOLUME",
  "description": "Extended inactivity threshold: complete cessation of training (0 sets) for a muscle begins producing measurable atrophy after approximately 14 days. Flag any muscle with 0 planned sessions for 2+ consecutive weeks outside a scheduled deload.",
  "confidence": "moderate",
  "sources": ["volume_landmarks.md", "recovery.md"],
  "conditions": [
    { "field": "muscle.daysSinceLastSession", "operator": "gt", "value": 14 },
    { "field": "session.isDeloadWeek", "operator": "eq", "value": false }
  ],
  "actions": [
    { "flag": "EXTENDED_INACTIVITY_ATROPHY_RISK" },
    { "recommend": "schedule_at_minimum_mev_session_for_muscle" }
  ]
}
```

```json
{
  "ruleId": "MV-005",
  "category": "MAINTENANCE_VOLUME",
  "description": "Maintenance phase volume target: when trainingPhase = 'maintain', set weekly direct sets target to MEV floor only. Do not accumulate progressive volume overload. Maintenance requires only the minimum effective signal.",
  "confidence": "high",
  "sources": ["volume_landmarks.md", "training_during_fat_loss.md"],
  "conditions": [
    { "field": "user.trainingPhase", "operator": "eq", "value": "maintain" }
  ],
  "actions": [
    { "set": "muscle.weeklyDirectSetsTarget", "value": "muscle.weeklyDirectSetsMin" },
    { "set": "progression.autoIncrementEnabled", "value": false },
    { "set": "session.mesoProgressionEnabled", "value": false }
  ]
}
```

---

## Rule Index

| Rule ID | Category | Confidence | Description Summary |
|---|---|---|---|
| VA-001 | Volume Allocation | High | MEV floor by muscle priority |
| VA-002 | Volume Allocation | High | MAV target by muscle priority |
| VA-003 | Volume Allocation | High | MRV ceiling by muscle priority |
| VA-004 | Volume Allocation | High | Session slot count hard cap (5) |
| VA-005 | Volume Allocation | High | Session set count hard cap (24) |
| VA-006 | Volume Allocation | High | Sets per exercise hard cap (5) |
| VA-007 | Volume Allocation | High | Junk volume gate (RIR >= 4) |
| VA-008 | Volume Allocation | High | Mesocycle weekly volume progression |
| VA-009 | Volume Allocation | Moderate | Volume scaling (MEV + MAV + MRV) by experience level |
| VA-010 | Volume Allocation | High | Very-high fatigue exercise cap: max 1 per session |
| FA-001 | Frequency Allocation | High | Minimum 2× per muscle per week |
| FA-002 | Frequency Allocation | Moderate | Max frequency by recovery class |
| FA-003 | Frequency Allocation | Moderate | Recovery class assignment per muscle |
| FA-004 | Frequency Allocation | High | 48-hour minimum gap between same-muscle sessions |
| FA-005 | Frequency Allocation | High | No consecutive lower-body sessions |
| FA-006 | Frequency Allocation | High | 2× minimum during fat loss for muscle retention |
| PR-001 | Progression | High | Double progression trigger — role-based increment, reportedRir ≤ prescribedRir+1 |
| PR-002 | Progression | High | Beginner linear progression with formal technical failure gate |
| PR-003 | Progression | Moderate | Micro-loading for isolation movements (1.25 lbs) |
| PR-004 | Progression | Moderate | Stall detection — 2 weeks (advanced) / 3 weeks (others), fatigue masking check first |
| PR-005 | Progression | High | Progression inhibition during fat loss |
| PR-006 | Progression | Moderate | Tempo progression fallback when load blocked |
| PR-007 | Progression | High | Meso volume baseline reset post-deload |
| PR-009 | Progression | High | Cross-mesocycle load carry-forward (intermediate/advanced) |
| PR-010 | Progression | High | Fat loss primary slot rep floor: repsMin >= 8 during cut |
| PR-011 | Progression | Moderate | Cross-mesocycle MEV advancement based on prior meso progression rate |
| EO-001 | Exercise Ordering | High | Role ordering: Primary → Secondary → Accessory |
| EO-002 | Exercise Ordering | High | Muscle priority ordering within session |
| EO-003 | Exercise Ordering | High | Compound before isolation within same muscle |
| EO-004 | Exercise Ordering | Moderate | No consecutive overlapping compound movements |
| EO-005 | Exercise Ordering | High | Weekly push/pull/hinge/squat movement balance check |
| ES-001 | Exercise Selection | High | Primary slots: priority-1 exercises only |
| ES-002 | Exercise Selection | High | Secondary slots: priority 1–2 exercises |
| ES-003 | Exercise Selection | High | Accessory slots: all priority levels, prefer isolation |
| ES-004 | Exercise Selection | High | Rep range defaults from SLOT_ROLE_CONFIGS |
| ES-005 | Exercise Selection | Moderate | Rep range minimum 10 for small/joint-sensitive muscles |
| ES-006 | Exercise Selection | High | Rep range hard bounds: 5 min, 30 max |
| ES-007 | Exercise Selection | High | RIR hard floor: no slot prescribed at RIR >= 4 (non-deload sessions only) |
| ES-008 | Exercise Selection | Moderate | Exercise rotation trigger at mesocycle boundary |
| ES-009 | Exercise Selection | High | Beginner exercise eligibility gate (beginner_suitable filter) |
| RM-001 | Recovery Management | High | Rest period defaults by slot role |
| RM-002 | Recovery Management | High | Session duration soft warning (90 min) and hard cap (120 min) |
| RM-003 | Recovery Management | High | Fat loss session volume reduction (−15%) |
| RM-004 | Recovery Management | Moderate | Logged RIR deviation detection |
| FM-001 | Fatigue Management | High | Performance regression detection → consecutiveBadSessions |
| FM-002 | Fatigue Management | High | Reset consecutiveBadSessions on performance recovery |
| FM-003 | Fatigue Management | Moderate | MRV approach detection via stall + volume |
| FM-004 | Fatigue Management | High | Indirect overlap sets contribution formula |
| FM-005 | Fatigue Management | Moderate | Post-deload bad session immunity (first session post-deload exempt) |
| DL-001 | Deloading | High | Scheduled deload: week 4 of every mesocycle block |
| DL-002 | Deloading | High | Early deload trigger: consecutiveBadSessions >= 2 |
| DL-003 | Deloading | High | Deload volume: 50% floor (50–70% adequate range) |
| DL-004 | Deloading | High | Hypertrophy load retention protocol (beginner/intermediate) |
| DL-005 | Deloading | High | Hypertrophy joint healing protocol (advanced) |
| DL-006 | Deloading | High | Strength deload protocol (maintain reps, reduce load) |
| DL-007 | Deloading | High | Deload RIR floor: all sets at RIR >= 4 |
| DL-008 | Deloading | Moderate | Post-deload mesocycle lock until 5+ deload days complete |
| DL-009 | Deloading | High | Absolute max interval: mandatory deload at 6 weeks regardless of performance |
| DL-010 | Deloading | High | Deload protocol router (replaces hardcoded DL-004 in DL-001/DL-002) |
| AD-001 | Adherence | High | Session length hard cap enforcement |
| AD-002 | Adherence | Moderate | Minimum effective dose (2 slots) during disruption |
| AD-003 | Adherence | Moderate | Fat loss floating split scheduling |
| AD-004 | Adherence | Moderate | Consecutive missed sessions detection |
| MV-001 | Maintenance Volume | High | MEV floor validation |
| MV-002 | Maintenance Volume | Moderate | Deload MEV preservation (40% minimum) |
| MV-003 | Maintenance Volume | High | Muscle retention MEV floor during cut |
| MV-004 | Maintenance Volume | Moderate | Extended inactivity atrophy threshold (14 days) |
| MV-005 | Maintenance Volume | High | Maintenance phase: target MEV only, no progression |
