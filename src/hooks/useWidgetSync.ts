import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { clearActiveWorkout, writeActiveWorkout } from '../lib/widgetBridge';

// Syncs the active workout state to the iOS widget via App Groups shared UserDefaults.
// Mount once in the root layout — noop on Android/web.
export function useWidgetSync() {
  if (Platform.OS !== 'ios') return;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const exercises = useWorkoutStore((s) => s.exercises);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activeWorkoutId = useWorkoutStore((s) => s.activeWorkoutId);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activeProgramName = useWorkoutStore((s) => s.activeProgramName);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activeProgramDayLabel = useWorkoutStore((s) => s.activeProgramDayLabel);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const prevActiveId = useRef<string | null>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const wasActive = prevActiveId.current !== null;
    prevActiveId.current = activeWorkoutId;

    if (!activeWorkoutId) {
      if (wasActive) clearActiveWorkout();
      return;
    }

    const setsCompleted = exercises.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.completed).length,
      0,
    );
    const setsTotal = exercises.reduce((n, ex) => n + ex.sets.length, 0);

    writeActiveWorkout({
      programName: activeProgramName ?? 'Free Workout',
      dayName: activeProgramDayLabel ?? 'Workout',
      exerciseCount: exercises.length,
      setsCompleted,
      setsTotal,
    });
  }, [activeWorkoutId, exercises, activeProgramName, activeProgramDayLabel]);
}
