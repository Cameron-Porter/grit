import { NextResponse } from 'next/server';
import { StripeBillingProvider } from '@/lib/billing/provider';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const result = await new StripeBillingProvider(supabase).createPortal(user.id, new URL(request.url).origin);
    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    console.error('Unable to create Stripe portal session.', error);
    return NextResponse.redirect(new URL('/profile?billing_error=portal', request.url), 303);
  }
}
