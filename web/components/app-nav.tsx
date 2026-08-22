'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const appNavLinks = [
  ['Today', '/workout'],
  ['Programs', '/programs'],
  ['Exercises', '/exercises'],
  ['Progress', '/progress'],
  ['Profile', '/profile'],
] as const;

export function isActiveAppNavLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Primary">
      {appNavLinks.map(([label, href]) => {
        const active = isActiveAppNavLink(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
