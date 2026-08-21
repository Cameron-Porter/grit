'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getOAuthCallbackUrl } from '@/lib/env/app-url';

function credentials(formData: FormData) {
  return { email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? '') };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect('/workout');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(credentials(formData));
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestOrigin = (await headers()).get('origin') ?? '';
  const redirectTo = getOAuthCallbackUrl({ APP_URL: process.env.APP_URL }, requestOrigin);
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}
