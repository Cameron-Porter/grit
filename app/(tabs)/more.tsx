import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { EQUIPMENT_TYPES, useProfileStore } from '../../src/store/useProfileStore';
import { Colors } from '../../src/utils/constants';

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ width: 51, height: 31, borderRadius: 16, backgroundColor: value ? Colors.primary : Colors.surface2, justifyContent: 'center', paddingHorizontal: 2 }}
    >
      <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: Colors.text, alignSelf: value ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

export default function ProfileAndSettings() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const {
    bodyWeight, setBodyWeight,
    autoMatchWeight, setAutoMatchWeight,
    usePreferredEquipment, setUsePreferredEquipment,
    preferredEquipment, setPreferredEquipment,
  } = useProfileStore();

  const meta = user?.user_metadata ?? {};
  const displayName: string = meta.full_name ?? meta.name ?? user?.email?.split('@')[0] ?? 'Athlete';
  const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;

  const [bwInput, setBwInput] = useState(bodyWeight != null ? String(bodyWeight) : '');
  const [bwSaved, setBwSaved] = useState(false);

  useEffect(() => {
    if (bodyWeight != null) setBwInput(String(bodyWeight));
  }, [bodyWeight]);

  const handleSaveBW = () => {
    const val = parseFloat(bwInput);
    if (isNaN(val) || val <= 0) return;
    setBodyWeight(val);
    setBwSaved(true);
    setTimeout(() => setBwSaved(false), 2000);
  };

  const toggleEquipment = (type: string) => {
    if (preferredEquipment.includes(type)) {
      setPreferredEquipment(preferredEquipment.filter((e) => e !== type));
    } else {
      setPreferredEquipment([...preferredEquipment, type]);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* User header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surface2 }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${Colors.primary}22`, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="account" size={28} color={Colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>{displayName}</Text>
          {user?.email && (
            <Text style={{ color: Colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{user.email}</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── BODY WEIGHT ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Body Weight</Text>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Current Weight (lbs)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                value={bwInput}
                onChangeText={setBwInput}
                placeholder="e.g. 175"
                placeholderTextColor={Colors.muted}
                keyboardType="decimal-pad"
                style={{ flex: 1, backgroundColor: '#0B0F14', color: Colors.text, borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700' }}
              />
              <Pressable
                onPress={handleSaveBW}
                style={{ paddingHorizontal: 18, paddingVertical: 13, backgroundColor: bwSaved ? Colors.success : Colors.primary, borderRadius: 10 }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 14 }}>{bwSaved ? '✓' : 'Save'}</Text>
              </Pressable>
            </View>
            {bodyWeight != null && (
              <Text style={{ color: Colors.muted, fontSize: 12, marginTop: 10 }}>
                Current: <Text style={{ color: Colors.text, fontWeight: '700' }}>{bodyWeight} lbs</Text>
                {' · '}used as default for bodyweight exercises
              </Text>
            )}
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Settings</Text>

          {/* Auto match weight */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Sets</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Auto match weight updates</Text>
                <Text style={{ color: Colors.muted, fontSize: 12, lineHeight: 17 }}>
                  When you change a set's weight, all subsequent sets with the same weight update automatically.
                </Text>
              </View>
              <Toggle value={autoMatchWeight} onToggle={() => setAutoMatchWeight(!autoMatchWeight)} />
            </View>
          </View>

          {/* Equipment preferences */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: Colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Exercise Types</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Use preferred exercise types</Text>
                <Text style={{ color: Colors.muted, fontSize: 12, lineHeight: 17 }}>Filter the exercise picker to your saved equipment preferences.</Text>
              </View>
              <Toggle value={usePreferredEquipment} onToggle={() => setUsePreferredEquipment(!usePreferredEquipment)} />
            </View>
            {usePreferredEquipment && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Equipment preferences</Text>
                {EQUIPMENT_TYPES.map((type) => {
                  const selected = preferredEquipment.includes(type);
                  return (
                    <Pressable
                      key={type}
                      onPress={() => toggleEquipment(type)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? Colors.primary : Colors.surface2, backgroundColor: selected ? `${Colors.primary}14` : 'transparent' }}
                    >
                      <Text style={{ color: Colors.text, fontSize: 15 }}>{type}</Text>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? Colors.primary : Colors.surface2, backgroundColor: selected ? Colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <MaterialCommunityIcons name="check" size={13} color={Colors.background} />}
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
              backgroundColor: Colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={{ color: Colors.muted, fontSize: 12, textAlign: 'center', marginTop: 32 }}>
          GRIT · Guided Results &amp; Intelligent Training
        </Text>
      </ScrollView>
    </View>
  );
}
