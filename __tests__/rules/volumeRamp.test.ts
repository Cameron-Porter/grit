import { capSetsPerExercise, MAX_SETS_PER_EXERCISE, rampSets, rirForWeek } from '../../src/rules/volumeRamp';

describe('rirForWeek — HV-038 final-week floor', () => {
  it('does not reach 0 RIR before the final week of a long mesocycle', () => {
    const params = { totalTrainingWeeks: 6, isDeload: false, experienceLevel: 'intermediate' as const };
    expect(rirForWeek(2, 'grow', { ...params, weekNumber: 5 })).toBeGreaterThanOrEqual(1);
    expect(rirForWeek(2, 'grow', { ...params, weekNumber: 6 })).toBe(0);
  });

  it('retains the beginner RIR 2 floor', () => {
    expect(rirForWeek(2, 'grow', {
      weekNumber: 6,
      totalTrainingWeeks: 6,
      isDeload: false,
      experienceLevel: 'beginner',
    })).toBe(2);
  });
});

describe('rampSets', () => {
  it('returns the week1 anchor at the start of the meso', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 1, totalTrainingWeeks: 5, isDeload: false },
    );
    expect(sets).toBe(8);
  });

  it('returns the peak anchor on the final training week', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 5, totalTrainingWeeks: 5, isDeload: false },
    );
    expect(sets).toBe(16);
  });

  it('interpolates linearly between week1 and peak mid-meso', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 3, totalTrainingWeeks: 5, isDeload: false },
    );
    // fraction = (3-1)/(5-1) = 0.5 -> 8 + (16-8)*0.5 = 12
    expect(sets).toBe(12);
  });

  it('returns the deload anchor on deload weeks, ignoring position', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 6, totalTrainingWeeks: 5, isDeload: true },
    );
    expect(sets).toBe(6);
  });

  it('never returns fewer than 1 set even for a very low anchor', () => {
    const sets = rampSets(
      { week1: 0.2, peak: 0.4, deload: 0.1 },
      { weekNumber: 1, totalTrainingWeeks: 3, isDeload: false },
    );
    expect(sets).toBeGreaterThanOrEqual(1);
  });

  it('treats a single-training-week meso as always at peak', () => {
    const sets = rampSets(
      { week1: 8, peak: 16, deload: 6 },
      { weekNumber: 1, totalTrainingWeeks: 1, isDeload: false },
    );
    expect(sets).toBe(16);
  });
});

// VA-015 — same graduated soreness response as progressionEngine.ts's
// per-exercise ramp, applied to the HV-021 landmark path. Without this, a
// hypertrophy-focus muscle's per-session target always advances with
// weekNumber regardless of reported recovery — the landmark override wins
// outright over the per-exercise ramp (see progressionEngine.ts), so this
// was the only place a soreness-focus program's actual set counts could
// ever be gated by recovery.
describe('rampSets — VA-015 graduated soreness response', () => {
  const anchors = { week1: 8, peak: 16, deload: 6 };
  const params = { weekNumber: 3, totalTrainingWeeks: 5, isDeload: false };
  // Baseline (no soreness signal / 'Healed early'): fraction = (3-1)/(5-1) = 0.5 -> 12

  it('does not accelerate volume from soreness alone', () => {
    // Week 3 remains week 3: fraction = (3-1)/4 = 0.5 -> 8 + 8*0.5 = 12.
    expect(rampSets(anchors, params, 'Not sore')).toBe(12);
  });

  it('repeats last week\'s step for "Just in time" (at the MRV ceiling)', () => {
    // rampWeek = 2 -> fraction = (2-1)/4 = 0.25 -> 8 + 8*0.25 = 10
    expect(rampSets(anchors, params, 'Just in time')).toBe(10);
  });

  it('backs off one set (not a full reset) for "Still sore"', () => {
    // Baseline this week would be 12 (see above) -> trim 1 -> 11.
    expect(rampSets(anchors, params, 'Still sore')).toBe(11);
  });

  it('never drops "Still sore" below the Week 1 anchor even when the trim would go lower', () => {
    // Week 1 itself: baseline = week1 anchor (8). Trimming 1 more would go
    // below it — the floor holds it at 8 instead.
    const firstWeekParams = { weekNumber: 1, totalTrainingWeeks: 5, isDeload: false };
    expect(rampSets(anchors, firstWeekParams, 'Still sore')).toBe(8);
  });

  it('does not shift the ramp for "Healed early" or an unset soreness signal', () => {
    expect(rampSets(anchors, params, 'Healed early')).toBe(12);
    expect(rampSets(anchors, params)).toBe(12);
  });

  it('does not overshoot the peak anchor when "Not sore" lands on the final training week', () => {
    const finalWeekParams = { weekNumber: 5, totalTrainingWeeks: 5, isDeload: false };
    expect(rampSets(anchors, finalWeekParams, 'Not sore')).toBe(16);
  });

  it('does not undershoot the week1 anchor when "Just in time" lands on week 1', () => {
    const firstWeekParams = { weekNumber: 1, totalTrainingWeeks: 5, isDeload: false };
    expect(rampSets(anchors, firstWeekParams, 'Just in time')).toBe(8);
  });

  it('deload still wins outright regardless of soreness', () => {
    const deloadParams = { weekNumber: 6, totalTrainingWeeks: 5, isDeload: true };
    expect(rampSets(anchors, deloadParams, 'Not sore')).toBe(6);
  });
});

// HV-023 — hard ceiling on sets prescribed to a single exercise, since a
// muscle's uncapped per-session ramp (e.g. rampSets peaking at 16+ for a
// high-MRV muscle) would otherwise concentrate entirely onto one movement
// whenever that's the only exercise trained for the muscle that session.
describe('capSetsPerExercise', () => {
  it('passes through values at or below the cap unchanged', () => {
    expect(capSetsPerExercise(1)).toBe(1);
    expect(capSetsPerExercise(MAX_SETS_PER_EXERCISE)).toBe(MAX_SETS_PER_EXERCISE);
  });

  it('caps values above the ceiling', () => {
    expect(capSetsPerExercise(MAX_SETS_PER_EXERCISE + 1)).toBe(MAX_SETS_PER_EXERCISE);
    expect(capSetsPerExercise(16)).toBe(MAX_SETS_PER_EXERCISE);
  });
});
