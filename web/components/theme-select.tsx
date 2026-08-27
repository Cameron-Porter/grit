'use client';

import { useEffect, useState } from 'react';

export function storedDarkMode(saved: string | null, systemDark: boolean) {
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return systemDark;
}

/** Pure so the lazy useState initializer below can be tested without rendering. */
export const initialDarkFromDataset = (theme: string | undefined) => theme === 'dark';

/**
 * The exact inline script injected into the document head so the saved theme applies
 * before first paint. Kept as a single source string (rather than duplicated logic)
 * so `storedDarkMode`'s behavior and this script can never drift: both branch on the
 * same three states (`'dark'`, `'light'`, anything else falls back to the system
 * preference).
 */
export const themeBootstrapScript = `(function(){try{var saved=localStorage.getItem('grit-theme');var dark=saved==='dark'?true:saved==='light'?false:window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';}catch(e){}})();`;

export function ThemeSelect() {
  // themeBootstrapScript already set documentElement.dataset.theme before this component
  // mounts (it's an inline <head> script that runs pre-hydration) - read that instead of
  // always starting at false and correcting after mount, which visibly animated the
  // switch sliding on every time dark mode happened to already be active.
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && initialDarkFromDataset(document.documentElement.dataset.theme));

  useEffect(() => {
    const enabled = storedDarkMode(localStorage.getItem('grit-theme'), window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
  }, []);

  const change = (enabled: boolean) => {
    setDark(enabled);
    const theme = enabled ? 'dark' : 'light';
    localStorage.setItem('grit-theme', theme);
    document.documentElement.dataset.theme = theme;
  };

  return <div className="setting-row">
    <div><strong>Dark mode</strong><span>Use the darker color palette.</span></div>
    <label className="switch" aria-label="Dark mode">
      <input type="checkbox" checked={dark} suppressHydrationWarning onChange={event => change(event.target.checked)} />
      <span aria-hidden="true" />
    </label>
  </div>;
}
