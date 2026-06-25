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
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef(false);

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

        const [offerings, info] = await Promise.all([
          Purchases.getOfferings(),
          Purchases.getCustomerInfo(),
        ]);

        setCurrentOffering(offerings.current);
        setCustomerInfo(info);
      } catch (e) {
        // SDK unavailable in Expo Go — silently no-op
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Listen for subscription state changes (e.g. after purchase completes)
  useEffect(() => {
    if (listenerRef.current) return;
    listenerRef.current = true;

    Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });
  }, []);

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
    purchasePackage,
    restorePurchases,
  };
}
