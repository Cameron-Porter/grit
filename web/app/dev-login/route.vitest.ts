import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPassword = vi.fn();
const createClient = vi.fn(async () => ({ auth: { signInWithPassword } }));

vi.mock('@/lib/supabase/server', () => ({ createClient }));

const request = () => new Request('http://localhost:3000/dev-login');

const withEnv = async (env: Record<string, string | undefined>) => {
  const previous = { ...process.env };
  // process.env coerces values to strings, so an `undefined` here would become
  // the truthy string "undefined" — the key has to be deleted to be unset.
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  // NODE_ENV is read at call time, so the module can be imported once per case.
  vi.resetModules();
  const { GET } = await import('./route');
  return {
    GET,
    restore: () => {
      for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
      Object.assign(process.env, previous);
    },
  };
};

const setNodeEnv = (value: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true, writable: true, enumerable: true });
};

describe('GET /dev-login', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ error: null });
  });

  afterEach(() => setNodeEnv(originalNodeEnv ?? 'test'));

  it('404s outside development so the route cannot exist in a build or deploy', async () => {
    for (const env of ['production', 'test']) {
      setNodeEnv(env);
      const { GET, restore } = await withEnv({ DEV_LOGIN_EMAIL: 'a@b.co', DEV_LOGIN_PASSWORD: 'pw' });
      const response = await GET(request());
      expect(response.status).toBe(404);
      expect(signInWithPassword).not.toHaveBeenCalled();
      restore();
    }
  });

  it('refuses to run in development when the dev credentials are not configured', async () => {
    setNodeEnv('development');
    const { GET, restore } = await withEnv({ DEV_LOGIN_EMAIL: undefined, DEV_LOGIN_PASSWORD: undefined });

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toContain('DEV_LOGIN_EMAIL');
    expect(signInWithPassword).not.toHaveBeenCalled();
    restore();
  });

  it('performs a real password sign-in and redirects into the app', async () => {
    setNodeEnv('development');
    const { GET, restore } = await withEnv({ DEV_LOGIN_EMAIL: 'a@b.co', DEV_LOGIN_PASSWORD: 'pw' });

    const response = await GET(request());

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/workout');
    restore();
  });

  it('surfaces a failed sign-in instead of redirecting to a signed-out app', async () => {
    setNodeEnv('development');
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const { GET, restore } = await withEnv({ DEV_LOGIN_EMAIL: 'a@b.co', DEV_LOGIN_PASSWORD: 'nope' });

    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toContain('Invalid login credentials');
    restore();
  });
});
