import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { login } from '../src/api/auth';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    if (needs2FA && !totpCode) { setError('Enter your 2FA code'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await login(email.trim(), password, needs2FA ? totpCode : undefined);
      if (result.requires2FA) {
        setNeeds2FA(true);
        return;
      }
      if (result.user) {
        setUser(result.user);
      } else {
        setError('Login succeeded but no user data returned');
      }
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || e.response?.data?.error || e.response?.data?.message || e.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Image
          source={require('../assets/icon.png')}
          style={[styles.logo, { borderRadius: theme.radius }]}
        />
        <Text style={[styles.title, { color: c.text1 }]}>Donkey Ideas</Text>
        <Text style={[styles.subtitle, { color: c.text2 }]}>Sign in to your dashboard</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text1, borderRadius: theme.radius }]}
          placeholder="Email"
          placeholderTextColor={c.text2}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text1, borderRadius: theme.radius }]}
          placeholder="Password"
          placeholderTextColor={c.text2}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {needs2FA && (
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text1, borderRadius: theme.radius }]}
            placeholder="2FA Code"
            placeholderTextColor={c.text2}
            value={totpCode}
            onChangeText={setTotpCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.fabBg, borderRadius: theme.radius, opacity: loading ? 0.6 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.btnText, { color: c.fabText }]}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 32 },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  input: { height: 52, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 12 },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700' },
});
