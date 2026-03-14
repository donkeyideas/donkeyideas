'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { PlatformBadge } from './platform-badge';

interface CredentialInfo {
  platform: string;
  isConnected: boolean;
  lastTestedAt: string | null;
  hasAccessToken: boolean;
  hasAppKey: boolean;
  pageId: string;
  personUrn: string;
  accessTokenMasked: string;
  appKeyMasked: string;
}

interface PlatformFields {
  label: string;
  fields: { key: string; label: string; placeholder: string }[];
  guide: string;
  supported: boolean;
}

const PLATFORM_CONFIGS: Record<string, PlatformFields> = {
  TWITTER: {
    label: 'Twitter / X',
    supported: true,
    fields: [
      { key: 'appKey', label: 'API Key (App Key)', placeholder: 'Your Twitter API key' },
      { key: 'appSecret', label: 'API Secret (App Secret)', placeholder: 'Your Twitter API secret' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Your access token' },
      { key: 'tokenSecret', label: 'Access Token Secret', placeholder: 'Your access token secret' },
    ],
    guide: 'Go to developer.x.com > Create a project > Generate API keys and access tokens with Read and Write permissions.',
  },
  LINKEDIN: {
    label: 'LinkedIn',
    supported: true,
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'OAuth 2.0 access token' },
      { key: 'personUrn', label: 'Person URN', placeholder: 'e.g., urn:li:person:abc123 or just abc123' },
    ],
    guide: 'Go to linkedin.com/developers > Create an app > Get an OAuth 2.0 access token with w_member_social scope. Find your Person URN via the /v2/me endpoint.',
  },
  FACEBOOK: {
    label: 'Facebook',
    supported: true,
    fields: [
      { key: 'accessToken', label: 'Page Access Token', placeholder: 'Your page access token' },
    ],
    guide: 'Go to developers.facebook.com > Graph API Explorer > Get a Page Access Token with pages_manage_posts permission. Find your Page ID in your page\'s About section.',
  },
  INSTAGRAM: {
    label: 'Instagram',
    supported: false,
    fields: [],
    guide: 'Instagram does not support text-only posts via API. Image/video posts require the Instagram Graph API with a connected Facebook Page.',
  },
  TIKTOK: {
    label: 'TikTok',
    supported: false,
    fields: [],
    guide: 'TikTok integration is coming soon. The TikTok Content Posting API requires video content.',
  },
};

export function ConnectionsTab() {
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showGuide, setShowGuide] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const res = await api.get('/social-posts/credentials');
      setCredentials(res.data.credentials || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const getCredential = (platform: string) => credentials.find((c) => c.platform === platform);

  const getFieldValue = (platform: string, key: string): string => {
    return formData[platform]?.[key] || '';
  };

  const setFieldValue = (platform: string, key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }));
  };

  const handleSave = async (platform: string) => {
    const fields = formData[platform] || {};
    if (Object.values(fields).every((v) => !v)) return;

    setSaving((p) => ({ ...p, [platform]: true }));
    try {
      await api.post('/social-posts/credentials', { platform, ...fields });
      await loadCredentials();
      setFormData((p) => ({ ...p, [platform]: {} }));
      alert('Credentials saved!');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving((p) => ({ ...p, [platform]: false }));
    }
  };

  const handleTest = async (platform: string) => {
    setTesting((p) => ({ ...p, [platform]: true }));
    setTestResults((p) => ({ ...p, [platform]: undefined as any }));
    try {
      const res = await api.post('/social-posts/test-connection', { platform });
      if (res.data.success) {
        setTestResults((p) => ({
          ...p,
          [platform]: { success: true, message: `Connected as ${res.data.accountInfo?.name || 'verified'}` },
        }));
      } else {
        setTestResults((p) => ({
          ...p,
          [platform]: { success: false, message: res.data.error || 'Connection failed' },
        }));
      }
      await loadCredentials();
    } catch (err: any) {
      setTestResults((p) => ({
        ...p,
        [platform]: { success: false, message: err.response?.data?.error || 'Connection test failed' },
      }));
    } finally {
      setTesting((p) => ({ ...p, [platform]: false }));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Object.entries(PLATFORM_CONFIGS).map(([platform, config]) => {
        const cred = getCredential(platform);
        const result = testResults[platform];

        return (
          <Card key={platform}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlatformBadge platform={platform} size="md" />
                  {cred?.isConnected ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/40 [.light_&]:bg-slate-100 [.light_&]:text-slate-400">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!config.supported ? (
                <p className="text-sm text-white/40 [.light_&]:text-slate-400 italic">{config.guide}</p>
              ) : (
                <>
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-white/60 [.light_&]:text-slate-500 mb-1">
                        {field.label}
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets[`${platform}_${field.key}`] ? 'text' : 'password'}
                          value={getFieldValue(platform, field.key)}
                          onChange={(e) => setFieldValue(platform, field.key, e.target.value)}
                          placeholder={cred && (field.key === 'appKey' ? cred.appKeyMasked : field.key === 'accessToken' ? cred.accessTokenMasked : '') || field.placeholder}
                          className="w-full bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 pr-16 text-sm text-white [.light_&]:text-slate-900 placeholder-white/30 [.light_&]:placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets((p) => ({
                              ...p,
                              [`${platform}_${field.key}`]: !p[`${platform}_${field.key}`],
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/30 [.light_&]:text-slate-400 hover:text-white/60 [.light_&]:hover:text-slate-600"
                        >
                          {showSecrets[`${platform}_${field.key}`] ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* pageId and personUrn as regular text fields */}
                  {platform === 'FACEBOOK' && (
                    <div>
                      <label className="block text-xs font-medium text-white/60 [.light_&]:text-slate-500 mb-1">Page ID</label>
                      <input
                        type="text"
                        value={getFieldValue(platform, 'pageId')}
                        onChange={(e) => setFieldValue(platform, 'pageId', e.target.value)}
                        placeholder={cred?.pageId || 'Your Facebook page ID'}
                        className="w-full bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-1.5 text-sm text-white [.light_&]:text-slate-900 placeholder-white/30 [.light_&]:placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Test result */}
                  {result && (
                    <p className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.message}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave(platform)}
                      disabled={saving[platform]}
                    >
                      {saving[platform] ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTest(platform)}
                      disabled={testing[platform]}
                    >
                      {testing[platform] ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>

                  {/* Setup guide */}
                  <div>
                    <button
                      onClick={() => setShowGuide((p) => ({ ...p, [platform]: !p[platform] }))}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {showGuide[platform] ? 'Hide' : 'Show'} setup guide
                    </button>
                    {showGuide[platform] && (
                      <p className="mt-1 text-xs text-white/40 [.light_&]:text-slate-500">{config.guide}</p>
                    )}
                  </div>
                </>
              )}

              {cred?.lastTestedAt && (
                <p className="text-xs text-white/30 [.light_&]:text-slate-400">
                  Last tested: {new Date(cred.lastTestedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
