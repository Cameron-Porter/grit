'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from './confirm-dialog';

export type ManualRecord = { id: string; exerciseName: string; weight: number; reps: number; achievedAt: string };

export function ManualRecords({ records, exerciseNames }: { records: ManualRecord[]; exerciseNames: string[] }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/personal-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName, weight: Number(weight), reps: Number(reps) }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Your personal record could not be saved.');
      setExerciseName('');
      setWeight('');
      setReps('');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your personal record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: ManualRecord) => {
    if (!(await confirm({ message: `Delete your manual record for ${record.exerciseName}?`, tone: 'danger' }))) return;
    setDeletingId(record.id);
    setError(null);
    try {
      const response = await fetch(`/api/personal-records?id=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Your personal record could not be deleted.');
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Your personal record could not be deleted.');
    } finally {
      setDeletingId(null);
    }
  };

  return <section>
    <div className="section-heading"><h2>Manual records</h2><span>{records.length} logged</span></div>
    <form className="surface profile-form" onSubmit={submit}>
      <label>Exercise
        <input list="manual-record-exercises" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} required maxLength={160} />
        <datalist id="manual-record-exercises">{exerciseNames.map((name) => <option value={name} key={name} />)}</datalist>
      </label>
      <label>Weight (lb)<input type="number" min="0" max="100000" step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} required /></label>
      <label>Reps<input type="number" min="1" max="1000" step="1" value={reps} onChange={(event) => setReps(event.target.value)} required /></label>
      <button className="primary full" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button>
      {error && <p className="notice error" role="alert">{error}</p>}
    </form>
    {records.length
      ? <div className="pr-grid">{records.map((record) => <article className="surface pr-card" key={record.id}>
          <div><h3>{record.exerciseName}</h3><p>{new Date(record.achievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
          <div className="manual-record-actions"><strong>{record.weight} lb × {record.reps}</strong><button className="remove-set" type="button" disabled={deletingId === record.id} onClick={() => remove(record)} aria-label={`Delete manual record for ${record.exerciseName}`}>×</button></div>
        </article>)}</div>
      : <p className="empty-state-inline">No manual records yet. Add a lift above to track a PR you haven&apos;t logged through a workout.</p>}
    {dialog}
  </section>;
}
