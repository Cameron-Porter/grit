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
  obj.then = (res: any) => Promise.resolve({ data: [], error: null }).then(res);
  return obj;
};

jest.mock('../../src/api/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) },
    from: jest.fn(() => chainable()),
  },
}));

import { supabase } from '../../src/api/supabase';

describe('programs API — structural tests', () => {
  beforeEach(() => jest.clearAllMocks());

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
  it('returns false when exerciseNames is empty', async () => {
    const { checkMuscleGroupPreviouslyTrained } = require('../../src/api/programs');
    const result = await checkMuscleGroupPreviouslyTrained('day-id', []);
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
