import { Platform } from 'react-native';

/**
 * Live Activity bridge — iOS 16.2+ only.
 *
 * The native Swift extension (ActivityKit / WidgetKit) needs to be built
 * separately. This module is a no-op on Android and on iOS builds without
 * the extension compiled in.
 *
 * When the native extension is ready:
 *   1. Add @bacons/apple-targets back to package.json
 *   2. Create targets/liveActivity/ with ActivityAttributes + SwiftUI view
 *   3. Replace the stub calls below with the real NativeModule bridge
 */

export interface WorkoutActivityState {
  exerciseName: string;
  setsCompleted: number;
  setsTotal: number;
  restSecondsRemaining: number;
  programDayLabel: string;
}

export async function startWorkoutActivity(state: WorkoutActivityState): Promise<void> {
  if (Platform.OS !== 'ios') return;
  // TODO: call native module once extension is compiled
}

export async function updateWorkoutActivity(state: WorkoutActivityState): Promise<void> {
  if (Platform.OS !== 'ios') return;
  // TODO: call native module once extension is compiled
}

export async function endWorkoutActivity(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  // TODO: call native module once extension is compiled
}
