# G.R.I.T. Doctrine: Hypertrophy

> Canonical reference for all hypertrophy-related rules, defaults, and recommendations in the G.R.I.T. platform.
> Sources: Israetel (RP), Nippard, Schwarzenegger/Haney. 24 distilled knowledge files.

---

## Core Principles

### 1. Mechanical Tension at the Stretched Position is the Primary Growth Signal
Loading a muscle under stretch — the deepest point of the range — is the most potent hypertrophic stimulus identified across all sources. This supersedes all technique debates about peak contraction, squeezing at the top, or metabolite accumulation as the primary mechanism.

### 2. Effective Volume Requires Proximity to Failure
A set only counts as hypertrophic stimulus when performed within 1–3 Reps in Reserve (RIR). Sets performed at 4+ RIR are "junk volume" — they accumulate fatigue without producing a sufficient adaptive signal. Effective weekly volume is counted only in hard sets.

### 3. Progressive Overload is the Adaptive Engine
Without progressive overload — more reps, more load, or more sets over time — the body has no reason to add tissue. Every other principle is in service of this one. A training program that does not produce week-over-week progression in some trackable variable is not producing hypertrophy.

### 4. Systemic Fatigue is a Finite Resource
You cannot train all muscles at their maximum recoverable volume (MRV) simultaneously. Prioritized muscles receive high volume; everything else is maintained. Attempting to maximize every muscle group at once produces overtraining, not maximum hypertrophy.

### 5. Frequency Distribution Beats Concentrated Volume
Training a muscle 2–3 times per week consistently outperforms training it once per week at the same total weekly volume. Protein synthesis windows are shorter than the interval between once-per-week sessions. Distribute volume across sessions rather than concentrating it.

---

## Rules

### Volume
| Parameter | Hard Floor | Sweet Spot | Hard Ceiling |
|---|---|---|---|
| Sets per muscle per week | 8 (MEV) | 10–20 | ~20+ (MRV) |
| Sets per exercise per session | 2 | 3–5 | 5 |
| Sets per muscle per session | — | 4–6 | ~8 |
| Sets per session (total) | 8 | 12–18 | 24 |

- Below MEV (~8 sets/week): maintenance only, no meaningful growth signal
- Above MRV (~20 sets/week for most muscles): recovery deficit accumulates, performance regresses
- Sets past the 5th for any single exercise in a session are presumed junk unless exceptional individual tolerance is confirmed
- *Added 2026-06-12 (A-8):* Muscle protein synthesis per session appears to max out at approximately 6–8 sets per muscle (Strong Evidence, building_delts_hypertrophy.md). Beyond 8 sets targeting the same muscle in a single session, additional sets yield diminishing returns regardless of exercise variety. Volume exceeding 8 sets per muscle per session is better split across a second session that week. Note: this is a *per-muscle* ceiling within a session and is distinct from the per-exercise cap (VA-006) and per-session total cap (VA-005)
- *Added 2026-06-12 (A-11):* Volume distribution heuristic — when total planned sets for a muscle in a session is **5–7, use one exercise**; when **7–12, use two to three exercises**. This prevents excessive variety (warm-up overhead per exercise) and insufficient variety (same load angle every set). (Source: exercise_selection_for_muscle_growth.md — expert opinion / coaching best practice)

### Intensity
- Working RIR target: **1–2** for all working sets
- Absolute floor: **3 RIR maximum** for a set to count as effective volume
- Technical failure (form breaks down) = true 0 RIR — stop the set
- Beginners cannot reliably self-report RIR; use bar speed deceleration as a proxy
- *Added 2026-06-12 (B-3):* RIR target should be adjusted by movement type — use lower RIR (0–1) on stable isolation exercises where form risk is low; use higher RIR (1–2) on high-skill compound movements where form breakdown risk is significant (Source: rir_intensity_autoregulation.md, training_intensity_failure_management.md)
- *Added 2026-06-12 (B-3):* Beginners are particularly prone to "sandbagging" — self-reporting RIR 2 when actual RIR is 8+. Use AMRAP sets on safe isolation exercises in the first 4–8 weeks to calibrate effort perception before introducing RIR targets

### Rep Ranges
- **Valid range**: 5–30 reps (all produce equivalent hypertrophy if performed near failure)
- **Default for compound movements**: 5–12 reps
- **Default for isolation movements**: 10–20 reps
- **Hard floor**: 5 reps minimum (below this, CNS and connective tissue cost outweighs hypertrophic return)
- **Hard ceiling**: 30 reps (above this, the set becomes cardiovascular, not hypertrophic)
- Isolation movements on small muscles (delts, arms, calves, abs): 10–20 reps preferred for joint safety

### Frequency
- **Minimum**: 2× per muscle per week
- **Default**: 2–3× per muscle per week
- **Advanced prioritization**: up to 4× for fast-recovering muscles (delts, calves, abs)
- Once-per-week training (bro splits) is never the preferred option; distributing volume improves outcomes at identical weekly totals

