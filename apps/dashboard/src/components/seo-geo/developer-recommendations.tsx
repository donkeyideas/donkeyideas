'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';

interface DevRecommendationsProps {
  seoAudit: any;
  geoAudit: any;
  pageSpeed: any;
  recommendations: any;
}

interface DevIssue {
  source: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  page?: string;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function getPriorityStyle(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}

function getSourceStyle(source: string): string {
  switch (source) {
    case 'SEO Audit': return 'bg-emerald-500/20 text-emerald-400';
    case 'GEO Readiness': return 'bg-purple-500/20 text-purple-400';
    case 'Web Vitals': return 'bg-cyan-500/20 text-cyan-400';
    case 'AI Analysis': return 'bg-pink-500/20 text-pink-400';
    default: return 'bg-white/10 text-white/60';
  }
}

function collectIssues(seoAudit: any, geoAudit: any, pageSpeed: any, recommendations: any): DevIssue[] {
  const issues: DevIssue[] = [];

  // SEO Audit issues
  if (seoAudit?.pages) {
    for (const page of seoAudit.pages) {
      const displayUrl = page.url?.replace(/^https?:\/\/[^/]+/, '') || '/';
      for (const issue of page.issues || []) {
        issues.push({
          source: 'SEO Audit',
          priority: issue.type === 'error' ? 'high' : issue.type === 'warning' ? 'medium' : 'low',
          title: issue.message,
          description: issue.element ? `Element: ${issue.element}` : '',
          page: displayUrl,
        });
      }
    }
  }

  // SEO Audit common issues
  if (seoAudit?.commonIssues) {
    for (const issue of seoAudit.commonIssues) {
      issues.push({
        source: 'SEO Audit',
        priority: 'high',
        title: `Common issue across 3+ pages: ${issue}`,
        description: 'This issue appears on multiple pages and should be addressed site-wide.',
      });
    }
  }

  // GEO Readiness issues
  if (geoAudit) {
    const categories = ['structuredData', 'llmAccessibility', 'contentQuality', 'technicalSignals'];
    const categoryLabels: Record<string, string> = {
      structuredData: 'Structured Data',
      llmAccessibility: 'LLM Accessibility',
      contentQuality: 'Content Quality',
      technicalSignals: 'Technical Signals',
    };

    for (const cat of categories) {
      const category = geoAudit[cat];
      if (!category) continue;

      // Failed checks
      for (const check of category.checks || []) {
        if (!check.passed) {
          issues.push({
            source: 'GEO Readiness',
            priority: category.score < 50 ? 'high' : 'medium',
            title: `[${categoryLabels[cat]}] ${check.label}`,
            description: check.detail || 'Check failed - needs attention.',
          });
        }
      }

      // Category issues
      for (const issue of category.issues || []) {
        issues.push({
          source: 'GEO Readiness',
          priority: 'medium',
          title: `[${categoryLabels[cat]}] ${issue}`,
          description: '',
        });
      }
    }

    // GEO recommendations
    for (const rec of geoAudit.recommendations || []) {
      issues.push({
        source: 'GEO Readiness',
        priority: rec.priority || 'medium',
        title: rec.title,
        description: `${rec.description}${rec.effort ? ` (Effort: ${rec.effort})` : ''}`,
      });
    }
  }

  // Web Vitals / PageSpeed diagnostics
  if (pageSpeed?.mobile?.diagnostics) {
    for (const d of pageSpeed.mobile.diagnostics) {
      issues.push({
        source: 'Web Vitals',
        priority: 'medium',
        title: d.title,
        description: `${d.description || ''}${d.displayValue ? ` (${d.displayValue})` : ''}`.trim(),
      });
    }
  }

  // Core Web Vitals failures
  if (pageSpeed?.mobile?.coreWebVitals) {
    const cwv = pageSpeed.mobile.coreWebVitals;
    const checks = [
      { metric: 'LCP', value: cwv.lcp, threshold: 2500, unit: 'ms' },
      { metric: 'FID', value: cwv.fid, threshold: 100, unit: 'ms' },
      { metric: 'CLS', value: cwv.cls, threshold: 0.1, unit: '' },
      { metric: 'FCP', value: cwv.fcp, threshold: 1800, unit: 'ms' },
      { metric: 'TTFB', value: cwv.ttfb, threshold: 800, unit: 'ms' },
    ];
    for (const c of checks) {
      if (c.value != null && c.value > c.threshold) {
        issues.push({
          source: 'Web Vitals',
          priority: 'high',
          title: `${c.metric} exceeds threshold: ${c.value}${c.unit} (threshold: ${c.threshold}${c.unit})`,
          description: `Core Web Vital ${c.metric} is failing. This affects search ranking and user experience.`,
        });
      }
    }
  }

  // AI Analysis action items
  const rec = recommendations?.recommendation || recommendations;
  if (rec) {
    for (const item of rec.actionItems || []) {
      issues.push({
        source: 'AI Analysis',
        priority: item.priority || 'medium',
        title: item.title,
        description: `${item.description}${item.effort ? ` (Effort: ${item.effort}, Impact: ${item.impact})` : ''}`,
      });
    }
    for (const item of rec.seoInsights || []) {
      issues.push({
        source: 'AI Analysis',
        priority: item.priority || 'medium',
        title: `[SEO] ${item.title}`,
        description: item.description,
      });
    }
    for (const item of rec.geoInsights || []) {
      issues.push({
        source: 'AI Analysis',
        priority: item.priority || 'medium',
        title: `[GEO] ${item.title}`,
        description: item.description,
      });
    }
  }

  // Sort by priority
  issues.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));

  return issues;
}

