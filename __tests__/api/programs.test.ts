// Mock Supabase before importing the module
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockNeq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

// Consumed in call order so tests can script a sequence of chained calls
// (e.g. checkMuscleGroupPreviouslyTrained makes 4 separate .from() calls).
let singleQueue: any[] = [];
let thenQueue: any[] = [];

const chainable = () => {
  const obj: any = {};
  obj.select = (...a: any[]) => { mockSelect(...a); return obj; };
  obj.insert = (...a: any[]) => { mockInsert(...a); return obj; };
  obj.update = (...a: any[]) => { mockUpdate(...a); return obj; };
  obj.delete = (...a: any[]) => { mockDelete(...a); return obj; };
  obj.eq = (...a: any[]) => { mockEq(...a); return obj; };
  obj.neq = (...a: any[]) => { mockNeq(...a); return obj; };
  obj.in = (...a: any[]) => { mockIn(...a); return obj; };
  obj.order = (...a: any[]) => { mockOrder(...a); return obj; };
  obj.limit = (...a: any[]) => { mockLimit(...a); return obj; };
  obj.single = (...a: any[]) => mockSingle(...a);
  obj.maybeSingle = (...a: any[]) => {
    mockSingle(...a);
    return Promise.resolve(singleQueue.length ? singleQueue.shift() : { data: null, error: null });
  };
  obj.then = (res: any) => Promise.resolve(thenQueue.length ? thenQueue.shift() : { data: [], error: null }).then(res);
  return obj;
};

jest.mock('../../src/api/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) },
    from: jest.fn(() => chainable()),
  },
}));

import { supabase } from '../../src/api/supabase';

beforeEach(() => {
  jest.clearAllMocks();
  singleQueue = [];
  thenQueue = [];
});

describe('programs API — structural tests', () => {
  it('supabase.from is called with the programs table on getPrograms', async () => {
    const { getPrograms } = require('../../src/api/programs');
    await getPrograms().catch(() => {});
    expect(supabase.from).toHaveBeenCalledWith('programs');
  });

  it('supabase.from is called with program_days on getProgramDays', async () => {
    const { getProgramDays } = require('../../src/api/programs');
    await getProgramDays('test-id').catch(() => {});
    expect(supabase.from).toHaveBeenCalledWith('program_days');
  });

  it('supabase.from is called with program_exercises on getProgramExercises', async () => {
    const { getProgramExercises } = require('../../src/api/programs');
    await getProgramExercises('test-day-id').catch(() => {});
    expect(supabase.from).toHaveBeenCalledWith('program_exercises');
  });
});

describe('checkMuscleGroupPreviouslyTrained', () => {
  it('returns false when muscleGroup is empty', async () => {
    const { checkMuscleGroupPreviouslyTrained } = require('../../src/api/programs');
    const result = await checkMuscleGroupPreviouslyTrained('day-id', '');
    expect(result).toBe(false);
  });

  it('matches on muscle_group even when a different exercise was used to train it', async () => {
    // Regression test: a prior version matched on exact exercise_name, so training
    // the same muscle with a different exercise (e.g. Incline Press vs Flat Bench)
    // was invisible to this check. It must match by muscle_group instead.
    singleQueue.push({ data: { program_id: 'prog-1' }, error: null }); // program lookup for the current day
    thenQueue.push({ data: [{ id: 'other-day-1' }], error: null }); // other completed days in the program
    thenQueue.push({ data: [{ id: 'workout-1' }], error: null }); // workouts logged on those days
    thenQueue.push({ data: [{ id: 'set-1' }], error: null }); // a matching workout_sets row

    const { checkMuscleGroupPreviouslyTrained } = require('../../src/api/programs');
    const result = await checkMuscleGroupPreviouslyTrained('day-id', 'Chest');

    expect(result).toBe(true);
    expect(mockEq).toHaveBeenCalledWith('muscle_group', 'Chest');
    expect(mockIn.mock.calls.some((call: any[]) => call[0] === 'exercise_name')).toBe(false);
  });

  it('returns false when no other completed day logged that muscle group', async () => {
    singleQueue.push({ data: { program_id: 'prog-1' }, error: null });
    thenQueue.push({ data: [{ id: 'other-day-1' }], error: null });
    thenQueue.push({ data: [{ id: 'workout-1' }], error: null });
    thenQueue.push({ data: [], error: null }); // no workout_sets rows for this muscle group

    const { checkMuscleGroupPreviouslyTrained } = require('../../src/api/programs');
    const result = await checkMuscleGroupPreviouslyTrained('day-id', 'Chest');

    expect(result).toBe(false);
  });
});

describe('getProgramWeekCompletedDays', () => {
  it('queries with correct week_number and completed=true', async () => {
    const { getProgramWeekCompletedDays } = require('../../src/api/programs');
    await getProgramWeekCompletedDays('prog-id', 2).catch(() => {});
    expect(mockEq).toHaveBeenCalledWith('week_number', 2);
    expect(mockEq).toHaveBeenCalledWith('completed', true);
  });
});
