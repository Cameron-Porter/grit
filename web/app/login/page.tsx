import { login, signup, signInWithGoogle } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="auth-shell">
      <form className="auth-card">
        <div className="eyebrow">GRIT</div><h1>Welcome back</h1>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
        {message && <p role="alert" className="error">{message}</p>}
        <button formAction={login}>Sign in</button>
        <button className="secondary" formAction={signup}>Create account</button>
        <button className="quiet" formAction={signInWithGoogle}>Continue with Google</button>
      </form>
    </main>
  );
}
