import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedPlayStore, getConsolidatedAppStore, AppStoreData } from '../../src/api/appstore';
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

function StarRating({ rating }: { rating: number }) {
  const { theme } = useTheme();
  const full = Math.floor(rating);
  return (
    <View style={starStyles.row}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={[
            starStyles.star,
            { backgroundColor: i < full ? theme.colors.warning : theme.colors.border },
          ]}
        />
      ))}
      <Text style={[starStyles.text, { color: theme.colors.text2 }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { width: 12, height: 12, borderRadius: 2 },
  text: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
});

export default function AppStoreScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [data, setData] = useState<AppStoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const fetchData = useCallback(async () => {
    try {
      let result = await getConsolidatedPlayStore(dateRange);
      if (!result.connected) {
        result = await getConsolidatedAppStore(dateRange);
      }
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
  const installs = data?.data?.installTimeSeries || [];
  const ratings = data?.data?.ratingDistribution;
  const reviews = data?.data?.reviews || [];

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
        <Text style={[styles.emptyTitle, { color: c.text1 }]}>App Store Not Connected</Text>
        <Text style={{ color: c.text2, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          No app store integration found. Configure Play Store or App Store Connect in the dashboard.
        </Text>
      </View>
    );
  }

  const ratingBars = ratings
    ? [5, 4, 3, 2, 1].map((star) => ({
        label: `${star} star`,
        value: ratings[String(star)] || 0,
      }))
    : [];
  const maxRating = ratingBars.length > 0 ? Math.max(...ratingBars.map((r) => r.value), 1) : 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <FilterChips options={['7d', '30d', '90d']} selected={dateRange} onSelect={setDateRange} />

      {/* KPI Pills */}
      <View style={styles.pillRow}>
        <KPIPill label="Installs" value={overview ? formatNumber(overview.totalInstalls) : '--'} />
        <KPIPill label="Rating" value={overview?.averageRating != null ? overview.averageRating.toFixed(1) : '--'} />
        <KPIPill label="Reviews" value={overview ? formatNumber(overview.totalReviews) : '--'} />
      </View>

      {overview && (
        <View style={styles.pillRow}>
          <KPIPill label="Daily" value={formatNumber(overview.dailyInstalls)} />
          <KPIPill label="Active" value={formatNumber(overview.activeDevices)} />
          {overview.crashRate !== undefined && (
            <KPIPill label="Crashes" value={`${overview.crashRate.toFixed(2)}%`} />
          )}
        </View>
      )}

      {/* Install Chart */}
      {installs.length > 0 && (
        <SectionCard title="Daily Installs">
          <BarChart
            data={installs.map((d: any) => ({
              label: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
              value: d.installs,
            }))}
            height={120}
          />
        </SectionCard>
      )}

      {/* Rating Distribution */}
      {ratingBars.length > 0 && (
        <SectionCard title="Rating Distribution">
          {overview && <StarRating rating={overview.averageRating} />}
          <View style={{ marginTop: 12 }}>
            {ratingBars.map((bar, i) => (
              <HBar
                key={i}
                label={bar.label}
                value={bar.value}
                total={maxRating}
                suffix=""
                color={i === 0 ? c.positive : i < 3 ? c.chart1 : c.negative}
              />
            ))}
          </View>
        </SectionCard>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <SectionCard title="Recent Reviews">
          {reviews.slice(0, 5).map((review: any, i: number) => (
            <View key={i} style={[styles.reviewCard, { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: theme.radius }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewAuthor, { color: c.text1 }]}>{review.author}</Text>
                <StarRating rating={review.rating} />
              </View>
              <Text style={[styles.reviewText, { color: c.text2 }]} numberOfLines={3}>
                {review.text}
              </Text>
              <Text style={[styles.reviewDate, { color: c.text2 }]}>
                {new Date(review.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
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
  reviewCard: { padding: 14, borderWidth: 1, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewAuthor: { fontSize: 13, fontWeight: '600' },
  reviewText: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  reviewDate: { fontSize: 11 },
});
