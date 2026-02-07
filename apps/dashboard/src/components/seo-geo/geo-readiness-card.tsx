'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface GeoCategory {
  score: number;
  checks: Array<{ label: string; passed: boolean; detail?: string }>;
  issues: string[];
}

interface GeoAudit {
  overallScore: number;
  structuredData: GeoCategory;
  llmAccessibility: GeoCategory;
  contentQuality: GeoCategory;
  technicalSignals: GeoCategory;
  recommendations: Array<{
    title: string;
    description: string;
    priority: string;
    effort: string;
    category: string;
  }>;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-blue-500/20 text-blue-400';
  }
}

function CategoryCard({ title, category }: { title: string; category: GeoCategory }) {
  return (
    <div className="border border-white/10 [.light_&]:border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{title}</h4>
        <span className={`text-lg font-bold ${getScoreColor(category.score)}`}>{category.score}</span>
      </div>
      <div className="h-1.5 bg-white/5 [.light_&]:bg-slate-100 rounded-full mb-3 overflow-hidden">
        <div className={`h-full rounded-full ${getScoreBg(category.score)}`} style={{ width: `${category.score}%` }} />
      </div>
      <div className="space-y-2">
        {category.checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-xs">
            <span className={check.passed ? 'text-green-400' : 'text-red-400'}>{check.passed ? '\u2713' : '\u2717'}</span>
            <span className="text-white/60 [.light_&]:text-slate-500">{check.label}</span>
            {check.detail && <span className="text-white/30 [.light_&]:text-slate-400 ml-auto">{check.detail}</span>}
          </div>
        ))}
      </div>
      {category.issues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 [.light_&]:border-slate-100">
          {category.issues.map((issue, idx) => (
            <p key={idx} className="text-xs text-yellow-400/80 mb-1">{issue}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeoReadinessCard({ audit }: { audit: GeoAudit | null }) {
  if (!audit) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-white/40 [.light_&]:text-slate-400">No GEO audit data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">GEO Readiness</CardTitle>
            <span className={`text-2xl font-bold ${getScoreColor(audit.overallScore)}`}>{audit.overallScore}/100</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryCard title="Structured Data" category={audit.structuredData} />
            <CategoryCard title="LLM Accessibility" category={audit.llmAccessibility} />
            <CategoryCard title="Content Quality" category={audit.contentQuality} />
            <CategoryCard title="Technical Signals" category={audit.technicalSignals} />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {audit.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">GEO Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.recommendations.map((rec, idx) => (
                <div key={idx} className="border border-white/10 [.light_&]:border-slate-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium text-white/90 [.light_&]:text-slate-800">{rec.title}</h4>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityBadge(rec.priority)}`}>{rec.priority}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 [.light_&]:bg-slate-100 text-white/50 [.light_&]:text-slate-500">{rec.effort}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/50 [.light_&]:text-slate-500">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
