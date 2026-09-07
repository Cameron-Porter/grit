import { applyMuscleRepBand, MUSCLE_REP_BAND_FLOORS } from '../../src/data/muscleRepBands';
import { buildDaySlots } from '../../src/rules/slotBuilder';
import { SESSION_TEMPLATES } from '../../src/data/sessionTemplates';
import type { MuscleGroup, MusclePriority } from '../../src/types/program';

describe('HV-043 per-muscle rep-band floors', () => {
  /**
   * The regression: rep bands came from slot role x muscle priority alone, so an
   * emphasized Primary slot was 5-10 reps whatever muscle filled it. That
   * prescribed 5-rep calf raises and 5-rep sit-ups - rep counts those muscles
   * cannot be loaded into.
   */
  it('raises a band that is too low for the muscle', () => {
    // 5-10 is the emphasized Primary band that caused the complaint.
    expect(applyMuscleRepBand('Calves', 5, 10)).toEqual({ repsMin: 10, repsMax: 20 });
    expect(applyMuscleRepBand('Abs', 5, 10)).toEqual({ repsMin: 10, repsMax: 25 });
    expect(applyMuscleRepBand('Forearms', 5, 10)).toEqual({ repsMin: 10, repsMax: 20 });
  });

  it('never lowers a band that is already high enough', () => {
    // RP is agnostic across 5-30, so a higher band set by the role table stands.
    expect(applyMuscleRepBand('Calves', 15, 30)).toEqual({ repsMin: 15, repsMax: 30 });
    expect(applyMuscleRepBand('Abs', 12, 25)).toEqual({ repsMin: 12, repsMax: 25 });
  });

  it('leaves muscles that load heavily untouched', () => {
    for (const muscle of ['Chest', 'Back', 'Quads', 'Hamstrings', 'Glutes']) {
      expect(applyMuscleRepBand(muscle, 5, 10)).toEqual({ repsMin: 5, repsMax: 10 });
    }
  });

  it('only floors muscles where heavy loading is impractical', () => {
    expect(Object.keys(MUSCLE_REP_BAND_FLOORS).sort()).toEqual(['Abs', 'Calves', 'Forearms']);
    for (const band of Object.values(MUSCLE_REP_BAND_FLOORS)) {
      // Every floor has to sit inside RP's 5-30 hypertrophy window.
      expect(band.repsMin).toBeGreaterThanOrEqual(5);
      expect(band.repsMax).toBeLessThanOrEqual(30);
      expect(band.repsMax).toBeGreaterThan(band.repsMin);
    }
  });

  it('reaches the slots a program actually builds', () => {
    // Emphasized muscles get the Primary 5-10 band from the role table, which is
    // exactly the case the floor exists to correct.
    const dayMuscles = new Map<MuscleGroup, MusclePriority | 'mev'>([
      ['Chest', 'emphasize'],
      ['Abs', 'emphasize'],
    ]);
    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Push);
    const abs = slots.filter((slot) => slot.muscle === 'Abs');
    expect(abs.length).toBeGreaterThan(0);
    for (const slot of abs) {
      expect(slot.repsMin).toBeGreaterThanOrEqual(MUSCLE_REP_BAND_FLOORS.Abs.repsMin);
      expect(slot.repsMax).toBeGreaterThanOrEqual(MUSCLE_REP_BAND_FLOORS.Abs.repsMax);
    }
    // A heavily loadable muscle in the same session is untouched by the floor.
    for (const slot of slots.filter((entry) => entry.muscle === 'Chest')) {
      expect(slot.repsMin).toBeLessThan(MUSCLE_REP_BAND_FLOORS.Abs.repsMin);
    }
  });
});
