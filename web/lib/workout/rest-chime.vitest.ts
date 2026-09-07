import { describe, expect, it } from 'vitest';
import { restTimerJustFinished, createRestChime, REST_COMPLETE_VIBRATION } from './rest-chime';

describe('restTimerJustFinished', () => {
  it('fires on the countdown reaching zero', () => {
    expect(restTimerJustFinished(1, 0, false)).toBe(true);
  });

  it('stays silent while the timer is still running', () => {
    expect(restTimerJustFinished(30, 29, false)).toBe(false);
  });

  it('stays silent when the user clears the timer, which also drives it to zero', () => {
    expect(restTimerJustFinished(45, 0, true)).toBe(false);
  });

  it('does not fire on mount, when the timer has never run', () => {
    expect(restTimerJustFinished(0, 0, false)).toBe(false);
  });

  it('does not re-fire once already at zero', () => {
    expect(restTimerJustFinished(0, 0, false)).toBe(false);
  });

  it('offers a vibration pattern alongside the tone', () => {
    expect(REST_COMPLETE_VIBRATION.length).toBeGreaterThan(0);
    expect(REST_COMPLETE_VIBRATION.every((part) => part > 0)).toBe(true);
  });
});

describe('createRestChime', () => {
  it('never throws where Web Audio is unavailable, so the timer still works', () => {
    // jsdom/node has no AudioContext - the chime must degrade to a no-op rather
    // than taking the rest timer down with it.
    const chime = createRestChime();
    expect(() => chime.prime()).not.toThrow();
    expect(() => chime.play()).not.toThrow();
  });
});
