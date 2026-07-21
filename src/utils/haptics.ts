import * as Haptics from 'expo-haptics';

/**
 * Semantic haptic actions.
 * Components call these named actions — never raw Haptics.* directly.
 */
export const haptic = {
  // Selection / light feedback
  selection: () => Haptics.selectionAsync(),
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Set-level interactions
  setLogged: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  setSkipped: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  setEdited: () => Haptics.selectionAsync(),

  // Exercise-level interactions
  exerciseDone: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  exerciseAdded: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  exerciseRemoved: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Workout-level interactions
  workoutStarted: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  workoutFinished: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  workoutSkipped: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // Rest timer
  restTimerStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  restTimerDone: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  restTimerWarning: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // PR celebration
  personalRecord: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  // Error / destructive
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  destructive: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Navigation / general
  swipe: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  longPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
} as const;
