import { PROGRAM_TEMPLATES, getProgramTemplateById, type ProgramTemplate } from '@grit/data/programTemplates';

export { PROGRAM_TEMPLATES, getProgramTemplateById, type ProgramTemplate };

const clampInteger = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

export function buildTemplateStartFields(template: ProgramTemplate) {
  return {
    name: template.name,
    weeks: clampInteger(template.recommendedWeeks, 2, 16),
    days: clampInteger(template.daysPerWeek, 1, 7),
  };
}
