import { describe, expect, it, vi } from 'vitest';
import { cancelStripeSubscriptionForAccountDeletion } from './account-deletion';

describe('cancelStripeSubscriptionForAccountDeletion', () => {
  it('does nothing when the account has no Stripe subscription', async () => {
    const cancel = vi.fn();

    await expect(cancelStripeSubscriptionForAccountDeletion({ subscriptions: { cancel } }, null)).resolves.toBe('not_needed');

    expect(cancel).not.toHaveBeenCalled();
  });

  it('treats a missing Stripe subscription as already canceled so deletion is idempotent', async () => {
    const cancel = vi.fn(async () => { throw { code: 'resource_missing', statusCode: 404 }; });

    await expect(cancelStripeSubscriptionForAccountDeletion({ subscriptions: { cancel } }, 'sub_missing')).resolves.toBe('already_absent');
  });

  it('still blocks deletion when Stripe returns an unknown cancellation error', async () => {
    const cancel = vi.fn(async () => { throw new Error('stripe outage'); });

    await expect(cancelStripeSubscriptionForAccountDeletion({ subscriptions: { cancel } }, 'sub_123')).rejects.toThrow('Stripe subscription cancellation failed.');
  });
});
