import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Greeting } from '../../src/components/Greeting';
import { SectionTitle } from '../../src/components/SectionTitle';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import { getPortfolioBriefing, runPortfolioBriefing, Briefing, Zone } from '../../src/api/portfolio';

const ZONE_LABEL: Record<Zone, string> = {
  'double-down': 'Double down',
  'small-tests': 'Small tests',
  'protect-or-partner': 'Protect / partner',
  'cut-pause-sell': 'Cut · pause · sell',
};

function zoneColor(zone: Zone, c: any): string {
  switch (zone) {
    case 'double-down': return c.sage;
    case 'small-tests': return c.plum;
    case 'protect-or-partner': return c.gold;
    case 'cut-pause-sell': return c.terracotta;
  }
}

export default function PortfolioScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setErrorMsg(null);
      setBriefing(await getPortfolioBriefing());
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to load briefing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const runNow = useCallback(async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      setBriefing(await runPortfolioBriefing());
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to run briefing');
    } finally {
      setRunning(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.terracotta} />
      </View>
    );
  }

  const z = briefing?.zoneCounts;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.terracotta} />}
      >
        <Greeting subline={briefing ? `Briefing · ${briefing.date}` : 'No briefing yet'} title="Portfolio agent" />

        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <Pressable
            onPress={runNow}
            disabled={running}
            style={[styles.runBtn, { backgroundColor: c.terracotta, opacity: running ? 0.6 : 1 }]}
          >
            <Text style={styles.runBtnText}>{running ? 'Running…' : 'Run briefing now'}</Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#7f1d1d' }]}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!briefing && !errorMsg && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ color: c.ink, fontSize: 18, fontFamily: theme.fontHead, fontStyle: 'italic' }}>No briefing yet</Text>
            <Text style={{ color: c.muted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>
              Tap “Run briefing now” to generate the first allocation briefing.
            </Text>
          </View>
        )}

        {briefing && (
          <>
            {/* verdict */}
            <View style={[styles.verdict, { backgroundColor: c.bgAlt ?? '#101822', borderColor: c.border }]}>
              <Text style={[styles.verdictTag, { color: c.plum }]}>THE CALL</Text>
              <Text style={[styles.verdictHead, { color: c.ink, fontFamily: theme.fontHead }]}>{briefing.headline}</Text>
              <Text style={[styles.verdictBody, { color: c.muted }]}>{briefing.narrative}</Text>
              <Text style={[styles.meta, { color: c.muted }]}>
                {briefing.beaconsReachable}/{briefing.beaconsTotal} beacons · {briefing.tokensUsed.toLocaleString()} tokens · ${briefing.cost.toFixed(4)}
              </Text>
            </View>

            {/* zone tiles */}
            <View style={styles.tiles}>
              <ZoneTile label="Double down" n={z?.doubleDown ?? 0} color={c.sage} c={c} />
              <ZoneTile label="Small tests" n={z?.smallTests ?? 0} color={c.plum} c={c} />
              <ZoneTile label="Protect" n={z?.protectPartner ?? 0} color={c.gold} c={c} />
              <ZoneTile label="Cut / pause" n={z?.cutPauseSell ?? 0} color={c.terracotta} c={c} />
            </View>

            {/* quietly broken */}
            <SectionTitle title="Quietly" emphasis="broken" trailing={`${briefing.quietlyBroken.length}`} />
            <View style={{ paddingHorizontal: 16 }}>
              {briefing.quietlyBroken.length === 0 && (
                <Text style={{ color: c.muted, fontSize: 13, paddingVertical: 8 }}>None detected.</Text>
              )}
              {briefing.quietlyBroken.map((q) => (
                <View key={q.projectKey + q.title} style={[styles.brokenRow, { borderColor: c.border }]}>
                  <Text style={[styles.brokenTitle, { color: c.terracotta }]}>{q.title}</Text>
                  <Text style={[styles.brokenDetail, { color: c.muted }]}>{q.detail}</Text>
                </View>
              ))}
            </View>

            {/* ranked products */}
            <SectionTitle title="All products" emphasis="ranked" trailing={`${briefing.products.length}`} />
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {briefing.products.map((p, i) => (
                <View key={p.projectKey} style={[styles.prodRow, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prodName, { color: c.ink }]}>{i + 1}. {p.displayName}</Text>
                    <Text style={[styles.prodWhy, { color: c.muted }]} numberOfLines={2}>{p.why}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <View style={[styles.zoneChip, { backgroundColor: zoneColor(p.zone, c) + '22' }]}>
                      <Text style={[styles.zoneChipText, { color: zoneColor(p.zone, c) }]}>{ZONE_LABEL[p.zone]}</Text>
                    </View>
                    <Text style={[styles.prodScore, { color: c.muted }]}>T {p.traction} · L {p.leverage}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

function ZoneTile({ label, n, color, c }: { label: string; n: number; color: string; c: any }) {
  return (
    <View style={[styles.tile, { backgroundColor: c.bgAlt ?? '#14161b', borderColor: c.border }]}>
      <Text style={[styles.tileNum, { color }]}>{n}</Text>
      <Text style={[styles.tileLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  runBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorBox: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 14 },
  errorTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  errorText: { color: '#fecaca', fontSize: 11 },
  verdict: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  verdictTag: { fontSize: 10, letterSpacing: 1.4, fontWeight: '800' },
  verdictHead: { fontSize: 18, marginTop: 8, lineHeight: 24 },
  verdictBody: { fontSize: 13, marginTop: 8, lineHeight: 19 },
  meta: { fontSize: 10, marginTop: 12 },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  tile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  tileNum: { fontSize: 22, fontWeight: '800' },
  tileLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  brokenRow: { borderBottomWidth: 1, paddingVertical: 10 },
  brokenTitle: { fontSize: 13, fontWeight: '700' },
  brokenDetail: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  prodRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 12 },
  prodName: { fontSize: 14, fontWeight: '700' },
  prodWhy: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  zoneChip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  zoneChipText: { fontSize: 10, fontWeight: '700' },
  prodScore: { fontSize: 10, marginTop: 4 },
});
