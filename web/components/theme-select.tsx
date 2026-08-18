'use client';

import { useEffect, useState } from 'react';

export function storedDarkMode(saved: string | null, systemDark: boolean) {
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return systemDark;
}

/**
 * The exact inline script injected into the document head so the saved theme applies
 * before first paint. Kept as a single source string (rather than duplicated logic)
 * so `storedDarkMode`'s behavior and this script can never drift: both branch on the
 * same three states (`'dark'`, `'light'`, anything else falls back to the system
 * preference).
 */
export const themeBootstrapScript = `(function(){try{var saved=localStorage.getItem('grit-theme');var dark=saved==='dark'?true:saved==='light'?false:window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';}catch(e){}})();`;

export function ThemeSelect() {
  const [dark, setDark] = useState(false);

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
      <input type="checkbox" checked={dark} onChange={event => change(event.target.checked)} />
      <span aria-hidden="true" />
    </label>
  </div>;
}
