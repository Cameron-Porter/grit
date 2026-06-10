import { SESSION_TEMPLATES } from '../data/sessionTemplates';
import type {
  AdjustedVolumeTarget,
  GeneratedProgram,
  MuscleGroup,
  MusclePriority,
  ProgramConfig,
  SessionType,
  WeekParams,
  WeekPlan,
} from '../types/program';
import { assignMuscleSessions } from './assignment';
import { deriveSplit, SESSION_LABELS } from './splitDeriver';
import { buildDaySlots } from './slotBuilder';
import { enforceSessionCaps } from './sessionTrimmer';
import { validateProgram } from './validation';
import { calculateVolumeBudget } from './volumeBudget';

const ALL_MUSCLES: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps', 'Forearms',
];

// ── Main builder ──────────────────────────────────────────────────────────────
export function buildProgram(config: ProgramConfig): GeneratedProgram {
  // Step 1: Derive split
  const { splitType, sessionSequence, derivation } = deriveSplit(
    config.daysPerWeek,
    config.musclePriorities,
  );
  const weekSessions: SessionType[] = config.selectedDays.map(
    (_, i) => sessionSequence[i % sessionSequence.length],
  );

  // Step 2: Volume budget (passes experienceLevel for VA-009 beginner scaling)
  const volumeTargets = calculateVolumeBudget(
    config.focus,
    config.musclePriorities,
    ALL_MUSCLES,
    weekSessions,
    config.experienceLevel,
  );

  // Step 3: Assign muscles to days
  const muscleSessionMap = new Map<MuscleGroup, number[]>();
  for (const target of volumeTargets) {
    muscleSessionMap.set(target.muscle, assignMuscleSessions(weekSessions, target));
  }

  // Recalculate setsPerSession from actual assigned day count
  for (const target of volumeTargets) {
    const actualFreq = (muscleSessionMap.get(target.muscle) ?? []).length;
    if (actualFreq > 0 && actualFreq !== target.sessionFrequency) {
      target.sessionFrequency = actualFreq;
      target.setsPerSession = Math.round(target.directSetsNeeded / actualFreq);
      target.mevSetsPerSession = Math.max(1, Math.round(target.mevSetsPerSession));
    }
  }

  // Step 4: Generate all weeks
  // Last week = deload; all prior weeks = training.
  const totalTrainingWeeks = Math.max(1, config.totalWeeks - 1);

  const weeks: WeekPlan[] = Array.from({ length: config.totalWeeks }, (_, weekIdx) => {
    const weekNumber = weekIdx + 1;
    const isDeload = weekNumber === config.totalWeeks;

    const weekParams: WeekParams = { weekNumber, totalTrainingWeeks, isDeload };

    const rawDays = config.selectedDays.map((dayName, dayIdx) => {
      const sessionType = weekSessions[dayIdx];
      const template = SESSION_TEMPLATES[sessionType];

      const dayMuscles = new Map<MuscleGroup, MusclePriority | 'mev'>();
      for (const [muscle, dayIndices] of muscleSessionMap) {
        if (dayIndices.includes(dayIdx)) {
          const priority =
            (volumeTargets.find((t) => t.muscle === muscle) as AdjustedVolumeTarget | undefined)
              ?.priority ?? 'mev';
          dayMuscles.set(muscle, priority);
        }
      }

      const slots = buildDaySlots(dayMuscles, template, undefined, weekParams);
      const totalSets = slots.reduce((n, s) => n + s.sets, 0);

      return {
        dayIndex: dayIdx,
        weekNumber,
        isDeload,
        sessionType,
        splitName: SESSION_LABELS[sessionType],
        trainingDay: dayName,
        primaryMuscles: [...dayMuscles.keys()].filter((m) => dayMuscles.get(m) !== 'mev'),
        slots,
        totalSets,
        estimatedMinutes: Math.round(totalSets * 3.5),
      };
    });

    const days = rawDays.map((day) => enforceSessionCaps(day, config.musclePriorities));
    return { weekNumber, isDeload, days };
  });

  // Step 5: Validate against Week 1 (representative non-deload structure)
  const week1Days = weeks[0].days;
  const validation = validateProgram(
    {
      focus: config.focus,
      splitType,
      daysPerWeek: config.daysPerWeek,
      totalWeeks: config.totalWeeks,
      volumeTargets,
      days: week1Days,
      weeks,
      derivation,
      validation: { valid: true, issues: [], weeklyEffectiveSets: {} },
    },
    volumeTargets,
  );

  return {
    focus: config.focus,
    splitType,
    daysPerWeek: config.daysPerWeek,
    totalWeeks: config.totalWeeks,
    volumeTargets,
    days: week1Days,  // backward compat alias
    weeks,
    validation,
    derivation,
  };
}
