import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/guards/AdminGuard';
import { useEntitlements } from '../../src/contexts/EntitlementsContext';
import { searchProfilesByEmail, pregrantRole, revokePregrant, listPregrants, RolePreGrant } from '../../src/api/userProfile';
import { roleLabel } from '../../src/lib/entitlements';
import { UserProfile, UserRole } from '../../src/types/auth';
import { useColors } from '../../src/utils/useColors';

const ROLES: UserRole[] = ['user', 'vip', 'admin'];

function RoleBadge({ role }: { role: UserRole }) {
  const colors = useColors();
  const bg =
    role === 'admin' ? colors.primary :
    role === 'vip'   ? '#A855F7' :
    colors.surface2;
  const fg = role === 'user' ? colors.muted : '#FFFFFF';
  return (
    <View style={{ backgroundColor: `${bg}50`, borderWidth: 1, borderColor: `${bg}80`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
        {roleLabel(role).toUpperCase()}
      </Text>
    </View>
  );
}

function UserRow({
  profile,
  onRoleChange,
  updating,
}: {
  profile: UserProfile;
  onRoleChange: (userId: string, role: UserRole) => void;
  updating: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {profile.email ?? profile.id}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
            {profile.id}
          </Text>
        </View>
        <RoleBadge role={profile.role} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {ROLES.map((role) => (
          <Pressable
            key={role}
            onPress={() => onRoleChange(profile.id, role)}
            disabled={updating || profile.role === role}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: profile.role === role ? colors.primary : colors.surface2,
              backgroundColor: profile.role === role ? `${colors.primary}22` : colors.surface2,
              opacity: pressed || (updating && profile.role !== role) ? 0.5 : 1,
            })}
          >
            <Text style={{
              color: profile.role === role ? colors.primary : colors.muted,
              fontSize: 12,
              fontWeight: '700',
            }}>
              {roleLabel(role)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PreGrantRow({ grant, onRevoke }: { grant: RolePreGrant; onRevoke: (email: string) => void }) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
          {grant.email}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Pending signup</Text>
      </View>
      <RoleBadge role={grant.role as UserRole} />
      <Pressable
        onPress={() => onRevoke(grant.email)}
        hitSlop={8}
        style={({ pressed }) => ({ marginLeft: 12, opacity: pressed ? 0.5 : 1 })}
      >
        <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { assignRole, refreshProfile } = useEntitlements();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pregrants, setPregrants] = useState<RolePreGrant[]>([]);
  const [pregrantingEmail, setPregrantingEmail] = useState<string | null>(null);

  const loadPregrants = async () => {
    try {
      const grants = await listPregrants();
      setPregrants(grants);
    } catch {}
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setSearching(true);
    setNotFound(false);
    try {
      const profiles = await searchProfilesByEmail(query.trim());
      setResults(profiles);
      setNotFound(profiles.length === 0);
      if (profiles.length === 0) await loadPregrants();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (updatingId) return;
    setUpdatingId(userId);
    try {
      await assignRole(userId, role);
      setResults((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role } : p)),
      );
      await refreshProfile();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Role update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePregrant = async (email: string, role: UserRole) => {
    if (pregrantingEmail) return;
    setPregrantingEmail(email);
    try {
      await pregrantRole(email, role);
      await loadPregrants();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Pre-grant failed');
    } finally {
      setPregrantingEmail(null);
    }
  };

  const handleRevoke = async (email: string) => {
    try {
      await revokePregrant(email);
      setPregrants((prev) => prev.filter((g) => g.email !== email));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Revoke failed');
    }
  };

  // Check if the searched email already has a pending pre-grant
  const existingPregrant = pregrants.find(
    (g) => g.email === query.trim().toLowerCase(),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface2,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more')} style={{ marginRight: 12, padding: 4 }} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Admin Panel</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Role management</Text>
        </View>
        <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>ADMIN</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Find User by Email
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setNotFound(false); setResults([]); }}
            onSubmitEditing={handleSearch}
            placeholder="user@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="search"
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 14,
              borderWidth: 1,
              borderColor: colors.surface2,
            }}
          />
          <Pressable
            onPress={handleSearch}
            disabled={searching || !query.trim()}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed || searching || !query.trim() ? 0.5 : 1,
            })}
          >
            {searching
              ? <ActivityIndicator color={colors.background} size="small" />
              : <MaterialCommunityIcons name="magnify" size={20} color={colors.background} />
            }
          </Pressable>
        </View>

        {/* Results — existing users */}
        {results.length > 0 && (
          <>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              Results ({results.length})
            </Text>
            {results.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                onRoleChange={handleRoleChange}
                updating={updatingId === profile.id}
              />
            ))}
          </>
        )}

        {/* Not found — offer pre-grant */}
        {notFound && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
              No account found
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              {query.trim()} hasn't signed up yet. You can pre-grant a role — it will be applied automatically when they create their account.
            </Text>

            {existingPregrant ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Already pre-granted:
                  </Text>
                  <RoleBadge role={existingPregrant.role as UserRole} />
                </View>
                <Pressable
                  onPress={() => handleRevoke(existingPregrant.email)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface2,
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>Revoke</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['vip', 'admin'] as UserRole[]).map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => handlePregrant(query.trim().toLowerCase(), role)}
                    disabled={pregrantingEmail === query.trim().toLowerCase()}
                    style={({ pressed }) => ({
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: role === 'admin' ? `${colors.primary}22` : '#A855F722',
                      borderWidth: 1,
                      borderColor: role === 'admin' ? colors.primary : '#A855F7',
                      opacity: pressed || pregrantingEmail !== null ? 0.6 : 1,
                    })}
                  >
                    {pregrantingEmail === query.trim().toLowerCase() ? (
                      <ActivityIndicator color={role === 'admin' ? colors.primary : '#A855F7'} size="small" />
                    ) : (
                      <Text style={{
                        color: role === 'admin' ? colors.primary : '#A855F7',
                        fontSize: 13,
                        fontWeight: '800',
                      }}>
                        Pre-grant {roleLabel(role)}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Pending pre-grants list */}
        {pregrants.length > 0 && (
          <>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>
              Pending Pre-Grants ({pregrants.length})
            </Text>
            {pregrants.map((grant) => (
              <PreGrantRow key={grant.email} grant={grant} onRevoke={handleRevoke} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function AdminScreen() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
