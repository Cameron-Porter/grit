import { buildProgram } from '../../src/rules/programBuilder';
import { getSessionMaxSets, SESSION_MAX_EXERCISES } from '../../src/rules/sessionTrimmer';
import { LOWER_SESSION_TYPES } from '../../src/rules/splitDeriver';
import { buildDaySlots } from '../../src/rules/slotBuilder';
import { SESSION_TEMPLATES } from '../../src/data/sessionTemplates';
import type { GeneratedProgram, ProgramConfig } from '../../src/types/program';

const EXAMPLE_CONFIG = {
  name: '5-Day Hypertrophy',
  focus: 'hypertrophy' as const,
  daysPerWeek: 5,
  selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  musclePriorities: {
    Chest: 'emphasize' as const,
    Shoulders: 'emphasize' as const,
    Triceps: 'emphasize' as const,
    Back: 'grow' as const,
    Biceps: 'grow' as const,
    Quads: 'maintain' as const,
    Hamstrings: 'maintain' as const,
    Glutes: 'maintain' as const,
    Calves: 'maintain' as const,
    Abs: 'maintain' as const,
  },
  totalWeeks: 6,
  experienceLevel: 'intermediate' as const,
};

const LOWER_EMPHASIS_CONFIG = {
  name: '5-Day Lower Emphasis',
  focus: 'hypertrophy' as const,
  daysPerWeek: 5,
  selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  musclePriorities: {
    Chest: 'maintain' as const,
    Back: 'maintain' as const,
    Shoulders: 'maintain' as const,
    Biceps: 'maintain' as const,
    Triceps: 'maintain' as const,
    Quads: 'emphasize' as const,
    Hamstrings: 'emphasize' as const,
    Glutes: 'emphasize' as const,
    Calves: 'maintain' as const,
    Abs: 'maintain' as const,
  },
  totalWeeks: 6,
  experienceLevel: 'intermediate' as const,
};

const STRENGTH_CONFIG = {
  name: '4-Day Strength',
  focus: 'strength' as const,
  daysPerWeek: 4,
  selectedDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  musclePriorities: {
    Chest: 'emphasize' as const,
    Back: 'emphasize' as const,
    Quads: 'grow' as const,
    Hamstrings: 'grow' as const,
    Shoulders: 'maintain' as const,
    Triceps: 'maintain' as const,
    Biceps: 'maintain' as const,
    Glutes: 'maintain' as const,
  },
  totalWeeks: 5,
  experienceLevel: 'intermediate' as const,
};

const POWERBUILDING_CONFIG = { ...STRENGTH_CONFIG, name: '4-Day Powerbuilding', focus: 'powerbuilding' as const };
const EXPLICIT_CONFIG: ProgramConfig = {
  ...EXAMPLE_CONFIG, name: 'Requested Upper/Lower', daysPerWeek: 4,
  selectedDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  requestedSessionSequence: ['Upper', 'Lower', 'Upper', 'Lower'], requestedSplitType: 'upper-lower',
};

// Replaces repeated per-field tests and console-only examples with a shared
// behavioral contract, checked across every week rather than only Week 1.
function expectUsableProgram(program: GeneratedProgram, config: ProgramConfig) {
  expect(program.validation.valid).toBe(true);
  expect(program.validation.issues.filter(issue => issue.severity === 'error')).toEqual([]);
  expect(program.days).toEqual(program.weeks[0].days);
  expect(program.days).toHaveLength(config.daysPerWeek);
  expect(program.weeks).toHaveLength(config.totalWeeks);
  for (const week of program.weeks) {
    expect(week.days.map(day => day.trainingDay)).toEqual(config.selectedDays);
    for (const day of week.days) {
      expect(day.slots.length).toBeGreaterThan(0);
      expect(day.slots.length).toBeLessThanOrEqual(SESSION_MAX_EXERCISES);
      expect(day.totalSets).toBe(day.slots.reduce((sum, slot) => sum + slot.sets, 0));
      expect(day.totalSets).toBeLessThanOrEqual(getSessionMaxSets(config.focus));
      expect(day.totalSets).toBeLessThanOrEqual(day.slots.length * 5);
      expect(day.estimatedMinutes).toBeLessThanOrEqual(90);
      for (const accessory of day.slots.filter(slot => slot.role === 'Accessory')) {
        for (const primary of day.slots.filter(slot => slot.muscle === accessory.muscle && slot.role === 'Primary')) {
          expect(primary.sortOrder).toBeLessThan(accessory.sortOrder);
        }
      }
      for (const forearm of day.slots.filter(slot => slot.muscle === 'Forearms')) { // HV-008
        for (const pull of day.slots.filter(slot => ['Back', 'Biceps', 'Traps'].includes(slot.muscle))) {
          expect(forearm.sortOrder).toBeGreaterThan(pull.sortOrder);
        }
      }
    }
    for (const [muscle, priority] of Object.entries(config.musclePriorities)) {
      if (priority !== 'emphasize') continue;
      const directSets = week.days.flatMap(day => day.slots).filter(slot => slot.muscle === muscle);
      expect(directSets.reduce((sum, slot) => sum + slot.sets, 0), `${muscle}, week ${week.weekNumber}`).toBeGreaterThan(0);
    }
  }
  const peak = program.weeks.at(-2)!;
  const deload = program.weeks.at(-1)!;
  expect(deload.isDeload).toBe(true);
  expect(deload.days.reduce((sum, day) => sum + day.totalSets, 0))
    .toBeLessThan(peak.days.reduce((sum, day) => sum + day.totalSets, 0));
}

