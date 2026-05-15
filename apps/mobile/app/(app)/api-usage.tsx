import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getApiUsageStats, ApiUsageStats } from '../../src/api/api-usage';
import { KPICard } from '../../src/components/KPICard';
import { SectionCard } from '../../src/components/SectionCard';
import { BarChart } from '../../src/components/BarChart';
import { HBar } from '../../src/components/HBar';
import { FilterChips } from '../../src/components/FilterChips';

export default function ApiUsageScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [data, setData] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('30d');

  const fetchData = useCallback(async () => {
    try {
      const result = await getApiUsageStats(range);
      setData(result);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const kpis = [
    { label: 'Total Calls', value: data?.totalCalls?.toLocaleString() || '0' },
    { label: 'Total Cost', value: `$${data?.totalCost?.toFixed(4) || '0.00'}`, color: c.positive },
    { label: 'Total Tokens', value: data?.totalTokens?.toLocaleString() || '0' },
  ];

  const maxProviderCalls = Math.max(...(data?.byProvider?.map((p) => p.calls) || [1]));

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <FilterChips options={['7d', '30d', '90d', 'All']} selected={range} onSelect={setRange} />

      <View style={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} color={kpi.color} />
        ))}
      </View>

      {data?.byProvider && data.byProvider.length > 0 && (
        <SectionCard title="Usage by Provider">
          {data.byProvider.map((p) => (
            <View key={p.provider} style={{ marginBottom: 6 }}>
              <Text style={[styles.providerStat, { color: c.text2, textAlign: 'right', marginBottom: 2 }]}>{p.calls} calls / ${p.cost.toFixed(4)}</Text>
              <HBar label={p.provider} value={p.calls} total={maxProviderCalls} color={c.accent} suffix="" />
            </View>
          ))}
        </SectionCard>
      )}

      {data?.dailyStats && data.dailyStats.length > 0 && (
        <SectionCard title="Daily Usage">
          <BarChart
            data={data.dailyStats.map((d) => ({ label: d.date.slice(5), value: d.calls }))}
            color={c.chart1}
            height={120}
          />
        </SectionCard>
      )}

      {data?.recentCalls && data.recentCalls.length > 0 && (
        <SectionCard title="Recent Calls">
          {data.recentCalls.slice(0, 10).map((call) => (
            <View key={call.id} style={[styles.callRow, { borderBottomColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.callProvider, { color: c.text1 }]}>{call.provider}</Text>
                <Text style={[styles.callModel, { color: c.text2 }]}>{call.model}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.callTokens, { color: c.text2 }]}>{call.totalTokens} tok</Text>
                <Text style={[styles.callCost, { color: c.accent }]}>${call.cost.toFixed(5)}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  providerStat: { fontSize: 11 },
  callRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  callProvider: { fontSize: 13, fontWeight: '600' },
  callModel: { fontSize: 11, marginTop: 2 },
  callTokens: { fontSize: 11 },
  callCost: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
