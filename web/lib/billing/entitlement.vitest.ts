import { describe, expect, it } from 'vitest';
import { resolveEntitlement } from './entitlement';

describe('web entitlement resolution', () => {
  it('grants pro to every premium role regardless of billing status', () => {
    for (const role of ['vip', 'admin', 'coach', 'ambassador', 'beta_tester']) {
      expect(resolveEntitlement({ role, subscription_status: 'inactive' })).toBe('pro');
      expect(resolveEntitlement({ role, subscription_status: null })).toBe('pro');
    }
  });
  it('grants pro to an ordinary user with an active RevenueCat/shared subscription', () => {
    expect(resolveEntitlement({ role: 'user', subscription_status: 'active' })).toBe('pro');
  });
  it('grants pro to an ordinary user with only an active Stripe subscription', () => {
    expect(resolveEntitlement({ role: 'user', subscription_status: 'inactive', stripe_subscription_status: 'active' })).toBe('pro');
  });
  it('grants pro when both Stripe and RevenueCat/shared statuses are active', () => {
    expect(resolveEntitlement({ role: 'user', subscription_status: 'active', stripe_subscription_status: 'active' })).toBe('pro');
  });
  it('denies an ordinary user without an active subscription on either provider', () => {
    for (const status of ['inactive', 'canceled', 'past_due', null, undefined]) {
      expect(resolveEntitlement({ role: 'user', subscription_status: status, stripe_subscription_status: status })).toBe('free');
    }
  });
  it('denies access when no profile has loaded yet', () => {
    expect(resolveEntitlement(null)).toBe('free');
    expect(resolveEntitlement(undefined)).toBe('free');
  });
  it('grants pro for premium roles regardless of case or surrounding whitespace', () => {
    for (const role of ['VIP', ' vip ', 'Vip', 'AMBASSADOR']) {
      expect(resolveEntitlement({ role, subscription_status: 'inactive' })).toBe('pro');
    }
  });
});
