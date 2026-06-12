# Doctrine Gap Analysis
Date: 2026-06-12
Source coverage: 12 doctrine files read in full; 50 distilled files read (45 hypertrophy, 5 strength); 3 raw-json files spot-checked for confidence levels and citations not captured in distilled summaries.

---

## Executive Summary

The existing doctrine is well-constructed and internally consistent. The new knowledge files largely reinforce rather than contradict it. The most significant gap is the **absence of any doctrine entry on HIT / Min-Max training** as a legitimate alternative paradigm — multiple files establish it as valid with Strong Evidence but doctrine frames 3–5 sets per exercise as a universal hard standard without acknowledging the 1–2 set / absolute failure trade-off. The second major gap is **protein and nutrient timing**, which appears repeatedly in new files with specific numerical targets but is absent from doctrine. The third cluster concerns several **nuanced technique findings** — particularly the superiority of seated over lying leg curl, the seated position on leg extension, the 7-segment deltoid model, and "pour the pitcher" impingement risk — that appear across multiple files with Strong Evidence ratings but have no entry in doctrine. Finally, new files provide **a meaningful qualification to the "full ROM is always superior" principle**: lengthened partials performed in the stretched position are validated as near-equivalent or superior to full ROM in some contexts, which is not reflected in doctrine's current treatment of partial reps as categorically inferior.

---

## A. New Principles Not Currently Represented

### A-1. Lengthened Partials (Stretched-Position Partials) as Valid Hypertrophy Technique
- **Confidence:** High
- **Supporting files:** training_past_failure.md, rom_hypertrophy_optimization.md, optimizing_hypertrophy_rom.md, training_intensity_sustainability_hypertrophy.md, train_pure_muscle_growth.md, training_past_failure.json (2026 IJES study cited with "Strong Evidence")
- **Impact:** Medium — would add a technique category to progression.md and exercise_selection.md; does not change core rules but qualifies the partial-rep prohibition
- **Recommended action:** Add to doctrine
- **Detail:** Multiple files distinguish between shortened-position partials (ineffective) and lengthened-position partials (effective, near-equivalent to full ROM when hard reps are matched). The 2026 International Journal of Exercise Science study found statistically equivalent 8% muscle growth between full ROM and full ROM + post-failure partials when volume load was equated. Doctrine currently states "partial-range training as a deliberate hypertrophy strategy produces inferior muscle development" without this distinction. The evidence specifically supports lengthened-position partials as a time-efficient intensity technique, particularly for isolation exercises.

---

### A-2. HIT / Min-Max Protocol: 1–2 Sets to Absolute Failure as a Valid Alternative
- **Confidence:** High
- **Supporting files:** hit_min_max.md, hit_min_max.json, training_intensity_sustainability_hypertrophy.md
- **Impact:** High — directly challenges the "3–5 sets per exercise" hard-code in rules_engine.md (VA-006), and the foundational belief R-01 treating 3–5 sets per exercise as universal
- **Recommended action:** Add to doctrine
- **Detail:** Strong Evidence supports 1–2 sets taken to true muscular failure producing equal or near-equal hypertrophy compared to 3–4 submaximal sets. The first set provides the largest relative stimulus; subsequent sets yield diminishing returns. This creates a valid inverse volume-intensity trade-off: fewer sets require true failure (0 RIR), while higher-set approaches use 1–2 RIR. Doctrine currently treats 3–5 sets as the operative standard without acknowledging this trade-off. The Min-Max approach is flagged as advanced-only (not suitable for beginners), which aligns with doctrine's experience-based structure. Doctrine should note that VA-006 (5 sets/exercise hard cap) is a ceiling, but the floor (3 sets) is not universally correct.

---

### A-3. Nutrition: Protein Targets and Timing as Recovery Variables
- **Confidence:** High
- **Supporting files:** nutrient_timing.md, biology_of_muscle_growth.md, science_programming_muscle_growth.md, science_based_hypertrophy_tension_volume.md, biology_programming_muscle_growth.md
- **Impact:** Medium — does not change training rules but belongs in the recovery or mindset doctrine as a prerequisite for adaptation
- **Recommended action:** Add to doctrine
- **Detail:** Multiple files consistently cite 0.7–1.0 g protein per pound of body weight (1.6–2.2 g/kg) as the effective range for hypertrophy. Leucine is identified as the primary nutritional trigger for mTOR/MPS with Strong Evidence. Post-workout protein within 1–2 hours provides anti-catabolic benefit (Moderate Evidence). 4+ meals per day distributes amino acid availability more effectively than 1–2 large meals. The current recovery.md mentions protein only briefly ("~0.7–1g per lb bodyweight") and does not give it standalone principle status. Given how consistently it appears across sources, it warrants elevation.

---

