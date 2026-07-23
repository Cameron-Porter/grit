import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useProfileStore } from '../store/useProfileStore';

let player: AudioPlayer | null = null;

function ensureLoaded() {
  if (player) return;
  try {
    player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/timer-done.wav'),
    );
  } catch {
    player = null;
  }
}

// Preload so first play has no lag.
export function preloadTimerSound() {
  ensureLoaded();
}

export async function playTimerSound() {
  if (!useProfileStore.getState().timerSoundEnabled) return;
  try {
    ensureLoaded();
    player?.seekTo(0);
    player?.play();
  } catch {
    // Non-critical — sound failure must never break the timer
  }
}
