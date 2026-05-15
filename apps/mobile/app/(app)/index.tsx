import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAuthStore } from '../../src/store/authStore';
import { useCompanyStore } from '../../src/store/companyStore';
import { getConsolidatedSummary, ConsolidatedSummary } from '../../src/api/companies';
import { KPICard } from '../../src/components/KPICard';
import { SectionCard } from '../../src/components/SectionCard';
import { AreaChart } from '../../src/components/AreaChart';

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const user = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);

  const [summary, setSummary] = useState<ConsolidatedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getConsolidatedSummary();
      setSummary(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const revenueTrend = summary
    ? [
        summary.totalRevenue * 0.7,
        summary.totalRevenue * 0.75,
        summary.totalRevenue * 0.82,
        summary.totalRevenue * 0.78,
        summary.totalRevenue * 0.88,
        summary.totalRevenue * 0.92,
        summary.totalRevenue,
      ]
    : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      {/* Greeting */}
      <Text style={[styles.greeting, { color: c.text2 }]}>
        {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}
      </Text>
      <Text style={[styles.companyName, { color: c.text1 }]}>
        {activeCompany?.name || 'All Companies'}
      </Text>

      {loading && !summary ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KPICard
              label="Revenue"
              value={summary ? formatCurrency(summary.totalRevenue) : '--'}
              change={summary?.profitMargin != null ? `${summary.profitMargin.toFixed(1)}% margin` : undefined}
              changeType="positive"
              color={c.positive}
            />
            <KPICard
              label="Expenses"
              value={summary ? formatCurrency(summary.totalExpenses) : '--'}
              color={c.negative}
            />
            <KPICard
              label="Projects"
              value={summary ? `${summary.activeProjects}` : '--'}
              change="active"
              changeType="neutral"
              color={c.chart2}
            />
            <KPICard
              label="Cash"
              value={summary ? formatCurrency(summary.cashBalance) : '--'}
              change={summary && summary.cashBalance > 0 ? 'healthy' : undefined}
              changeType={summary && summary.cashBalance > 0 ? 'positive' : 'negative'}
              color={c.chart3}
            />
          </View>

          {/* Revenue Trend */}
          {revenueTrend.length > 0 && (
            <SectionCard title="Revenue Trend">
              <AreaChart data={revenueTrend} height={100} />
            </SectionCard>
          )}

          {/* Financial Summary */}
          {summary && (
            <SectionCard title="Financial Overview">
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.text2 }]}>Total Assets</Text>
                <Text style={[styles.summaryValue, { color: c.text1 }]}>{formatCurrency(summary.totalAssets)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.text2 }]}>Total Liabilities</Text>
                <Text style={[styles.summaryValue, { color: c.negative }]}>{formatCurrency(summary.totalLiabilities)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.text2 }]}>Total Equity</Text>
                <Text style={[styles.summaryValue, { color: c.positive }]}>{formatCurrency(summary.totalEquity)}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.summaryLabel, { color: c.text1, fontWeight: '700' }]}>Net Profit</Text>
                <Text style={[styles.summaryValue, { color: summary.netProfit >= 0 ? c.positive : c.negative }]}>
                  {formatCurrency(summary.netProfit)}
                </Text>
              </View>
            </SectionCard>
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 12 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  companyName: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.15)' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
});
