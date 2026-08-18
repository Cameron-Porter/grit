import { describe, expect, it } from 'vitest';
import { subscriptionStatus } from './stripe';

describe('subscriptionStatus', () => {
  it.each(['active', 'trialing'] as const)('grants access for %s', (status) => expect(subscriptionStatus(status)).toBe('active'));
  it.each(['past_due', 'unpaid', 'paused'] as const)('marks %s as past due', (status) => expect(subscriptionStatus(status)).toBe('past_due'));
  it('does not grant access to incomplete subscriptions', () => expect(subscriptionStatus('incomplete')).toBe('inactive'));
});
