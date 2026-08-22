import { describe, expect, it } from 'vitest';
import { PROGRAM_TEMPLATES } from '@grit/data/programTemplates';
import { buildTemplateStartFields, getProgramTemplateById } from './program-templates';

describe('program template helpers', () => {
  it('returns the matching template for a known id', () => {
    const template = getProgramTemplateById('ppl-3');
    expect(template).toBe(PROGRAM_TEMPLATES.find((item) => item.id === 'ppl-3'));
    expect(template?.name).toBe('Push Pull Legs');
  });

  it('returns undefined for an unknown id', () => {
    expect(getProgramTemplateById('does-not-exist')).toBeUndefined();
  });

  it('builds create-program form values from a curated template', () => {
    const template = getProgramTemplateById('upper-lower-4');
    expect(template).toBeDefined();
    expect(buildTemplateStartFields(template!)).toEqual({ name: 'Upper Lower', weeks: 8, days: 4 });
  });

  it('clamps template start values to the existing create-program action bounds', () => {
    const base = PROGRAM_TEMPLATES[0];
    expect(buildTemplateStartFields({ ...base, recommendedWeeks: 99, daysPerWeek: 99 })).toEqual({
      name: base.name,
      weeks: 16,
      days: 7,
    });
    expect(buildTemplateStartFields({ ...base, recommendedWeeks: 1, daysPerWeek: 0 })).toEqual({
      name: base.name,
      weeks: 2,
      days: 1,
    });
  });
});
