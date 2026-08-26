export default function Loading() {
  return <main className="content native-page native-gradient-background">
    <section className="surface empty-state native-empty-state" aria-live="polite">
      <img src="/plate-icon.png" alt="" aria-hidden="true" width={72} height={72} className="loading-plate-icon" />
      <h2>Loading…</h2>
      <p>Getting your training data ready.</p>
    </section>
  </main>;
}
