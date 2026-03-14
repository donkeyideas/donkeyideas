'use client';

import { useState } from 'react';
import {
  PostGeneratorTab,
  PostQueueTab,
  PostPublishedTab,
  AutomationTab,
  ConnectionsTab,
} from '@/components/social-posts';

type TabId = 'generator' | 'queue' | 'published' | 'automation' | 'connections';

const TABS: { id: TabId; label: string }[] = [
  { id: 'generator', label: 'Generator' },
  { id: 'queue', label: 'Queue' },
  { id: 'published', label: 'Published' },
  { id: 'automation', label: 'Automation' },
  { id: 'connections', label: 'Connections' },
];

export default function SocialPostsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('generator');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white [.light_&]:text-slate-900 mb-2">Social Media Posts</h1>
        <p className="text-white/60 [.light_&]:text-slate-600">
          Generate, manage, schedule, and publish social media posts across multiple platforms
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1 overflow-x-auto mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : 'text-white/50 [.light_&]:text-slate-500 hover:text-white/80 [.light_&]:hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'generator' && <PostGeneratorTab />}
      {activeTab === 'queue' && <PostQueueTab />}
      {activeTab === 'published' && <PostPublishedTab />}
      {activeTab === 'automation' && <AutomationTab />}
      {activeTab === 'connections' && <ConnectionsTab />}
    </div>
  );
}
