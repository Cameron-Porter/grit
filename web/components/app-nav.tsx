import Link from 'next/link';
const links = [['Today', '/workout'], ['Programs', '/programs'], ['Progress', '/progress'], ['Profile', '/profile']] as const;
export function AppNav() { return <nav className="app-nav" aria-label="Primary">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>; }
