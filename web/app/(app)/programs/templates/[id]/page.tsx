import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createProgram } from '../../actions';
import { buildTemplateStartFields, getProgramTemplateById } from '@/lib/programs/program-templates';

export default async function ProgramTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = getProgramTemplateById(id);
  if (!template) notFound();
  const start = buildTemplateStartFields(template);

  return <main className="content">
    <Link className="back-link" href="/programs/templates">← Program templates</Link>
    <article className="surface exercise-detail">
      <div className="eyebrow">{template.focus}</div>
      <h1>{template.name}</h1>
      <p>{template.description}</p>
      <dl className="detail-grid">
        <div><dt>Schedule</dt><dd>{template.daysPerWeek} days/week</dd></div>
        <div><dt>Length</dt><dd>{template.recommendedWeeks} weeks</dd></div>
        <div><dt>Best for</dt><dd>{template.bestFor}</dd></div>
        <div><dt>Template days</dt><dd>{template.days.length}</dd></div>
      </dl>
      <form action={createProgram} className="template-start-form">
        <input type="hidden" name="name" value={start.name} />
        <input type="hidden" name="weeks" value={start.weeks} />
        <input type="hidden" name="days" value={start.days} />
        <button className="primary full">Start this program</button>
      </form>
    </article>
    <div className="stack">
      {template.days.map((day, index) => <section className="surface" key={`${day.label}-${index}`}>
        <div className="section-heading"><h2>{day.label}</h2><span>{day.exercises.length} exercises</span></div>
        <div className="ai-exercise-list">
          {day.exercises.map((exercise) => <div className="review-exercise" key={`${day.label}-${exercise.name}`}>
            <div><strong>{exercise.name}</strong><p>{exercise.muscleGroup}</p></div>
            <span>{exercise.sets} × {exercise.repsMin}–{exercise.repsMax} · RIR {exercise.rir}</span>
          </div>)}
        </div>
      </section>)}
    </div>
  </main>;
}
