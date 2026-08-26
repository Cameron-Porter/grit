'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from './confirm-dialog';

export function DeleteAccountButton() {
  const router = useRouter();
  const [deleting,setDeleting] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const remove = async() => {
    if (!(await confirm({ message:'Permanently delete your account, workouts, programs, and subscription? This cannot be undone.', tone:'danger' }))) return;
    setDeleting(true); setError(null);
    try {
      const response = await fetch('/api/account',{ method:'DELETE' });
      const result = await response.json() as { error?:string };
      if (!response.ok) throw new Error(result.error ?? 'Account deletion failed.');
      for (let index=localStorage.length-1;index>=0;index--) { const key=localStorage.key(index); if (key?.startsWith('grit-')) localStorage.removeItem(key); }
      router.replace('/login?deleted=true'); router.refresh();
    } catch(error) { setError(error instanceof Error ? error.message : 'Account deletion failed.'); }
    finally { setDeleting(false); }
  };
  return <section className="danger-zone"><div><h2>Danger zone</h2><p>Permanently remove your account, programs, workout history, and subscription.</p></div><button className="danger full" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete account'}</button>{error && <p className="notice error" role="alert">{error}</p>}{dialog}</section>;
}
