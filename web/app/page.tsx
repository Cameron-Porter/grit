import Link from 'next/link';
import type { CSSProperties } from 'react';

const features = [
  {
    title: 'Adaptive programming',
    copy: 'Progressions respond to logged performance, RIR, recovery, and missed work instead of forcing a static spreadsheet.',
  },
  {
    title: 'Evidence-aware volume',
    copy: 'Hypertrophy landmarks shape weekly set targets so hard training stays productive, recoverable, and easy to audit.',
  },
  {
    title: 'Built for the gym floor',
    copy: 'Fast workout logging, rest timing, substitutions, and history are designed for one-handed use between sets.',
  },
];

const metrics = [
  ['4-week', 'adaptive training blocks'],
  ['RIR', 'guided effort targets'],
  ['MEV–MAV', 'volume guardrails'],
];

export default function Home() {
  return (
    <main className="landing landing-refresh">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <div className="eyebrow">PORTER PERFORMANCE · GRIT</div>
          <h1 id="landing-title">
            Program harder training without guessing your recovery.
          </h1>
          <p>
            GRIT turns hypertrophy doctrine into practical programming, workout logging, and progression decisions that adjust as your training data changes.
          </p>
          <div className="actions landing-actions">
            <Link className="primary" href="/login">Open GRIT</Link>
            <Link className="secondary" href="/support">Get support</Link>
          </div>
          <div className="landing-proof" aria-label="Product highlights">
            {metrics.map(([value, label]) => (
              <div key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="training-preview surface" aria-label="Example training dashboard preview">
          <div className="preview-header">
            <span>Today</span>
            <strong>Upper A</strong>
          </div>
          <div className="preview-score">
            <span>Readiness</span>
            <strong>92%</strong>
          </div>
          <div className="preview-bars" aria-hidden="true">
            <span style={{ '--bar': '86%' } as CSSProperties} />
            <span style={{ '--bar': '62%' } as CSSProperties} />
            <span style={{ '--bar': '74%' } as CSSProperties} />
          </div>
          <div className="preview-list">
            <div><span>Bench Press</span><strong>4×5 @ RIR 2</strong></div>
            <div><span>Incline DB Press</span><strong>3×10</strong></div>
            <div><span>Chest-supported Row</span><strong>4×8</strong></div>
          </div>
        </aside>
      </section>

      <section className="landing-feature-grid" aria-label="Why athletes use GRIT">
        {features.map((feature) => (
          <article className="landing-feature surface" key={feature.title}>
            <span aria-hidden="true" />
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="landing-band surface" aria-label="Porter Performance training philosophy">
        <div>
          <p className="eyebrow">DOCTRINE → DECISIONS</p>
          <h2>Clear guardrails for lifters who want measurable progress.</h2>
        </div>
        <p>
          Plan weeks, execute sessions, review trends, and adjust volume without losing the simple question that matters: can you recover and progress from the work you are doing?
        </p>
      </section>

      <nav className="landing-legal" aria-label="Legal and support links">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/support">Support</Link>
      </nav>
    </main>
  );
}
