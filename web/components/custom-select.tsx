'use client';
import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; disabled?: boolean };
export function CustomSelect({ options, value, defaultValue, onChange, name, ariaLabel, autoFocus = false }: { options: SelectOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; name?: string; ariaLabel?: string; autoFocus?: boolean }) {
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value ?? '');
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null); const listId = useId(); const selected = value ?? internal;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  const choose = (next: SelectOption) => { if (next.disabled) return; if (value === undefined) setInternal(next.value); onChange?.(next.value); setOpen(false); };
  const move = (direction: 1 | -1) => { let next = active; do { next = (next + direction + options.length) % options.length; } while (options[next]?.disabled); setActive(next); };
  return <div className={`custom-select ${open ? 'open' : ''}`} ref={root}>
    {name && <input type="hidden" name={name} value={selected} />}
    <button type="button" className="custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} autoFocus={autoFocus} onClick={() => { setActive(selectedIndex); setOpen(current => !current); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) setOpen(true); else move(event.key === 'ArrowDown' ? 1 : -1); } if (event.key === 'Enter' && open) { event.preventDefault(); choose(options[active]); } if (event.key === 'Escape') setOpen(false); }}>
      <span>{options[selectedIndex]?.label ?? 'Choose…'}</span><span className="custom-select-chevron" aria-hidden />
    </button>
    {open && <div className="custom-select-menu" id={listId} role="listbox" aria-label={ariaLabel}>{options.map((option, index) => <button type="button" role="option" aria-selected={option.value === selected} disabled={option.disabled} className={`custom-select-option ${index === active ? 'active' : ''}`} key={option.value} onPointerEnter={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selected && <span aria-hidden>✓</span>}</button>)}</div>}
  </div>;
}
