import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedAnalytics, AnalyticsData } from '../../src/api/analytics';
import { Greeting } from '../../src/components/Greeting';
import { HeroCard } from '../../src/components/HeroCard';
import { StatTile } from '../../src/components/StatTile';
import { CompanyRow } from '../../src/components/CompanyRow';
import { Sparkline } from '../../src/components/Sparkline';
import { SectionTitle } from '../../src/components/SectionTitle';
import { FilterChips } from '../../src/components/FilterChips';
import { BottomTabBar } from '../../src/components/BottomTabBar';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return n.toFixed(0);
}

function dateLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
}

function bounceColor(rate: number, c: any) {
  if (rate >= 55) return c.terracotta;
  if (rate >= 40) return c.gold;
  return c.sage;
}

function paletteFor(i: number, c: any) {
  const palette = [c.terracotta, c.plum, c.gold, c.rose, c.sage];
  return palette[i % palette.length];
}

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const result = await getConsolidatedAnalytics(dateRange);
      setData(result);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : '';
      setErrorMsg(`${status ? `HTTP ${status} — ` : ''}${e?.message || 'Unknown error'}${body ? `\n${body}` : ''}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const overview = data?.data?.overview;
  const sessions = data?.data?.sessionsOverTime || [];
  const breakdown = data?.data?.companyBreakdown || [];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.terracotta} />
      </View>
    );
  }

  const sparkData = sessions.map((s: any) => s.sessions || 0);
  const maxShare = Math.max(...breakdown.map((b) => b.share || 0), 1);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.terracotta} />}
      >
        <Greeting subline={dateLabel()} title="Portfolio analytics" />

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#7f1d1d' }]}>
            <Text style={styles.errorTitle}>API Error</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!data?.connected && !errorMsg && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ color: c.ink, fontSize: 18, fontFamily: theme.fontHead, fontStyle: 'italic' }}>Not connected</Text>
            <Text style={{ color: c.muted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>
              Configure Google Analytics in the dashboard.
            </Text>
          </View>
        )}

        {data?.connected && (
          <>
            <HeroCard
              label={`Total Sessions · Last ${dateRange === '7d' ? '7' : dateRange === '90d' ? '90' : '30'} Days`}
              value={overview ? formatNumber(overview.sessions) : '0'}
              delta={breakdown.length ? `${breakdown.length} cos` : undefined}
              subline={<>across <Text style={{ fontStyle: 'italic', color: c.terracotta }}>{breakdown.length}</Text> portfolio companies</>}
            >
              {sparkData.length > 1 && <Sparkline data={sparkData} color={c.terracotta} />}
            </HeroCard>

            <View style={styles.kpiRow}>
              <StatTile
                label="Users"
                value={overview ? formatNumber(overview.totalUsers) : '0'}
                trend={overview && overview.totalUsers ? 'all properties' : undefined}
              />
              <StatTile
                label="Pageviews"
                value={overview ? formatNumber(overview.pageviews) : '0'}
                trend={overview && overview.bounceRate != null ? `${Math.round(overview.bounceRate)}% bounce` : undefined}
                trendWarn={overview ? overview.bounceRate > 50 : false}
              />
            </View>

            <View style={{ marginHorizontal: 16, marginTop: 14 }}>
              <FilterChips options={['7d', '30d', '90d']} selected={dateRange} onSelect={setDateRange} />
            </View>

            {breakdown.length > 0 && (
              <>
                <SectionTitle title="Companies" emphasis="by share" trailing={`${breakdown.length} total`} />
                <View style={styles.list}>
                  {breakdown.map((row: any, i: number) => (
                    <CompanyRow
                      key={row.id || i}
                      rank={i + 1}
                      name={row.name}
                      logo={row.logo}
                      fallbackColor={paletteFor(i, c)}
                      barPercent={(row.share / maxShare) * 100}
                      barColor={paletteFor(i, c)}
                      statsLine={`${formatNumber(row.users || 0)} users · `}
                      statsBold={`${formatNumber(row.sessions || 0)} sessions`}
                      primaryStat={`${row.share || 0}%`}
                      secondaryStat={row.bounceRate != null ? `${Math.round(row.bounceRate)}% bounce` : undefined}
                      secondaryColor={row.bounceRate != null ? bounceColor(row.bounceRate, c) : c.muted}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  errorBox: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 14 },
  errorTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  errorText: { color: '#fecaca', fontSize: 11 },
});
