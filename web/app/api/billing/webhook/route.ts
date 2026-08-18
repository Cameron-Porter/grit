import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe, subscriptionStatus } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed.', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (userId && customerId) {
        const { error } = await admin.from('user_profiles').update({ stripe_customer_id: customerId, stripe_subscription_id: subscriptionId ?? null }).eq('id', userId);
        if (error) throw error;
      }
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const userId = subscription.metadata.user_id;
      const update = admin.from('user_profiles').update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus(subscription.status),
      });
      const { error } = userId ? await update.eq('id', userId) : await update.eq('stripe_customer_id', customerId);
      if (error) throw error;
    }
  } catch (error) {
    console.error('Stripe webhook processing failed.', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
