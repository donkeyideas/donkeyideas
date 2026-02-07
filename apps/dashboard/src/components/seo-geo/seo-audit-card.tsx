'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface PageAudit {
  url: string;
  title: { value: string; length: number; hasIssue: boolean; issue?: string };
  metaDescription: { value: string; length: number; hasIssue: boolean; issue?: string };
  h1: { count: number; values: string[]; hasIssue: boolean; issue?: string };
  images: { total: number; withoutAlt: number; hasIssue: boolean };
  ogTags: { title: boolean; description: boolean; image: boolean };
  structuredData: { found: boolean; types: string[] };
  wordCount: number;
  score: number;
  issues: Array<{ type: string; message: string; element?: string }>;
}

interface SiteAudit {
  pages: PageAudit[];
  overallScore: number;
  totalIssues: { errors: number; warnings: number; info: number };
  commonIssues: string[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function IssueTag({ type }: { type: string }) {
  const styles: Record<string, string> = {
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/20 text-blue-400',
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${styles[type] || styles.info}`}>{type}</span>;
}

export function SeoAuditCard({ audit }: { audit: SiteAudit | null }) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  if (!audit) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-white/40 [.light_&]:text-slate-400">No audit data available. Run an audit to see results.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">SEO Audit Results</CardTitle>
            <span className={`text-2xl font-bold ${getScoreColor(audit.overallScore)}`}>{audit.overallScore}/100</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-white/70 [.light_&]:text-slate-600">{audit.totalIssues.errors} Errors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-white/70 [.light_&]:text-slate-600">{audit.totalIssues.warnings} Warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-white/70 [.light_&]:text-slate-600">{audit.totalIssues.info} Info</span>
            </div>
          </div>

          {audit.commonIssues.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-white/50 [.light_&]:text-slate-500 mb-2">Common Issues (3+ pages):</p>
              <div className="flex flex-wrap gap-2">
                {audit.commonIssues.map((issue) => (
                  <span key={issue} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">{issue}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-page results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Page-by-Page Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {audit.pages.map((page) => {
              const displayUrl = page.url.replace(/^https?:\/\/[^/]+/, '') || '/';
              const isExpanded = expandedPage === page.url;

              return (
                <div key={page.url} className="border border-white/10 [.light_&]:border-slate-200 rounded-lg">
                  <button
                    onClick={() => setExpandedPage(isExpanded ? null : page.url)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 [.light_&]:hover:bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${getScoreColor(page.score)}`}>{page.score}</span>
                      <span className="text-sm text-white/80 [.light_&]:text-slate-700">{displayUrl}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40 [.light_&]:text-slate-400">{page.issues.length} issues</span>
                      <span className="text-white/40">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-white/5 [.light_&]:border-slate-100 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-white/40 [.light_&]:text-slate-400">Title</p>
                          <p className={`text-xs ${page.title.hasIssue ? 'text-yellow-400' : 'text-green-400'}`}>
                            {page.title.hasIssue ? page.title.issue : `${page.title.length} chars`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40 [.light_&]:text-slate-400">Meta Description</p>
                          <p className={`text-xs ${page.metaDescription.hasIssue ? 'text-yellow-400' : 'text-green-400'}`}>
                            {page.metaDescription.hasIssue ? page.metaDescription.issue : `${page.metaDescription.length} chars`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40 [.light_&]:text-slate-400">Word Count</p>
                          <p className="text-xs text-white/70 [.light_&]:text-slate-600">{page.wordCount} words</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40 [.light_&]:text-slate-400">Structured Data</p>
                          <p className={`text-xs ${page.structuredData.found ? 'text-green-400' : 'text-red-400'}`}>
                            {page.structuredData.found ? page.structuredData.types.join(', ') : 'None found'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {page.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <IssueTag type={issue.type} />
                            <span className="text-white/60 [.light_&]:text-slate-500">{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
