import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Greeting } from '../../src/components/Greeting';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import { getMessages, markMessageRead, Message } from '../../src/api/messages';

function dateLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
}

function formatRelative(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const INTEREST_LABELS: Record<string, string> = {
  'fractional-cfo': 'Fractional CFO',
  'venture-pitch': 'Venture pitch',
  services: 'Services',
  platform: 'Platform',
  partnership: 'Partnership',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
  event: 'Event',
  other: 'General',
};
function interestLabel(i?: string): string {
  if (!i) return 'General';
  return INTEREST_LABELS[i] || i;
}

export default function MessagesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await getMessages(filter, 1);
      setMessages(res.messages || []);
      setTotal(res.pagination?.total || 0);
      setUnread(res.unreadCount || 0);
    } catch (e: any) {
      const status = e?.response?.status;
      setErrorMsg(`${status ? `HTTP ${status} — ` : ''}${e?.message || 'Failed to load messages'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const onTap = async (m: Message) => {
    setExpanded(expanded === m.id ? null : m.id);
    if (!m.read) {
      // optimistic
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      try { await markMessageRead(m.id, true); } catch { /* revert silently on next refresh */ }
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.terracotta} />
      </View>
    );
  }

  const shown = filter === 'unread' ? messages.filter((m) => !m.read) : messages;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.terracotta} />}
      >
        <Greeting subline={dateLabel()} title="The inbox" />

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#7f1d1d' }]}>
            <Text style={styles.errorTitle}>API Error</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: c.surface, shadowColor: c.ink }]}>
          <Text style={[styles.heroLabel, { color: c.muted }]}>INCOMING REQUESTS · ALL SOURCES</Text>
          <Text style={[styles.heroValue, { color: c.ink, fontFamily: theme.fontHead }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {total.toLocaleString()}
          </Text>
          <View style={[styles.heroPill, { backgroundColor: unread > 0 ? c.terracotta : c.sage, alignSelf: 'center' }]}>
            <Text style={styles.heroPillText}>{unread} unread</Text>
          </View>
          <Text style={[styles.heroSub, { color: c.inkSoft, fontFamily: theme.fontHead }]}>
            total messages received
          </Text>
        </View>

        {/* Filter chips */}
        <View style={styles.chipsRow}>
          <FilterChip label={`All · ${total}`} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label={`Unread · ${unread}`} active={filter === 'unread'} onPress={() => setFilter('unread')} />
        </View>

        {/* Section title */}
        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: c.ink, fontFamily: theme.fontHead }]}>
            Recent <Text style={{ fontStyle: 'italic', color: c.terracotta }}>requests</Text>
          </Text>
          <Text style={[styles.sectionMeta, { color: c.muted }]}>{shown.length} of {total}</Text>
        </View>

        <View style={styles.list}>
          {shown.length === 0 && (
            <Text style={{ color: c.muted, textAlign: 'center', paddingVertical: 40 }}>
              No {filter === 'unread' ? 'unread ' : ''}messages yet.
            </Text>
          )}
          {shown.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => onTap(m)}
              style={[styles.card, { backgroundColor: c.surface, shadowColor: c.ink, borderColor: m.read ? 'transparent' : c.terracotta }]}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{m.name || 'Anonymous'}</Text>
                  <Text style={[styles.email, { color: c.muted }]} numberOfLines={1}>{m.email}{m.company ? ` · ${m.company}` : ''}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.time, { color: c.muted, fontFamily: theme.fontHead }]}>{formatRelative(m.createdAt)}</Text>
                  {!m.read && <View style={[styles.dot, { backgroundColor: c.terracotta }]} />}
                </View>
              </View>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: c.bgAlt }]}>
                  <Text style={[styles.badgeText, { color: c.terracotta }]}>{interestLabel(m.interest)}</Text>
                </View>
                {m.source && (
                  <View style={[styles.badge, { backgroundColor: c.bgAlt }]}>
                    <Text style={[styles.badgeText, { color: c.inkSoft }]}>{m.source}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.message, { color: c.inkSoft }]}
                numberOfLines={expanded === m.id ? undefined : 2}
              >
                {m.message}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[styles.chip, { backgroundColor: active ? c.ink : c.surface, borderColor: active ? c.ink : c.line }]}>
      <Text style={[styles.chipText, { color: active ? c.bg : c.inkSoft }]}>{label}</Text>
    </TouchableOpacity>
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
  heroLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500', textAlign: 'center' },
  heroValue: { fontSize: 52, lineHeight: 78, letterSpacing: -1, marginTop: 8, paddingBottom: 10, textAlign: 'center' },
  heroPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  heroPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroSub: { fontSize: 15, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },

  chipsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  sectionTitle: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitleText: { fontSize: 22, lineHeight: 33, letterSpacing: -0.3 },
  sectionMeta: { fontSize: 11 },

  list: { paddingHorizontal: 16 },
  card: {
    padding: 14, borderRadius: 18, marginBottom: 8, borderWidth: 1.5,
    shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  email: { fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 6 },
  time: { fontSize: 10, fontStyle: 'italic' },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 3 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  message: { fontSize: 13, lineHeight: 19, marginTop: 8 },
});
