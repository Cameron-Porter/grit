import Link from 'next/link';
import { PROGRAM_TEMPLATES } from '@/lib/programs/program-templates';

export default function ProgramTemplatesPage() {
  return <main className="content">
    <header className="page-header">
      <div><div className="eyebrow">TEMPLATES</div><h1>Program templates</h1><p>Start from curated training structures, then customize the days and exercises after creation.</p></div>
      <Link className="secondary button-link compact header-action" href="/programs">My programs</Link>
    </header>
    <div className="catalog-grid">
      {PROGRAM_TEMPLATES.map((template) => <Link className="surface catalog-card" href={`/programs/templates/${template.id}`} key={template.id}>
        <div><h2>{template.name}</h2><p>{template.tagline} · {template.bestFor}</p></div>
        <span>{template.focus} · {template.recommendedWeeks} weeks</span>
      </Link>)}
    </div>
  </main>;
}
