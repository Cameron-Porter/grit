/**
 * A short two-tone chime for the end of a rest period, synthesised with Web Audio
 * rather than shipped as an audio file: no extra request, nothing to add to the
 * CSP, and it still works offline in the installed PWA.
 *
 * Browsers only let audio start from a user gesture, and a countdown reaching
 * zero is not one. prime() is therefore called from the tap that starts the
 * timer, which constructs and unlocks the context while a gesture is still in
 * scope so play() can fire silently-permitted later.
 */
export type RestChime = { prime: () => void; play: () => void };

/** Two rising tones - audible over gym noise without being startling. */
const TONES = [
  { frequency: 880, startsAt: 0, lasts: 0.16 },
  { frequency: 1174.66, startsAt: 0.19, lasts: 0.28 },
] as const;

const PEAK_GAIN = 0.32;

type AudioContextCtor = typeof AudioContext;

export const createRestChime = (): RestChime => {
  let context: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      context ??= new Ctor();
      // Safari starts the context suspended and only allows resume() from a gesture.
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      // Audio is a nicety; a browser that refuses it must not break the timer.
      return null;
    }
  };

  return {
    prime: () => { ensureContext(); },
    play: () => {
      const ctx = ensureContext();
      if (!ctx) return;
      try {
        for (const tone of TONES) {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = tone.frequency;
          const startsAt = ctx.currentTime + tone.startsAt;
          // Ramp instead of a hard start/stop, which would click.
          gain.gain.setValueAtTime(0.0001, startsAt);
          gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, startsAt + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + tone.lasts);
          oscillator.connect(gain).connect(ctx.destination);
          oscillator.start(startsAt);
          oscillator.stop(startsAt + tone.lasts + 0.02);
        }
      } catch { /* Never let a failed chime surface as a logging error. */ }
    },
  };
};

/**
 * True only on the countdown's own 1 -> 0 transition. Clearing the timer also
 * drives it to zero, so that path passes cancelled and stays silent.
 */
export const restTimerJustFinished = (previousSeconds: number, seconds: number, cancelled: boolean): boolean =>
  !cancelled && previousSeconds > 0 && seconds === 0;

/** Haptic alongside the chime, for a phone sitting face-down on a bench. */
export const REST_COMPLETE_VIBRATION = [120, 60, 120];
