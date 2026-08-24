import { GritWordmark } from '@/components/grit-wordmark';
import { login, signup, signInWithGoogle } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="auth-shell native-login-shell rp-polish-shell">
      <form className="auth-card native-login-card rp-glass-panel">
        <GritWordmark size="lg" />
        <div className="auth-mode-tabs" aria-label="Authentication mode">
          <span className="active">Log In</span>
          <span>Sign Up</span>
        </div>
        {message && <p role="alert" className="notice error">{message}</p>}
        <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="••••••••" minLength={8} required /></label>
        <button className="rp-primary-action" formAction={login}>Log In</button>
        <button className="secondary" formAction={signup}>Create Account</button>
        <div className="native-divider"><span />or<span /></div>
        <button className="quiet social-button" formAction={signInWithGoogle} formNoValidate><span aria-hidden="true">G</span>Continue with Google</button>
      </form>
    </main>
  );
}
