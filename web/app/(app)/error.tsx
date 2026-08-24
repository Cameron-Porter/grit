'use client';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content native-page native-gradient-background">
    <section className="surface empty-state native-empty-state" role="alert">
      <div aria-hidden="true">!</div>
      <div className="eyebrow">SOMETHING WENT WRONG</div>
      <h1>We couldn’t load this page</h1>
      <p>Your workout drafts remain stored on this device. Check your connection and try again.</p>
      <button onClick={reset}>Try again</button>
    </section>
  </main>;
}
