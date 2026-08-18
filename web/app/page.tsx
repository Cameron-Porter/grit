import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <div className="eyebrow">INTELLIGENT TRAINING</div>
      <h1>Train hard.<br /><span>Recover intelligently.</span></h1>
      <p>Adaptive hypertrophy programming that responds to your performance, effort, and recovery.</p>
      <div className="actions"><Link className="primary" href="/login">Open GRIT</Link></div>
      <nav className="legal-nav"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/support">Support</Link></nav>
    </main>
  );
}
