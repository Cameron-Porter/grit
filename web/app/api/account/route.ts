import { NextResponse } from 'next/server';
import { cancelStripeSubscriptionForAccountDeletion } from '@/lib/billing/account-deletion';
import { stripe } from '@/lib/billing/stripe';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Account details could not be loaded.' }, { status: 500 });

  try {
    await cancelStripeSubscriptionForAccountDeletion(stripe(), profile?.stripe_subscription_id);
  } catch (error) {
    console.error('Stripe subscription cancellation failed during account deletion.', error);
    return NextResponse.json({ error: 'Your subscription could not be canceled, so your account was not deleted.' }, { status: 502 });
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.error('Supabase account deletion failed.', error);
    return NextResponse.json({ error: 'Your subscription was canceled, but account deletion needs to be retried.' }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
