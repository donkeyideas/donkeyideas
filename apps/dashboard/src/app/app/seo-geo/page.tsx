'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import {
  SeoGeoKPICards,
  ScoreGauge,
  SearchPerformanceChart,
  PositionTrendChart,
  KeywordTable,
  TopPagesTable,
  CoreWebVitalsCard,
  LighthouseScores,
  SeoAuditCard,
  GeoReadinessCard,
  SeoGeoRecommendations,
  DeveloperRecommendations,
} from '@/components/seo-geo';

type DateRange = '7d' | '30d' | '90d';
type TabId = 'overview' | 'search-console' | 'web-vitals' | 'seo-audit' | 'geo-readiness' | 'recommendations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'search-console', label: 'Search Console' },
  { id: 'web-vitals', label: 'Web Vitals' },
  { id: 'seo-audit', label: 'SEO Audit' },
  { id: 'geo-readiness', label: 'GEO Readiness' },
  { id: 'recommendations', label: 'Recommendations' },
];

export default function SeoGeoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/seo-geo?dateRange=${dateRange}`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to load SEO/GEO data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load SEO/GEO data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setRecsLoading(true);
    try {
      const response = await api.get('/seo-geo/recommendations');
      setRecommendations(response.data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'recommendations') && !recommendations) {
      loadRecommendations();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-white/50 [.light_&]:text-slate-500 text-sm">Analyzing SEO & GEO performance...</p>
          <p className="text-white/30 [.light_&]:text-slate-400 text-xs mt-1">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={loadData}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gscData = data?.searchConsole?.data;
  const pageSpeed = data?.pageSpeed;
  const seoAudit = data?.seoAudit;
  const geoAudit = data?.geoAudit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white [.light_&]:text-slate-900">SEO & GEO Analytics</h1>
          <p className="text-white/60 [.light_&]:text-slate-500 mt-1">
            Search Engine & Generative Engine Optimization for donkeyideas.com
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-blue-500/20 text-blue-400 font-medium'
                    : 'text-white/50 [.light_&]:text-slate-500 hover:text-white/80 [.light_&]:hover:text-slate-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button onClick={() => { loadData(); setRecommendations(null); }} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1 overflow-x-auto">
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

      {/* GSC connection warning */}
      {!gscData && data?.searchConsole?.error && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-yellow-400 text-lg">&#9888;</span>
            <div>
              <p className="text-sm text-yellow-400 font-medium">Google Search Console not connected</p>
              <p className="text-xs text-white/50 [.light_&]:text-slate-500">{data.searchConsole.error}. Add the service account to GSC for keyword ranking data.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreGauge label="SEO Score" score={pageSpeed?.mobile?.lighthouseScores?.seoScore || data?.snapshot?.seoScore || 0} subtitle="Lighthouse" />
            <ScoreGauge label="GEO Score" score={geoAudit?.overallScore || data?.snapshot?.geoScore || 0} subtitle="AI Readiness" />
            <ScoreGauge label="Performance" score={pageSpeed?.mobile?.lighthouseScores?.performanceScore || data?.snapshot?.performanceScore || 0} subtitle="Lighthouse" />
            <ScoreGauge label="SEO Audit" score={seoAudit?.overallScore || data?.snapshot?.seoAuditScore || 0} subtitle="On-page" />
          </div>

          {/* KPI Cards */}
          {gscData && (
            <SeoGeoKPICards data={{
              totalClicks: gscData.overview.totalClicks,
              totalImpressions: gscData.overview.totalImpressions,
              avgCtr: gscData.overview.avgCtr,
              avgPosition: gscData.overview.avgPosition,
              seoScore: pageSpeed?.mobile?.lighthouseScores?.seoScore,
              geoScore: geoAudit?.overallScore,
              performanceScore: pageSpeed?.mobile?.lighthouseScores?.performanceScore,
              issuesFound: seoAudit?.totalIssues ? seoAudit.totalIssues.errors + seoAudit.totalIssues.warnings : undefined,
            }} />
          )}

          {/* AI Recommendations */}
          {recsLoading ? (
            <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto mb-3" />
                <p className="text-white/50 [.light_&]:text-slate-500 text-sm">Loading AI recommendations...</p>
              </CardContent>
            </Card>
          ) : (
            <SeoGeoRecommendations recommendation={recommendations?.recommendation || null} cached={recommendations?.cached || false} />
          )}

          {/* Summary Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gscData?.overTime && gscData.overTime.length > 0 && (
              <SearchPerformanceChart data={gscData.overTime} title="Search Performance" />
            )}
            {gscData?.overTime && gscData.overTime.length > 0 && (
              <PositionTrendChart data={gscData.overTime} title="Position Trend" />
            )}
          </div>

          {/* Quick Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gscData?.topKeywords && <KeywordTable keywords={gscData.topKeywords.slice(0, 5)} title="Top Keywords" />}
            {gscData?.topPages && <TopPagesTable pages={gscData.topPages.slice(0, 5)} title="Top Pages" />}
          </div>
        </div>
      )}

      {/* ==================== SEARCH CONSOLE TAB ==================== */}
      {activeTab === 'search-console' && (
        <div className="space-y-6">
          {gscData ? (
            <>
              <SeoGeoKPICards data={{
                totalClicks: gscData.overview.totalClicks,
                totalImpressions: gscData.overview.totalImpressions,
                avgCtr: gscData.overview.avgCtr,
                avgPosition: gscData.overview.avgPosition,
              }} />

              {gscData.overTime?.length > 0 && (
                <SearchPerformanceChart data={gscData.overTime} title="Search Performance Over Time" />
              )}

              <KeywordTable keywords={gscData.topKeywords || []} title="All Keywords" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopPagesTable pages={gscData.topPages || []} title="Pages by Search Performance" />

                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-white/90 [.light_&]:text-slate-800">Device Breakdown</h3>
                    <div className="space-y-3">
                      {(gscData.devices || []).map((device: any) => {
                        const total = gscData.devices.reduce((s: number, d: any) => s + d.clicks, 0) || 1;
                        const pct = Math.round((device.clicks / total) * 100);
                        return (
                          <div key={device.device}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-white/70 [.light_&]:text-slate-600 capitalize">{device.device}</span>
                              <span className="text-white/50 [.light_&]:text-slate-400">{device.clicks} clicks ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-white/5 [.light_&]:bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <h3 className="text-lg font-semibold mb-4 mt-6 text-white/90 [.light_&]:text-slate-800">Top Countries</h3>
                    <div className="space-y-2">
                      {(gscData.countries || []).slice(0, 10).map((country: any) => (
                        <div key={country.country} className="flex justify-between text-sm">
                          <span className="text-white/70 [.light_&]:text-slate-600">{country.country}</span>
                          <span className="text-white/50 [.light_&]:text-slate-400">{country.clicks} clicks / {country.impressions.toLocaleString()} imp.</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-white/60 [.light_&]:text-slate-500 mb-2">Google Search Console is not connected yet.</p>
                <p className="text-white/40 [.light_&]:text-slate-400 text-sm">Add the service account ({process.env.NEXT_PUBLIC_GA_SERVICE_EMAIL || 'GA service account'}) as a user in Google Search Console.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== WEB VITALS TAB ==================== */}
      {activeTab === 'web-vitals' && (
        <div className="space-y-6">
          {pageSpeed?.mobile ? (
            <>
              <LighthouseScores
                performanceScore={pageSpeed.mobile.lighthouseScores.performanceScore}
                seoScore={pageSpeed.mobile.lighthouseScores.seoScore}
                accessibilityScore={pageSpeed.mobile.lighthouseScores.accessibilityScore}
                bestPracticesScore={pageSpeed.mobile.lighthouseScores.bestPracticesScore || 0}
              />

              <CoreWebVitalsCard
                mobile={pageSpeed.mobile.coreWebVitals}
                desktop={pageSpeed.desktop?.coreWebVitals}
              />

              {pageSpeed.mobile.diagnostics?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-white/90 [.light_&]:text-slate-800">Diagnostics</h3>
                    <div className="space-y-3">
                      {pageSpeed.mobile.diagnostics.map((d: any) => (
                        <div key={d.id} className="border border-white/10 [.light_&]:border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white/80 [.light_&]:text-slate-700">{d.title}</span>
                            {d.displayValue && (
                              <span className="text-xs text-yellow-400">{d.displayValue}</span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 [.light_&]:text-slate-400 line-clamp-2">{d.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-white/60 [.light_&]:text-slate-500">Web Vitals data is not available yet. Click Refresh to fetch.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== SEO AUDIT TAB ==================== */}
      {activeTab === 'seo-audit' && (
        <SeoAuditCard audit={seoAudit} />
      )}

      {/* ==================== GEO READINESS TAB ==================== */}
      {activeTab === 'geo-readiness' && (
        <GeoReadinessCard audit={geoAudit} />
      )}

      {/* ==================== RECOMMENDATIONS TAB ==================== */}
      {activeTab === 'recommendations' && (
        <DeveloperRecommendations
          seoAudit={seoAudit}
          geoAudit={geoAudit}
          pageSpeed={pageSpeed}
          recommendations={recommendations}
        />
      )}
    </div>
  );
}
