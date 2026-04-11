'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface Recommendation {
  id: string;
  date: string;
  summary: string;
  pros: { title: string; description: string }[];
  cons: { title: string; description: string }[];
  recommendations: { title: string; description: string; priority: string }[];
  createdAt: string;
}

interface GPRecommendationsCardProps {
  companyId: string;
  apiBasePath?: string;
}

export function GPRecommendationsCard({ companyId, apiBasePath = '/play-store' }: GPRecommendationsCardProps) {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'pros' | 'cons' | 'actions'>('summary');

  useEffect(() => {
    loadRecommendation();
  }, [companyId]);

  const loadRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/companies/${companyId}${apiBasePath}/recommendations`);
      setRecommendation(response.data.recommendation || null);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to load recommendations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const response = await api.post(`/companies/${companyId}${apiBasePath}/recommendations`);
      setRecommendation(response.data.recommendation || null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            <span className="text-white/60 [.light_&]:text-slate-500 text-sm">Loading AI insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-white/60 [.light_&]:text-slate-500">{error}</span>
            </div>
            <Button variant="secondary" onClick={loadRecommendation} className="text-xs">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) return null;

  const tabs = [
    { key: 'summary' as const, label: 'Summary' },
    { key: 'pros' as const, label: `Strengths (${recommendation.pros?.length || 0})` },
    { key: 'cons' as const, label: `Issues (${recommendation.cons?.length || 0})` },
    { key: 'actions' as const, label: `Actions (${recommendation.recommendations?.length || 0})` },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <CardTitle>{apiBasePath === '/app-store' ? 'AI App Store Insights' : 'AI Play Store Insights'}</CardTitle>
          </div>
          <Button
            variant="secondary"
            onClick={regenerate}
            disabled={regenerating}
            className="text-xs"
          >
            {regenerating ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                Analyzing...
              </span>
            ) : (
              'Regenerate'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'summary' && (
          <p className="text-sm text-white/70 [.light_&]:text-slate-600 leading-relaxed">
            {recommendation.summary}
          </p>
        )}

        {activeTab === 'pros' && (
          <div className="space-y-3">
            {(recommendation.pros || []).map((pro, i) => (
              <div key={i} className="flex gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{pro.title}</p>
                  <p className="text-xs text-white/50 [.light_&]:text-slate-500 mt-0.5">{pro.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cons' && (
          <div className="space-y-3">
            {(recommendation.cons || []).map((con, i) => (
              <div key={i} className="flex gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{con.title}</p>
                  <p className="text-xs text-white/50 [.light_&]:text-slate-500 mt-0.5">{con.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-3">
            {(recommendation.recommendations || []).map((rec, i) => (
              <div key={i} className="flex gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${
                  rec.priority === 'high'
                    ? 'bg-red-500/10 text-red-400'
                    : rec.priority === 'medium'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {rec.priority?.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{rec.title}</p>
                  <p className="text-xs text-white/50 [.light_&]:text-slate-500 mt-0.5">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-white/20 [.light_&]:text-slate-400 mt-4">
          Generated {new Date(recommendation.createdAt).toLocaleString()} via DeepSeek
        </p>
      </CardContent>
    </Card>
  );
}
