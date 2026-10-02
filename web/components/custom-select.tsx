'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

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
const MENU_GAP = 7;

export type CustomSelectMenuPlacement = {
  openUpward: boolean;
  maxHeight: number;
  style: CSSProperties;
};

export function customSelectMenuPlacement(
  rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  viewportHeight: number,
  viewportWidth: number = typeof window !== 'undefined' ? window.innerWidth : 800,
): CustomSelectMenuPlacement {
  const spaceBelow = viewportHeight - rect.bottom - MENU_GAP - MENU_MARGIN;
  const spaceAbove = rect.top - MENU_GAP - MENU_MARGIN;
  const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
  const available = openUpward ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(280, available));
  const left = Math.max(8, Math.min(rect.left, viewportWidth - rect.width - 8));
  const width = Math.min(rect.width, Math.max(120, viewportWidth - left - 8));
  return {
    openUpward,
    maxHeight,
    style: {
      left,
      top: openUpward ? 'auto' : rect.bottom + MENU_GAP,
      bottom: openUpward ? viewportHeight - rect.top + MENU_GAP : 'auto',
      width,
      maxHeight,
    },
  };
}

export function CustomSelect({ options, value, defaultValue, onChange, name, ariaLabel, autoFocus = false }: { options: SelectOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; name?: string; ariaLabel?: string; autoFocus?: boolean }) {
  const [internal, setInternal] = useState(defaultValue ?? options.find(option => !option.disabled)?.value ?? '');
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0); const [openUpward, setOpenUpward] = useState(false); const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const menu = useRef<HTMLDivElement>(null); const listId = useId(); const selected = value ?? internal;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));
  const optionId = (index: number) => `${listId}-option-${index}`;
  useEffect(() => { const close = (event: PointerEvent) => { const target = event.target as Node; if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  const positionMenu = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const placement = customSelectMenuPlacement(rect, window.innerHeight, window.innerWidth);
      setOpenUpward(placement.openUpward);
      setMenuStyle(placement.style);
    }
  };
  useEffect(() => {
    if (!open) return undefined;
    const update = () => positionMenu();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);
  const openMenu = () => {
    positionMenu();
    setActive(selectedIndex); setOpen(true);
  };
  const choose = (next: SelectOption) => { if (next.disabled) return; if (value === undefined) setInternal(next.value); onChange?.(next.value); setOpen(false); };
  const move = (direction: 1 | -1) => { const next = nextEnabledOptionIndex(options, active, direction); if (next !== null) setActive(next); };
  const menuMarkup = open && menuStyle ? <div ref={menu} className={`custom-select-menu custom-select-portal-menu ${openUpward ? 'open-up' : ''}`} id={listId} role="listbox" aria-label={ariaLabel} style={menuStyle}>{options.map((option, index) => <button type="button" id={optionId(index)} role="option" aria-selected={option.value === selected} disabled={option.disabled} className={`custom-select-option ${index === active ? 'active' : ''}`} key={option.value} onPointerEnter={() => setActive(index)} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selected && <span aria-hidden>✓</span>}</button>)}</div> : null;
  return <div className={`custom-select ${open ? 'open' : ''} ${open && openUpward ? 'open-up' : ''}`} ref={root}>
    {name && <input type="hidden" name={name} value={selected} />}
    <button type="button" ref={trigger} className="custom-select-trigger" aria-label={ariaLabel} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? optionId(active) : undefined} autoFocus={autoFocus} onClick={() => { if (open) setOpen(false); else openMenu(); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) openMenu(); else move(event.key === 'ArrowDown' ? 1 : -1); } if (event.key === 'Enter' && open) { event.preventDefault(); const option = options[active]; if (option) choose(option); } if (event.key === 'Escape') setOpen(false); }}>
      <span>{options[selectedIndex]?.label ?? 'Choose…'}</span><span className="custom-select-chevron" aria-hidden />
    </button>
    {menuMarkup && createPortal(menuMarkup, document.body)}
  </div>;
}
