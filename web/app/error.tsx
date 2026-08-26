'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="content native-page native-gradient-background page-frame">
    <section className="native-empty-state" role="alert">
      <div aria-hidden="true">!</div>
      <h2>Something went wrong</h2>
      <p>This page couldn&rsquo;t load. Try again, or head back to your workout.</p>
      <div className="error-actions">
        <button type="button" className="primary" onClick={() => reset()}>Try again</button>
        <a className="quiet button-link" href="/workout">Go to Workout</a>
      </div>
    </section>
  </main>;
}
