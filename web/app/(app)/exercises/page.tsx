import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  movement_category: string | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  beginner_suitable: boolean | null;
};

function normalize(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function matches(row: ExerciseRow, query: string, muscle: string, equipment: string) {
  const text = `${row.name} ${row.muscle_group ?? ''} ${row.equipment ?? ''} ${row.movement_category ?? ''}`.toLowerCase();
  return (!query || text.includes(query.toLowerCase()))
    && (!muscle || row.muscle_group === muscle)
    && (!equipment || row.equipment === equipment);
}

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireUser();
  const params = await searchParams;
  const query = normalize(params.q).trim();
  const muscle = normalize(params.muscle);
  const equipment = normalize(params.equipment);

  const { data, error } = await supabase
    .from('exercises')
    .select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max,beginner_suitable')
    .order('name');
  if (error) throw new Error('Could not load the exercise catalog.');

  const rows = (data ?? []) as ExerciseRow[];
  const muscles = [...new Set(rows.map((row) => row.muscle_group).filter((item): item is string => Boolean(item)))].sort();
  const equipmentOptions = [...new Set(rows.map((row) => row.equipment).filter((item): item is string => Boolean(item)))].sort();
  const filtered = rows.filter((row) => matches(row, query, muscle, equipment));

  return <main className="content">
    <header className="page-header"><div><div className="eyebrow">CATALOG</div><h1>Exercises</h1><p>Search the Supabase exercise catalog used by programs and workout logging.</p></div></header>
    <form className="surface catalog-filters" action="/exercises">
      <label>Search<input name="q" defaultValue={query} placeholder="Bench, squat, cable..." /></label>
      <label>Muscle<select name="muscle" defaultValue={muscle}><option value="">All muscles</option>{muscles.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Equipment<select name="equipment" defaultValue={equipment}><option value="">All equipment</option>{equipmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="secondary compact">Filter</button>
    </form>
    <div className="section-heading"><h2>{filtered.length} exercises</h2><span>{rows.length} total</span></div>
    <div className="catalog-grid">
      {filtered.map((exercise) => <Link className="surface catalog-card" href={`/exercises/${exercise.id}`} key={exercise.id}>
        <div><h3>{exercise.name}</h3><p>{exercise.muscle_group ?? 'Muscle not set'} · {exercise.equipment ?? 'Equipment not set'}</p></div>
        <span>{exercise.rep_range_min && exercise.rep_range_max ? `${exercise.rep_range_min}–${exercise.rep_range_max} reps` : 'Rep range not set'}</span>
      </Link>)}
    </div>
    {!filtered.length && <section className="surface empty-state"><h2>No exercises found</h2><p>Clear filters or try a different search.</p></section>}
  </main>;
}
