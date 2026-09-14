import fs from 'node:fs';
import path from 'node:path';
import { EXERCISE_DATABASE } from '../exerciseDatabase';
import { PROGRAM_TEMPLATES } from '../programTemplates';
import { RETIRED_EXERCISE_NAMES, canonicalExerciseName } from '../exerciseNameAliases';

const MIGRATION = path.resolve(
  import.meta.dirname,
  '..', '..', '..',
  'supabase', 'migrations', '20260914120000_merge_duplicate_exercise_names.sql',
);

function migrationPairs(): Record<string, string> {
  const sql = fs.readFileSync(MIGRATION, 'utf-8');
  const insert = sql.slice(sql.indexOf('insert into exercise_name_merge'));
  const values = insert.slice(0, insert.indexOf(';'));
  const pairs: Record<string, string> = {};
  for (const [, retired, kept] of values.matchAll(/\('([^']+)',\s*'([^']+)',\s*'[^']+',\s*'[^']+'\)/g)) {
    pairs[retired] = kept;
  }
  return pairs;
}

describe('retired exercise names', () => {
  it('match the merge migration exactly, so the save routes canonicalise what the migration renamed', () => {
    expect(migrationPairs()).toEqual(RETIRED_EXERCISE_NAMES);
  });

  it('never point at another retired name', () => {
    const chained = Object.values(RETIRED_EXERCISE_NAMES).filter((kept) => kept in RETIRED_EXERCISE_NAMES);
    expect(chained).toEqual([]);
  });

  it('are not used by the rules-engine exercise fixture', () => {
    const retired = EXERCISE_DATABASE.map((e) => e.name).filter((name) => name in RETIRED_EXERCISE_NAMES);
    expect(retired).toEqual([]);
  });

  it('are not used by any program template', () => {
    const retired = PROGRAM_TEMPLATES.flatMap((template) =>
      template.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)),
    ).filter((name) => name in RETIRED_EXERCISE_NAMES);
    expect(retired).toEqual([]);
  });

  it('leave the fixture with one entry per exercise name', () => {
    const names = EXERCISE_DATABASE.map((e) => e.name);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  it('leave no template day prescribing the same exercise twice', () => {
    const repeats: string[] = [];
    for (const template of PROGRAM_TEMPLATES) {
      for (const day of template.days) {
        const names = day.exercises.map((exercise) => exercise.name);
        for (const name of names.filter((n, index) => names.indexOf(n) !== index)) {
          repeats.push(`${template.id} / ${day.label} / ${name}`);
        }
      }
    }
    expect(repeats).toEqual([]);
  });
});

describe('canonicalExerciseName', () => {
  it('maps a retired name onto the kept catalog name', () => {
    expect(canonicalExerciseName('Cable Overhead Tricep Extension')).toBe('Overhead Tricep Extension (Cable)');
  });

  it('trims before matching', () => {
    expect(canonicalExerciseName('  Romanian Deadlift ')).toBe('Romanian Deadlift (Barbell)');
  });

  it('returns a current name unchanged', () => {
    expect(canonicalExerciseName('Overhead Tricep Extension (Cable)')).toBe('Overhead Tricep Extension (Cable)');
  });
});
