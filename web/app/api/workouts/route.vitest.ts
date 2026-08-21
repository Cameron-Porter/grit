import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebWorkoutPayload } from '@/lib/workout/payload';

const createClient = vi.fn();
const computeProgression = vi.fn();

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('@/lib/progression/compute', () => ({ computeProgression }));

const payload: WebWorkoutPayload = {
  workoutId: '00000000-0000-4000-8000-000000000001',
  programDayId: '00000000-0000-4000-8000-000000000002',
  name: 'Pull',
  programName: 'Mid Summer',
  completedAt: new Date('2026-08-18T12:00:00.000Z').toISOString(),
  exercises: [{ name: 'Row', muscleGroup: 'Back', musclePriority: 'grow', equipment: 'Cable', note: null, sets: [{ reps: 10, weight: 100, rir: 2, reportedRir: 2, completed: true }] }],
  feedback: [],
};

function request(body: unknown) {
  return new Request('https://grit.test/api/workouts', { method: 'POST', body: JSON.stringify(body) });
}

function supabaseWithRpcResult(saveResult: string | null) {
  const tableResults = {
    program_days: { data: { id: payload.programDayId }, error: null },
    exercises: { data: [{ name: 'Row' }], error: null },
    user_profiles: { data: { experience_level: 'intermediate' }, error: null },
  } as const;
  const from = vi.fn((table: keyof typeof tableResults) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => tableResults[table]),
    in: vi.fn(async () => tableResults[table]),
  }));
  return { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) }, from, rpc: vi.fn(async () => ({ data: saveResult, error: null })) };
}

describe('POST /api/workouts retry and partial-save handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    computeProgression.mockResolvedValue(undefined);
  });

  it('treats an already-saved queued retry as idempotent without recomputing progression', async () => {
    const supabase = supabaseWithRpcResult('already_saved');
    createClient.mockResolvedValue(supabase);
    computeProgression.mockRejectedValue(new Error('would duplicate derived targets'));
    const { POST } = await import('./route');

    const response = await POST(request(payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: true, idempotent: true });
    expect(computeProgression).not.toHaveBeenCalled();
  });

  it('surfaces an unexpected RPC result as a retryable save failure', async () => {
    const supabase = supabaseWithRpcResult(null);
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(request(payload));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Your workout could not be saved. Your local copy is still available.' });
    expect(computeProgression).not.toHaveBeenCalled();
  });

  it('saves a Quick Workout with no program day without checking ownership or computing progression', async () => {
    const supabase = supabaseWithRpcResult('saved');
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(request({ ...payload, programDayId: null }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: true, idempotent: false });
    expect(supabase.from).not.toHaveBeenCalledWith('program_days');
    expect(supabase.rpc).toHaveBeenCalledWith('save_web_workout', expect.objectContaining({ p_program_day_id: null }));
    expect(computeProgression).not.toHaveBeenCalled();
  });
});