function generateCopyText(issues: DevIssue[], filterSource: string | null): string {
  const filtered = filterSource ? issues.filter(i => i.source === filterSource) : issues;
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push(`DONKEY IDEAS - SEO & GEO RECOMMENDATIONS`);
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`Total Issues: ${filtered.length}`);
  lines.push('='.repeat(60));
  lines.push('');

  // Group by source
  const grouped: Record<string, DevIssue[]> = {};
  for (const issue of filtered) {
    if (!grouped[issue.source]) grouped[issue.source] = [];
    grouped[issue.source].push(issue);
  }

  for (const [source, items] of Object.entries(grouped)) {
    lines.push(`## ${source} (${items.length} issues)`);
    lines.push('-'.repeat(40));
    lines.push('');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      lines.push(`${i + 1}. [${item.priority.toUpperCase()}] ${item.title}`);
      if (item.page) lines.push(`   Page: ${item.page}`);
      if (item.description) lines.push(`   ${item.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function DeveloperRecommendations({ seoAudit, geoAudit, pageSpeed, recommendations }: DevRecommendationsProps) {
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const allIssues = useMemo(
    () => collectIssues(seoAudit, geoAudit, pageSpeed, recommendations),
    [seoAudit, geoAudit, pageSpeed, recommendations]
  );

  const filteredIssues = useMemo(() => {
    let result = allIssues;
    if (filterSource) result = result.filter(i => i.source === filterSource);
    if (filterPriority) result = result.filter(i => i.priority === filterPriority);
    return result;
  }, [allIssues, filterSource, filterPriority]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of allIssues) {
      counts[issue.source] = (counts[issue.source] || 0) + 1;
    }
    return counts;
  }, [allIssues]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of allIssues) {
      counts[issue.priority] = (counts[issue.priority] || 0) + 1;
    }
    return counts;
  }, [allIssues]);

  const handleCopy = async () => {
    const text = generateCopyText(filteredIssues, null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (allIssues.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white/70 [.light_&]:text-slate-600 font-medium">No issues found</p>
          <p className="text-white/40 [.light_&]:text-slate-400 text-sm mt-1">Run an audit from the Overview tab to generate recommendations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with copy button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white/90 [.light_&]:text-slate-800">
                Developer Action Items
              </h3>
              <p className="text-xs text-white/40 [.light_&]:text-slate-400 mt-0.5">
                {allIssues.length} total issues aggregated from all audits. Copy and share with your development team.
              </p>
            </div>
            <Button onClick={handleCopy} variant="secondary">
              {copied ? 'Copied!' : 'Copy All to Clipboard'}
            </Button>
          </div>

          {/* Priority summary */}
          <div className="flex flex-wrap gap-2 mt-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((p) => {
              const count = priorityCounts[p] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={p}
                  onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    filterPriority === p
                      ? getPriorityStyle(p) + ' ring-1 ring-white/20'
                      : 'border-white/10 [.light_&]:border-slate-200 text-white/50 [.light_&]:text-slate-500 hover:border-white/20'
                  }`}
                >
                  {count} {p}
                </button>
              );
            })}
          </div>

          {/* Source filters */}
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(sourceCounts).map(([source, count]) => (
              <button
                key={source}
                onClick={() => setFilterSource(filterSource === source ? null : source)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filterSource === source
                    ? getSourceStyle(source) + ' ring-1 ring-white/20'
                    : 'border-white/10 [.light_&]:border-slate-200 text-white/50 [.light_&]:text-slate-500 hover:border-white/20'
                }`}
              >
                {source} ({count})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filterSource || filterPriority
                ? `Filtered Issues (${filteredIssues.length})`
                : `All Issues (${filteredIssues.length})`}
            </CardTitle>
            {(filterSource || filterPriority) && (
              <button
                onClick={() => { setFilterSource(null); setFilterPriority(null); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredIssues.map((issue, idx) => (
              <div
                key={idx}
                className="border border-white/10 [.light_&]:border-slate-200 rounded-lg p-3 hover:bg-white/[0.02] [.light_&]:hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-white/20 [.light_&]:text-slate-300 text-xs font-mono min-w-[24px] pt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityStyle(issue.priority)}`}>
                        {issue.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getSourceStyle(issue.source)}`}>
                        {issue.source}
                      </span>
                      {issue.page && (
                        <span className="text-xs text-white/30 [.light_&]:text-slate-400 font-mono">
                          {issue.page}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/80 [.light_&]:text-slate-700 font-medium">{issue.title}</p>
                    {issue.description && (
                      <p className="text-xs text-white/40 [.light_&]:text-slate-500 mt-1 leading-relaxed">
                        {issue.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
