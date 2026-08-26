'use client';
import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function nextEnabledOptionIndex(
  options: SelectOption[],
  current: number,
  direction: 1 | -1,
): number | null {
  if (options.length === 0 || options.every(option => option.disabled)) return null;
  let next = current;
  do {
    next = (next + direction + options.length) % options.length;
  } while (options[next]?.disabled);
  return next;
}

const MENU_MARGIN = 8;

// The dropdown menu is an absolutely-positioned descendant of `.custom-select`,
// so it's clipped by the nearest ancestor that actually scrolls/clips (e.g. a
// modal with `overflow:auto`), not by the viewport — a select near the bottom
// of a modal has plenty of *viewport* room below it, but none inside the
// modal's own box. Measure against that ancestor (falling back to the
// viewport when there isn't one) so the menu flips and sizes correctly.
function findClipBoundary(node: HTMLElement | null): { top:number; bottom:number } {
  let el = node?.parentElement ?? null;
  while (el) {
    const style = getComputedStyle(el);
    if (/(auto|scroll|hidden)/.test(style.overflowY)) { const rect = el.getBoundingClientRect(); return { top:rect.top,bottom:rect.bottom }; }
    el = el.parentElement;
  }
  return { top:0,bottom:window.innerHeight };
}

export function CustomSelect({ options, value, defaultValue, onChange, name, ariaLabel, autoFocus = false }: { options: SelectOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; name?: string; ariaLabel?: string; autoFocus?: boolean }) {
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value ?? '');
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0); const [openUpward, setOpenUpward] = useState(false); const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const listId = useId(); const selected = value ?? internal;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));
  const optionId = (index: number) => `${listId}-option-${index}`;
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  const openMenu = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const boundary = findClipBoundary(trigger.current);
      const spaceBelow = boundary.bottom - rect.bottom - MENU_MARGIN, spaceAbove = rect.top - boundary.top - MENU_MARGIN;
      const upward = spaceBelow < 160 && spaceAbove > spaceBelow;
      setOpenUpward(upward);
      setMaxHeight(Math.max(120,Math.min(280,upward ? spaceAbove : spaceBelow)));
    }
    setActive(selectedIndex); setOpen(true);
  };
  const choose = (next: SelectOption) => { if (next.disabled) return; if (value === undefined) setInternal(next.value); onChange?.(next.value); setOpen(false); };
  const move = (direction: 1 | -1) => { const next = nextEnabledOptionIndex(options, active, direction); if (next !== null) setActive(next); };
  return <div className={`custom-select ${open ? 'open' : ''} ${open && openUpward ? 'open-up' : ''}`} ref={root}>
    {name && <input type="hidden" name={name} value={selected} />}
    <button type="button" ref={trigger} className="custom-select-trigger" aria-label={ariaLabel} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? optionId(active) : undefined} autoFocus={autoFocus} onClick={() => { if (open) setOpen(false); else openMenu(); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) openMenu(); else move(event.key === 'ArrowDown' ? 1 : -1); } if (event.key === 'Enter' && open) { event.preventDefault(); const option = options[active]; if (option) choose(option); } if (event.key === 'Escape') setOpen(false); }}>
      <span>{options[selectedIndex]?.label ?? 'Choose…'}</span><span className="custom-select-chevron" aria-hidden />
    </button>
    {open && <div className="custom-select-menu" id={listId} role="listbox" aria-label={ariaLabel} style={maxHeight ? { maxHeight } : undefined}>{options.map((option, index) => <button type="button" id={optionId(index)} role="option" aria-selected={option.value === selected} disabled={option.disabled} className={`custom-select-option ${index === active ? 'active' : ''}`} key={option.value} onPointerEnter={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selected && <span aria-hidden>✓</span>}</button>)}</div>}
  </div>;
}
