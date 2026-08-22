import { describe, expect, it } from 'vitest';
import { buildAiProgramBase, filterCatalogByEquipment, requestedSequence, validAiBuilderInput, validateAiSelection, type AiBuilderInput, type AiCatalogExercise } from './program';

const input: AiBuilderInput = { name: 'Test', focus: 'hypertrophy', experienceLevel: 'intermediate', split: 'upper-lower', weeks: 5, daysPerWeek: 4, priorities: {} };

describe('AI program boundary', () => {
  it('honors the selected split while leaving prescriptions to the rules engine', () => {
    expect(requestedSequence('upper-lower', 4)).toEqual(['Upper', 'Lower', 'Upper', 'Lower']);
    expect(buildAiProgramBase(input).days.map(day => day.sessionType)).toEqual(['Upper', 'Lower', 'Upper', 'Lower']);
  });

  it('rejects malformed builder limits', () => {
    expect(validAiBuilderInput(input)).toBe(true);
    expect(validAiBuilderInput({ ...input, daysPerWeek: 8 })).toBe(false);
    expect(validAiBuilderInput({ ...input, split: 'push-pull-lower' })).toBe(false);
  });

  it('treats enabled equipment availability as a hard catalog constraint',()=>{const catalog=[{name:'Cable Row',muscleGroup:'Back',equipment:'Cable',movementCategory:null,beginnerSuitable:true},{name:'Barbell Row',muscleGroup:'Back',equipment:'Barbell',movementCategory:null,beginnerSuitable:true}];expect(filterCatalogByEquipment(catalog,true,['Cable']).map(item=>item.name)).toEqual(['Cable Row']);expect(filterCatalogByEquipment(catalog,false,[])).toEqual(catalog)});

  it('accepts only exact catalog exercises matching every locked muscle slot', () => {
    const program = buildAiProgramBase(input);
    const catalog: AiCatalogExercise[] = [];
    const selection = { summary: 'Validated', days: program.days.map(day => ({
      dayIndex: day.dayIndex, label: `Day ${day.dayIndex + 1}`,
      selections: day.slots.map((slot, index) => {
        const exerciseName = `${day.dayIndex}-${index}-${slot.muscle}`;
        catalog.push({ name: exerciseName, muscleGroup: slot.muscle, equipment: 'Test', movementCategory: null, beginnerSuitable: true });
        return { slotId: slot.id, exerciseName, reason: 'Matches the locked slot.' };
      }),
    })) };
    expect(validateAiSelection(program, selection, catalog)).toBe(selection);
    catalog[0].muscleGroup = 'Abs';
    expect(() => validateAiSelection(program, selection, catalog)).toThrow(/does not match/);
  });
});
