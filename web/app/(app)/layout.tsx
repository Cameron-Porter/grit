import { AppNav } from '@/components/app-nav';
import { PendingWorkoutReconciler } from '@/components/pending-workout-reconciler';
import { requireUser } from '@/lib/auth/require-user';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }: { children: React.ReactNode }) { const { user } = await requireUser(); return <><PendingWorkoutReconciler userId={user.id}/><div className="page-frame">{children}</div><AppNav /></>; }
