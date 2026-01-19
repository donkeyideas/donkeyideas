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

  useEffect(() => {
    loadSettings();
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
          <div className="grid grid-cols-2 gap-4">
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

