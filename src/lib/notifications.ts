import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getWorkoutStreak, hasMissedRecentWorkout } from '../api/history';
import { getActiveProgramTrainingDays } from '../api/programs';

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

export interface TrainingDay {
  weekday: WeekDay;
  /** Day label from the active program, e.g. "Push", "Pull", "Legs". */
  label?: string;
}

interface DayPersonality {
  tagline: string;
  detail: string;
}

const DAY_PERSONALITY: Record<string, DayPersonality> = {
  'Push':                   { tagline: 'Push Day 🏋️',               detail: 'Chest, shoulders, and triceps are on the menu.' },
  'Pull':                   { tagline: 'Pull Day 💪',                detail: 'Back and biceps — time to build that V-taper.' },
  'Legs':                   { tagline: 'Never skip leg day 🦵',      detail: 'Squats are waiting. Embrace the burn.' },
  'Upper Body':             { tagline: 'Upper Body Day 💪',          detail: "Upper body is on deck — let's build that physique." },
  'Lower Body':             { tagline: 'Lower Body Day 🦵',          detail: "Legs and glutes — let's get after it." },
  'Full Body':              { tagline: 'Full Body Day 💪',           detail: 'Hit every muscle — make every rep count.' },
  'Lower: Quad Focus':      { tagline: 'Quad Day 🦵',               detail: "Prepare to walk funny tomorrow — it's worth it." },
  'Lower: Posterior Chain': { tagline: 'Posterior Chain Day 🔥',    detail: 'Hamstrings, glutes, and deadlifts — let\'s go.' },
  'Lower: Glute & Quad':   { tagline: 'Glute & Quad Day 🔥',       detail: 'Lower body power session — build that engine.' },
  // Muscle-specific labels for future session types
  'Shoulders':              { tagline: 'Shoulder boulder day! 🏋️',  detail: 'Time to build those cannonball delts.' },
  'Arms':                   { tagline: 'Suns out, guns out! 😎',    detail: "Don't forget to get that arm pump in." },
  'Chest':                  { tagline: 'Chest Day 🏋️',              detail: "Bench, flies, and press — let's go." },
  'Back':                   { tagline: 'Back Day 💪',               detail: 'Build that V-taper — rows and pull-downs await.' },
  'Biceps':                 { tagline: 'Curl season is open 💪',    detail: 'Arm day is here — get those gains in.' },
  'Triceps':                { tagline: 'Tricep Day 🏋️',             detail: 'Build those horseshoes — let\'s go.' },
  'Glutes':                 { tagline: 'Glute Day 🔥',              detail: 'Hip thrusts and RDLs await.' },
};

function lc(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildContent(streak: number, dayLabel?: string, missed = false): { title: string; body: string } {
  const p = dayLabel ? (DAY_PERSONALITY[dayLabel] ?? null) : null;

  if (missed) {
    return {
      title: p ? p.tagline : (dayLabel ? `${dayLabel} Day 💪` : 'Get back on track 💪'),
      body: p
        ? `Missed your last session? No sweat — ${lc(p.detail)} Open GRIT and get after it.`
        : "Missed your last session? Today's a new shot. Open GRIT to get started.",
    };
  }

  if (streak >= 30) {
    return {
      title: `💪 ${streak} days strong!`,
      body: p
        ? `Keep up your killer streak — ${lc(p.detail)} You're an absolute machine.`
        : "Keep up your killer streak and get your workout in today. You're an absolute machine.",
    };
  }
  if (streak >= 7) {
    return {
      title: `🔥 ${streak}-day streak!`,
      body: p
        ? `${p.detail} Don't break the chain.`
        : "Don't break the chain — your workout is ready and waiting.",
    };
  }
  if (streak >= 3) {
    return {
      title: 'Time to train 💪',
      body: p
        ? `${streak} days in a row — ${lc(p.detail)} Keep the momentum going!`
        : `${streak} days in a row and counting — keep the momentum going!`,
    };
  }
  return {
    title: p ? p.tagline : (dayLabel ? `${dayLabel} Day 💪` : 'Time to train 💪'),
    body: p
      ? `${p.detail} Open GRIT to get started.`
      : (dayLabel
          ? `${dayLabel} Day is scheduled for today. Open GRIT to get started.`
          : 'Your workout is scheduled for today. Open GRIT to get started.'),
  };
}

/**
 * Schedules a weekly workout reminder for each training day.
 * Each day gets its own personalised title/body based on streak and day label.
 * Cancels any previously scheduled reminders before rescheduling.
 */
export async function scheduleWorkoutReminders(
  trainingDays: TrainingDay[],
  hour = 8,
  streak = 0,
  missed = false,
): Promise<void> {
  await cancelWorkoutReminders();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const { weekday, label } of trainingDays) {
    const { title, body } = buildContent(streak, label, missed);
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        // Store label in data so rescheduleWithStreak can read it back without
        // re-querying the program.
        data: { type: 'workout_reminder', dayLabel: label ?? null },
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

/**
 * Schedules reminders derived from the active program's actual completion
 * history. Each day_number's weekday is inferred from the most recent
 * completed_at timestamp for that day. No-ops if there is no history yet —
 * the next call after the first workout completes will pick it up.
 */
export async function scheduleRemindersFromHistory(hour = 8): Promise<void> {
  const raw = await getActiveProgramTrainingDays().catch(() => []);
  if (!raw.length) return;

  const trainingDays: TrainingDay[] = raw.map((d) => ({
    weekday: d.weekday as WeekDay,
    label: d.label,
  }));
  const weekdays = trainingDays.map((d) => d.weekday);

  const [streak, missed] = await Promise.all([
    getWorkoutStreak().catch(() => 0),
    hasMissedRecentWorkout(weekdays).catch(() => false),
  ]);

  await scheduleWorkoutReminders(trainingDays, hour, streak, missed);
}

/**
 * Reads currently-scheduled reminders to recover training days + labels,
 * fetches the current streak and missed status, then reschedules with fresh
 * personalised content. Falls back to scheduleRemindersFromHistory when no
 * reminders are scheduled yet (e.g. first workout on a new device).
 * Safe to call after a workout completes or on app resume.
 */
export async function rescheduleWithStreak(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.type === 'workout_reminder');

  if (ours.length === 0) {
    await scheduleRemindersFromHistory();
    return;
  }

  const trainingDays: TrainingDay[] = ours.map((n) => {
    const trigger = n.trigger as any;
    const data = n.content.data as any;
    return {
      weekday: ((trigger.weekday ?? 1) - 1) as WeekDay,
      label: data?.dayLabel ?? undefined,
    };
  });
  const trainingWeekdays = trainingDays.map((d) => d.weekday);
  const hour = (ours[0].trigger as any)?.hour ?? 8;

  const [streak, missed] = await Promise.all([
    getWorkoutStreak().catch(() => 0),
    hasMissedRecentWorkout(trainingWeekdays).catch(() => false),
  ]);
  await scheduleWorkoutReminders(trainingDays, hour, streak, missed);
}
