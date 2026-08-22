'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Focusable elements inside a container, in DOM/tab order, excluding hidden ones. */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );

/**
 * Pure Tab-key trap logic: given the focusable elements, which element currently has
 * focus, and whether Shift is held, returns the element that should receive focus, or
 * null when the default browser behavior should proceed unmodified (focus already
 * inside the trap and not at a boundary).
 */
export const trapTabKey = (
  elements: HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean,
): HTMLElement | null => {
  if (elements.length === 0) return null;
  const first = elements[0];
  const last = elements[elements.length - 1];
  const activeIndex = activeElement ? elements.indexOf(activeElement as HTMLElement) : -1;
  if (activeIndex === -1) return shiftKey ? last : first;
  if (shiftKey && activeIndex === 0) return last;
  if (!shiftKey && activeIndex === elements.length - 1) return first;
  return null;
};

/**
 * Traps focus within `containerRef` while `active` is true: focuses the first focusable
 * element (or the container itself) on activation, wraps Tab/Shift+Tab at the boundaries,
 * and restores focus to whatever was focused beforehand once deactivated or unmounted.
 */
export const useDialogFocusTrap = (active: boolean, containerRef: RefObject<HTMLElement | null>): void => {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const [first] = getFocusableElements(container);
    (first ?? container).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const target = trapTabKey(getFocusableElements(container), document.activeElement, event.shiftKey);
      if (target) { event.preventDefault(); target.focus(); }
    };
    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [active, containerRef]);
};
