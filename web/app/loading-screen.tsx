/**
 * Shared full-viewport loading screen. It fills 100dvh/100vw and centres its
 * content rather than sitting in the normal page flow, so a slow server render
 * shows a deliberate screen instead of a half-drawn page pinned to the top.
 */
export function LoadingScreen({ message = 'Getting your training data ready.' }: { message?: string }) {
  return (
    <main className="loading-screen native-gradient-background" aria-busy="true">
      <section aria-live="polite">
        <img src="/plate-icon.png" alt="" aria-hidden="true" width={72} height={72} className="loading-plate-icon" />
        <h2>Loading…</h2>
        <p>{message}</p>
      </section>
    </main>
  );
}
