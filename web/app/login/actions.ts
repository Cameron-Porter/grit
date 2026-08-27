'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getOAuthCallbackUrl } from '@/lib/env/app-url';

function credentials(formData: FormData) {
  return { email: String(formData.get('email') ?? '').trim(), password: String(formData.get('password') ?? '') };
}

function redirectWithMessage(type: 'error' | 'success', message: string, mode: 'login' | 'signup' = 'login'): never {
  redirect(`/login?mode=${mode}&type=${type}&message=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) redirectWithMessage('error', error.message);
  redirect('/workout');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials(formData));
  if (error) redirectWithMessage('error', error.message, 'signup');
  // Supabase returns a success response with an empty `identities` array (no error) when the
  // email already belongs to a confirmed account, to avoid leaking which emails are registered.
  // Without this check the user sees "check your email" for an email that was never sent.
  if (data.user && data.user.identities?.length === 0) {
    redirectWithMessage('error', 'An account with this email already exists. Try logging in instead.', 'signup');
  }
  if (!data.user) redirectWithMessage('error', 'Could not create your account. Please try again.', 'signup');
  if (data.session) redirect('/workout');
  redirectWithMessage('success', 'Check your email to confirm your account.');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestOrigin = (await headers()).get('origin') ?? '';
  const redirectTo = getOAuthCallbackUrl({ APP_URL: process.env.APP_URL }, requestOrigin);
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) redirectWithMessage('error', error.message);
  if (data.url) redirect(data.url);
}
