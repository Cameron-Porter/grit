import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useEntitlements } from '../../contexts/EntitlementsContext';
import { useColors } from '../../utils/useColors';

interface PremiumGuardProps {
  children: React.ReactNode;
  /**
   * Where to redirect non-premium users.
   * Defaults to '/subscription'.
   */
  redirectTo?: string;
}

/**
 * Wraps a screen to ensure only premium users can view it.
 *
 * Usage:
 *   export default function MyPremiumScreen() {
 *     return (
 *       <PremiumGuard>
 *         <MyContent />
 *       </PremiumGuard>
 *     );
 *   }
 */
export default function PremiumGuard({
  children,
  redirectTo = '/subscription',
}: PremiumGuardProps) {
  const { hasPremiumAccess, loading } = useEntitlements();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (!loading && !hasPremiumAccess) {
      router.replace(redirectTo as any);
    }
  }, [loading, hasPremiumAccess]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!hasPremiumAccess) return null;

  return <>{children}</>;
}
