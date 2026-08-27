import Link from 'next/link';
import { GritWordmark } from '@/components/grit-wordmark';
import { login, signup, signInWithGoogle } from './actions';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; type?: string; mode?: string }>;
}) {
  const { message, type, mode: modeParam } = await searchParams;
  const isSignup = modeParam === 'signup';
  const noticeClassName = `notice ${type === 'success' ? 'success' : 'error'}`;

  return (
    <main className="auth-shell native-login-shell">
      <form className="auth-card native-login-card">
        <GritWordmark size="lg" />
        <div className="auth-mode-tabs" aria-label="Authentication mode">
          <Link href="/login?mode=login" className={isSignup ? undefined : 'active'} aria-current={isSignup ? undefined : 'page'}>Log In</Link>
          <Link href="/login?mode=signup" className={isSignup ? 'active' : undefined} aria-current={isSignup ? 'page' : undefined}>Sign Up</Link>
        </div>
        {message && <p role="alert" className={noticeClassName}>{message}</p>}
        <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
        <label>Password<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="••••••••" minLength={8} required /></label>
        {isSignup ? (
          <button formAction={signup}>Create Account</button>
        ) : (
          <button formAction={login}>Log In</button>
        )}
        <div className="native-divider"><span />or<span /></div>
        <button className="quiet social-button" formAction={signInWithGoogle} formNoValidate><span aria-hidden="true">G</span>Continue with Google</button>
      </form>
    </main>
  );
}
