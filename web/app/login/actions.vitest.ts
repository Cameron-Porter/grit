import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({ createClient }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Map()) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

const { login, signup } = await import('./actions');

function formData(email: string, password: string) {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);
  return data;
}

describe('signup reliability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a clear "already exists" error instead of a fake success when Supabase masks a duplicate account', async () => {
    // Supabase returns 200 with no `error` but an empty `identities` array when the
    // email already belongs to a confirmed account (anti-enumeration behavior).
    // A brittle signup action would tell this user to "check your email" even
    // though no email was sent, which is exactly the "unreliable" symptom reported.
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn(async () => ({ data: { user: { id: 'u1', identities: [] }, session: null }, error: null })) },
    });

    await expect(signup(formData('taken@example.com', 'password123'))).rejects.toThrow(
      'REDIRECT:/login?mode=signup&type=error&message=An%20account%20with%20this%20email%20already%20exists',
    );
  });

  it('sends the user straight into the app when the project auto-confirms new accounts', async () => {
    createClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: 'u2', identities: [{ id: 'id1' }] }, session: { access_token: 'x' } },
          error: null,
        })),
      },
    });

    await expect(signup(formData('new@example.com', 'password123'))).rejects.toThrow('REDIRECT:/workout');
  });

  it('shows a success notice (not the error style) when email confirmation is required', async () => {
    createClient.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: 'u3', identities: [{ id: 'id1' }] }, session: null },
          error: null,
        })),
      },
    });

    await expect(signup(formData('brandnew@example.com', 'password123'))).rejects.toThrow(
      'REDIRECT:/login?mode=login&type=success&message=Check%20your%20email',
    );
  });

  it('keeps the user on the signup form when account creation unexpectedly returns no user', async () => {
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })) },
    });

    await expect(signup(formData('missing@example.com', 'password123'))).rejects.toThrow(
      'REDIRECT:/login?mode=signup&type=error&message=Could%20not%20create%20your%20account',
    );
  });

  it('surfaces the Supabase error message visibly on failure', async () => {
    createClient.mockResolvedValue({
      auth: { signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters.' } })) },
    });

    await expect(signup(formData('bad@example.com', '123'))).rejects.toThrow(
      'REDIRECT:/login?mode=signup&type=error&message=Password',
    );
  });
});

describe('login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /workout on success', async () => {
    createClient.mockResolvedValue({ auth: { signInWithPassword: vi.fn(async () => ({ error: null })) } });

    await expect(login(formData('a@example.com', 'password123'))).rejects.toThrow('REDIRECT:/workout');
  });

  it('shows a visible error message on failure', async () => {
    createClient.mockResolvedValue({
      auth: { signInWithPassword: vi.fn(async () => ({ error: { message: 'Invalid login credentials' } })) },
    });

    await expect(login(formData('a@example.com', 'wrong'))).rejects.toThrow(
      'REDIRECT:/login?mode=login&type=error&message=Invalid',
    );
  });
});
