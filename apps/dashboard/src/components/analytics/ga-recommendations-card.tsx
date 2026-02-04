'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface RecommendationItem {
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

interface RecommendationData {
  id: string;
  date: string;
  summary: string;
  pros: RecommendationItem[];
  cons: RecommendationItem[];
  recommendations: RecommendationItem[];
  createdAt: string;
}

interface GARecommendationsCardProps {
  companyId: string;
}

export function GARecommendationsCard({ companyId }: GARecommendationsCardProps) {
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchRecommendations();
    }
  }, [companyId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/companies/${companyId}/analytics/recommendations`);
      if (response.data.recommendation) {
        setRecommendation(response.data.recommendation);
      }
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
      setError(err.response?.data?.error?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);

    try {
      const response = await api.post(`/companies/${companyId}/analytics/recommendations`);
      if (response.data.recommendation) {
        setRecommendation(response.data.recommendation);
      }
    } catch (err: any) {
      console.error('Failed to regenerate recommendations:', err);
      setError(err.response?.data?.error?.message || 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
            <span className="text-white/60 [.light_&]:text-slate-500">
              Analyzing your analytics data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !recommendation) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white/60 [.light_&]:text-slate-500 text-sm mb-3">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchRecommendations}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return null;
  }

  const quickStats = `${recommendation.pros?.length || 0} strengths | ${recommendation.cons?.length || 0} improvements | ${recommendation.recommendations?.length || 0} actions`;

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <CardTitle className="text-lg">AI Recommendations</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 [.light_&]:text-slate-400">
              {formatTimeAgo(recommendation.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs"
            >
              {regenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <p className="text-sm text-white/70 [.light_&]:text-slate-600 mb-3">
          {recommendation.summary}
        </p>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs text-white/50 [.light_&]:text-slate-500">{quickStats}</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {expanded ? 'Hide Details' : 'View Details'}
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t border-white/10 [.light_&]:border-slate-200">
            {/* Pros */}
            {recommendation.pros && recommendation.pros.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Strengths
                </h4>
                <div className="space-y-2">
                  {recommendation.pros.map((pro, idx) => (
                    <div
                      key={idx}
                      className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-green-300 [.light_&]:text-green-700">
                        {pro.title}
                      </p>
                      <p className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
                        {pro.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cons */}
            {recommendation.cons && recommendation.cons.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {recommendation.cons.map((con, idx) => (
                    <div
                      key={idx}
                      className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-yellow-300 [.light_&]:text-yellow-700">
                        {con.title}
                      </p>
                      <p className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
                        {con.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendation.recommendations && recommendation.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Action Items
                </h4>
                <div className="space-y-2">
                  {recommendation.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-purple-300 [.light_&]:text-purple-700">
                          {rec.title}
                        </p>
                        {rec.priority && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                              rec.priority
                            )}`}
                          >
                            {rec.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