### A-4. 7-Segment Deltoid Model: Requires Multi-Angle Training for Complete Development
- **Confidence:** High
- **Supporting files:** building_delts_hypertrophy.md, lateral_raise_biomechanics.md
- **Impact:** Medium — would refine exercise_taxonomy.md and exercise_selection.md for shoulder training; may affect shoulder slot assignment logic
- **Recommended action:** Add to doctrine
- **Detail:** The deltoid has 7 functional anatomical segments (not 3 heads), requiring varied angles and resistance profiles for complete regional hypertrophy — this is cited as Strong Evidence. Heavy overhead presses primarily develop the anterior deltoid; the lateral deltoid requires abduction-plane isolation; the rear delt requires transverse plane movements. The current exercise_taxonomy.md treats shoulders as a single "Vertical Press" category. This anatomical model has direct implications for the minimum exercise variety needed per session for complete delt development.

---

### A-5. Subacromial Impingement Risk from Internal Rotation During Lateral Raises ("Pour the Pitcher")
- **Confidence:** High
- **Supporting files:** lateral_raise_biomechanics.md
- **Impact:** Medium — safety flag that should be encoded in exercise_selection.md and exercise_taxonomy.md for the Cable/Dumbbell Lateral Raise entries
- **Recommended action:** Add to doctrine
- **Detail:** Internally rotating the shoulder ("pouring the pitcher" or "emptying the can") during lateral raises significantly increases subacromial impingement risk by narrowing the subacromial space — rated Strong Evidence. The scapular plane (15–30° forward of the frontal plane) maximizes safety and lateral delt activation simultaneously. Raising above shoulder height shifts load to the upper traps. Current doctrine flags "heavy barbell lateral raises" as a risk but does not address this rotation-specific injury mechanism. Doctrine should specify: neutral wrist, scapular plane, and stopping at shoulder height as technique standards for all lateral raise variants.

---

### A-6. Seated vs. Lying Leg Curl: Seated Superior Due to Longer Muscle Length
- **Confidence:** High
- **Supporting files:** stretch_mediated_hypertrophy.md, stretch_mediated_hypertrophy.json (Strong Evidence)
- **Impact:** Low — exercise selection nuance, but directly actionable in exercise_taxonomy.md and exercise_selection.md
- **Recommended action:** Add to doctrine
- **Detail:** Seated leg curls are superior to lying leg curls for hamstring hypertrophy because they train the muscle at a longer length (hip is flexed, placing both the knee flexion and hip components of the hamstring under stretch simultaneously). This is rated Strong Evidence. Current exercise_taxonomy.md lists "Lying Leg Curl" and "Seated Leg Curl" without distinguishing superiority. The exercise_selection.md entry for hamstrings does not specify this preference.

---

### A-7. Leg Extension Machine Technique: Seat Lean-Back for Rectus Femoris Stretch
- **Confidence:** High
- **Supporting files:** stretch_mediated_hypertrophy.md, stretch_mediated_hypertrophy.json (Strong Evidence)
- **Impact:** Low — technique cue, no rule changes needed; belongs in exercise_taxonomy.md
- **Recommended action:** Add to doctrine
- **Detail:** Leaning back on the leg extension machine places the hip in extension, stretching the rectus femoris (the only quad head that crosses both the hip and knee) — rated Strong Evidence. Standard upright sitting fails to stretch the rectus femoris, leaving the most unique quad contribution untrained. Current doctrine has no technique cues for leg extensions beyond "ROM is the primary driver of quad development."

---

### A-8. Per-Session Volume Cap for Single Muscles: 6–8 Sets Maximum Before Junk Volume
- **Confidence:** Medium
- **Supporting files:** building_delts_hypertrophy.md (Strong Evidence cited for 6–8 set cap), exercise_selection_for_muscle_growth.md, hit_min_max.md
- **Impact:** Medium — would qualify existing rules. VA-006 caps sets per exercise at 5, but the 6–8 total sets per muscle per session cap is a related but different constraint not currently in doctrine
- **Recommended action:** Add to doctrine
- **Detail:** Muscle protein synthesis maxes out at approximately 6–8 sets per muscle per session; additional sets yield diminishing returns. This is cited with Strong Evidence in building_delts_hypertrophy.md. The current engine caps sets per single exercise at 5 (VA-006) but does not cap total sets targeting the same muscle within a single session across multiple exercises. A session with 3 exercises × 3 sets each = 9 sets for one muscle may already exceed this threshold. This finding also has practical volume distribution implications: exceeding 8 sets per muscle in one session is better split across a second session.

---

