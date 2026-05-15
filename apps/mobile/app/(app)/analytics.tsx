import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedAnalytics, AnalyticsData } from '../../src/api/analytics';
import { KPIPill } from '../../src/components/KPIPill';
import { SectionCard } from '../../src/components/SectionCard';
import { BarChart } from '../../src/components/BarChart';
import { HBar } from '../../src/components/HBar';
import { FilterChips } from '../../src/components/FilterChips';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  const fetchData = useCallback(async () => {
    try {
      const result = await getConsolidatedAnalytics(dateRange);
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const overview = data?.data?.overview;
  const sessions = data?.data?.sessionsOverTime || [];
  const traffic = data?.data?.trafficSources || [];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (!data?.connected) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={[styles.emptyTitle, { color: c.text1 }]}>Analytics Not Connected</Text>
        <Text style={{ color: c.text2, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          Google Analytics is not set up. Configure it in the dashboard.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <FilterChips options={['7d', '30d', '90d']} selected={dateRange} onSelect={setDateRange} />

      {/* KPI Pills */}
      <View style={styles.pillRow}>
        <KPIPill label="Users" value={overview ? formatNumber(overview.totalUsers) : '--'} />
        <KPIPill label="Sessions" value={overview ? formatNumber(overview.sessions) : '--'} />
        <KPIPill label="Bounce" value={overview?.bounceRate != null ? `${overview.bounceRate.toFixed(1)}%` : '--'} />
      </View>

      {overview && (
        <View style={styles.pillRow}>
          <KPIPill label="Pageviews" value={formatNumber(overview.pageviews)} />
          <KPIPill label="Avg Duration" value={formatDuration(overview.avgSessionDuration)} />
        </View>
      )}

      {/* Sessions Chart */}
      {sessions.length > 0 && (
        <SectionCard title="Sessions Over Time">
          <BarChart
            data={sessions.slice(-7).map((s) => ({
              label: new Date(s.date).toLocaleDateString('en', { weekday: 'short' }),
              value: s.sessions,
            }))}
            height={120}
          />
        </SectionCard>
      )}

      {/* Traffic Sources */}
      {traffic.length > 0 && (
        <SectionCard title="Traffic Sources">
          {traffic.slice(0, 5).map((t: any, i: number) => (
            <HBar
              key={i}
              label={t.source}
              value={Math.round(t.percentage)}
              total={100}
              color={[c.chart1, c.chart2, c.chart3, c.chart4, c.accent][i % 5]}
            />
          ))}
        </SectionCard>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
});
