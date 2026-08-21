import { describe, expect, it } from 'vitest';
import { validateManualPersonalRecordPayload, type ManualPersonalRecordPayload } from './payload';

const valid: ManualPersonalRecordPayload = { exerciseName: 'Barbell Row', weight: 185, reps: 5 };

describe('validateManualPersonalRecordPayload', () => {
  it('accepts a complete manual record', () => {
    expect(validateManualPersonalRecordPayload(valid)).toBe(true);
  });

  it('rejects a missing or blank exercise name', () => {
    expect(validateManualPersonalRecordPayload({ ...valid, exerciseName: '' })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, exerciseName: undefined })).toBe(false);
  });

  it('rejects an exercise name over 160 characters', () => {
    expect(validateManualPersonalRecordPayload({ ...valid, exerciseName: 'x'.repeat(161) })).toBe(false);
  });

  it('rejects a non-finite or out-of-range weight', () => {
    expect(validateManualPersonalRecordPayload({ ...valid, weight: -1 })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, weight: 100001 })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, weight: Number.NaN })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, weight: '185' })).toBe(false);
  });

  it('accepts a zero weight for bodyweight exercises', () => {
    expect(validateManualPersonalRecordPayload({ ...valid, weight: 0 })).toBe(true);
  });

  it('rejects a non-integer or out-of-range rep count', () => {
    expect(validateManualPersonalRecordPayload({ ...valid, reps: 0 })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, reps: 1001 })).toBe(false);
    expect(validateManualPersonalRecordPayload({ ...valid, reps: 5.5 })).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(validateManualPersonalRecordPayload(null)).toBe(false);
    expect(validateManualPersonalRecordPayload('nope')).toBe(false);
  });
});
