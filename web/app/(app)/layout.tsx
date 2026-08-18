import { AppNav } from '@/components/app-nav';
import { requireUser } from '@/lib/auth/require-user';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }: { children: React.ReactNode }) { await requireUser(); return <><div className="page-frame">{children}</div><AppNav /></>; }
