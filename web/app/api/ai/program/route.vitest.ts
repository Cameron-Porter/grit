import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const auth = vi.hoisted(() => ({ user: { id: 'test-user' } as { id: string } | null, pro: true, profileError: false }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: auth.user } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({
        data: table === 'user_profiles'
          ? (auth.pro ? { role: 'pro', subscription_status: 'active' } : { role: 'free', subscription_status: 'canceled' })
          : null,
        error: auth.profileError ? { message: 'database unavailable' } : null,
      }));
      return chain;
    },
  }),
}));

describe('program AI route', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); auth.user = { id: 'test-user' }; auth.pro = true; auth.profileError = false; });
  const request = () => new Request('http://localhost/api/ai/program', { method: 'POST', body: JSON.stringify({
    input: { name: 'Test', focus: 'hypertrophy', experienceLevel: 'intermediate', split: 'upper-lower', weeks: 5, daysPerWeek: 4, priorities: {} }, catalog: [], history: [],
  }) });

  it('rejects unauthenticated generation before contacting a model', async () => {
    auth.user = null;
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect((await POST(request())).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-pro standard accounts with 403 Forbidden', async () => {
    auth.pro = false;
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'GRIT Pro or VIP membership required for AI program generation.' });
  });

  it('returns a readable JSON error when membership cannot be loaded', async () => {
    auth.profileError = true;
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Could not verify your membership. Please try again.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the server-selected local provider in the existing generation workflow', async () => {
    vi.stubEnv('GRIT_AI_PROGRAM_PROVIDER', 'local');
    vi.stubEnv('GRIT_AI_BASE_URL', 'http://127.0.0.1:8080/v1');
    vi.stubEnv('GRIT_AI_MODEL', 'qwen');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"test","days":[]}' }, finish_reason: 'stop' }] })));
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8080/v1/chat/completions');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('qwen');
  });

  it('returns a visible error when local inference fails', async () => {
    vi.stubEnv('GRIT_AI_PROGRAM_PROVIDER', 'local');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Connection refused' });
  });
});
