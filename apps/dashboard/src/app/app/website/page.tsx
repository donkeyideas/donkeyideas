'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { EditContentModal } from '@/components/website/edit-content-modal';

interface WebsiteContent {
  id: string;
  section: string;
  content: any;
  published: boolean;
  updatedAt: string;
}

export default function WebsitePage() {
  const { currentCompany } = useAppStore();
  const [content, setContent] = useState<WebsiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ventures' | 'services' | 'process' | 'about' | 'privacy'>('home');
  const [editingSection, setEditingSection] = useState<{
    key: string;
    name: string;
    content?: any;
    published?: boolean;
  } | null>(null);
  const [settingsModal, setSettingsModal] = useState<'domain' | 'seo' | 'analytics' | null>(null);
  const [settings, setSettings] = useState<any>({
    domain: { customDomain: '', sslEnabled: false },
    seo: { title: '', description: '', keywords: '', ogImage: '' },
    analytics: { googleAnalyticsId: '', googleTagManagerId: '' },
  });

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/website/content');
      setContent(response.data.content || []);
    } catch (error) {
      console.error('Failed to load website content:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('website-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  const saveSettings = (key: 'domain' | 'seo' | 'analytics', data: any) => {
    const newSettings = { ...settings, [key]: data };
    setSettings(newSettings);
    localStorage.setItem('website-settings', JSON.stringify(newSettings));
    // In production, save to API
    setSettingsModal(null);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8 text-white [.light_&]:text-slate-900">Website Manager</h1>
        <div className="text-white/60 [.light_&]:text-slate-600">Loading website content...</div>
      </div>
    );
  }

  const homeSections = [
    { key: 'hero', name: 'Hero Section' },
    { key: 'stats', name: 'Stats Section' },
    { key: 'about', name: 'About / Philosophy Section' },
    { key: 'engage-excellence', name: 'Engage with Excellence Section' },
  ];

  const pageSections = {
    ventures: [
      { key: 'ventures-page', name: 'Ventures Page' },
    ],
    services: [
      { key: 'services-page', name: 'Services Page' },
    ],
    process: [
      { key: 'process-page', name: 'Process Page' },
    ],
    about: [
      { key: 'about-page', name: 'About Page' },
    ],
    privacy: [
      { key: 'privacy-page', name: 'Privacy Policy' },
    ],
  };

  const getSectionsForTab = () => {
    if (activeTab === 'home') return homeSections;
    return pageSections[activeTab] || [];
  };

  // Merge sections with content from database
  const sectionsWithContent = getSectionsForTab().map((section) => {
    const existing = content.find((c) => c.section === section.key);
    return {
      ...section,
      id: existing?.id,
      content: existing?.content,
      published: existing?.published ?? false,
      updatedAt: existing?.updatedAt,
    };
  });

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Website Manager</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Manage content for your public marketing website
          </p>
        </div>
        <Link href="/home" target="_blank">
          <Button variant="primary">Preview Website</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-white/10 [.light_&]:border-slate-300">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'home'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Home Page
          </button>
          <button
            onClick={() => setActiveTab('ventures')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'ventures'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Ventures Page
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'services'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Services Page
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'process'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Process Page
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'about'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            About Page
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'border-b-2 border-blue-500 text-blue-400 [.light_&]:text-blue-600'
                : 'text-white/60 hover:text-white [.light_&]:text-slate-600 [.light_&]:hover:text-slate-900'
            }`}
          >
            Privacy Page
          </button>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'home' ? 'Home Page' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Page`} Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 [.light_&]:text-slate-600 mb-4">
              Edit the content for each section of your {activeTab === 'home' ? 'home' : activeTab} page. Changes
              are saved automatically.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectionsWithContent.map((section) => (
          <Card key={section.key} className="hover:border-blue-500 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold mb-1">{section.name}</div>
                  <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">
                    {section.key}
                  </div>
                  {section.updatedAt && (
                    <div className="text-xs text-white/40 [.light_&]:text-slate-500">
                      Updated: {new Date(section.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {section.published ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                      Published
                    </span>
                  ) : section.id ? (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                      Draft
                    </span>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingSection({
                        key: section.key,
                        name: section.name,
                        content: section.content,
                        published: section.published,
                      });
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Website Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Custom Domain</div>
                  <div className="text-sm text-white/60">
                    Connect your custom domain
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setSettingsModal('domain')}>
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">SEO Settings</div>
                  <div className="text-sm text-white/60">
                    Meta tags and SEO configuration
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setSettingsModal('seo')}>
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Analytics</div>
                  <div className="text-sm text-white/60">
                    Google Analytics and tracking
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setSettingsModal('analytics')}>
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {editingSection && (
        <EditContentModal
          isOpen={!!editingSection}
          onClose={() => setEditingSection(null)}
          section={editingSection}
          onSave={() => {
            loadContent();
          }}
        />
      )}

      {settingsModal === 'domain' && (
        <SettingsModal
          title="Custom Domain Settings"
          onClose={() => setSettingsModal(null)}
          onSave={(data) => saveSettings('domain', data)}
          initialData={settings.domain}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Custom Domain</label>
              <input
                type="text"
                defaultValue={settings.domain.customDomain}
                id="custom-domain-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="example.com"
              />
              <p className="text-xs text-white/60 mt-2">
                Enter your custom domain (without http:// or https://)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={settings.domain.sslEnabled}
                id="ssl-enabled-input"
                className="w-4 h-4"
              />
              <label htmlFor="ssl-enabled-input" className="text-sm">
                Enable SSL/HTTPS
              </label>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-400">
              <strong>Note:</strong> After configuring your domain, you&apos;ll need to update your DNS records to point to our servers. Instructions will be provided after saving.
            </div>
          </div>
        </SettingsModal>
      )}

      {settingsModal === 'seo' && (
        <SettingsModal
          title="SEO Settings"
          onClose={() => setSettingsModal(null)}
          onSave={(data) => saveSettings('seo', data)}
          initialData={settings.seo}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Page Title</label>
              <input
                type="text"
                defaultValue={settings.seo.title}
                id="seo-title-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="Donkey Ideas - Innovation Laboratory"
              />
              <p className="text-xs text-white/60 mt-2">
                The title that appears in browser tabs and search results (50-60 characters recommended)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Meta Description</label>
              <textarea
                defaultValue={settings.seo.description}
                id="seo-description-input"
                rows={3}
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="Transform unconventional ideas into intelligent systems..."
              />
              <p className="text-xs text-white/60 mt-2">
                A brief description of your website (150-160 characters recommended)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Keywords</label>
              <input
                type="text"
                defaultValue={settings.seo.keywords}
                id="seo-keywords-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="innovation, AI, venture builder, startup"
              />
              <p className="text-xs text-white/60 mt-2">
                Comma-separated keywords relevant to your business
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Open Graph Image URL</label>
              <input
                type="text"
                defaultValue={settings.seo.ogImage}
                id="seo-og-image-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="https://example.com/og-image.jpg"
              />
              <p className="text-xs text-white/60 mt-2">
                Image URL for social media sharing (1200x630px recommended)
              </p>
            </div>
          </div>
        </SettingsModal>
      )}

      {settingsModal === 'analytics' && (
        <SettingsModal
          title="Analytics Settings"
          onClose={() => setSettingsModal(null)}
          onSave={(data) => saveSettings('analytics', data)}
          initialData={settings.analytics}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Google Analytics ID</label>
              <input
                type="text"
                defaultValue={settings.analytics.googleAnalyticsId}
                id="ga-id-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
              />
              <p className="text-xs text-white/60 mt-2">
                Your Google Analytics Measurement ID (GA4) or Universal Analytics ID
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Google Tag Manager ID</label>
              <input
                type="text"
                defaultValue={settings.analytics.googleTagManagerId}
                id="gtm-id-input"
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="GTM-XXXXXXX"
              />
              <p className="text-xs text-white/60 mt-2">
                Your Google Tag Manager Container ID (optional)
              </p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-400">
              <strong>Note:</strong> Analytics tracking will be enabled after saving. Make sure your IDs are correct.
            </div>
          </div>
        </SettingsModal>
      )}
    </div>
  );
}

function SettingsModal({
  title,
  onClose,
  onSave,
  initialData,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData: any;
  children: React.ReactNode;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data: any = {};

    // Collect all input values by ID
    const customDomainInput = document.getElementById('custom-domain-input') as HTMLInputElement;
    const sslEnabledInput = document.getElementById('ssl-enabled-input') as HTMLInputElement;
    const seoTitleInput = document.getElementById('seo-title-input') as HTMLInputElement;
    const seoDescriptionInput = document.getElementById('seo-description-input') as HTMLTextAreaElement;
    const seoKeywordsInput = document.getElementById('seo-keywords-input') as HTMLInputElement;
    const seoOgImageInput = document.getElementById('seo-og-image-input') as HTMLInputElement;
    const gaIdInput = document.getElementById('ga-id-input') as HTMLInputElement;
    const gtmIdInput = document.getElementById('gtm-id-input') as HTMLInputElement;

    // Map to proper keys based on modal type
    if (title.includes('Domain')) {
      onSave({
        customDomain: customDomainInput?.value || '',
        sslEnabled: sslEnabledInput?.checked || false,
      });
    } else if (title.includes('SEO')) {
      onSave({
        title: seoTitleInput?.value || '',
        description: seoDescriptionInput?.value || '',
        keywords: seoKeywordsInput?.value || '',
        ogImage: seoOgImageInput?.value || '',
      });
    } else if (title.includes('Analytics')) {
      onSave({
        googleAnalyticsId: gaIdInput?.value || '',
        googleTagManagerId: gtmIdInput?.value || '',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-white/60 text-sm mt-1">Configure your website settings</p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">{children}</div>

          <div className="p-6 border-t border-white/10 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
