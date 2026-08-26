'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { copyProgram, setCurrentProgram, softDeleteProgram } from '@/app/(app)/programs/actions';
import { useConfirmDialog } from './confirm-dialog';

export function ProgramCard({ program, status, active, subtitle, canSetCurrent }:{ program:{id:string; name:string}; status:string; active:boolean; subtitle:string; canSetCurrent:boolean }) {
  const [open,setOpen] = useState(false);
  const [copying,setCopying] = useState(false);
  const [copyName,setCopyName] = useState(`${program.name} copy`);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const { confirm, dialog } = useConfirmDialog();

  const toggle = () => { setOpen((current) => !current); setCopying(false); };
  const confirmDelete = async() => {
    if (await confirm({ message:`Delete ${program.name}? This cannot be undone.`, tone:'danger', confirmLabel:'Delete program' })) deleteFormRef.current?.requestSubmit();
  };

  return <article className={`surface program-card-group ${open ? 'open' : ''}`}>
    <div className="program-card-row">
      <Link href={`/programs/${program.id}`} className="program-card-link"><div className="native-row-title"><h2>{program.name}</h2><span className={`native-badge ${active ? 'solid' : 'ghost'}`}>{status}</span></div><p>{subtitle}</p></Link>
      <button type="button" className="program-card-menu-toggle" aria-expanded={open} aria-label={`${program.name} menu`} onClick={toggle}>⋮</button>
    </div>
    {open && <div className="program-card-menu-panel">
      {copying
        ? <form action={copyProgram} className="program-copy-form">
            <input type="hidden" name="id" value={program.id}/>
            <label>New program name<input name="name" value={copyName} onChange={(event) => setCopyName(event.target.value)} required maxLength={80} autoFocus/></label>
            <div className="program-copy-actions"><button type="button" className="quiet compact" onClick={() => setCopying(false)}>Back</button><button className="secondary compact">Create copy</button></div>
          </form>
        : <>
            {canSetCurrent && <form action={setCurrentProgram}><input type="hidden" name="id" value={program.id}/><button className="sheet-action-row accent">Set as Current</button></form>}
            <button type="button" className="sheet-action-row accent" onClick={() => setCopying(true)}>Copy program</button>
            <form ref={deleteFormRef} action={softDeleteProgram}><input type="hidden" name="id" value={program.id}/><button type="button" className="sheet-action-row danger" onClick={confirmDelete}>Delete program</button></form>
          </>}
    </div>}
    {dialog}
  </article>;
}
