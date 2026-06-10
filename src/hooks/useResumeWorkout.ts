import { useEffect, useState } from "react";
import { useWorkoutStore } from "../store/useWorkoutStore";

export function useResumeWorkout() {
  const { activeWorkoutId, exercises } = useWorkoutStore();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const [hasResumeSession, setHasResumeSession] = useState(false);

  useEffect(() => {
    if (activeWorkoutId && exercises.length > 0) {
      setHasResumeSession(true);
    }
  }, []);

  return {
    hasResumeSession,
    resume: () => startWorkout(), // no-op safe restore
  };
}