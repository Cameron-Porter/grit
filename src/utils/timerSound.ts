import { Audio } from 'expo-av';
import { useProfileStore } from '../store/useProfileStore';

let sound: Audio.Sound | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded() {
  if (sound) return;
  if (loadPromise) return loadPromise;
  loadPromise = Audio.Sound.createAsync(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../assets/sounds/timer-done.wav'),
    { shouldPlay: false },
  ).then(({ sound: s }) => {
    sound = s;
  }).catch(() => {
    loadPromise = null;
  });
  return loadPromise;
}

// Preload so first play has no lag.
export function preloadTimerSound() {
  ensureLoaded();
}

export async function playTimerSound() {
  if (!useProfileStore.getState().timerSoundEnabled) return;
  try {
    await ensureLoaded();
    await sound?.replayAsync();
  } catch {
    // Non-critical — sound failure must never break the timer
  }
}
