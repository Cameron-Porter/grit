'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SVGProps } from 'react';

type NavIcon = 'dumbbell' | 'programs' | 'progress' | 'profile';

type AppNavLink = {
  label: string;
  href: string;
  icon: NavIcon;
};

export const appNavLinks = [
  { label: 'Workout', href: '/workout', icon: 'dumbbell' },
  { label: 'Programs', href: '/programs', icon: 'programs' },
  { label: 'Progress', href: '/history', icon: 'progress' },
  { label: 'Profile', href: '/profile', icon: 'profile' },
] as const satisfies readonly AppNavLink[];

export function isActiveAppNavLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AppNavIcon({ icon, ...props }: { icon: NavIcon } & SVGProps<SVGSVGElement>) {
  switch (icon) {
    case 'dumbbell':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
          <path d="M4.75 9.75v4.5M19.25 9.75v4.5M7.25 8.25v7.5M16.75 8.25v7.5" />
          <path d="M7.25 12h9.5" />
          <path d="M3.25 11.25v1.5M20.75 11.25v1.5" />
        </svg>
      );
    case 'programs':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
          <path d="M6.25 5.75h11.5v4.5H6.25zM6.25 13.75h7.5v4.5h-7.5zM16.25 13.75h1.5v4.5h-1.5z" />
        </svg>
      );
    case 'progress':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
          <path d="M5 18.25h14" />
          <path d="M7.25 15.75v-3M12 15.75V8.25M16.75 15.75v-5" />
          <path d="m7.25 10.5 3.2-3.2 3.05 3.05 3.25-3.25" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
          <path d="M12 12.25a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5.75 19.25c.8-3.1 3-4.75 6.25-4.75s5.45 1.65 6.25 4.75" />
        </svg>
      );
  }
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Primary">
      {appNavLinks.map(({ label, href, icon }) => {
        const active = isActiveAppNavLink(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <AppNavIcon icon={icon} className="app-nav-icon" />
            <span className="sr-only">{label}</span>
            <span className="app-nav-dot" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
