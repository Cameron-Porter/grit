import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

const { requirePremiumAccess } = await import('./require-premium');

const makeDatabase = (handlers: Record<string, () => { data: unknown; error: unknown }>) => ({
  from: vi.fn(() => ({
    select: vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => handlers[columns]()),
      })),
    })),
  })),
}) as never;

describe('requirePremiumAccess', () => {
  it('lets a VIP through even when the Stripe status column cannot be read', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: { role: 'vip', subscription_status: 'inactive' }, error: null }),
      'stripe_subscription_status': () => ({ data: null, error: { message: 'column "stripe_subscription_status" does not exist' } }),
    });
    await expect(requirePremiumAccess(database, 'user-1')).resolves.toBeUndefined();
  });

  it('redirects an ordinary inactive user even when the Stripe status column cannot be read', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: { role: 'user', subscription_status: 'inactive' }, error: null }),
      'stripe_subscription_status': () => ({ data: null, error: { message: 'column "stripe_subscription_status" does not exist' } }),
    });
    await expect(requirePremiumAccess(database, 'user-1')).rejects.toThrow('REDIRECT:');
  });

  it('surfaces an error (does not silently treat as free) when the core role/subscription_status query fails', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: null, error: { message: 'connection reset' } }),
    });
    await expect(requirePremiumAccess(database, 'user-1')).rejects.toMatchObject({ message: 'connection reset' });
  });
});
