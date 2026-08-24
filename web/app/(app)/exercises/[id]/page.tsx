import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';

type ExerciseDetail = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  movement_category: string | null;
  fatigue_rating: string | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  beginner_suitable: boolean | null;
  exercise_tags: string[] | null;
  hard_rir_floor: number | null;
};

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireUser();
  const { id } = await params;
  const { data, error } = await supabase
    .from('exercises')
    .select('id,name,muscle_group,equipment,movement_category,fatigue_rating,rep_range_min,rep_range_max,beginner_suitable,exercise_tags,hard_rir_floor')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Could not load this exercise.');
  if (!data) notFound();
  const exercise = data as ExerciseDetail;
  const tags = Array.isArray(exercise.exercise_tags) ? exercise.exercise_tags : [];

  return <main className="content native-page native-gradient-background">
    <Link className="back-link" href="/exercises">← Exercise catalog</Link>
    <article className="surface exercise-detail native-list-card">
      <div className="eyebrow">{exercise.muscle_group ?? 'Exercise'}</div>
      <h1>{exercise.name}</h1>
      <dl className="detail-grid">
        <div><dt>Equipment</dt><dd>{exercise.equipment ?? 'Not listed'}</dd></div>
        <div><dt>Movement</dt><dd>{exercise.movement_category ?? 'Not classified'}</dd></div>
        <div><dt>Rep range</dt><dd>{exercise.rep_range_min && exercise.rep_range_max ? `${exercise.rep_range_min}–${exercise.rep_range_max}` : 'Not set'}</dd></div>
        <div><dt>Fatigue</dt><dd>{exercise.fatigue_rating ?? 'Not rated'}</dd></div>
        <div><dt>Beginner suitable</dt><dd>{exercise.beginner_suitable ? 'Yes' : 'Review first'}</dd></div>
        <div><dt>Hard RIR floor</dt><dd>{exercise.hard_rir_floor ?? 'None'}</dd></div>
      </dl>
      {tags.length > 0 && <div className="tag-row" aria-label="Exercise tags">{tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}</div>}
    </article>
  </main>;
}
