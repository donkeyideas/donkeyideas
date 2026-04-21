'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { NotificationModal } from '@/components/ui/notification-modal';

interface ApiConfig {
  deepSeekApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  stripeApiKey: string;
  sendgridApiKey: string;
  twilioApiKey: string;
  twilioApiSecret: string;
}

interface TwoFASetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export default function SettingsPage() {
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    deepSeekApiKey: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    stripeApiKey: '',
    sendgridApiKey: '',
    twilioApiKey: '',
    twilioApiSecret: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // 2FA State
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<TwoFASetup | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  useEffect(() => {
    loadSettings();
    load2FAStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/api-keys');
      if (response.data) {
        updateApiConfig(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      // If endpoint doesn't exist yet, continue with empty config
    } finally {
      setLoading(false);
    }
  };

  const load2FAStatus = async () => {
    try {
      const response = await api.get('/auth/2fa/status');
      setTwoFAEnabled(response.data.enabled);
    } catch (error: any) {
      console.error('Failed to load 2FA status:', error);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setTwoFALoading(true);
      const response = await api.post('/auth/2fa/setup');
      setTwoFASetup(response.data);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to setup 2FA',
        type: 'error',
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setTwoFALoading(true);
      await api.post('/auth/2fa/verify', { code: verifyCode });
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setVerifyCode('');
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Two-factor authentication enabled successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Invalid verification code',
        type: 'error',
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setTwoFALoading(true);
      await api.post('/auth/2fa/disable', {
        password: disablePassword,
        code: disableCode,
      });
      setTwoFAEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setDisableCode('');
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'Two-factor authentication disabled',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to disable 2FA',
        type: 'error',
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const cancelSetup = () => {
    setTwoFASetup(null);
    setVerifyCode('');
  };

  const updateApiConfig = (data: any) => {
    setApiConfig({
      deepSeekApiKey: data.deepSeekApiKey || '',
      openaiApiKey: data.openaiApiKey || '',
      anthropicApiKey: data.anthropicApiKey || '',
      googleApiKey: data.googleApiKey || '',
      stripeApiKey: data.stripeApiKey || '',
      sendgridApiKey: data.sendgridApiKey || '',
      twilioApiKey: data.twilioApiKey || '',
      twilioApiSecret: data.twilioApiSecret || '',
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/settings/api-keys', apiConfig);
      setNotification({
        isOpen: true,
        title: 'Success',
        message: 'API keys saved successfully',
        type: 'success',
      });
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save API keys',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof ApiConfig, value: string) => {
    setApiConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading settings...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Settings</h1>
        <p className="text-white/60 [.light_&]:text-slate-600">Manage your API keys and configuration</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Keys Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deep Seek AI */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Deep Seek AI API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiConfig.deepSeekApiKey}
              onChange={(e) => handleChange('deepSeekApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Required for AI Assistant functionality. Get your key from{' '}
              <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Deep Seek Platform
              </a>
            </p>
          </div>

          {/* OpenAI */}
          <div>
            <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
            <input
              type="password"
              value={apiConfig.openaiApiKey}
              onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Optional: Alternative AI provider. Get your key from{' '}
              <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                OpenAI Platform
              </a>
            </p>
          </div>

          {/* Anthropic */}
          <div>
            <label className="block text-sm font-medium mb-2">Anthropic (Claude) API Key</label>
            <input
              type="password"
              value={apiConfig.anthropicApiKey}
              onChange={(e) => handleChange('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Optional: Alternative AI provider. Get your key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Anthropic Console
              </a>
            </p>
          </div>

          {/* Google API */}
          <div>
            <label className="block text-sm font-medium mb-2">Google API Key</label>
            <input
              type="password"
              value={apiConfig.googleApiKey}
              onChange={(e) => handleChange('googleApiKey', e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Optional: For Google services integration (Maps, Analytics, etc.)
            </p>
          </div>

          {/* Stripe */}
          <div>
            <label className="block text-sm font-medium mb-2">Stripe API Key</label>
            <input
              type="password"
              value={apiConfig.stripeApiKey}
              onChange={(e) => handleChange('stripeApiKey', e.target.value)}
              placeholder="sk_live_..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Optional: For payment processing. Get your key from{' '}
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Stripe Dashboard
              </a>
            </p>
          </div>

          {/* SendGrid */}
          <div>
            <label className="block text-sm font-medium mb-2">SendGrid API Key</label>
            <input
              type="password"
              value={apiConfig.sendgridApiKey}
              onChange={(e) => handleChange('sendgridApiKey', e.target.value)}
              placeholder="SG..."
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            />
            <p className="text-xs text-white/50 mt-1">
              Optional: For email notifications. Get your key from{' '}
              <a href="https://app.sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                SendGrid Dashboard
              </a>
            </p>
          </div>

          {/* Twilio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Twilio API Key</label>
              <input
                type="password"
                value={apiConfig.twilioApiKey}
                onChange={(e) => handleChange('twilioApiKey', e.target.value)}
                placeholder="AC..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Twilio API Secret</label>
              <input
                type="password"
                value={apiConfig.twilioApiSecret}
                onChange={(e) => handleChange('twilioApiSecret', e.target.value)}
                placeholder="..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
              />
            </div>
          </div>
          <p className="text-xs text-white/50">
            Optional: For SMS notifications. Get your keys from{' '}
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Twilio Console
            </a>
          </p>

          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save API Keys'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Two-Factor Authentication (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {twoFAEnabled ? (
            /* 2FA is enabled */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-emerald-400 font-medium">Two-factor authentication is enabled</span>
              </div>
              <p className="text-white/60 [.light_&]:text-slate-600 text-sm mb-4">
                Your account is protected with an authenticator app. You&apos;ll need to enter a code from your app when signing in.
              </p>

              {showDisableForm ? (
                <div className="space-y-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-medium">
                    To disable 2FA, please enter your password and current 2FA code:
                  </p>
                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-red-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">2FA Code</label>
                    <input
                      type="text"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      placeholder="000000"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white font-mono tracking-wider text-center focus:outline-none focus:border-red-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisablePassword('');
                        setDisableCode('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDisable2FA}
                      disabled={twoFALoading || !disablePassword || disableCode.length !== 6}
                    >
                      {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setShowDisableForm(true)}>
                  Disable Two-Factor Authentication
                </Button>
              )}
            </div>
          ) : twoFASetup ? (
            /* Setup in progress - show QR code */
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                <p className="text-white/60 [.light_&]:text-slate-600 text-sm mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="inline-block p-4 bg-white rounded-lg mb-4">
                  <img src={twoFASetup.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-white/40 [.light_&]:text-slate-500 text-xs">
                  Or enter this code manually: <code className="bg-white/10 px-2 py-1 rounded">{twoFASetup.secret}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter the 6-digit code from your app to verify
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-md text-white text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={cancelSetup}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleVerify2FA}
                  disabled={twoFALoading || verifyCode.length !== 6}
                >
                  {twoFALoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </Button>
              </div>
            </div>
          ) : (
            /* 2FA not enabled - show setup button */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 font-medium">Two-factor authentication is not enabled</span>
              </div>
              <p className="text-white/60 [.light_&]:text-slate-600 text-sm mb-4">
                Add an extra layer of security to your account by requiring a verification code from your authenticator app when signing in.
              </p>
              <Button variant="primary" onClick={handleSetup2FA} disabled={twoFALoading}>
                {twoFALoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 [.light_&]:text-slate-600">More settings coming soon...</p>
        </CardContent>
      </Card>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

