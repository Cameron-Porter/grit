import { classifyVolume, countSetsByMuscle } from '../volumeLandmarks';

describe('countSetsByMuscle', () => {
  it('counts pending (not yet completed) sets as scheduled', () => {
    const exercises = [
      {
        muscleGroup: 'Shoulders',
        sets: [
          { completed: true },
          { completed: false },
          { completed: false },
        ],
      },
    ];
    // Regression: previously this only counted the 1 completed set, showing
    // "below MEV" mid-session even though 3 sets are scheduled for today.
    expect(countSetsByMuscle(exercises)).toEqual({ Shoulders: 3 });
  });

  it('excludes skipped sets from the scheduled count', () => {
    const exercises = [
      {
        muscleGroup: 'Shoulders',
        sets: [
          { completed: true },
          { completed: false, skipped: true },
          { completed: false },
        ],
      },
    ];
    expect(countSetsByMuscle(exercises)).toEqual({ Shoulders: 2 });
  });

  it('sums sets across multiple exercises sharing a muscle group', () => {
    const exercises = [
      { muscleGroup: 'Chest', sets: [{ completed: true }, { completed: false }] },
      { muscleGroup: 'Chest', sets: [{ completed: false }] },
      { muscleGroup: 'Triceps', sets: [{ completed: true }] },
    ];
    expect(countSetsByMuscle(exercises)).toEqual({ Chest: 3, Triceps: 1 });
  });

  it('ignores exercises with no muscle group', () => {
    const exercises = [{ sets: [{ completed: true }] }];
    expect(countSetsByMuscle(exercises)).toEqual({});
  });
});

describe('classifyVolume', () => {
  it('flags below_mev when weekly sets are under the landmark floor', () => {
    const result = classifyVolume('Chest', 5);
    expect(result.status).toBe('below_mev');
    expect(result.label).toContain('below MEV (8)');
  });

  it('reports productive range between MEV and MAV', () => {
    const result = classifyVolume('Chest', 10);
    expect(result.status).toBe('mev_to_mav');
  });

  it('reports near MRV between MAV and MRV inclusive', () => {
    const result = classifyVolume('Chest', 22);
    expect(result.status).toBe('mav_to_mrv');
  });

  it('flags above_mrv when weekly sets exceed the landmark ceiling', () => {
    const result = classifyVolume('Chest', 23);
    expect(result.status).toBe('above_mrv');
  });

  it('labels above_mrv as a recovery-time warning, not just the raw MRV number', () => {
    const result = classifyVolume('Chest', 23);
    expect(result.label).toBe('23 sets · may need more recovery time');
  });

  it('returns a neutral result for an unknown muscle group', () => {
    const result = classifyVolume('NotAMuscle', 5);
    expect(result.landmark).toBeNull();
    expect(result.status).toBe('mev_to_mav');
  });
});
