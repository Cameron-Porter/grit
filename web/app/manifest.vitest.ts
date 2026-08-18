import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('PWA manifest', () => {
  it('opens the workout flow without locking device orientation', () => {
    const value = manifest();

    expect(value.start_url).toBe('/workout');
    expect(value.orientation).toBeUndefined();
  });
});
