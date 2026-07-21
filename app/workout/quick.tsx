import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useWorkoutStore } from '../../src/store/useWorkoutStore';

export default function QuickStart() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  useEffect(() => {
    startWorkout();
    router.replace('/workout');
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
}
