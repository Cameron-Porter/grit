import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createClient }));

function postRequest(body: unknown) {
  return new Request('https://grit.test/api/personal-records', { method: 'POST', body: JSON.stringify(body) });
}

function deleteRequest(id: string | null) {
  const url = new URL('https://grit.test/api/personal-records');
  if (id !== null) url.searchParams.set('id', id);
  return new Request(url, { method: 'DELETE' });
}

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.is = vi.fn(self);
  builder.upsert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function supabaseWith({
  authenticated = true,
  catalog = { data: [{ name: 'Barbell Row' }], error: null },
  write = { data: { id: 'rec-1', exercise_name: 'Barbell Row', weight: 185, reps: 5, achieved_at: '2026-08-21T00:00:00.000Z' }, error: null },
}: { authenticated?: boolean; catalog?: { data: unknown; error: unknown }; write?: { data: unknown; error: unknown } } = {}) {
  const from = vi.fn((table: string) => {
    if (table === 'exercises') return chainable(catalog);
    return chainable(write);
  });
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: authenticated ? { id: 'user-1' } : null } })) },
    from,
  };
}

describe('POST /api/personal-records', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects an unauthenticated request', async () => {
    const supabase = supabaseWith({ authenticated: false });
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(postRequest({ exerciseName: 'Barbell Row', weight: 185, reps: 5 }));

    expect(response.status).toBe(401);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload', async () => {
    const supabase = supabaseWith();
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(postRequest({ exerciseName: '', weight: 185, reps: 5 }));

    expect(response.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects an exercise name that is not in the catalog', async () => {
    const supabase = supabaseWith({ catalog: { data: [], error: null } });
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(postRequest({ exerciseName: 'Not A Real Exercise', weight: 185, reps: 5 }));

    expect(response.status).toBe(400);
    expect(supabase.from).toHaveBeenCalledWith('exercises');
    expect(supabase.from).not.toHaveBeenCalledWith('personal_records');
  });

  it('upserts a valid manual record', async () => {
    const supabase = supabaseWith();
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(postRequest({ exerciseName: 'Barbell Row', weight: 185, reps: 5 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      saved: true,
      record: { id: 'rec-1', exercise_name: 'Barbell Row', weight: 185, reps: 5, achieved_at: '2026-08-21T00:00:00.000Z' },
    });
    expect(supabase.from).toHaveBeenCalledWith('personal_records');
  });

  it('surfaces a database failure as a 500', async () => {
    const supabase = supabaseWith({ write: { data: null, error: { message: 'boom' } } });
    createClient.mockResolvedValue(supabase);
    const { POST } = await import('./route');

    const response = await POST(postRequest({ exerciseName: 'Barbell Row', weight: 185, reps: 5 }));

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/personal-records', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects an unauthenticated request', async () => {
    const supabase = supabaseWith({ authenticated: false });
    createClient.mockResolvedValue(supabase);
    const { DELETE } = await import('./route');

    const response = await DELETE(deleteRequest('00000000-0000-4000-8000-000000000001'));

    expect(response.status).toBe(401);
  });

  it('rejects a missing or malformed id', async () => {
    const supabase = supabaseWith();
    createClient.mockResolvedValue(supabase);
    const { DELETE } = await import('./route');

    expect((await DELETE(deleteRequest(null))).status).toBe(400);
    expect((await DELETE(deleteRequest('not-a-uuid'))).status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns 404 when the record does not belong to the user or does not exist', async () => {
    const supabase = supabaseWith({ write: { data: null, error: null } });
    createClient.mockResolvedValue(supabase);
    const { DELETE } = await import('./route');

    const response = await DELETE(deleteRequest('00000000-0000-4000-8000-000000000001'));

    expect(response.status).toBe(404);
  });

  it('soft-deletes an owned record', async () => {
    const supabase = supabaseWith({ write: { data: { id: '00000000-0000-4000-8000-000000000001' }, error: null } });
    createClient.mockResolvedValue(supabase);
    const { DELETE } = await import('./route');

    const response = await DELETE(deleteRequest('00000000-0000-4000-8000-000000000001'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
  });
});
