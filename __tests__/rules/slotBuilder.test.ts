import { buildDaySlots } from '../../src/rules/slotBuilder';
import { SESSION_TEMPLATES } from '../../src/data/sessionTemplates';
import type { MuscleGroup, MusclePriority } from '../../src/types/program';

function muscles(entries: [MuscleGroup, MusclePriority | 'mev'][]): Map<MuscleGroup, MusclePriority | 'mev'> {
  return new Map(entries);
}

// HV-022: priority-first ordering
describe('buildDaySlots — HV-022 priority-first ordering', () => {
  it('moves the single emphasized muscle to the front of a Push session', () => {
    // Push template order is Chest -> Shoulders -> Triceps -> Abs.
    // Emphasizing Shoulders should promote its block ahead of Chest.
    const dayMuscles = muscles([
      ['Chest', 'grow'],
      ['Shoulders', 'emphasize'],
      ['Triceps', 'maintain'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Push);

    expect(slots[0].muscle).toBe('Shoulders');
  });

  it('preserves Primary-before-Accessory ordering within the promoted muscle block', () => {
    const dayMuscles = muscles([
      ['Chest', 'maintain'],
      ['Shoulders', 'emphasize'],
      ['Triceps', 'maintain'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Push);
    const shoulderSlots = slots.filter((s) => s.muscle === 'Shoulders');
    const roleOrder = shoulderSlots.map((s) => s.role);

    // Whatever Shoulders roles are included, Primary must precede Secondary
    // must precede Accessory — never out of order.
    const rank = { Primary: 0, Secondary: 1, Accessory: 2 };
    for (let i = 1; i < roleOrder.length; i++) {
      expect(rank[roleOrder[i]]).toBeGreaterThanOrEqual(rank[roleOrder[i - 1]]);
    }
  });

  it('leaves template order untouched when no muscle is emphasized', () => {
    const dayMuscles = muscles([
      ['Chest', 'grow'],
      ['Shoulders', 'grow'],
      ['Triceps', 'maintain'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Push);

    expect(slots[0].muscle).toBe('Chest');
  });

  it('leaves template order untouched when multiple muscles are emphasized (ambiguous)', () => {
    const dayMuscles = muscles([
      ['Chest', 'emphasize'],
      ['Shoulders', 'emphasize'],
      ['Triceps', 'maintain'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Push);

    expect(slots[0].muscle).toBe('Chest');
  });

  it('does not reorder FullBody sessions even with a single emphasized muscle', () => {
    // FullBody's fixed order (Quads first) encodes a separate safety rationale
    // and is deliberately excluded from HV-022 — see slotBuilder.ts comment.
    const dayMuscles = muscles([
      ['Quads', 'maintain'],
      ['Chest', 'emphasize'],
      ['Hamstrings', 'maintain'],
      ['Back', 'maintain'],
      ['Shoulders', 'maintain'],
      ['Glutes', 'maintain'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.FullBody);

    expect(slots[0].muscle).toBe('Quads');
  });

  it('still places Forearms after the last Back/Biceps/Traps slot post-reorder (HV-008)', () => {
    // Pull template: Back -> Biceps -> Back(Accessory) -> Traps -> Forearms.
    // Emphasizing Biceps promotes it to the front; HV-008 must still win.
    const dayMuscles = muscles([
      ['Back', 'maintain'],
      ['Biceps', 'emphasize'],
      ['Traps', 'maintain'],
      ['Forearms', 'mev'],
    ]);

    const slots = buildDaySlots(dayMuscles, SESSION_TEMPLATES.Pull, 7);
    const forearmIdx = slots.findIndex((s) => s.muscle === 'Forearms');
    const lastPullIdx = slots.reduce(
      (acc, s, i) => (['Back', 'Biceps', 'Traps'].includes(s.muscle) ? i : acc),
      -1,
    );

    expect(forearmIdx).toBeGreaterThan(lastPullIdx);
    expect(slots[0].muscle).toBe('Biceps');
  });
});
