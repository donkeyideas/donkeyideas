import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getSeoGeoData, SeoGeoData } from '../../src/api/seo-geo';
import { useCompanyStore } from '../../src/store/companyStore';
import { KPICard } from '../../src/components/KPICard';
import { SectionCard } from '../../src/components/SectionCard';
import { ScoreGauge } from '../../src/components/ScoreGauge';
import { BarChart } from '../../src/components/BarChart';
import { HBar } from '../../src/components/HBar';
import { TabBar } from '../../src/components/TabBar';
import { FilterChips } from '../../src/components/FilterChips';

const TABS = ['Overview', 'Search Console', 'Web Vitals', 'Audit', 'GEO'];

export default function SeoGeoScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [data, setData] = useState<SeoGeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('30d');

  const fetchData = useCallback(async () => {
    try {
      const result = await getSeoGeoData(dateRange);
      setData(result);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const snapshot = data?.snapshot;
  const sc = data?.searchConsole;
  const ps = data?.pageSpeed;
  const audit = data?.seoAudit;
  const geo = data?.geoAudit;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <FilterChips options={['7d', '30d', '90d']} selected={dateRange} onSelect={setDateRange} />
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 0 && (
        <>
          <View style={styles.gaugeRow}>
            <ScoreGauge score={snapshot?.seoScore || 0} label="SEO" />
            <ScoreGauge score={snapshot?.geoScore || 0} label="GEO" />
            <ScoreGauge score={snapshot?.performanceScore || 0} label="Perf" />
          </View>
          {sc?.connected && sc.data && (
            <View style={styles.kpiGrid}>
              <KPICard label="Clicks" value={sc.data.overview.totalClicks.toLocaleString()} />
              <KPICard label="Impressions" value={sc.data.overview.totalImpressions.toLocaleString()} />
              <KPICard label="CTR" value={`${(sc.data.overview.avgCtr * 100).toFixed(1)}%`} />
              <KPICard label="Position" value={sc.data.overview.avgPosition.toFixed(1)} />
            </View>
          )}
          {!sc?.connected && (
            <SectionCard title="Search Console">
              <Text style={[styles.notConnected, { color: c.text2 }]}>
                Google Search Console is not connected. Connect it from your Business Profile.
              </Text>
            </SectionCard>
          )}
        </>
      )}

      {activeTab === 1 && sc?.connected && sc.data && (
        <>
          {sc.data.performanceOverTime.length > 0 && (
            <SectionCard title="Search Performance">
              <BarChart
                data={sc.data.performanceOverTime.map((d) => ({ label: d.date.slice(5), value: d.clicks }))}
                color={c.chart1}
                height={120}
              />
            </SectionCard>
          )}
          <SectionCard title="Top Keywords">
            {sc.data.topKeywords.slice(0, 10).map((kw, i) => (
              <View key={i} style={[styles.kwRow, { borderBottomColor: c.border }]}>
                <Text style={[styles.kwText, { color: c.text1 }]} numberOfLines={1}>{kw.keyword}</Text>
                <Text style={[styles.kwStat, { color: c.text2 }]}>{kw.clicks} clicks</Text>
                <Text style={[styles.kwStat, { color: c.accent }]}>#{kw.position.toFixed(0)}</Text>
              </View>
            ))}
          </SectionCard>
        </>
      )}

      {activeTab === 2 && ps && (
        <>
          <SectionCard title="Lighthouse Scores">
            <View style={styles.gaugeRow}>
              <ScoreGauge score={ps.mobile.lighthouseScores.performanceScore} label="Perf" size={70} />
              <ScoreGauge score={ps.mobile.lighthouseScores.seoScore} label="SEO" size={70} />
              <ScoreGauge score={ps.mobile.lighthouseScores.accessibilityScore} label="A11y" size={70} />
            </View>
          </SectionCard>
          <SectionCard title="Core Web Vitals">
            <View style={styles.kpiGrid}>
              <KPICard label="LCP" value={`${ps.mobile.coreWebVitals.lcp.toFixed(1)}s`} />
              <KPICard label="FID" value={`${ps.mobile.coreWebVitals.fid}ms`} />
              <KPICard label="CLS" value={ps.mobile.coreWebVitals.cls.toFixed(3)} />
              <KPICard label="FCP" value={`${ps.mobile.coreWebVitals.fcp.toFixed(1)}s`} />
            </View>
          </SectionCard>
        </>
      )}

      {activeTab === 3 && audit && (
        <SectionCard title="SEO Audit">
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ScoreGauge score={audit.overallScore} label="Overall" size={100} />
          </View>
          <View style={styles.kpiGrid}>
            <KPICard label="Errors" value={String(audit.totalIssues.errors)} color={c.negative} />
            <KPICard label="Warnings" value={String(audit.totalIssues.warnings)} color={c.warning} />
            <KPICard label="Info" value={String(audit.totalIssues.info)} />
          </View>
        </SectionCard>
      )}

      {activeTab === 4 && geo && (
        <SectionCard title="GEO Readiness">
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <ScoreGauge score={geo.overallScore} label="GEO Score" size={100} />
          </View>
          <View style={{ gap: 10 }}>
            <HBar label="Structured Data" value={geo.structuredData.score} total={100} color={c.chart1} />
            <HBar label="LLM Accessibility" value={geo.llmAccessibility.score} total={100} color={c.chart2} />
            <HBar label="Content Quality" value={geo.contentQuality.score} total={100} color={c.chart3} />
            <HBar label="Technical Signals" value={geo.technicalSignals.score} total={100} color={c.chart4} />
          </View>
        </SectionCard>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gaugeRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 20 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  kwRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  kwText: { flex: 1, fontSize: 13, fontWeight: '500' },
  kwStat: { fontSize: 11 },
  notConnected: { fontSize: 13, lineHeight: 18 },
  barLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 }, // kept for potential future use
});
