import Link from 'next/link';
import { requireUser } from '@/lib/auth/require-user';
import { CustomSelect } from '@/components/custom-select';

type ExerciseRow = { id:string; name:string; muscle_group:string|null; equipment:string|null; movement_category:string|null; rep_range_min:number|null; rep_range_max:number|null; beginner_suitable:boolean|null };
const MUSCLE_ORDER = ['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Abs','Forearms','Traps'];
function normalize(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function matches(row: ExerciseRow, query: string, muscle: string, equipment: string) { const text = `${row.name} ${row.muscle_group ?? ''} ${row.equipment ?? ''} ${row.movement_category ?? ''}`.toLowerCase(); return (!query || text.includes(query.toLowerCase())) && (!muscle || row.muscle_group === muscle) && (!equipment || row.equipment === equipment); }

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireUser();
  const params = await searchParams;
  const query = normalize(params.q).trim(), muscle = normalize(params.muscle), equipment = normalize(params.equipment);
  const { data, error } = await supabase.from('exercises').select('id,name,muscle_group,equipment,movement_category,rep_range_min,rep_range_max,beginner_suitable').order('name');
  if (error) throw new Error('Could not load the exercise catalog.');
  const rows = (data ?? []) as ExerciseRow[];
  const muscles = MUSCLE_ORDER.filter(item => rows.some(row => row.muscle_group === item));
  const equipmentOptions = [...new Set(rows.map((row) => row.equipment).filter((item): item is string => Boolean(item)))].sort();
  const filtered = rows.filter((row) => matches(row, query, muscle, equipment));
  return <main className="content native-page exercise-library-page">
    <header className="native-page-header stacked"><h1>Exercises</h1><form className="native-search-card" action="/exercises"><span aria-hidden="true">⌕</span><input name="q" defaultValue={query} placeholder="Search exercises..."/><input type="hidden" name="muscle" value={muscle}/><input type="hidden" name="equipment" value={equipment}/></form></header>
    <form className="native-filter-bar" action="/exercises"><input type="hidden" name="q" value={query}/><CustomSelect name="muscle" ariaLabel="Muscle" defaultValue={muscle} options={[{ value: '', label: 'All' }, ...muscles.map((item) => ({ value: item, label: item }))]} /><CustomSelect name="equipment" ariaLabel="Equipment" defaultValue={equipment} options={[{ value: '', label: 'All equipment' }, ...equipmentOptions.map((item) => ({ value: item, label: item }))]} /><button className="secondary compact">Filter</button></form>
    <div className="native-section-title"><h2>{filtered.length} exercises</h2><span>{rows.length} total</span></div>
    <div className="native-list-stack exercise-native-list">{filtered.map((exercise) => <Link className="native-row exercise-native-row" href={`/exercises/${exercise.id}`} key={exercise.id}><div><h2>{exercise.name}</h2><p>{exercise.equipment ?? 'Equipment not set'}</p></div>{exercise.muscle_group&&<span className="native-badge tint">{exercise.muscle_group}</span>}<b aria-hidden="true">›</b></Link>)}</div>
    {!filtered.length && <section className="native-empty-state"><div aria-hidden="true">⌕</div><h2>No exercises found</h2><p>Clear filters or try a different search.</p></section>}
  </main>;
}
