import { describe, expect, it } from 'vitest';
import { shouldApplyStripeSubscriptionEvent } from './webhook-ordering';

describe('shouldApplyStripeSubscriptionEvent', () => {
  it('applies the first event ever seen for a profile', () => {
    expect(shouldApplyStripeSubscriptionEvent(null, { created: 100, id: 'evt_1' })).toBe(true);
    expect(shouldApplyStripeSubscriptionEvent({ stripe_subscription_event_created: null, stripe_subscription_event_id: null }, { created: 100, id: 'evt_1' })).toBe(true);
  });

  it('applies an event newer than the stored one', () => {
    const stored = { stripe_subscription_event_created: 100, stripe_subscription_event_id: 'evt_1' };
    expect(shouldApplyStripeSubscriptionEvent(stored, { created: 101, id: 'evt_2' })).toBe(true);
  });

  it('ignores an event older than the stored one, even if it arrives late', () => {
    const stored = { stripe_subscription_event_created: 100, stripe_subscription_event_id: 'evt_2' };
    expect(shouldApplyStripeSubscriptionEvent(stored, { created: 99, id: 'evt_1' })).toBe(false);
  });

  it('is idempotent for a redelivery of the same event', () => {
    const stored = { stripe_subscription_event_created: 100, stripe_subscription_event_id: 'evt_1' };
    expect(shouldApplyStripeSubscriptionEvent(stored, { created: 100, id: 'evt_1' })).toBe(false);
  });

  it('breaks a same-timestamp tie deterministically by event id ordering', () => {
    const stored = { stripe_subscription_event_created: 100, stripe_subscription_event_id: 'evt_1' };
    expect(shouldApplyStripeSubscriptionEvent(stored, { created: 100, id: 'evt_2' })).toBe(true);
    expect(shouldApplyStripeSubscriptionEvent(stored, { created: 100, id: 'evt_0' })).toBe(false);
  });
});
