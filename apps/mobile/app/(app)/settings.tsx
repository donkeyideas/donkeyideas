import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getApiKeys, saveApiKeys, get2FAStatus, setup2FA, verify2FA, disable2FA, ApiKeys, TwoFASetupResponse } from '../../src/api/settings';
import { SectionCard } from '../../src/components/SectionCard';

const KEY_LABELS: Array<{ key: keyof ApiKeys; label: string }> = [
  { key: 'deepSeekApiKey', label: 'Deep Seek API Key' },
  { key: 'openaiApiKey', label: 'OpenAI API Key' },
  { key: 'anthropicApiKey', label: 'Anthropic API Key' },
  { key: 'googleApiKey', label: 'Google API Key' },
  { key: 'stripeApiKey', label: 'Stripe API Key' },
  { key: 'sendgridApiKey', label: 'SendGrid API Key' },
  { key: 'twilioApiKey', label: 'Twilio API Key' },
  { key: 'twilioApiSecret', label: 'Twilio API Secret' },
];

export default function SettingsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [keys, setKeys] = useState<Partial<ApiKeys>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [keysData, tfaStatus] = await Promise.all([getApiKeys(), get2FAStatus()]);
      setKeys(keysData);
      setTwoFAEnabled(tfaStatus.enabled);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      await saveApiKeys(keys);
      Alert.alert('Saved', 'API keys updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to save keys.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA();
      setSetupData(data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to start 2FA setup.');
    }
  };

  const handleVerify2FA = async () => {
    try {
      await verify2FA(verifyCode);
      setTwoFAEnabled(true);
      setSetupData(null);
      setVerifyCode('');
      Alert.alert('Success', '2FA enabled successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Invalid verification code.');
    }
  };

  const handleDisable2FA = async () => {
    if (!verifyCode) { Alert.alert('Error', 'Enter your 2FA code to disable.'); return; }
    try {
      await disable2FA(verifyCode);
      setTwoFAEnabled(false);
      setVerifyCode('');
      Alert.alert('Success', '2FA disabled.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Invalid code.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: c.bg }]}>
      <SectionCard title="API Keys">
        {KEY_LABELS.map(({ key, label }) => (
          <View key={key} style={{ marginBottom: 14 }}>
            <Text style={[styles.inputLabel, { color: c.text2 }]}>{label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text1, borderRadius: theme.radius * 0.6 }]}
              value={keys[key] || ''}
              onChangeText={(v: string) => setKeys((prev) => ({ ...prev, [key]: v }))}
              secureTextEntry
              placeholder="Enter key..."
              placeholderTextColor={c.text3}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: c.accent, borderRadius: theme.radius }]}
          onPress={handleSaveKeys}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Keys'}</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Two-Factor Authentication">
        <View style={[styles.statusRow, { borderBottomColor: c.border }]}>
          <Text style={[styles.statusLabel, { color: c.text1 }]}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: twoFAEnabled ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)' }]}>
            <Text style={{ color: twoFAEnabled ? c.positive : c.warning, fontSize: 12, fontWeight: '600' }}>
              {twoFAEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>

        {!twoFAEnabled && !setupData && (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.accent, borderRadius: theme.radius, marginTop: 12 }]}
            onPress={handleSetup2FA}
          >
            <Text style={styles.saveBtnText}>Enable 2FA</Text>
          </TouchableOpacity>
        )}

        {setupData && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.inputLabel, { color: c.text2 }]}>
              Scan QR code with your authenticator app, then enter the 6-digit code:
            </Text>
            <Text style={[styles.secret, { color: c.accent, borderColor: c.border }]}>{setupData.secret}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text1, borderRadius: theme.radius * 0.6, marginTop: 10 }]}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="6-digit code"
              placeholderTextColor={c.text3}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.positive, borderRadius: theme.radius, marginTop: 10 }]}
              onPress={handleVerify2FA}
            >
              <Text style={styles.saveBtnText}>Verify & Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {twoFAEnabled && (
          <View style={{ marginTop: 12 }}>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text1, borderRadius: theme.radius * 0.6 }]}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="Enter 2FA code to disable"
              placeholderTextColor={c.text3}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.negative, borderRadius: theme.radius, marginTop: 10 }]}
              onPress={handleDisable2FA}
            >
              <Text style={styles.saveBtnText}>Disable 2FA</Text>
            </TouchableOpacity>
          </View>
        )}
      </SectionCard>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { height: 44, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  saveBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1 },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  secret: { fontSize: 12, fontFamily: 'monospace', marginTop: 8, padding: 10, borderWidth: 1, borderRadius: 6, textAlign: 'center' },
});
