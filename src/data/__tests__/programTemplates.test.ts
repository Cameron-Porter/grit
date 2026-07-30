import { PROGRAM_TEMPLATES, getEquipmentForTemplateExercise } from '../programTemplates';
import { getExerciseByName } from '../exerciseDatabase';

describe('PROGRAM_TEMPLATES', () => {
  it('every template exercise name resolves to an exerciseDatabase entry', () => {
    const missing: string[] = [];
    for (const template of PROGRAM_TEMPLATES) {
      for (const day of template.days) {
        for (const exercise of day.exercises) {
          if (!getExerciseByName(exercise.name)) {
            missing.push(`${template.id} / ${day.label} / ${exercise.name}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('getEquipmentForTemplateExercise never throws for a template exercise', () => {
    for (const template of PROGRAM_TEMPLATES) {
      for (const day of template.days) {
        for (const exercise of day.exercises) {
          expect(() => getEquipmentForTemplateExercise(exercise.name)).not.toThrow();
        }
      }
    }
  });

  it('template ids are unique', () => {
    const ids = PROGRAM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