### A-9. Asymmetrical A/B Split Design: Two Bias-Differentiated Days per Muscle Group
- **Confidence:** Medium
- **Supporting files:** asymmetrical_ppl_splits.md, pull_day_architecture.md, building_delts_hypertrophy.md
- **Impact:** Low — program template design consideration, not a change to core training principles
- **Recommended action:** Add to doctrine
- **Detail:** For lifters using 2× weekly frequency, training the same muscle with two differentially-biased sessions (e.g., Chest-focused Push vs. Delt-focused Push; Lat-focused Pull vs. Mid-back Pull) improves regional hypertrophy and reduces overuse relative to running identical sessions twice. This is cited with Strong Evidence for angle/region targeting. Current doctrine does not address how to structure the two frequency sessions for the same muscle — it only establishes that 2× is necessary, not how those two sessions should differ.

---

### A-10. Myo-Reps as a Distinct Progression and Time-Efficiency Tool
- **Confidence:** Medium
- **Supporting files:** training_during_fat_loss.md, training_past_failure.md, asymmetrical_ppl_splits.md
- **Impact:** Low — already partially present in progression.md as a method in the toolkit, but not defined with operational detail
- **Recommended action:** Strengthen existing entry
- **Detail:** Myo-reps (first set near failure followed by short 5–10 second intra-set rest periods and mini-sets matching that first set's rep count) are presented across multiple files as achieving equivalent hypertrophy stimulus to post-failure partials and traditional multiple sets, but in significantly less time. Moderate Evidence. Current progression.md includes "myo-rep matching" in its toolkit but rates confidence only "Moderate" and provides no operational definition. Given its repeated appearance across sources for both hypertrophy and fat-loss contexts, the definition and use-case conditions warrant expansion.

---

### A-11. Volume Distribution Principle: 5–7 Sets/Session → 1 Exercise; 7–12 Sets → 2–3 Exercises
- **Confidence:** Medium
- **Supporting files:** exercise_selection_for_muscle_growth.md
- **Impact:** Low — design heuristic for session-level exercise count decisions
- **Recommended action:** Add to doctrine
- **Detail:** When total planned sets for a muscle in a session is 5–7, use one exercise. When 7–12, use two to three exercises. This prevents both excessive variety (creates warm-up fatigue overhead) and insufficient variety (same load angle every set). This is presented as expert opinion / coaching best practice but is internally consistent with the existing 3–5 sets per exercise doctrine. No rule currently governs how many exercises to assign per muscle per session.

---

### A-12. Strength as a Learnable Skill with Neurological Components Distinct from Muscle Mass
- **Confidence:** High
- **Supporting files:** strength_vs_muscle.md, strength_vs_hypertrophy.md
- **Impact:** Low — primarily a conceptual clarification; strength.md partially covers this but lacks the advanced framing
- **Recommended action:** Strengthen existing entry
- **Detail:** Strength is explicitly presented as a neuromuscular skill heavily influenced by biomechanics, limb length ratios, motor unit recruitment sequencing, and technique rhythm — not just muscle cross-sectional area. The distinction between powerlifters (stronger) and bodybuilders (more muscle) reinforces this. Current strength.md states "strength is a neuromuscular skill" but does not explain why technique, rhythm, and firing sequence diverge from mass accumulation. The new files provide clearer framing for the user-facing corollary: a strength plateau is often a technique problem, not a muscle problem.

---

## B. Existing Principles Strengthened

### B-1. Stretch-Position Loading Superiority — Now Supported with "Strong Evidence" Rating
- **Confidence:** High
- **Supporting files:** stretch_mediated_hypertrophy.md, optimizing_hypertrophy_rom.md, rom_hypertrophy_optimization.md, science_rep_ranges.md, lateral_raise_biomechanics.md, building_delts_hypertrophy.md, training_past_failure.md
- **Impact:** Low — principle already in doctrine as U-03 (High confidence); new files raise it to near-definitive status
- **Recommended action:** Strengthen existing entry
- **Detail:** Stretch-mediated hypertrophy is now supported by multiple dedicated files, all rating it Strong Evidence. Specific muscle examples are added (seated vs. lying hamstring curl, seated position on leg extensions). The principle that "the stretch position is more productive than peak contraction" is consistently validated. Doctrine's foundational_beliefs.md rates this High (18/24 files); the new file count would increase this substantially.

---

### B-2. 5–30 Rep Range Equivalence Near Failure — Multiple Additional Strong Evidence Citations
- **Confidence:** High
- **Supporting files:** science_rep_ranges.md, biology_of_muscle_growth.md, science_programming_muscle_growth.md, biology_programming_muscle_growth.md, training_size_strength.md
- **Impact:** Low — principle already in doctrine as R-02; this adds more evidence citations
- **Recommended action:** Strengthen existing entry
- **Detail:** Multiple new files cite the 5–30 rep range equivalence near failure as Strong Evidence from multiple studies. One file extends this slightly to 3–30 reps, widening the lower bound from 5 to 3 (though this applies to strength training contexts, not hypertrophy specifically). This strengthens the foundational_beliefs.md confidence rating from "High" toward definititive.

---

### B-3. Proximity to Failure as the Primary Intensity Variable — Stronger Evidence Base
- **Confidence:** High
- **Supporting files:** rir_intensity_autoregulation.md, training_intensity_failure_management.md, science_rep_ranges.md, training_past_failure.md, training_volume_recovery.md
- **Impact:** Low — principle well-established in doctrine; new files add operational nuance
- **Recommended action:** Strengthen existing entry
- **Detail:** New files add nuances not currently in doctrine: (1) use lower RIR (0–1) on stable isolation exercises where form risk is low; use higher RIR (1–2) on high-skill compound movements. (2) RIR targets should progress within a mesocycle — starting at 3–4 RIR, tapering to 0–1 RIR as the cycle concludes. (3) Beginners are particularly prone to "sandbagging" (calling RIR 2 when actual RIR is 8). These nuances add useful operational depth to the RIR section of hypertrophy.md.

---

### B-4. Deload Principles — "2-Session Rule" and "Braking Hard" Explicitly Named
- **Confidence:** High
- **Supporting files:** deloading_protocols.md
- **Impact:** Low — doctrine already contains these rules; naming them aids user communication
- **Recommended action:** Strengthen existing entry
- **Detail:** The deloading_protocols.md introduces the "2-Session Confirmation" as a named principle ("never deload after a single bad session; wait for performance to decline for two consecutive sessions") and the "Braking Rule" ("when you hit the brakes on training, you must hit them hard"). Both concepts already exist in doctrine but are unnamed. Making these named heuristics could improve in-app coaching communication.

---

### B-5. Supersets and Advanced Techniques — Lengthened Partials, Drop Sets, Myo-Reps Validated
- **Confidence:** Medium
- **Supporting files:** asymmetrical_ppl_splits.md, training_past_failure.md, training_during_fat_loss.md
- **Impact:** Low — doctrine has supersets and some technique variety; this reinforces Moderate-rated claims
- **Recommended action:** Strengthen existing entry
- **Detail:** Drop sets and myo-reps are explicitly validated (Moderate Evidence) as producing similar muscle growth to traditional straight sets in less time. The current foundational_beliefs.md R-08 covers antagonist supersets but does not address these intensity techniques. The evidence now justifies elevating these from coaching suggestions to formally documented techniques with appropriate caveats (isolation-only for drop sets and partials; not appropriate for beginners).

---

### B-6. Adherence and Enjoyment as True Training Variables
- **Confidence:** High
- **Supporting files:** training_intensity_sustainability_hypertrophy.md, training_during_fat_loss.md, evidence_based_fitness.md
- **Impact:** Low — principle already at High confidence in mindset.md; new files add strong affirmation
- **Recommended action:** Strengthen existing entry
- **Detail:** Multiple new files explicitly state that clients who love a sub-optimal program will outperform those on a "perfect" program they dislike. The mindset.md doctrine already covers this under "The Role of Enjoyment" but primarily as a secondary consideration. New files elevate it to a core programming variable: if adherence to a split is poor, the program is objectively wrong regardless of its theoretical optimality.

---

### B-7. Cables Preferred Over Dumbbells for Lateral Raises (Constant-Tension Advantage)
- **Confidence:** High
- **Supporting files:** building_delts_hypertrophy.md, lateral_raise_biomechanics.md (Strong Evidence)
- **Impact:** Low — exercise_selection.md already recommends cables for isolations; this adds specific lateral raise rationale
- **Recommended action:** Strengthen existing entry
- **Detail:** Dumbbells provide zero tension at the bottom of a lateral raise (the most hypertrophically valuable position), while cables maintain continuous tension throughout including at the bottom stretch. This is cited as Strong Evidence. Current doctrine recommends cables for "accessory/isolation slots" generally but does not specify the lateral raise as the clearest example of cable superiority. This finding directly supports the exercise_selection.md principle for delts.

---

### B-8. Recovery Class for Fast-Recovering Muscles: Delts Can Handle 3–4× Weekly
- **Confidence:** Medium
- **Supporting files:** building_delts_hypertrophy.md, lateral_raise_biomechanics.md
- **Impact:** Low — already encoded in FA-002/FA-003 rules; new files provide additional specific frequency recommendations
- **Recommended action:** Strengthen existing entry
- **Detail:** Both files recommend training side delts 2–4 times per week due to fast recovery, consistent with doctrine's FA-003 classification. The new data adds that the multipennate structure of the lateral deltoid makes it particularly suited for high volume and high metabolic stress — providing mechanistic rationale for the fast-recovery classification that doctrine states without explanation.

---

### B-9. Session Duration During Fat Loss: Keep Under 90 Minutes (Not 120)
- **Confidence:** Medium
- **Supporting files:** training_during_fat_loss.md
- **Impact:** Low — tightens the soft cap for cut phases; doctrine states 90 min warning / 120 min hard cap generally
- **Recommended action:** Strengthen existing entry
- **Detail:** The fat loss training file recommends keeping sessions under 1.5 hours (90 minutes) specifically during cuts, framing 90 minutes as the effective hard cap in that context rather than just a "soft warning." This is more conservative than doctrine's general 120-minute hard cap. During caloric deficit, longer sessions become disproportionately fatiguing and junk-volume-heavy. A phase-dependent session cap deserves a specific entry.

---

### B-10. Mesocycle Length: 8–12 Weeks Referenced as a Valid Range
- **Confidence:** Medium
- **Supporting files:** training_size_strength.md, block_periodization.md
- **Impact:** Low — doctrine primarily uses 4-week mesocycles; this suggests longer blocks are valid
- **Recommended action:** Strengthen existing entry
- **Detail:** Two files reference 8–12 week mesocycles as the primary programming structure, while current doctrine defaults to 4-week blocks (3 hard weeks + 1 deload). The block_periodization.md also introduces phase potentiation — the concept that low-volume/high-intensity blocks increase the body's sensitivity to subsequent high-volume phases. Doctrine does not currently address phase potentiation or multi-block programming where one mesocycle feeds into another.

---

## C. Existing Principles Weakened

### C-1. "Partial ROM is Inferior" — Qualified by Lengthened Partials Evidence
- **Confidence:** High
- **Supporting files:** training_past_failure.md, rom_hypertrophy_optimization.md, training_past_failure.json (Strong Evidence from 2026 IJES study)
- **Impact:** Medium — current doctrine (exercise_selection.md "Outdated Guidance" section, exercise_taxonomy.md) categorically states partials are suboptimal; this creates a false prohibition
- **Recommended action:** Weaken/qualify existing entry
- **Detail:** Doctrine's exercise_selection.md explicitly lists "Partial range of motion as intentional strategy" as "Outdated Guidance" and states partials "produce inferior muscle development." The new evidence qualifies this: *shortened-position* partials are inferior, but *lengthened-position* partials performed in the stretched portion of the ROM produce hypertrophy equal to or better than full ROM in some conditions (Strong Evidence, multiple studies). The doctrine statement needs to be qualified to distinguish between these two types.

---

### C-2. "Full ROM Always Superior" — Qualified by Lengthened Partial Studies
- **Confidence:** High
- **Supporting files:** training_past_failure.md, rom_hypertrophy_optimization.md, optimizing_hypertrophy_rom.md
- **Impact:** Medium — exercise_selection.md states full ROM is categorically superior; this needs a nuanced qualifier
- **Recommended action:** Weaken/qualify existing entry
- **Detail:** While full ROM remains the default and optimal general recommendation, lengthened partials added after reaching full-ROM failure are now validated as producing additional hypertrophy stimulus without disproportionate fatigue cost — particularly on isolation exercises. The absolute framing in exercise_selection.md ("The stretch position is the most productive range — cutting it short abandons the highest-value portion of the rep") remains accurate but incomplete. The nuance is that adding lengthened-position partials after full-ROM failure is an enhancement, not a compromise of this principle.

---

### C-3. "3–5 Sets Per Exercise is the Per-Session Maximum" — True But Incomplete Without HIT Context
- **Confidence:** Medium
- **Supporting files:** hit_min_max.md, hit_min_max.json (Strong Evidence for 1–2 set equivalence)
- **Impact:** High — VA-006 hard-codes 5 as the cap and foundational_beliefs.md R-01 treats 3–5 as the effective minimum-standard range; this creates an implicit false floor
- **Recommended action:** Weaken/qualify existing entry
- **Detail:** Doctrine establishes 3–5 sets per exercise as the effective range, implying 2 or fewer sets are insufficient. The HIT / Min-Max literature (Strong Evidence for first-set primacy, diminishing returns) establishes that 1–2 sets taken to true failure produce equivalent growth, particularly for advanced lifters. The doctrine's language about "diminishing returns beginning sharply after the 5th set" is correct, but it should acknowledge the inverse exists: when intensity is maximized (0 RIR / absolute failure), fewer sets are required. This should weaken the implied floor (currently 3) while leaving the ceiling (5) intact.

---

### C-4. Beginner Rep Range Recommendation: 5–10 Narrowing May Be Too Restrictive
- **Confidence:** Medium
- **Supporting files:** science_rep_ranges.md, foundational_strength_training.md
- **Impact:** Low — progression.md and progression_framework.md set beginners at 5–10; new files consistently recommend 8–12 for beginners
- **Recommended action:** Weaken/qualify existing entry
- **Detail:** Both the strength foundational and science rep range files recommend 8–12 reps as the starting range for beginners, citing this as optimal for balancing technique practice with hypertrophic stimulus and avoiding the discomfort of very high-rep sets. Current doctrine sets beginners at 5–10, which is more aggressive on the lower bound. The 8–12 recommendation is more conservative and arguably more appropriate for technique acquisition. Doctrine should consider shifting the beginner default from 5–10 to 8–12 or expanding to 6–15 to reconcile these positions.

---

## D. New Areas of Disagreement

### D-1. Absolute Failure: Systematic Use vs. Surgical Tool
- **Confidence:** High
- **Supporting files (for):** hit_min_max.md, hit_min_max.json, training_intensity_sustainability_hypertrophy.md
- **Supporting files (against):** training_past_failure.md, training_intensity_failure_management.md, rir_intensity_autoregulation.md, deloading_protocols.md, foundational_beliefs.md, hypertrophy.md
- **Impact:** High — the HIT approach prescribes 0 RIR on nearly every set; doctrine's consensus is 1–2 RIR with occasional failure
- **Detail:** Strong disagreement exists between two legitimate positions: (1) HIT/Min-Max: almost every working set goes to absolute failure (0 RIR); this is justified because fewer total sets are used, making each set the only opportunity for full stimulus. (2) RP/Nippard consensus: 1–2 RIR is equivalent to failure in hypertrophic output but produces significantly less systemic fatigue, preserving volume capacity across the week. The resolution in doctrine favors position 2 (1–2 RIR standard with occasional failure), but the HIT evidence is legitimate and growing. The disagreement is real and should be explicitly named in doctrine rather than ignored.

---

### D-2. Optimal Mesocycle Length: 4 Weeks vs. 8–12 Weeks
- **Confidence:** Medium
- **Supporting files (4-week):** deloading_protocols.md, volume_landmarks_hypertrophy.md, progression.md, hypertrophy.md
- **Supporting files (8–12 week):** training_size_strength.md, block_periodization.md
- **Impact:** Medium — affects deload scheduling, program structure, and rules DL-001 / DL-009
- **Detail:** Current doctrine standardizes on 4-week mesocycles (3 hard weeks + 1 deload), with extensions to 6–8 weeks for beginners or lower volumes. New files reference 8–12 week blocks as the primary structure for intermediate/advanced lifters, with block periodization's "phase potentiation" concept suggesting longer blocks where one phase prepares the body for the next. This is not truly contradictory (8–12 weeks could contain two 4-week mesocycles), but doctrine does not address how to structure multi-mesocycle blocks or when to use a longer vs. shorter mesocycle.

---

### D-3. Heavy Compound Barbell Exercises for Hypertrophy: Essential vs. Often Suboptimal SFR
- **Confidence:** Medium
- **Supporting files (essential):** exercise_selection.md (Primary slot requires compounds), exercise_taxonomy.md, foundational_beliefs.md, strength.md
- **Supporting files (suboptimal SFR):** train_pure_muscle_growth.md, strength_vs_hypertrophy.md, quad_hypertrophy.md, exercise_selection_for_muscle_growth.md
- **Impact:** Medium — affects Primary slot assignment and exercise selection doctrine
- **Detail:** Several new files explicitly state that for pure hypertrophy, machines often have superior SFR compared to barbell compounds — specifically noting leg press vs. barbell squat for targeted quad stimulus with less systemic fatigue. One file states "heavy barbell compounds have a high fatigue cost; machine alternatives (e.g., hack squats) offer better SFR for pure hypertrophy." Current doctrine mandates barbell compounds in Primary slots and treats machines as Secondary. This conflict exists between the strength doctrine (compounds first) and several hypertrophy-specific files (machines preferred). Doctrine acknowledges "No equipment is universally superior" but this tension is stronger in new files.

---

### D-4. Eccentric Tempo: Controlled Always vs. Fast Concentric + Slow Eccentric
- **Confidence:** Low
- **Supporting files (both):** train_pure_muscle_growth.md, optimizing_hypertrophy_rom.md, training_intensity_sustainability_hypertrophy.md
- **Impact:** Low — nuance rather than fundamental disagreement
- **Detail:** Doctrine specifies 2–3 second controlled eccentric on all working sets (R-04). One new file (training_intensity_sustainability_hypertrophy.md) suggests the optimal tempo is "slower eccentrics paired with fast, explosive concentrics" for maximum hypertrophy (rated Moderate Evidence). The explosive concentric is absent from current doctrine, which specifies controlled lowering but says nothing about concentric speed. This is not contradictory (controlled lowering is consistent across all files) but the "explosive concentric" nuance is new and belongs in the doctrine as an advanced technique note.

---

### D-5. Failure Training Timing Within a Set: First vs. Last Set Only
- **Confidence:** Medium
- **Supporting files (first set priority — HIT):** hit_min_max.md
- **Supporting files (last set only — standard):** train_pure_muscle_growth.md, training_intensity_failure_management.md, rir_intensity_autoregulation.md
- **Impact:** Low — within-session failure management nuance
- **Detail:** Train_pure_muscle_growth.md recommends: "Sets 1-2: Leave 2 reps in the tank. Set 3: AMRAP/Failure" — the standard approach of reserving failure for the final set. HIT/Min-Max inverts this: the single working set must go to absolute failure. There is no contradiction within either paradigm, but doctrine should specify that the "final set to failure" heuristic is the standard default, while noting that the 1-set protocols require true failure throughout.

---

## E. New Unknowns Requiring Further Evidence

### E-1. Per-Session Muscle Volume Cap (6–8 sets): Confidence Cited as Strong, But Lacks Specifics
- **Confidence:** Low (confidence in the principle's precision, not existence)
- **Supporting files:** building_delts_hypertrophy.md (Strong Evidence cited), exercise_selection_for_muscle_growth.md
- **Impact:** Medium — would require a new rules engine constraint on per-muscle sets per session
- **Recommended action:** Flag for future research
- **Detail:** The 6–8 set cap per muscle per session is cited as Strong Evidence in building_delts_hypertrophy.md, but the existing doctrine contains no formal rule for this. The underlying mechanism (MPS ceiling per session) is plausible but the specific threshold (6 vs. 8 vs. 10 sets) is unclear. The current engine does not have a "total sets per muscle per session" constraint — only "sets per exercise" (VA-006: max 5) and "total session sets" (VA-005: max 24). This gap should be researched before adding a hard rule.

---

### E-2. Phase Potentiation: Does a Strength Phase Meaningfully Improve Subsequent Hypertrophy Response?
- **Confidence:** Low
- **Supporting files:** block_periodization.md (Moderate Evidence)
- **Impact:** Medium — would introduce new program architecture if validated
- **Recommended action:** Flag for future research
- **Detail:** Phase potentiation suggests that completing a low-volume/high-intensity strength block increases the body's sensitivity to a subsequent high-volume hypertrophy phase. This is cited at Moderate Evidence in block_periodization.md. Current doctrine does not address this concept. If validated, it would support periodized programming where intensity and hypertrophy phases alternate deliberately across mesocycles, rather than the current model where each mesocycle independently accumulates toward MRV.

---

### E-3. Myo-Reps: Confidence Rated "Moderate" — Application Conditions Undefined in Sources
- **Confidence:** Low (moderate evidence, but limited operational clarity)
- **Supporting files:** training_during_fat_loss.md, training_past_failure.md, asymmetrical_ppl_splits.md
- **Impact:** Low — progression.md notes myo-reps but lacks detail
- **Recommended action:** Flag for future research
- **Detail:** Myo-reps appear across three files as a time-efficient alternative to multiple straight sets, but operational specifics vary: the rest interval between mini-sets is cited as "5 seconds" in one file and "5–10 seconds" in another. The minimum trigger rep count for the activation set is not defined. Whether myo-reps are appropriate for compound or isolation only is inconsistent across sources. Doctrine should hold myo-reps at "Moderate, coaching judgment required" until more specific evidence is available.

---

### E-4. RIR-Based Intensity Across the Mesocycle: Gradual Taper Protocol Not in Doctrine
- **Confidence:** Medium (coherent, consistent across sources, but mechanistic evidence limited)
- **Supporting files:** rir_intensity_autoregulation.md, training_intensity_failure_management.md
- **Impact:** Medium — would formalize a mesocycle RIR taper as a design principle (e.g., Week 1: 3 RIR → Week 3: 0–1 RIR)
- **Recommended action:** Flag for future research / Add to doctrine with Low confidence
- **Detail:** Two files recommend starting a mesocycle at 3–4 RIR and tapering to 0–1 RIR as the block concludes, allowing accumulated muscle strength to express near failure only when fitness is maximally built. This is mechanistically coherent with the volume-overload model (easy at MEV, hard at MRV approach). Current doctrine uses a fixed RIR target (1–3) throughout a mesocycle without this taper concept. This would be a meaningful addition but requires clearer evidence before being hard-coded.

---

### E-5. HIT Frequency (1–2× Per Week) as an Exception to the 2× Minimum Rule
- **Confidence:** Low
- **Supporting files:** hit_min_max.md, hit_min_max.json
- **Impact:** High — FA-001 hard-codes 2× per muscle per week minimum; HIT prescribes 1–2× as appropriate
- **Recommended action:** Flag for future research
- **Detail:** The HIT / Min-Max protocol explicitly permits training muscle groups 1–2× per week. This conflicts with doctrine's hard rule FA-001 (minimum 2× per muscle per week). The HIT rationale is that absolute failure on 1–2 sets provides the full stimulus without needing a second session. Current evidence for the 2× minimum is rated High in doctrine. The HIT exception is not strong enough to remove the 2× minimum as a hard rule, but it should be flagged as an unresolved tension — particularly relevant for time-limited users.

---

### E-6. Protein Timing: 1–2 Hour Post-Workout Window — Moderate vs. Secondary Status
- **Confidence:** Low (evidence classified as Moderate; doctrine currently downgrades it further)
- **Supporting files:** nutrient_timing.md
- **Impact:** Low — recovery.md already mentions post-workout protein but rates it "moderate evidence"
- **Recommended action:** Flag for future research
- **Detail:** Nutrient_timing.md rates post-workout protein within 1–2 hours as "moderate evidence" for anti-catabolic benefit. The doctrine (recovery.md) already references this and calls it secondary to daily totals. However, the specific claim that "waiting longer than 2 hours post-workout to ingest nutrients is sub-optimal for maximizing the anabolic response" is given Moderate Evidence in the distilled file, while doctrine keeps it vague. The precise timing window claim should be tracked as evidence evolves.

---

## Appendix: Files Reviewed

### Doctrine Files (12 total)
- consensus_principles.md
- exercise_selection.md
- exercise_taxonomy.md
- foundational_beliefs.md
- hypertrophy.md
- mindset.md
- progression.md
- progression_framework.md
- recovery.md
- rules_engine.md
- rules_engine_gap_analysis.md
- strength.md

### Distilled Files — Hypertrophy (45 total)
- abdominal_hypertrophy.md
- accessory_training.md
- asymmetrical_ppl_splits.md
- at_home_workout.md
- back_training_hypertrophy.md
- barbell_hip_thrust_mechanics.md
- bigger_arms.md
- biology_of_muscle_growth.md
- biology_programming_muscle_growth.md
- block_periodization.md
- building_delts_hypertrophy.md
- cable_kickback_mechanics.md
- conventional_deadlift_mechanics.md
- deloading_protocols.md
- dumbbell_hypertrophy.md
- dumbbell_lateral_raise_guide.md
- dumbbell_leg_hypertrophy.md
- effective_training_principles.md
- evidence_based_fitness.md
- exercise_selection_for_muscle_growth.md
- high_efficiency_hypertrophy.md
- high_frequency_full_body.md
- hit_min_max.md
- lateral_raise_biomechanics.md
- lee_haney_training.md
- not_growing_not_training_enough.md
- nutrient_timing.md
- optimal_chest_growth.md
- optimal_delt_growth.md
- optimal_rep_range_for_hypertrophy.md
- optimizing_hypertrophy_rom.md
- progressive_overload_training_principles.md
- pull_day_architecture.md
- pull_day_biomechanics.md
- pull_training_back_biceps.md
- quad_hypertrophy.md
- quad_specialization.md
- rir_intensity_autoregulation.md
- rom_hypertrophy_optimization.md
- science_based_hypertrophy_tension_volume.md
- science_programming_muscle_growth.md
- science_rep_ranges.md
- science_rest_intervals.md
- science_training_volume_hypertrophy.md
- scientific_push_day.md
- squat_vs_legpress_biomechanics.md
- strength_vs_hypertrophy.md
- strength_vs_muscle.md
- stretch_mediated_hypertrophy.md
- sumo_dl_biomechanics.md
- technique_for_muscle_growth.md
- time_limited_training.md
- train_pure_muscle_growth.md
- training_during_fat_loss.md
- training_for_muscle_growth_beginner_to_advanced.md
- training_intensity_failure_management.md
- training_intensity_sustainability_hypertrophy.md
- training_past_failure.md
- training_size_strength.md
- training_volume_hypertrophy.md
- training_volume_recovery.md
- ultimate_push_workout.md
- underrated_exercises.md
- volume_landmarks.md
- volume_landmarks_effective_training.md
- volume_landmarks_hypertrophy.md

### Distilled Files — Strength (5 total)
- foundational_strength_training.md
- strength_vs_hypertrophy.md
- strength_vs_muscle.md
- training_size_strength.md
- (additional duplicates of hypertrophy files are cross-listed)

### Raw JSON Files Spot-Checked (3 total)
- training_past_failure.json — checked for 2026 IJES study citation and confidence levels
- stretch_mediated_hypertrophy.json — confirmed Strong Evidence ratings for seated leg curl and leg extension technique
- hit_min_max.json — confirmed Strong Evidence citation for 1–2 set equivalence

### Files Not Individually Read (covered by thematic overlap with above)
- Remaining raw-json files: all distilled files that were read correspond to raw-json equivalents; the distilled versions captured all principles. Raw-json files were only spot-checked where scientific citations or confidence ratings were flagged as potentially richer than the distilled version.
