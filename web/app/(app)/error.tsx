'use client';

import { useEffect } from 'react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="content native-page native-gradient-background">
    <section className="native-empty-state" role="alert">
      <div aria-hidden="true">!</div>
      <h2>We couldn&rsquo;t load this page</h2>
      <p>Your workout drafts remain stored on this device. Check your connection and try again.</p>
      <div className="error-actions">
        <button type="button" className="primary" onClick={() => reset()}>Try again</button>
        <a className="quiet button-link" href="/dashboard">Go to Home</a>
      </div>
    </section>
  </main>;
}
