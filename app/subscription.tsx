import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRevenueCatContext } from '../src/contexts/RevenueCatContext';
import { useEntitlements } from '../src/contexts/EntitlementsContext';
import { useColors } from '../src/utils/useColors';

const BENEFITS = [
  { icon: 'calendar-multiselect', label: 'Unlimited Programs',   desc: 'Build and run as many training programs as you need.' },
  { icon: 'chart-line',           label: 'Advanced Analytics',   desc: 'Deep dive into strength curves and volume trends.' },
  { icon: 'dumbbell',             label: 'Full Exercise Library', desc: 'Access every exercise with no restrictions.' },
  { icon: 'trophy-outline',       label: 'Personal Records',     desc: 'Track PRs and visualize your strength over time.' },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    loading: rcLoading,
    isTrialing,
    monthlyPackage,
    annualPackage,
    savingsPct,
    purchasePackage,
    restorePurchases,
  } = useRevenueCatContext();
  // hasPremiumAccess covers role-based access (admin/vip) AND active RC subscription
  const { hasPremiumAccess, loading: entLoading } = useEntitlements();
  const isProMember = hasPremiumAccess;
  const loading = rcLoading || entLoading;

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const goToApp = () => router.replace('/(tabs)/programs');
  const handleClose = () => router.canGoBack() ? router.back() : goToApp();

  const handlePurchase = async (type: 'monthly' | 'annual') => {
    const pkg = type === 'monthly' ? monthlyPackage : annualPackage;
    if (!pkg || purchasing) return;
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) goToApp();
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    if (restored) {
      goToApp();
    } else {
      Alert.alert('Nothing to Restore', 'No active subscriptions were found for this account.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header — only show close button for active subscribers managing their plan */}
      {isProMember && (
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Pressable onPress={handleClose} hitSlop={12} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close" size={24} color={colors.muted} />
          </Pressable>
        </View>
      )}
      {!isProMember && <View style={{ height: insets.top + 12 }} />}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.primary}22`, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="crown" size={36} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 }}>
            GRIT Pro
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Try free for 7 days, then choose a plan.{'\n'}Cancel anytime.
          </Text>
        </View>

        {/* Benefits */}
        <View style={{ gap: 12, marginBottom: 32 }}>
          {BENEFITS.map((b) => (
            <View key={b.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MaterialCommunityIcons name={b.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 }}>{b.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 12 }}>Loading plans...</Text>
          </View>
        ) : isProMember ? (
          <View style={{ backgroundColor: `${colors.primary}18`, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary }}>
            <MaterialCommunityIcons name="check-circle" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>
              {isTrialing ? 'Free Trial Active' : 'You\'re a Pro member'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              {isTrialing
                ? 'You\'re in your 7-day free trial. Enjoy full access to GRIT Pro.'
                : 'Your subscription is active. Enjoy full access to GRIT Pro.'}
            </Text>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={() => {
                  const url = Platform.OS === 'android'
                    ? 'https://play.google.com/store/account/subscriptions'
                    : 'https://apps.apple.com/account/subscriptions';
                  Linking.openURL(url);
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Manage Subscription</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>

            {/* Annual card — featured */}
            {annualPackage && (
              <Pressable
                onPress={() => handlePurchase('annual')}
                disabled={purchasing}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  opacity: pressed || purchasing ? 0.7 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Annual</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: colors.background, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                        SAVE {savingsPct}%
                      </Text>
                    </View>
                    <View style={{ backgroundColor: `${colors.primary}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                        BEST VALUE
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '800', marginBottom: 2 }}>
                  {annualPackage.product.priceString}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}> / year</Text>
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {monthlyPackage
                    ? `${(annualPackage.product.price / 12).toLocaleString('en-US', { style: 'currency', currency: annualPackage.product.currencyCode })} / month — billed annually`
                    : 'Billed once per year'}
                </Text>

                <View style={{ marginTop: 14, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}>
                  {purchasing ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={{ color: colors.background, fontSize: 15, fontWeight: '800' }}>
                      Start 7-Day Free Trial
                    </Text>
                  )}
                </View>
              </Pressable>
            )}

            {/* Monthly card */}
            {monthlyPackage && (
              <Pressable
                onPress={() => handlePurchase('monthly')}
                disabled={purchasing}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: colors.surface2,
                  opacity: pressed || purchasing ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>Monthly</Text>
                <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 2 }}>
                  {monthlyPackage.product.priceString}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}> / month</Text>
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Cancel anytime.</Text>

                <View style={{ marginTop: 14, backgroundColor: colors.surface2, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}>
                  {purchasing ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                      Start 7-Day Free Trial
                    </Text>
                  )}
                </View>
              </Pressable>
            )}

            {!annualPackage && !monthlyPackage && (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 }}>
                <MaterialCommunityIcons name="wifi-off" size={32} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  Subscription plans unavailable.{'\n'}Check your connection and try again.
                </Text>
                <Pressable
                  onPress={() => router.replace('/subscription')}
                  style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={{ color: colors.background, fontSize: 14, fontWeight: '700' }}>Retry</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Restore purchases */}
        {!isProMember && (
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={{ marginTop: 20, alignItems: 'center', paddingVertical: 12 }}
          >
            {restoring ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : (
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
                Restore Purchases
              </Text>
            )}
          </Pressable>
        )}

        <Text style={{ color: colors.surface2, fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 }}>
          7-day free trial available to new subscribers only. After the trial, your subscription{'\n'}
          auto-renews unless cancelled at least 24 hours before the renewal date.{'\n'}
          Manage or cancel in your App Store account settings.
        </Text>
      </ScrollView>
    </View>
  );
}
