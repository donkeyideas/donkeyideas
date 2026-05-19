'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Keyword Intelligence panel for the ASO page                        */
/*                                                                     */
/*  Two completely separate views: Apple App Store and Google Play.   */
/*  Switching tabs swaps the entire dataset — summary tiles, table    */
/*  rank column, all of it. Never mixes data between stores.          */
/* ------------------------------------------------------------------ */

interface PlaybookEntry {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: 'navigational' | 'informational' | 'transactional' | 'commercial';
  kei: number;
  androidRank: number | null;
  iosRank: number | null;
  androidTopCompetitor?: string;
  iosTopCompetitor?: string;
  lastSyncedAt?: string;
}

interface PlaybookResponse {
  entries: PlaybookEntry[];
  lastSyncedAt: string | null;
  androidAppId: string;
  iosAppId: string;
}

type SortKey = 'volume' | 'difficulty' | 'kei' | 'rank' | 'keyword';
type Store = 'ios' | 'android';

function fmtRank(rank: number | null): string {
  if (rank === null) return '—';
  return `#${rank}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function intentColor(intent: PlaybookEntry['intent']): string {
  if (intent === 'transactional') return 'bg-marble-green/15 text-marble-green border-marble-green/30';
  if (intent === 'commercial') return 'bg-gold/15 text-gold border-gold/30';
  if (intent === 'navigational') return 'bg-marble-blue/15 text-marble-blue border-marble-blue/30';
  return 'bg-white/10 text-white/60 border-white/15';
}

function rankColor(rank: number | null): string {
  if (rank === null) return 'text-white/30';
  if (rank <= 3) return 'text-marble-green font-bold';
  if (rank <= 10) return 'text-gold font-bold';
  if (rank <= 50) return 'text-marble-blue';
  return 'text-white/50';
}

export function KeywordIntelligence() {
  const queryClient = useQueryClient();
  const [store, setStore] = useState<Store>('ios');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDesc, setSortDesc] = useState(false);
  const [intentFilter, setIntentFilter] = useState<PlaybookEntry['intent'] | 'all'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const autoSyncTriggered = useRef(false);

  const { data, isLoading } = useQuery<PlaybookResponse>({
    queryKey: ['aso-keywords'],
    queryFn: () => api.get('/aso/keywords').then((r: any) => r.data),
    refetchOnWindowFocus: false,
  });

  const entries = data?.entries ?? [];
  const hasData = !!data?.lastSyncedAt;

  /* Auto-trigger one sync on first visit when the cache is empty so the
   * operator never sees the blank "—" state without knowing why. */
  useEffect(() => {
    if (!data) return;
    if (hasData) return;
    if (autoSyncTriggered.current) return;
    if (syncing) return;
    autoSyncTriggered.current = true;
    handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasData]);

  const summary = useMemo(() => {
    const rankKey = store === 'ios' ? 'iosRank' : 'androidRank';
    const ranked = entries.filter((e) => e[rankKey] !== null).length;
    const topTen = entries.filter((e) => (e[rankKey] ?? 999) <= 10).length;
    const topThree = entries.filter((e) => (e[rankKey] ?? 999) <= 3).length;
    return { ranked, topTen, topThree };
  }, [entries, store]);

  const sorted = useMemo(() => {
    const filtered = intentFilter === 'all'
      ? entries
      : entries.filter((e) => e.intent === intentFilter);
    const rankKey = store === 'ios' ? 'iosRank' : 'androidRank';
    return [...filtered].sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      if (sortKey === 'keyword') return a.keyword.localeCompare(b.keyword) * -dir;
      if (sortKey === 'rank') {
        const av = a[rankKey] ?? 999;
        const bv = b[rankKey] ?? 999;
        return (av - bv) * dir;
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
  }, [entries, sortKey, sortDesc, intentFilter, store]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      await api.post('/aso/keywords/sync');
      await queryClient.invalidateQueries({ queryKey: ['aso-keywords'] });
    } catch (e: any) {
      setSyncError(e?.response?.data?.error?.message || e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const lastSynced = data?.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString()
    : 'never';

  const storeLabel = store === 'ios' ? 'Apple App Store' : 'Google Play';
  const appId = store === 'ios' ? data?.iosAppId : data?.androidAppId;

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-heading text-lg tracking-wide">Keyword Intelligence</h2>
          <p className="text-[11px] text-white/35 mt-0.5">
            {storeLabel} · {entries.length} keywords tracked · last synced {lastSynced}
            {appId ? ` · ${appId}` : ''}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing… (~30s)' : hasData ? 'Sync Ranks' : 'Fetch Ranks'}
          </button>
        </div>
      </div>

      {/* Store tabs — Apple vs Google. Switching swaps the whole dataset. */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => setStore('ios')}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-[2px] ${
            store === 'ios'
              ? 'border-marble-blue text-marble-blue'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Apple App Store
        </button>
        <button
          type="button"
          onClick={() => setStore('android')}
          className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-[2px] ${
            store === 'android'
              ? 'border-marble-green text-marble-green'
              : 'border-transparent text-white/40 hover:text-white/70'
          }`}
        >
          Google Play
        </button>
      </div>

      {syncError && (
        <p className="text-xs text-marble-red mb-4 px-3 py-2 rounded bg-marble-red/10 border border-marble-red/30">
          {syncError}
        </p>
      )}

      {!hasData && !syncing && !syncError && (
        <p className="text-xs text-gold mb-4 px-3 py-2 rounded bg-gold/10 border border-gold/30">
          No live rank data yet. Click <strong>Fetch Ranks</strong> to query both stores (~30s).
        </p>
      )}

      {syncing && (
        <p className="text-xs text-marble-blue mb-4 px-3 py-2 rounded bg-marble-blue/10 border border-marble-blue/30">
          Querying {storeLabel} for live ranks… this takes ~30 seconds for 30 keywords.
        </p>
      )}

      {/* Summary tiles — scoped to the active store */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryTile label="Tracked" value={String(entries.length)} color="text-white/90" />
        <SummaryTile
          label={`Ranking on ${store === 'ios' ? 'iOS' : 'Android'}`}
          value={String(summary.ranked)}
          color={store === 'ios' ? 'text-marble-blue' : 'text-marble-green'}
        />
        <SummaryTile label="Top 10" value={String(summary.topTen)} color="text-gold" />
        <SummaryTile label="Top 3" value={String(summary.topThree)} color="text-marble-green" />
      </div>

      {/* Intent filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(['all', 'transactional', 'commercial', 'navigational', 'informational'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setIntentFilter(opt)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
              intentFilter === opt
                ? 'bg-gold/25 text-gold border border-gold/40'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
          >
            {opt === 'all' ? 'All intents' : opt}
          </button>
        ))}
      </div>

      {/* Table — Rank is the lead column, single store only, no font-mono */}
      {isLoading ? (
        <p className="text-xs text-white/40 py-8 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/40">
                <SortHeader k="rank" sortKey={sortKey} sortDesc={sortDesc} onClick={toggleSort} className="text-left">
                  {store === 'ios' ? 'iOS Rank' : 'Android Rank'}
                </SortHeader>
                <SortHeader k="keyword" sortKey={sortKey} sortDesc={sortDesc} onClick={toggleSort} className="text-left">Keyword</SortHeader>
                <SortHeader k="volume" sortKey={sortKey} sortDesc={sortDesc} onClick={toggleSort} className="text-right">Vol</SortHeader>
                <SortHeader k="difficulty" sortKey={sortKey} sortDesc={sortDesc} onClick={toggleSort} className="text-right">Diff</SortHeader>
                <SortHeader k="kei" sortKey={sortKey} sortDesc={sortDesc} onClick={toggleSort} className="text-right">KEI</SortHeader>
                <th className="text-center px-3 py-2 font-bold">Intent</th>
                <th className="text-left px-3 py-2 font-bold">Top Competitor</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => {
                const rank = store === 'ios' ? e.iosRank : e.androidRank;
                const competitor = store === 'ios' ? e.iosTopCompetitor : e.androidTopCompetitor;
                return (
                  <tr key={e.keyword} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                    <td className={`py-2 pr-3 text-left ${rankColor(rank)}`}>{fmtRank(rank)}</td>
                    <td className="py-2 px-3 text-white/85 font-medium">{e.keyword}</td>
                    <td className="py-2 px-3 text-right text-white/65">{fmtNum(e.volume)}</td>
                    <td className="py-2 px-3 text-right text-white/65">{e.difficulty}</td>
                    <td className="py-2 px-3 text-right text-gold font-bold">{e.kei}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${intentColor(e.intent)}`}>
                        {e.intent.slice(0, 4)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-left text-white/50 text-[11px]">{competitor || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-white/30 mt-3">
        Volume / Difficulty / KEI are heuristic estimates (no external keyword API). Ranks are live from{' '}
        {store === 'ios' ? 'the iTunes Search API' : 'google-play-scraper'}. KEI = volume ÷ difficulty × 0.5.
      </p>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]">
      <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{label}</div>
      <div className={`font-heading text-xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function SortHeader({
  k, sortKey, sortDesc, onClick, className, children,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortDesc: boolean;
  onClick: (k: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sortKey === k;
  return (
    <th className={`${className ?? ''} px-3 py-2 font-bold cursor-pointer select-none`}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`hover:text-white/70 transition-colors ${active ? 'text-gold' : ''}`}
      >
        {children}{active ? (sortDesc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
}
