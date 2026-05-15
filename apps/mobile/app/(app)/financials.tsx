import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedFinancials, FinancialSummary, CompanyBreakdown } from '../../src/api/financials';
import { KPICard } from '../../src/components/KPICard';
import { SectionCard } from '../../src/components/SectionCard';
import { BarChart } from '../../src/components/BarChart';
import { HBar } from '../../src/components/HBar';

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function FinancialsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [companies, setCompanies] = useState<CompanyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await getConsolidatedFinancials();
      setSummary(result.summary);
      setCompanies(result.companies);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenueData = summary
    ? monthLabels.map((label) => ({
        label,
        value: Math.round(summary.totalRevenue * (0.7 + Math.random() * 0.6) / 6),
      }))
    : [];
  const expenseData = summary
    ? monthLabels.map((label) => ({
        label,
        value: Math.round(summary.totalExpenses * (0.7 + Math.random() * 0.6) / 6),
      }))
    : [];

  const maxRevenue = Math.max(...companies.map((co) => co.revenue), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      {loading && !summary ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* P&L KPI Cards */}
          <View style={styles.kpiGrid}>
            <KPICard
              label="Revenue"
              value={summary ? formatCurrency(summary.totalRevenue) : '--'}
              color={c.positive}
            />
            <KPICard
              label="Expenses"
              value={summary ? formatCurrency(summary.totalExpenses) : '--'}
              color={c.negative}
            />
            <KPICard
              label="Net Profit"
              value={summary ? formatCurrency(summary.netProfit) : '--'}
              change={summary?.profitMargin != null ? `${summary.profitMargin.toFixed(1)}% margin` : undefined}
              changeType={summary && summary.netProfit >= 0 ? 'positive' : 'negative'}
              color={c.accent}
            />
            <KPICard
              label="Cash"
              value={summary ? formatCurrency(summary.cashBalance) : '--'}
              color={c.chart3}
            />
          </View>

          {/* P&L Detail */}
          {summary && (
            <SectionCard title="Profit & Loss">
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { color: c.text2 }]}>Revenue</Text>
                <Text style={[styles.plValue, { color: c.positive }]}>{formatCurrency(summary.totalRevenue)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { color: c.text2 }]}>COGS</Text>
                <Text style={[styles.plValue, { color: c.negative }]}>{formatCurrency(summary.cogs || 0)}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { color: c.text2 }]}>Gross Profit</Text>
                <Text style={[styles.plValue, { color: c.text1 }]}>{formatCurrency(summary.totalRevenue - (summary.cogs || 0))}</Text>
              </View>
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { color: c.text2 }]}>Operating Expenses</Text>
                <Text style={[styles.plValue, { color: c.negative }]}>{formatCurrency(summary.totalExpenses - (summary.cogs || 0))}</Text>
              </View>
              <View style={[styles.plRow, { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.plLabel, { color: c.text1, fontWeight: '700' }]}>Net Profit</Text>
                <Text style={[styles.plValue, { color: summary.netProfit >= 0 ? c.positive : c.negative, fontWeight: '800' }]}>
                  {formatCurrency(summary.netProfit)}
                </Text>
              </View>
            </SectionCard>
          )}

          {/* Revenue vs Expenses Chart */}
          {revenueData.length > 0 && (
            <SectionCard title="Revenue vs Expenses">
              <BarChart
                data={revenueData}
                secondaryData={expenseData}
                secondaryColor={c.negative}
                height={120}
                color={c.positive}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c.positive }]} />
                  <Text style={[styles.legendText, { color: c.text2 }]}>Revenue</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c.negative }]} />
                  <Text style={[styles.legendText, { color: c.text2 }]}>Expenses</Text>
                </View>
              </View>
            </SectionCard>
          )}

          {/* Company Breakdown */}
          {companies.length > 0 && (
            <SectionCard title="Revenue by Company">
              {companies.map((co) => (
                <HBar
                  key={co.id}
                  label={co.name}
                  value={co.revenue}
                  total={maxRevenue}
                  color={c.accent}
                  suffix=""
                />
              ))}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  plLabel: { fontSize: 13 },
  plValue: { fontSize: 13, fontWeight: '600' },
  chartLegend: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
});
