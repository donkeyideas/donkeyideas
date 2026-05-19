import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { getUserOverview, getUsersList, UserOverview, UserRow } from '../../src/api/users';
import { Greeting } from '../../src/components/Greeting';
import { LogoAvatar } from '../../src/components/LogoAvatar';
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

export default function UsersScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [data, setData] = useState<UserOverview | null>(null);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const [overview, list] = await Promise.all([
        getUserOverview('30d'),
        getUsersList({ limit: 25, project: activeFilter === 'all' ? undefined : activeFilter, search: search || undefined }),
      ]);
      setData(overview);
      setUsersList(list.users || []);
      setTotalUsers(list.total || 0);
    } catch (e: any) {
      const status = e?.response?.status;
      const body = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : '';
      setErrorMsg(`${status ? `HTTP ${status} — ` : ''}${e?.message || 'Unknown error'}${body ? `\n${body}` : ''}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.terracotta} />
      </View>
    );
  }

  const projects = data?.usersByProject || [];
  // Map slug -> logo + color from overview projects (the projects API returns logo)
  const projectMeta: Record<string, { logo: string | null | undefined; color: string }> = {};
  projects.forEach((p: any) => {
    projectMeta[p.slug] = { logo: p.logo, color: p.color || c.terracotta };
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.terracotta} />}
      >
        <Greeting subline={dateLabel()} title="The community" />

        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#7f1d1d' }]}>
            <Text style={styles.errorTitle}>API Error</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Hero card */}
        <View style={[styles.hero, { backgroundColor: c.surface, shadowColor: c.ink }]}>
          <Text style={[styles.heroLabel, { color: c.muted }]}>TOTAL USERS · ALL PROJECTS</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heroValue, { color: c.ink, fontFamily: theme.fontHead }]}>
              {formatNumber(data?.totalUsers || 0)}
            </Text>
            <View style={[styles.heroPill, { backgroundColor: c.sage }]}>
              <Text style={styles.heroPillText}>+{data?.newUsers7d || 0} this week</Text>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: c.inkSoft, fontFamily: theme.fontHead }]}>
            across <Text style={{ fontStyle: 'italic', color: c.terracotta }}>{projects.length}</Text> active projects
          </Text>

          <View style={[styles.miniRow, { borderTopColor: c.line }]}>
            <View style={styles.mini}>
              <Text style={[styles.miniNum, { color: c.sage, fontFamily: theme.fontHead }]}>{formatNumber(data?.newUsers30d || 0)}</Text>
              <Text style={[styles.miniLbl, { color: c.muted }]}>NEW (30D)</Text>
            </View>
            <View style={styles.mini}>
              <Text style={[styles.miniNum, { color: c.ink, fontFamily: theme.fontHead }]}>{formatNumber(data?.newUsers7d || 0)}</Text>
              <Text style={[styles.miniLbl, { color: c.muted }]}>NEW (7D)</Text>
            </View>
            <View style={styles.mini}>
              <Text style={[styles.miniNum, { color: c.terracotta, fontFamily: theme.fontHead }]}>{data?.growthRate ? `${data.growthRate.toFixed(0)}%` : '0%'}</Text>
              <Text style={[styles.miniLbl, { color: c.muted }]}>GROWTH</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.search, { backgroundColor: c.surface }]}>
          <Text style={{ color: c.muted, fontSize: 14 }}>⌕</Text>
          <TextInput
            placeholder="Search by name, email, or device..."
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: c.ink, fontFamily: theme.fontBody }]}
          />
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <FilterChip label={`All · ${totalUsers}`} active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} />
          {projects.map((p: any) => (
            <FilterChip
              key={p.slug}
              label={`${p.project} · ${p.count}`}
              active={activeFilter === p.slug}
              onPress={() => setActiveFilter(p.slug)}
            />
          ))}
        </ScrollView>

        {/* Recently joined */}
        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionTitleText, { color: c.ink, fontFamily: theme.fontHead }]}>
            Recently <Text style={{ fontStyle: 'italic', color: c.terracotta }}>joined</Text>
          </Text>
          <Text style={[styles.sectionMeta, { color: c.muted }]}>{usersList.length} of {totalUsers.toLocaleString()}</Text>
        </View>

        <View style={styles.list}>
          {usersList.map((u) => {
            const meta = projectMeta[u.project];
            const displayName = u.name || u.email.split('@')[0] || 'User';
            return (
              <View key={`${u.project}-${u.id}`} style={[styles.userCard, { backgroundColor: c.surface, shadowColor: c.ink }]}>
                <LogoAvatar
                  uri={u.projectLogo || meta?.logo}
                  fallbackLetter={displayName}
                  fallbackColor={meta?.color || u.projectColor}
                  size={38}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.userName, { color: c.ink }]} numberOfLines={1}>{displayName}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.projPill, { backgroundColor: c.bgAlt }]}>
                      <Text style={[styles.projPillText, { color: c.inkSoft }]}>{u.projectName}</Text>
                    </View>
                    <Text style={[styles.userTime, { color: c.muted, fontFamily: theme.fontHead }]}>{formatRelative(u.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.userRight}>
                  <Text style={[styles.roleBadge, { color: c.ink, fontFamily: theme.fontHead }]}>
                    {u.role === 'player' ? 'Player' : 'User'}
                  </Text>
                  {u.status === 'active' && <View style={[styles.activeDot, { backgroundColor: c.sage }]} />}
                </View>
              </View>
            );
          })}
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
    <View
      onTouchEnd={onPress}
      style={[styles.chip, {
        backgroundColor: active ? c.ink : c.surface,
        borderColor: active ? c.ink : c.line,
      }]}
    >
      <Text style={[styles.chipText, { color: active ? c.bg : c.inkSoft }]}>{label}</Text>
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
  heroLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  heroValue: { fontSize: 52, lineHeight: 52, letterSpacing: -1 },
  heroPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 6 },
  heroPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroSub: { fontSize: 15, fontStyle: 'italic', marginTop: 4 },

  miniRow: { flexDirection: 'row', gap: 16, marginTop: 18, paddingTop: 16, borderTopWidth: 1 },
  mini: { flex: 1 },
  miniNum: { fontSize: 24, lineHeight: 26, letterSpacing: -0.5 },
  miniLbl: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },

  search: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  chipsRow: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },

  sectionTitle: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitleText: { fontSize: 22, lineHeight: 24, letterSpacing: -0.3 },
  sectionMeta: { fontSize: 11 },

  list: { paddingHorizontal: 16 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 18, marginBottom: 8,
    shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  userName: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  projPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  projPillText: { fontSize: 9, fontWeight: '500', letterSpacing: 0.3 },
  userTime: { fontSize: 10, fontStyle: 'italic' },
  userRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  roleBadge: { fontSize: 13, fontStyle: 'italic' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
});
