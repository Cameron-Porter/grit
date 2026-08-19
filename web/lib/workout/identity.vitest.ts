import { describe, expect, it } from 'vitest';
import { unknownWorkoutExerciseNames } from './identity';

describe('unknownWorkoutExerciseNames', () => {
  it('returns only submitted exercise names missing from the server catalog', () => {
    expect(unknownWorkoutExerciseNames(['Row', 'Mystery Curl', 'Squat', 'Mystery Curl'], new Set(['Row', 'Squat']))).toEqual(['Mystery Curl']);
  });

  it('treats blank names as invalid identities', () => {
    expect(unknownWorkoutExerciseNames(['Row', '   '], new Set(['Row']))).toEqual(['']);
  });
});
