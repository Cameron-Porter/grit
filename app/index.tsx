import { Redirect } from 'expo-router';
import { useWorkoutStore } from '../src/store/useWorkoutStore';

export default function Index() {
  const activeWorkoutId = useWorkoutStore((s) => s.activeWorkoutId);
  const exercises = useWorkoutStore((s) => s.exercises);
  const hasActiveWorkout = !!(activeWorkoutId && exercises.length > 0);
  return <Redirect href={hasActiveWorkout ? '/workout' : '/(tabs)/programs'} />;
}
