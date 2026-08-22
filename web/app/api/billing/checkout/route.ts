import { NextResponse } from 'next/server';
import { StripeBillingProvider } from '@/lib/billing/provider';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const result = await new StripeBillingProvider(supabase).createCheckout(user.id, user.email, new URL(request.url).origin);
    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    console.error('Unable to create Stripe Checkout session.', error);
    return NextResponse.redirect(new URL('/profile?billing_error=checkout', request.url), 303);
  }
}
