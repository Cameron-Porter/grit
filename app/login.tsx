import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import GritWordmark from '../src/components/GritWordmark';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useColors } from '../src/utils/useColors';

export default function LoginScreen() {
  const colors = useColors();
  const { signIn, signUp, signInWithGoogle, loading } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (mode === 'login') {
      const err = await signIn(email.trim(), password);
      if (err) {
        setError(err);
      }
      // Navigation handled by auth guard in _layout.tsx once user state updates
    } else {
      const err = await signUp(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        setSuccessMsg('Check your email for a confirmation link, then log in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
    }
    // Navigation handled by auth guard in _layout.tsx
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / branding */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <GritWordmark size="lg" letterColor="#FFFFFF" />
        </View>

        {/* Mode tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {(['login', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setError(null); setSuccessMsg(null); }}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === m ? colors.primary : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ color: mode === m ? colors.background : colors.muted, fontWeight: '700', fontSize: 14 }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Success message */}
        {successMsg && (
          <View style={{ backgroundColor: `${colors.success}18`, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: `${colors.success}40` }}>
            <Text style={{ color: colors.success, fontSize: 14 }}>{successMsg}</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={{ backgroundColor: '#EF444418', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EF444440' }}>
            <Text style={{ color: '#EF4444', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 16 }}
        />

        {/* Password */}
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Password</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: mode === 'signup' ? 16 : 28 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{ flex: 1, color: colors.text, padding: 16, fontSize: 15 }}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={{ padding: 14 }}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Confirm password (sign up only) */}
        {mode === 'signup' && (
          <>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 28 }}
            />
          </>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 17, alignItems: 'center', opacity: loading ? 0.7 : 1, marginBottom: 16 }}
        >
          <Text style={{ color: colors.background, fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surface2 }} />
          <Text style={{ color: colors.muted, marginHorizontal: 12, fontSize: 13 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.surface2 }} />
        </View>

        {/* Google SSO */}
        <Pressable
          onPress={handleGoogle}
          disabled={loading}
          style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.surface2, opacity: loading ? 0.7 : 1 }}
        >
          <MaterialCommunityIcons name="google" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Continue with Google</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
