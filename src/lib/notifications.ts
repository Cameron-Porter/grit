import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

/**
 * Schedules a weekly workout reminder for each of the user's training days.
 * Cancels any previously scheduled reminders before rescheduling.
 *
 * @param trainingDays  0–6 array (0=Sunday) matching the program schedule
 * @param hour          Hour to send the notification (24h, default 8am)
 */
export async function scheduleWorkoutReminders(
  trainingDays: WeekDay[],
  hour = 8,
): Promise<void> {
  await cancelWorkoutReminders();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const weekday of trainingDays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to train 💪",
        body: "Your workout is scheduled for today. Open GRIT to get started.",
        data: { type: 'workout_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weekday + 1, // expo-notifications uses 1=Sunday
        hour,
        minute: 0,
      },
    });
  }
}

const REMINDER_TAG = 'grit_workout_reminder';

export async function cancelWorkoutReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (n) => (n.content.data as any)?.type === 'workout_reminder',
  );
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Returns true if the user has at least one workout reminder scheduled.
 */
export async function hasWorkoutReminders(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => (n.content.data as any)?.type === 'workout_reminder');
}
