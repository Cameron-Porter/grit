import Stripe from 'stripe';

let client: Stripe | undefined;
export function stripe(): Stripe {
  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey) throw new Error('STRIPE_API_KEY is not configured.');
  client ??= new Stripe(apiKey, { apiVersion: '2026-07-29.dahlia' });
  return client;
}

export function subscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === 'active' || status === 'trialing') return 'active' as const;
  if (status === 'past_due' || status === 'unpaid' || status === 'paused') return 'past_due' as const;
  if (status === 'canceled') return 'canceled' as const;
  return 'inactive' as const;
}
