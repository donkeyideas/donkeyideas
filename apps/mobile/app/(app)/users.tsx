import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getUserOverview, UserOverview } from '../../src/api/users';
import { KPICard } from '../../src/components/KPICard';
import { SectionCard } from '../../src/components/SectionCard';
import { AreaChart } from '../../src/components/AreaChart';
import { DonutChart } from '../../src/components/DonutChart';
import { FilterChips } from '../../src/components/FilterChips';

export default function UsersScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [data, setData] = useState<UserOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  const fetchData = useCallback(async () => {
    try {
      const result = await getUserOverview(dateRange);
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

  const kpis = [
    { label: 'Total Users', value: data?.totalUsers?.toLocaleString() || '0' },
    { label: 'New (30D)', value: data?.newUsers30d?.toLocaleString() || '0' },
    { label: 'New (7D)', value: data?.newUsers7d?.toLocaleString() || '0' },
    { label: 'Growth', value: data?.growthRate ? `+${data.growthRate.toFixed(1)}%` : '0%', color: c.positive },
  ];

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <FilterChips options={['7d', '30d', '90d', 'All']} selected={dateRange} onSelect={setDateRange} />

      <View style={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} label={kpi.label} value={kpi.value} color={kpi.color} />
        ))}
      </View>

      {data?.growthTrend && data.growthTrend.length > 0 && (
        <SectionCard title="User Growth">
          <AreaChart
            data={data.growthTrend.map((d) => d.users)}
            color={c.accent}
            height={140}
          />
        </SectionCard>
      )}

      {data?.usersByProject && data.usersByProject.length > 0 && (
        <SectionCard title="Users by Project">
          <DonutChart
            data={data.usersByProject.map((p, i) => ({
              value: p.count,
              label: p.project,
              color: p.color || [c.chart1, c.chart2, c.chart3, c.chart4][i % 4],
            }))}
            size={120}
          />
          <View style={{ marginTop: 12 }}>
            {data.usersByProject.map((p, i) => (
              <View key={p.slug} style={[styles.projectRow, { borderBottomColor: c.border }]}>
                <View style={[styles.dot, { backgroundColor: p.color || [c.chart1, c.chart2, c.chart3, c.chart4][i % 4] }]} />
                <Text style={[styles.projectName, { color: c.text1 }]} numberOfLines={1}>{p.project}</Text>
                <Text style={[styles.projectCount, { color: c.text2 }]}>{p.count}</Text>
              </View>
            ))}
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  projectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  projectName: { flex: 1, fontSize: 13, fontWeight: '500' },
  projectCount: { fontSize: 13, fontWeight: '700' },
});
