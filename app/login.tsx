import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { Colors } from '../src/utils/constants';

export default function LoginScreen() {
  const router = useRouter();
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
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / branding */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: `${Colors.primary}22`, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <MaterialCommunityIcons name="dumbbell" size={36} color={Colors.primary} />
          </View>
          <Text style={{ color: Colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>GRIT</Text>
          <Text style={{ color: Colors.muted, fontSize: 14, marginTop: 6 }}>Guided Results &amp; Intelligent Training</Text>
        </View>

        {/* Mode tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {(['login', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setError(null); setSuccessMsg(null); }}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === m ? Colors.primary : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ color: mode === m ? Colors.background : Colors.muted, fontWeight: '700', fontSize: 14 }}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Success message */}
        {successMsg && (
          <View style={{ backgroundColor: `${Colors.success}18`, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: `${Colors.success}40` }}>
            <Text style={{ color: Colors.success, fontSize: 14 }}>{successMsg}</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={{ backgroundColor: '#EF444418', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EF444440' }}>
            <Text style={{ color: '#EF4444', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Email */}
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={{ backgroundColor: Colors.surface, color: Colors.text, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 16 }}
        />

        {/* Password */}
        <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Password</Text>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: mode === 'signup' ? 16 : 28 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.muted}
            secureTextEntry={!showPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            style={{ flex: 1, color: Colors.text, padding: 16, fontSize: 15 }}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={{ padding: 14 }}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.muted} />
          </Pressable>
        </View>

        {/* Confirm password (sign up only) */}
        {mode === 'signup' && (
          <>
            <Text style={{ color: Colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.muted}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              style={{ backgroundColor: Colors.surface, color: Colors.text, borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 28 }}
            />
          </>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 17, alignItems: 'center', opacity: loading ? 0.7 : 1, marginBottom: 16 }}
        >
          <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.surface2 }} />
          <Text style={{ color: Colors.muted, marginHorizontal: 12, fontSize: 13 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.surface2 }} />
        </View>

        {/* Google SSO */}
        <Pressable
          onPress={handleGoogle}
          disabled={loading}
          style={{ backgroundColor: Colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: Colors.surface2, opacity: loading ? 0.7 : 1 }}
        >
          <MaterialCommunityIcons name="google" size={20} color={Colors.text} />
          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>Continue with Google</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
