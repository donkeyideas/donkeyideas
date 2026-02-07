'use client';

import { useState } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface Recommendation {
  id: string;
  summary: string;
  overallGrade: string;
  seoInsights: Array<{ title: string; description: string; priority: string; category: string }>;
  geoInsights: Array<{ title: string; description: string; priority: string; category: string }>;
  actionItems: Array<{ title: string; description: string; priority: string; effort: string; impact: string }>;
  createdAt: string;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-400 bg-red-500/10';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10';
    default: return 'text-blue-400 bg-blue-500/10';
  }
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400';
  if (grade.startsWith('B')) return 'text-blue-400';
  if (grade.startsWith('C')) return 'text-yellow-400';
  return 'text-red-400';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SeoGeoRecommendations({ recommendation, cached }: { recommendation: Recommendation | null; cached: boolean }) {
  const [data, setData] = useState<Recommendation | null>(recommendation);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('actionItems');

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/seo-geo/recommendations');
      setData(res.data.recommendation);
    } catch (err) {
      console.error('Failed to regenerate recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
        <CardContent className="p-6 text-center">
          <p className="text-white/60 [.light_&]:text-slate-500 mb-4">No AI recommendations generated yet.</p>
          <Button onClick={regenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate AI Insights'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { key: 'actionItems', label: 'Action Items', items: data.actionItems, count: data.actionItems?.length || 0 },
    { key: 'seoInsights', label: 'SEO Insights', items: data.seoInsights, count: data.seoInsights?.length || 0 },
    { key: 'geoInsights', label: 'GEO Insights', items: data.geoInsights, count: data.geoInsights?.length || 0 },
  ];

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/90 [.light_&]:text-slate-800">AI SEO & GEO Analysis</h3>
              <p className="text-xs text-white/40 [.light_&]:text-slate-400">
                {cached ? 'Cached' : 'Fresh'} · Generated {timeAgo(data.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold ${getGradeColor(data.overallGrade)}`}>{data.overallGrade}</span>
            <Button onClick={regenerate} disabled={loading} variant="secondary">
              {loading ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-white/70 [.light_&]:text-slate-600 mb-4 leading-relaxed">{data.summary}</p>

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {sections.map(({ key, label, items, count }) => (
            <div key={key} className="border border-white/10 [.light_&]:border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 [.light_&]:hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 [.light_&]:text-slate-400">{count}</span>
                  <span className="text-white/40">{expandedSection === key ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>
              {expandedSection === key && items && (
                <div className="px-3 pb-3 space-y-2">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded flex-shrink-0 ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                      <div>
                        <p className="font-medium text-white/80 [.light_&]:text-slate-700">{item.title}</p>
                        <p className="text-white/50 [.light_&]:text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
