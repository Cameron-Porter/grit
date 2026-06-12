import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import GritWordmark from '../../src/components/GritWordmark';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirm } from '../../src/utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/useAuthStore';
import { EQUIPMENT_TYPES, useProfileStore } from '../../src/store/useProfileStore';
import { BOTTOM_TAB_HEIGHT } from '../../src/utils/constants';
import useRevenueCat from '../../src/hooks/useRevenueCat';
import { useColors } from '../../src/utils/useColors';

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onToggle}
      style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: value ? colors.primary : colors.surface2, justifyContent: 'center', paddingHorizontal: 2 }}
    >
      <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: colors.text, alignSelf: value ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

export default function ProfileAndSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const {
    bodyWeight, setBodyWeight,
    autoMatchWeight, setAutoMatchWeight,
    usePreferredEquipment, setUsePreferredEquipment,
    preferredEquipment, setPreferredEquipment,
    theme, setTheme,
  } = useProfileStore();

  const { isProMember, isTrialing, customerInfo } = useRevenueCat();

  const meta = user?.user_metadata ?? {};
  const identityEmail = user?.identities?.[0]?.identity_data?.email as string | undefined;
  const resolvedEmail: string | undefined = user?.email ?? meta.email ?? identityEmail;
  const displayName: string = meta.full_name ?? meta.name ?? resolvedEmail?.split('@')[0] ?? 'Athlete';
  const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;

  const [bwInput, setBwInput] = useState(bodyWeight != null ? String(bodyWeight) : '');

  useEffect(() => {
    if (bodyWeight != null) setBwInput(String(bodyWeight));
  }, [bodyWeight]);

  const handleSaveBW = () => {
    const val = parseFloat(bwInput);
    if (isNaN(val) || val <= 0) return;
    setBodyWeight(val);
  };

  const toggleEquipment = (type: string) => {
    if (preferredEquipment.includes(type)) {
      setPreferredEquipment(preferredEquipment.filter((e) => e !== type));
    } else {
      setPreferredEquipment([...preferredEquipment, type]);
    }
  };

  const handleSignOut = () => {
    confirm(
      'Log Out',
      'Are you sure you want to log out?',
      () => {
        signOut().catch((e) => Alert.alert('Error', `Could not log out: ${String(e)}`));
      },
      'Log Out',
      true,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* User header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface2 }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}22`, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="account" size={28} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{displayName}</Text>
          {resolvedEmail && (
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{resolvedEmail}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + insets.bottom + 24 }}>

        {/* ── GRIT PRO ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Membership</Text>
          {isProMember ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="crown" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>GRIT Pro</Text>
                  <View style={{ backgroundColor: isTrialing ? colors.warning : colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.background, fontSize: 10, fontWeight: '900' }}>
                      {isTrialing ? 'TRIAL' : 'ACTIVE'}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {isTrialing ? '7-day free trial' : customerInfo?.activeSubscriptions?.[0] ? 'Subscription active' : 'Full access enabled'}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/subscription')} style={{ padding: 4 }} hitSlop={8}>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/subscription')}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1.5,
                borderColor: `${colors.primary}50`,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="crown-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>Start Your Free Trial</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>7 days free, then monthly or annual.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* ── MY PROGRESS ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>My Progress</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
            <Pressable
              onPress={() => router.push('/personal-records')}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 16, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.warning}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Personal Records</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>View and add your PRs</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.surface2, marginLeft: 66 }} />
            <Pressable
              onPress={() => router.push('/growth-over-time')}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 16, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <MaterialCommunityIcons name="chart-line" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Growth Over Time</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Track strength progress by muscle</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* ── BODY WEIGHT ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Body Weight</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Body weight</Text>
              {bodyWeight != null && (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  used for bodyweight exercises
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={bwInput}
                onChangeText={setBwInput}
                onBlur={handleSaveBW}
                onSubmitEditing={handleSaveBW}
                returnKeyType="done"
                placeholder="e.g. 175"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={{ flex: 1, backgroundColor: colors.surface2, color: colors.text, borderRadius: 10, padding: 14, fontSize: 20, fontWeight: '700' }}
              />
              <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600', minWidth: 32 }}>lbs</Text>
            </View>
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Settings</Text>

          {/* Theme */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Appearance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Dark mode</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                  Switch between dark and light themes.
                </Text>
              </View>
              <Toggle value={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            </View>
          </View>

          {/* Auto match weight */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Sets</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Auto match weight updates</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                  When you change a set's weight, all subsequent sets with the same weight update automatically.
                </Text>
              </View>
              <Toggle value={autoMatchWeight} onToggle={() => setAutoMatchWeight(!autoMatchWeight)} />
            </View>
          </View>

          {/* Equipment preferences */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Types</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Use preferred exercise types</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>Filter the exercise picker to your saved equipment preferences.</Text>
              </View>
              <Toggle value={usePreferredEquipment} onToggle={() => setUsePreferredEquipment(!usePreferredEquipment)} />
            </View>
            {usePreferredEquipment && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Equipment preferences</Text>
                {EQUIPMENT_TYPES.map((type) => {
                  const selected = preferredEquipment.includes(type);
                  return (
                    <Pressable
                      key={type}
                      onPress={() => toggleEquipment(type)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.surface2, backgroundColor: selected ? `${colors.primary}14` : 'transparent' }}
                    >
                      <Text style={{ color: colors.text, fontSize: 15 }}>{type}</Text>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.primary : colors.surface2, backgroundColor: selected ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <MaterialCommunityIcons name="check" size={13} color={colors.background} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* ── SIGN OUT ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 15,
              borderRadius: 14,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Log Out</Text>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 36, opacity: 0.4 }}>
          <GritWordmark size="sm" />
        </View>
      </ScrollView>
    </View>
  );
}
