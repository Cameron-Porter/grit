import { useEffect, useRef, useState, useCallback } from 'react';
import { haptic } from '../utils/haptics';
import { playTimerSound, preloadTimerSound } from '../utils/timerSound';

export interface RestTimerState {
  active: boolean;
  remaining: number;   // seconds left
  total: number;       // duration the timer was started with
  progress: number;    // 0→1 (elapsed / total)
}

export interface RestTimerControls {
  start: (seconds: number) => void;
  stop: () => void;
  addTime: (seconds: number) => void;
}

const INITIAL: RestTimerState = { active: false, remaining: 0, total: 0, progress: 0 };

export function useRestTimer(): [RestTimerState, RestTimerControls] {
  const [state, setState] = useState<RestTimerState>(INITIAL);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);
  const totalRef = useRef(0);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const tick = useCallback(() => {
    remainingRef.current -= 1;
    const remaining = remainingRef.current;
    const total = totalRef.current;
    const progress = total > 0 ? (total - remaining) / total : 1;

    if (remaining === 10) haptic.restTimerWarning();

    if (remaining <= 0) {
      clear();
      haptic.restTimerDone();
      playTimerSound();
      setState({ active: false, remaining: 0, total, progress: 1 });
      return;
    }

    setState({ active: true, remaining, total, progress });
  }, []);

  const start = useCallback((seconds: number) => {
    clear();
    remainingRef.current = seconds;
    totalRef.current = seconds;
    setState({ active: true, remaining: seconds, total: seconds, progress: 0 });
    haptic.restTimerStart();
    preloadTimerSound();
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const stop = useCallback(() => {
    clear();
    setState(INITIAL);
  }, []);

  const addTime = useCallback((seconds: number) => {
    remainingRef.current += seconds;
    const remaining = remainingRef.current;
    const total = Math.max(totalRef.current, remaining);
    totalRef.current = total;
    const progress = total > 0 ? (total - remaining) / total : 0;
    setState((s) => ({ ...s, remaining, total, progress }));
  }, []);

  useEffect(() => () => clear(), []);

  return [state, { start, stop, addTime }];
}
