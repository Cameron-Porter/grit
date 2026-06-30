import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useAuthStore } from '../store/useAuthStore';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// RevenueCat entitlement identifier — must match what you create in the RC dashboard
export const RC_ENTITLEMENT = 'GRIT Pro';

let configured = false;

export default function useRevenueCat() {
  const user = useAuthStore((s) => s.user);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loadingRaw, setLoading] = useState(true);
  // Track which user ID we last successfully loaded for, so we don't treat
  // a stale anonymous result as valid when the authenticated user appears.
  const [loadedForUserId, setLoadedForUserId] = useState<string | null | undefined>(undefined);
  const listenerRef = useRef(false);

  // RC is only "ready" once we've finished loading for the current user identity.
  const loading = loadingRaw || loadedForUserId !== (user?.id ?? null);

  const activeEntitlement = customerInfo?.entitlements.active[RC_ENTITLEMENT];
  const isProMember = !!activeEntitlement;
  const isTrialing = activeEntitlement?.periodType === 'TRIAL';

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (!configured) {
          Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
          const key = Platform.OS === 'android' ? RC_ANDROID_KEY : RC_IOS_KEY;
          Purchases.configure({ apiKey: key });
          configured = true;
        }

        // Tie RevenueCat to the logged-in Supabase user for cross-device sync
        if (user?.id) {
          await Purchases.logIn(user.id);
        }

        // Race against an 8-second timeout so a billing-client hang never
        // blocks the app indefinitely.
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('RC timeout')), 8000),
        );
        const [offerings, info] = await Promise.race([
          Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]),
          timeout,
        ]) as [Awaited<ReturnType<typeof Purchases.getOfferings>>, CustomerInfo];

        setCurrentOffering(offerings.current);
        setCustomerInfo(info);
        setLoadedForUserId(user?.id ?? null);

        // Register listener only after SDK is confirmed configured
        if (!listenerRef.current) {
          listenerRef.current = true;
          Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
            setCustomerInfo(updatedInfo);
          });
        }
      } catch (e) {
        // Billing unavailable, timeout, or Expo Go — treat as non-subscriber so app doesn't hang
        if (__DEV__) console.log('[RC] init error:', e);
        setLoadedForUserId(user?.id ?? null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user?.id]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return !!(info.entitlements.active[RC_ENTITLEMENT]);
    } catch (e) {
      if (__DEV__) console.log('[RC] purchasePackage error:', e);
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return (info.activeSubscriptions?.length ?? 0) > 0;
    } catch {
      return false;
    }
  };

  const refreshCustomerInfo = async (): Promise<void> => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch {
      // silently ignore — stale cache is fine
    }
  };

  // Convenience: packages from current offering
  const monthlyPackage = currentOffering?.monthly ?? null;
  const annualPackage = currentOffering?.annual ?? null;

  // Compute real savings % (falls back to 20 if prices unavailable)
  const savingsPct =
    monthlyPackage && annualPackage
      ? Math.round(
          (1 - annualPackage.product.price / (monthlyPackage.product.price * 12)) * 100,
        )
      : 20;

  return {
    currentOffering,
    customerInfo,
    isProMember,
    isTrialing,
    loading,
    monthlyPackage,
    annualPackage,
    savingsPct,
    refreshCustomerInfo,
    purchasePackage,
    restorePurchases,
  };
}
