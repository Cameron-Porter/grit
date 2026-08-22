import { describe, expect, it, vi } from 'vitest';
import { fetchEntitlementProfile, fetchStripeSubscriptionStatus, fetchStripeCustomerId } from './fetch-entitlement-profile';

const makeDatabase = (handlers: Record<string, () => { data: unknown; error: unknown }>) => ({
  from: vi.fn(() => ({
    select: vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => handlers[columns]()),
      })),
    })),
  })),
}) as never;

describe('fetchStripeSubscriptionStatus', () => {
  it('returns the status when the column can be read', async () => {
    const database = makeDatabase({
      'stripe_subscription_status': () => ({ data: { stripe_subscription_status: 'active' }, error: null }),
    });
    expect(await fetchStripeSubscriptionStatus(database, 'user-1')).toBe('active');
  });

  it('returns null instead of throwing when the column query errors (e.g. missing column)', async () => {
    const database = makeDatabase({
      'stripe_subscription_status': () => ({ data: null, error: { message: 'column "stripe_subscription_status" does not exist' } }),
    });
    expect(await fetchStripeSubscriptionStatus(database, 'user-1')).toBeNull();
  });
});

describe('fetchStripeCustomerId', () => {
  it('returns the customer id when the column can be read', async () => {
    const database = makeDatabase({
      'stripe_customer_id': () => ({ data: { stripe_customer_id: 'cus_123' }, error: null }),
    });
    expect(await fetchStripeCustomerId(database, 'user-1')).toBe('cus_123');
  });

  it('returns null instead of throwing when the column query errors (e.g. missing column)', async () => {
    const database = makeDatabase({
      'stripe_customer_id': () => ({ data: null, error: { message: 'column "stripe_customer_id" does not exist' } }),
    });
    expect(await fetchStripeCustomerId(database, 'user-1')).toBeNull();
  });

  it('returns null when no profile row exists', async () => {
    const database = makeDatabase({
      'stripe_customer_id': () => ({ data: null, error: null }),
    });
    expect(await fetchStripeCustomerId(database, 'user-1')).toBeNull();
  });
});

describe('fetchEntitlementProfile', () => {
  it('grants a full profile including Stripe status when both queries succeed', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: { role: 'user', subscription_status: 'inactive' }, error: null }),
      'stripe_subscription_status': () => ({ data: { stripe_subscription_status: 'active' }, error: null }),
    });
    await expect(fetchEntitlementProfile(database, 'user-1')).resolves.toEqual({
      role: 'user', subscription_status: 'inactive', stripe_subscription_status: 'active',
    });
  });

  it('still returns the VIP role when the Stripe status column errors out', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: { role: 'vip', subscription_status: 'inactive' }, error: null }),
      'stripe_subscription_status': () => ({ data: null, error: { message: 'column "stripe_subscription_status" does not exist' } }),
    });
    await expect(fetchEntitlementProfile(database, 'user-1')).resolves.toEqual({
      role: 'vip', subscription_status: 'inactive', stripe_subscription_status: null,
    });
  });

  it('throws when the core role/subscription_status query errors, since entitlement cannot be determined without it', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: null, error: { message: 'connection reset' } }),
    });
    await expect(fetchEntitlementProfile(database, 'user-1')).rejects.toBeTruthy();
  });

  it('returns null when no profile row exists', async () => {
    const database = makeDatabase({
      'role,subscription_status': () => ({ data: null, error: null }),
    });
    await expect(fetchEntitlementProfile(database, 'user-1')).resolves.toBeNull();
  });
});
