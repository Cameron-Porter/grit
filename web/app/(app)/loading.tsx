export default function Loading() {
  return <main className="content native-page native-gradient-background">
    <section className="surface empty-state native-empty-state" aria-live="polite">
      <div aria-hidden="true">…</div>
      <h2>Loading…</h2>
      <p>Getting your training data ready.</p>
    </section>
  </main>;
}
