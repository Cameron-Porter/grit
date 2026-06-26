import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useEntitlements } from '../../contexts/EntitlementsContext';
import { useColors } from '../../utils/useColors';

interface AdminGuardProps {
  children: React.ReactNode;
  /**
   * Where to redirect non-admins.
   * Defaults to '/(tabs)/programs'.
   */
  redirectTo?: string;
}

/**
 * Wraps a screen to ensure only admin users can view it.
 *
 * Usage:
 *   export default function AdminScreen() {
 *     return (
 *       <AdminGuard>
 *         <AdminContent />
 *       </AdminGuard>
 *     );
 *   }
 */
export default function AdminGuard({
  children,
  redirectTo = '/(tabs)/programs',
}: AdminGuardProps) {
  const { isAdmin, loading } = useEntitlements();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace(redirectTo as any);
    }
  }, [loading, isAdmin]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
