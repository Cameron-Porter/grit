import type { ReactNode } from 'react';
import Link from 'next/link';
import { appName, contactEmail, legalUpdatedDate } from '@/lib/legal/constants';

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return <section className="legal-section"><h2>{heading}</h2>{children}</section>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal-page content">
      <Link className="back-link" href="/">← {appName}</Link>
      <header className="page-header"><div><div className="eyebrow">{appName.toUpperCase()}</div><h1>{title}</h1><p>Last updated: {legalUpdatedDate}</p></div></header>
      <nav className="legal-nav"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/support">Support</Link></nav>
      <article className="legal-body">{children}</article>
      <footer className="legal-footer"><span>© 2026 {appName}. All rights reserved.</span><span>Questions? <a href={`mailto:${contactEmail}`}>{contactEmail}</a></span></footer>
    </main>
  );
}
