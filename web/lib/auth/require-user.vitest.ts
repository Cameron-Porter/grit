import { describe, expect, it, vi, beforeEach } from 'vitest';

const getClaims = vi.fn();
const getUser = vi.fn();
const redirect = vi.fn((_path: string): never => { throw new Error('REDIRECT'); });

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims, getUser } }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));

const load = async () => {
  vi.resetModules();
  return (await import('./require-user')).requireUser;
};

describe('requireUser', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('verifies the token locally instead of paying a round-trip to the auth server', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1', email: 'a@b.co' } }, error: null });
    const requireUser = await load();

    const { user } = await requireUser();

    expect(user).toEqual({ id: 'user-1', email: 'a@b.co' });
    // The whole point: getUser() is a network call and must not be on the read path.
    expect(getUser).not.toHaveBeenCalled();
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it('redirects to /login when the token fails verification', async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: 'bad signature' } });
    const requireUser = await load();

    await expect(requireUser()).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects when the token carries no subject, rather than trusting a blank id', async () => {
    getClaims.mockResolvedValue({ data: { claims: { email: 'a@b.co' } }, error: null });
    const requireUser = await load();

    await expect(requireUser()).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('tolerates a token with no email claim', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null });
    const requireUser = await load();

    expect((await requireUser()).user).toEqual({ id: 'user-1', email: null });
  });

  /* The cache() dedupe of layout+page is deliberately not asserted here: React's
     cache() is a no-op outside a request scope, which a bare unit run has no way
     to provide, so a test of it would only ever prove the harness. */
});
