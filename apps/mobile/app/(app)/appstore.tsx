import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getConsolidatedPlayStore, getConsolidatedAppStore, AppStoreData, AppStoreCompany } from '../../src/api/appstore';
import { Greeting } from '../../src/components/Greeting';
import { LogoAvatar } from '../../src/components/LogoAvatar';
import { SectionTitle } from '../../src/components/SectionTitle';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import { PlatformBadge } from '../../src/components/PlatformBadge';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return n.toFixed(0);
}

function dateLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
}

function paletteFor(i: number, c: any) {
  const palette = [c.terracotta, c.plum, c.gold, c.rose, c.sage];
  return palette[i % palette.length];
}

type Platform = 'all' | 'play' | 'ios';

export default function AppStoreScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [play, setPlay] = useState<AppStoreData | null>(null);
  const [ios, setIos] = useState<AppStoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('all');

  const fetchData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const [p, i] = await Promise.all([
        getConsolidatedPlayStore('30d').catch(() => ({ connected: false } as AppStoreData)),
        getConsolidatedAppStore('30d').catch(() => ({ connected: false } as AppStoreData)),
      ]);
      setPlay(p);
      setIos(i);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : '';
      setErrorMsg(`${status ? `HTTP ${status} — ` : ''}${e?.message || 'Unknown error'}${body ? `\n${body}` : ''}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.terracotta} />
      </View>
    );
  }

  // Combine breakdowns + tag platform
  const playRows = (play?.data?.companyBreakdown || []).map((r) => ({ ...r, platform: 'PLAY' as const }));
  const iosRows = (ios?.data?.companyBreakdown || []).map((r) => ({ ...r, platform: 'iOS' as const }));
  let allRows: Array<AppStoreCompany & { platform: 'PLAY' | 'iOS' }> = [];
  if (platform === 'play') allRows = playRows;
  else if (platform === 'ios') allRows = iosRows;
  else allRows = [...playRows, ...iosRows];
  allRows.sort((a, b) => (b.totalInstalls || 0) - (a.totalInstalls || 0));

  // Compute funnel totals based on current selection
  const totalInstalls = allRows.reduce((s, r) => s + (r.totalInstalls || 0), 0);
  const totalActiveDevices = allRows.reduce((s, r) => s + (r.activeDevices || 0), 0);
  const totalDailyInstalls = allRows.reduce((s, r) => s + (r.dailyInstalls || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.terracotta} />}
      >
        <Greeting subline={dateLabel()} title="Store performance" />

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#7f1d1d' }]}>
            <Text style={styles.errorTitle}>API Error</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Funnel hero */}
        <View style={[styles.hero, { backgroundColor: c.surface, shadowColor: c.ink }]}>
          <Text style={[styles.heroLabel, { color: c.muted }]}>ACQUISITION FUNNEL · LAST 30 DAYS</Text>

          <FunnelRow label="Total Installs" value={formatNumber(totalInstalls)} barPercent={100} color={c.sky || '#8aa5bd'} />
          <FunnelArrow />
          <FunnelRow label="Active Devices" value={formatNumber(totalActiveDevices)} valueColor={c.sage} barPercent={totalInstalls ? Math.max(8, (totalActiveDevices / totalInstalls) * 100) : 0} color={c.sage} />
          <FunnelArrow />
          <FunnelRow label="Daily Installs" value={`${totalDailyInstalls}/day`} valueColor={c.terracotta} barPercent={totalInstalls ? Math.max(3, (totalDailyInstalls / totalInstalls) * 100) : 0} color={c.terracotta} />
        </View>

        {/* Platform segment */}
        <View style={[styles.seg, { backgroundColor: c.bgAlt }]}>
          <SegOpt label="All" active={platform === 'all'} onPress={() => setPlatform('all')} />
          <SegOpt label="Play" active={platform === 'play'} onPress={() => setPlatform('play')} />
          <SegOpt label="App Store" active={platform === 'ios'} onPress={() => setPlatform('ios')} />
        </View>

        <SectionTitle title="Apps" emphasis="by installs" trailing={`${allRows.length} apps`} />

        <View style={styles.list}>
          {allRows.map((app, i) => (
            <View key={`${app.platform}-${app.id || i}`} style={[styles.appCard, { backgroundColor: c.surface, shadowColor: c.ink }]}>
              <View style={styles.appTop}>
                <LogoAvatar
                  uri={app.logo}
                  fallbackLetter={app.name}
                  fallbackColor={paletteFor(i, c)}
                  size={40}
                  borderRadius={11}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.appName, { color: c.ink }]} numberOfLines={1}>{app.name}</Text>
                    <View style={[styles.platTag, { backgroundColor: c.bgAlt }]}>
                      <PlatformBadge platform={app.platform} size={13} appleColor={c.ink} />
                    </View>
                  </View>
                  <Text style={[styles.appSub, { color: c.muted, fontFamily: theme.fontHead }]}>{formatNumber(app.activeDevices || 0)} active devices</Text>
                </View>
                <View style={styles.appRight}>
                  <Text style={[styles.installNum, { color: c.ink, fontFamily: theme.fontHead }]}>{formatNumber(app.totalInstalls || 0)}</Text>
                  <Text style={[styles.installDelta, { color: (app.dailyInstalls || 0) > 0 ? c.sage : c.muted }]}>
                    +{app.dailyInstalls || 0} today
                  </Text>
                </View>
              </View>
              <View style={[styles.statsRow, { borderTopColor: c.line }]}>
                <Stat value={formatNumber(app.activeDevices || 0)} label="DEVICES" c={c} />
                <Stat value={app.conversionRate != null ? `${app.conversionRate.toFixed(1)}%` : '—'} label="CONV." c={c} colorOverride={app.conversionRate != null ? (app.conversionRate >= 10 ? c.sage : app.conversionRate >= 5 ? c.gold : c.terracotta) : undefined} divider />
                <Stat value={app.crashRate != null ? `${app.crashRate.toFixed(2)}%` : '0.00%'} label="CRASH" c={c} divider />
                <Stat value={app.rating ? app.rating.toFixed(1) : '—'} label="RATING" c={c} colorOverride={app.rating && app.rating >= 4 ? c.sage : app.rating && app.rating >= 3 ? c.gold : c.ink} divider />
              </View>
            </View>
          ))}
          {allRows.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: c.muted, fontFamily: theme.fontHead, fontStyle: 'italic', fontSize: 14 }}>No apps for this platform yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

function FunnelRow({ label, value, valueColor, barPercent, color }: { label: string; value: string; valueColor?: string; barPercent: number; color: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View>
      <View style={styles.funnelRow}>
        <Text style={[styles.funnelLabel, { color: c.inkSoft, fontFamily: theme.fontHead }]}>{label}</Text>
        <Text style={[styles.funnelVal, { color: valueColor || c.ink, fontFamily: theme.fontHead }]}>{value}</Text>
      </View>
      <View style={[styles.funnelBar, { backgroundColor: c.bgAlt }]}>
        <View style={[styles.funnelBarFill, { width: `${Math.max(2, Math.min(100, barPercent))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function FunnelArrow() {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Text style={[styles.funnelArrow, { color: c.muted, fontFamily: theme.fontHead }]}>↓</Text>
  );
}

function SegOpt({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      onTouchEnd={onPress}
      style={[styles.segOpt, active && { backgroundColor: c.surface }]}
    >
      <Text style={[styles.segOptText, { color: active ? c.ink : c.inkSoft, fontWeight: active ? '600' : '500' }]}>{label}</Text>
    </View>
  );
}

function Stat({ value, label, c, colorOverride, divider }: { value: string; label: string; c: any; colorOverride?: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && { borderLeftWidth: 1, borderLeftColor: c.line }]}>
      <Text style={[styles.statNum, { color: colorOverride || c.ink }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 14 },
  errorTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  errorText: { color: '#fecaca', fontSize: 11 },

  hero: {
    marginHorizontal: 16, marginTop: 14, borderRadius: 28, padding: 22,
    shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  heroLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500', marginBottom: 8 },
  funnelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 4 },
  funnelLabel: { fontSize: 14, fontStyle: 'italic' },
  funnelVal: { fontSize: 26, lineHeight: 39, letterSpacing: -0.5 },
  funnelBar: { height: 5, borderRadius: 3, marginVertical: 6, overflow: 'hidden' },
  funnelBarFill: { height: '100%', borderRadius: 3 },
  funnelArrow: { textAlign: 'center', fontSize: 12, fontStyle: 'italic' },

  seg: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 4, flexDirection: 'row', gap: 4 },
  segOpt: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 14 },
  segOptText: { fontSize: 12 },

  list: { paddingHorizontal: 16, paddingTop: 4 },
  appCard: {
    borderRadius: 20, padding: 12, marginBottom: 8,
    shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  appTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 },
  platTag: { padding: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  appSub: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  appRight: { alignItems: 'flex-end' },
  installNum: { fontSize: 24, lineHeight: 36, letterSpacing: -0.5 },
  installDelta: { fontSize: 10, fontWeight: '500', marginTop: 2 },

  statsRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  statNum: { fontSize: 12, fontWeight: '600' },
  statLbl: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
});