describe('complete program behavior', () => {
  it.each([
    EXAMPLE_CONFIG, LOWER_EMPHASIS_CONFIG, STRENGTH_CONFIG, POWERBUILDING_CONFIG, EXPLICIT_CONFIG,
    { ...STRENGTH_CONFIG, name: 'General fitness', focus: 'general' },
    { ...STRENGTH_CONFIG, name: 'Maintenance', focus: 'maintenance' },
    { ...STRENGTH_CONFIG, name: 'Cut', focus: 'cut' },
    { ...EXAMPLE_CONFIG, name: 'Two-day beginner', daysPerWeek: 2, selectedDays: ['Monday', 'Thursday'], experienceLevel: 'beginner' },
  ] satisfies ProgramConfig[])('$name stays valid, ordered, within caps, and deloads', config => {
    const program = buildProgram(config);
    expectUsableProgram(program, config);
    if ('requestedSessionSequence' in config && config.requestedSessionSequence) {
      expect(program.days.map(day => day.sessionType)).toEqual(config.requestedSessionSequence);
      expect(program.splitType).toBe(config.requestedSplitType);
    }
  });

  it('rejects a requested split that does not cover every selected day', () => {
    expect(() => buildProgram({ ...EXAMPLE_CONFIG, requestedSessionSequence: ['Push'] })).toThrow('exactly one session');
  });

  it('allocates upper emphasis to four upper days and accounts for pressing overlap', () => {
    const program = buildProgram(EXAMPLE_CONFIG);
    expect(program.derivation).toMatchObject({ upperDays: 4, lowerDays: 1 });
    expect(program.derivation.pushScore).toBeGreaterThan(program.derivation.pullScore);
    const triceps = program.volumeTargets.find(target => target.muscle === 'Triceps')!;
    const shoulders = program.volumeTargets.find(target => target.muscle === 'Shoulders')!;
    expect(triceps.estimatedIndirectSets).toBeGreaterThan(4);
    expect(triceps.directSetsNeeded).toBeLessThan(12);
    expect(shoulders.estimatedIndirectSets).toBeGreaterThan(2);
  });

  it('spreads lower emphasis across specialized, alternating sessions', () => {
    const program = buildProgram(LOWER_EMPHASIS_CONFIG);
    expect(program.derivation).toMatchObject({ upperDays: 2, lowerDays: 3 });
    const types = program.days.map(day => day.sessionType);
    expect(types).toEqual(expect.arrayContaining(['LowerQuadFocus', 'LowerPosteriorChain', 'LowerGluteQuad']));
    expect(program.splitType).toContain('lower-quad');
    for (let i = 1; i < types.length; i++) {
      expect(LOWER_SESSION_TYPES.includes(types[i - 1]) && LOWER_SESSION_TYPES.includes(types[i])).toBe(false);
    }
    for (const muscle of ['Quads', 'Hamstrings', 'Glutes']) {
      // Count sessions, not slots: two exercises on one day aren't two exposures.
      expect(program.days.filter(day => day.slots.some(slot => slot.muscle === muscle)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('prescribes distinct strength and powerbuilding rep ranges', () => {
    const strength = buildProgram(STRENGTH_CONFIG).days.flatMap(day => day.slots);
    const powerbuilding = buildProgram(POWERBUILDING_CONFIG).days.flatMap(day => day.slots);
    const strengthPrimary = strength.filter(slot => slot.role === 'Primary' && slot.priority === 'emphasize');
    const strengthSecondary = strength.filter(slot => slot.role === 'Secondary' && slot.priority === 'emphasize');
    const powerPrimary = powerbuilding.filter(slot => slot.role === 'Primary' && slot.priority === 'emphasize');
    // The full program trims these accessories; a sparse session actually exercises PB-003.
    const powerAccessory = buildDaySlots(new Map([['Back', 'emphasize']]), SESSION_TEMPLATES.Pull, undefined, undefined, 'powerbuilding')
      .filter(slot => slot.role === 'Accessory' && slot.priority === 'emphasize');
    // Prevent an empty collection from silently passing the rep checks.
    for (const [name, slots] of Object.entries({ strengthPrimary, strengthSecondary, powerPrimary, powerAccessory })) expect(slots.length, name).toBeGreaterThan(0);
    for (const slot of strengthPrimary) expect(slot.repsMax).toBeLessThanOrEqual(5); // ST-001
    for (const slot of strengthSecondary) expect(slot.repsMax).toBeLessThanOrEqual(10); // ST-002
    for (const slot of powerPrimary) { // PB-001
      expect(slot.repsMin).toBeGreaterThanOrEqual(3);
      expect(slot.repsMax).toBeLessThanOrEqual(7);
    }
    for (const slot of powerAccessory) expect(slot.repsMin).toBeGreaterThanOrEqual(10); // PB-003
    expect(Math.min(...powerPrimary.map(slot => slot.repsMin))).toBeGreaterThan(Math.min(...strengthPrimary.map(slot => slot.repsMin)));
  });
});
