'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { PLATFORMS, PlatformBadge } from './platform-badge';

const TONES = ['informative', 'engaging', 'promotional', 'controversial'] as const;

interface AutomationConfig {
  enabled: boolean;
  platforms: string[];
  cronHour: number;
  topicPool: string[];
  tone: string;
  requireApproval: boolean;
}

export function AutomationTab() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: false,
    platforms: [],
    cronHour: 9,
    topicPool: [],
    tone: 'engaging',
    requireApproval: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/social-posts/automation');
      const c = res.data.config;
      setConfig(c);
      setTopicInput((c.topicPool || []).join('\n'));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const topics = topicInput.split('\n').map((t) => t.trim()).filter(Boolean);
      await api.post('/social-posts/automation', {
        ...config,
        topicPool: topics,
      });
      alert('Automation settings saved!');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (p: string) => {
    setConfig((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-white/40 [.light_&]:text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Enable/Disable */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white [.light_&]:text-slate-900">Daily Auto-Generation</h3>
            <p className="text-sm text-white/50 [.light_&]:text-slate-500">
              Automatically generate social media posts on a daily schedule
            </p>
          </div>
          <button
            onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.enabled ? 'bg-blue-500' : 'bg-white/20 [.light_&]:bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Platforms */}
          <Card>
            <CardHeader><CardTitle>Platforms</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`transition-all ${
                    config.platforms.includes(p)
                      ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent rounded-full'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <PlatformBadge platform={p} size="md" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
            <CardContent>
              <label className="block text-sm text-white/70 [.light_&]:text-slate-600 mb-1">Generation Hour (UTC)</label>
              <select
                value={config.cronHour}
                onChange={(e) => setConfig((p) => ({ ...p, cronHour: parseInt(e.target.value) }))}
                className="bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md px-3 py-2 text-white [.light_&]:text-slate-900 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i} className="bg-slate-900">
                    {i.toString().padStart(2, '0')}:00 UTC
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Topic Pool */}
          <Card>
            <CardHeader><CardTitle>Topic Pool</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-white/50 [.light_&]:text-slate-500 mb-2">One topic per line. Topics will be rotated daily.</p>
              <textarea
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="AI in business consulting&#10;Startup growth strategies&#10;Digital transformation trends"
                className="w-full bg-white/5 [.light_&]:bg-white border border-white/10 [.light_&]:border-slate-300 rounded-md p-3 text-sm text-white [.light_&]:text-slate-900 placeholder-white/30 [.light_&]:placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                rows={5}
              />
            </CardContent>
          </Card>

          {/* Tone */}
          <Card>
            <CardHeader><CardTitle>Tone</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setConfig((p) => ({ ...p, tone: t }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                      config.tone === t
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-white/5 [.light_&]:bg-slate-100 text-white/50 [.light_&]:text-slate-500 border border-white/10 [.light_&]:border-slate-300 hover:text-white/80 [.light_&]:hover:text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval gate */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white [.light_&]:text-slate-900">Require Approval</h3>
                <p className="text-sm text-white/50 [.light_&]:text-slate-500">
                  Posts land as drafts for review before publishing
                </p>
              </div>
              <button
                onClick={() => setConfig((p) => ({ ...p, requireApproval: !p.requireApproval }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.requireApproval ? 'bg-blue-500' : 'bg-white/20 [.light_&]:bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    config.requireApproval ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Automation Settings'}
      </Button>
    </div>
  );
}