### Session Duration
- **Target**: 60–90 minutes
- **Soft warning**: >90 minutes
- **Hard cap**: 120 minutes (quality degrades beyond this; systemic fatigue outpaces stimulus)
- *Added 2026-06-12 (B-9):* During fat loss phases (caloric deficit), the effective hard cap drops to **90 minutes**. Caloric restriction reduces recovery capacity, making sessions beyond 90 minutes disproportionately fatiguing and junk-volume-heavy during cuts. (Source: training_during_fat_loss.md — Moderate Evidence)

### Eccentric Phase
- All working sets should include a controlled eccentric: **2–3 seconds minimum**
- Gravity-assisted "dropping" of the weight eliminates a significant portion of the hypertrophic stimulus
- When load is near capacity, a 2-second eccentric is always preferred over reducing weight

---

## Practical Application

### Program Structure
1. Derive split type from muscle priorities (emphasized muscles get more sessions)
2. Assign muscles to sessions ensuring ≥2× weekly frequency per muscle
3. Fill sessions with 3–5 slots per session (hard max 5)
4. Assign sets/reps per slot from SLOT_ROLE_CONFIGS by role × priority
5. Validate total weekly effective sets against MEV/MRV per muscle
6. Insert deload week at end of every 4-week block

### Mesocycle Design
- Standard length: **4 weeks** (3 hard weeks + 1 deload)
- Extended mesocycles (6–8 weeks) appropriate for lower-frequency beginners or moderate-volume programs
- Each week within the mesocycle should increase volume by 1–2 sets per muscle vs. the prior week
- Never design a flat-volume mesocycle — progressive volume overload must be structurally present
- *Added 2026-06-12 (B-10):* 8–12 week mesocycles are referenced in block periodization literature as valid for intermediate/advanced lifters (training_size_strength.md, block_periodization.md). These longer blocks can be structured as two consecutive 4-week mesocycles with a single deload between them, or as a single extended block. The 4-week default remains appropriate for the G.R.I.T. standard program; the longer block is an advanced option. Phase potentiation — the concept that a low-volume/high-intensity strength phase increases the body's sensitivity to a subsequent high-volume hypertrophy phase — is cited at Moderate Evidence and warrants future consideration for multi-block program design (see doctrine_gap_analysis.md E-2)

### Session Design Order of Operations
1. Establish which muscles are trained that session
2. Assign Primary slot (main compound) first
3. Assign Secondary slots for emphasized/grow muscles if capacity remains
4. Assign Accessory slots for MEV muscles if capacity remains
5. Cap at 5 total slots, 24 total sets
6. Order slots: Primary → Secondary → Accessory within each muscle; higher-priority muscles earlier in session

### Supersets
- Agonist supersets (same muscle group, different exercises): increase density without adding fatigue cost — recommended
- Antagonist supersets (opposing muscle groups): acceptable, reduces rest time
- Compound-compound supersets (e.g., squats + deadlifts): avoid — systemic fatigue spike is disproportionate

---

## Exceptions

**Time-constrained training**: When sessions must be ≤45 minutes, prioritize proximity to failure over volume. 2–3 very hard sets per muscle group outperforms 5–6 moderate sets. Reduce exercise count; maintain intensity.

**Fat loss phases**: Lower rep ranges (5–8) carry elevated injury risk when systemic fatigue is high from caloric deficit. During cuts, default to 10–20 rep range for all movements. Avoid near-1RM attempts.

**Beginners (0–2 years)**: Start at or near MEV for all muscle groups. Beginners do not need 20 sets/week — they grow from nearly any stimulus. Prioritize technique mastery and frequency over volume accumulation.

**Advanced lifters (7+ years)**: MRV for a prioritized muscle may reach 25–35+ sets/week. This is not universally applicable — it reflects training age and individual tolerance, not a target for general programs.

**Muscle-specific rep range exceptions**: Delts, calves, and abs tolerate and may prefer the higher end of the rep range (15–25) due to fiber composition and movement pattern. Do not force heavy loading on these muscles.

---

## Confidence Ratings

| Principle | Confidence | Basis |
|---|---|---|
| Stretch-position loading superior | High | Present in 14+ files, consistent direction |
| 1–3 RIR defines effective volume | High | Universal across all 24 files |
| 10–20 sets/muscle/week sweet spot | High | 18+ files, supported by Israetel volume landmark model |
| Rep range 5–30 equivalent near failure | High | Explicit across Nippard, Israetel sources |
| 2–3× frequency superior to 1× | High | Consistent across all periodization sources |
| 2–3 second eccentric critical | Moderate-High | Widespread but less directly cited with RCT data |
| Diminishing returns past set 5 | Moderate | Consistent coaching position; less direct RCT support |
| Agonist supersets safe for density | Moderate | Empirically endorsed; mechanism clear but less studied |
