'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import api from '@/lib/api-client';

/* ================================================================== */
/*  Marble colors (display constants, not data)                        */
/* ================================================================== */

const marbleColors: Record<string, string> = {
  dash: 'radial-gradient(circle at 35% 30%, #ff6b6b, #e74c3c)',
  lucky: 'radial-gradient(circle at 35% 30%, #ffd43b, #ffc220)',
  rocky: 'radial-gradient(circle at 35% 30%, #69db7c, #2ecc71)',
  spike: 'radial-gradient(circle at 35% 30%, #4dabf7, #1d56d4)',
  aqua: 'radial-gradient(circle at 35% 30%, #66d9e8, #17a2b8)',
  nova: 'radial-gradient(circle at 35% 30%, #da77f2, #9b59b6)',
  shadow: 'radial-gradient(circle at 35% 30%, #868e96, #495057)',
  frosty: 'radial-gradient(circle at 35% 30%, #74c0fc, #6ec1ff)',
};

/* ================================================================== */
/*  KPI border/accent color map (display constants)                    */
/* ================================================================== */

const kpiColorMap: Record<string, { border: string; text: string; bg: string }> = {
  gold: { border: 'border-gold/20', text: 'text-gold', bg: 'bg-gold' },
  green: { border: 'border-marble-green/20', text: 'text-marble-green', bg: 'bg-marble-green' },
  blue: { border: 'border-marble-blue/20', text: 'text-marble-blue', bg: 'bg-marble-blue' },
  purple: { border: 'border-[#c39bd3]/20', text: 'text-[#c39bd3]', bg: 'bg-[#c39bd3]' },
  white: { border: 'border-white/10', text: 'text-white/90', bg: 'bg-white' },
  red: { border: 'border-marble-red/20', text: 'text-marble-red', bg: 'bg-marble-red' },
};

/* ================================================================== */
/*  All 8 marble names (for "never bet on" computation)                */
/* ================================================================== */

const ALL_MARBLE_NAMES = ['Dash', 'Spike', 'Rocky', 'Lucky', 'Frosty', 'Nova', 'Shadow', 'Aqua'];

function MarbleDot({ name, size = 24 }: { name: string; size?: number }) {
  const bg = marbleColors[name.toLowerCase()] ?? 'radial-gradient(circle at 35% 30%, #999, #666)';
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: bg, boxShadow: '0 2px 0 rgba(0,0,0,0.25), inset 0 -3px 5px rgba(0,0,0,0.2)' }}
    />
  );
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function timeAgo(date: string | null | undefined) {
  if (!date) return '—';
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return '—';
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-marble-green/15 text-marble-green border-marble-green/30',
    banned: 'bg-marble-red/15 text-marble-red border-marble-red/30',
    flagged: 'bg-gold/15 text-gold border-gold/30',
    inactive: 'bg-white/[0.08] text-white/35 border-white/10',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[s] ?? map.inactive}`}>
      {status.toUpperCase()}
    </span>
  );
}

function SectionCard({ title, headerAction, noPad, children, className = '' }: { title?: string; headerAction?: React.ReactNode; noPad?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 border-2 border-white/[0.08] rounded-2xl ${noPad ? '' : 'p-5'} ${className}`}>
      {title && (
        <div className={`flex justify-between items-center mb-4 ${noPad ? 'px-5 pt-5' : ''}`}>
          <h3 className="font-heading text-base tracking-wide">{title}</h3>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const colorMap: Record<string, string> = {
    gold: 'text-gold',
    green: 'text-marble-green',
    red: 'text-marble-red',
    blue: 'text-marble-blue',
    purple: 'text-[#c39bd3]',
  };
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? colorMap[highlight] ?? 'text-white/80' : 'text-white/80'}`}>{value}</span>
    </div>
  );
}

/* ================================================================== */
/*  Heat cell classes                                                  */
/* ================================================================== */

const heatClass = (level: number) => {
  const map: Record<number, string> = {
    0: 'bg-white/[0.04]',
    1: 'bg-marble-green/[0.15]',
    2: 'bg-marble-green/[0.30]',
    3: 'bg-marble-green/[0.50]',
    4: 'bg-marble-green/[0.75]',
    5: 'bg-marble-green',
  };
  return map[level] ?? map[0];
};

/* ================================================================== */
/*  Page component                                                     */
/* ================================================================== */

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [noteText, setNoteText] = useState('');
  const [showAdjustCoins, setShowAdjustCoins] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPushConfirm, setShowPushConfirm] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [racePage, setRacePage] = useState(1);
  const [selectedHeatCell, setSelectedHeatCell] = useState<{ day: number; hour: number } | null>(null);
  const RACE_PER_PAGE = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => api.get(`/players/${id}`).then((r: any) => r.data),
  });

  // All data from API only, no mock fallbacks
  const player = data?.player ?? { id: '', playerName: '', status: 'active', platform: '', coins: 0, totalSpent: 0, totalRaces: 0, passTier: 'free', createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() };
  const betting = data?.betting ?? { wins: 0, losses: 0, winRate: 0, totalWagered: 0, totalWon: 0, netPL: 0, avgBetSize: 0, biggestWin: 0 };
  const kpis: any[] = data?.kpis ?? [];
  const heatmap = data?.heatmap ?? { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], grid: Array.from({ length: 7 }, () => Array(24).fill(0)), peakTime: 'N/A', mostActiveDay: 'N/A' };
  const coinHistory = data?.coinHistory ?? { bars: [], high: 0, low: 0, current: 0, totalIn: 0, totalOut: 0 };
  const raceStats: any[] = data?.raceStats ?? [];
  const adminNotes: any[] = data?.adminNotes ?? [];

  // Marble preferences from API
  const marblePrefsRaw: any[] = data?.marblePreferences ?? [];
  const sortedMarblePrefs = [...marblePrefsRaw].sort((a: any, b: any) => b.bets - a.bets);
  const betOnIds = new Set(marblePrefsRaw.map((m: any) => (m.marbleId ?? m.name ?? '').toLowerCase()));
  const neverBetOn = ALL_MARBLE_NAMES.filter((n: string) => !betOnIds.has(n.toLowerCase()));

  // Purchases from API
  const purchasesList: any[] = data?.purchases ?? [];
  const purchaseTimeline = purchasesList.map((p: any) => ({
    desc: p.productName ?? p.productId ?? 'Purchase',
    amount: `$${(p.priceUsd ?? 0).toFixed(2)}`,
    when: p.purchasedAt ? timeAgo(p.purchasedAt) : '',
  }));
  const purchaseTotal = purchasesList.reduce((s: number, p: any) => s + (p.priceUsd ?? 0), 0);
  const avgPurchase = purchasesList.length > 0 ? purchaseTotal / purchasesList.length : 0;
  const lastPurchase = purchasesList.length > 0 && purchasesList[0].purchasedAt ? timeAgo(purchasesList[0].purchasedAt) : 'N/A';

  // Recent bets from API
  const recentBets: any[] = data?.recentBets ?? [];
  // Recent races from API (used for race history table)
  const recentRaces: any[] = data?.recentRaces ?? [];
  const totalRacePages = Math.max(1, Math.ceil(recentRaces.length / RACE_PER_PAGE));
  const pagedRaces = recentRaces.slice((racePage - 1) * RACE_PER_PAGE, racePage * RACE_PER_PAGE);

  // Game mode usage from API
  const gameModes: any[] = data?.gameModes ?? [];

  // Season progress from API
  const seasonProgressList: any[] = data?.seasonProgress ?? [];
  const latestSeason = seasonProgressList.length > 0 ? seasonProgressList[0] : null;

  // Compute days active
  const daysActive = player.createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(player.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  /* ================================================================== */
  /*  Action handlers                                                    */
  /* ================================================================== */

  async function handleAdjustCoins() {
    const amt = parseInt(adjustAmount);
    if (isNaN(amt) || amt === 0) return;
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/adjust-coins`, { amount: amt, note: adjustNote || undefined });
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      setShowAdjustCoins(false);
      setAdjustAmount('');
      setAdjustNote('');
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to adjust coins');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBan() {
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/ban`, { reason: banReason || undefined });
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      setShowBanConfirm(false);
      setBanReason('');
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to ban player');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnban() {
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/unban`);
      queryClient.invalidateQueries({ queryKey: ['player', id] });
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to unban player');
    } finally {
      setActionLoading(false);
    }
  }

  function handleExportGDPR() {
    /* GDPR data export — produces a multi-sheet .xlsx with one sheet per
     * category (Profile, Betting Stats, Coin History, Race History,
     * Purchases, Marble Preferences, Season Progress). Excel is more
     * useful for ops + support review than the prior single JSON blob;
     * GDPR's "structured, machine-readable" requirement is satisfied by
     * either, but reviewers / legal / support staff can actually open
     * an xlsx and read it without a JSON viewer.
     *
     * One sheet per logical entity so wide tables (race history, coin
     * history) get their own columns instead of being collapsed into
     * one giant nested object. */
    const wb = XLSX.utils.book_new();

    /* Helper: convert any value to something Excel can hold. Dates ->
     * ISO strings, objects -> JSON. Prevents [object Object] cells. */
    const safe = (v: unknown): string | number | boolean | Date | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
      if (v instanceof Date) return v;
      // Date-shaped strings come through as strings already; this catches
      // arrays/objects.
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    };

    /* Flatten a single object into an Excel sheet (key|value rows). Used
     * for the Profile sheet where there's only one record. */
    const objectToSheet = (obj: Record<string, unknown>) => {
      const rows = Object.entries(obj).map(([k, v]) => ({ Field: k, Value: safe(v) }));
      return XLSX.utils.json_to_sheet(rows);
    };

    /* Flatten an array of objects into a normal table sheet. */
    const arrayToSheet = (arr: Record<string, unknown>[]) => {
      if (arr.length === 0) {
        return XLSX.utils.json_to_sheet([{ Note: 'No data' }]);
      }
      const cleaned = arr.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) out[k] = safe(v);
        return out;
      });
      return XLSX.utils.json_to_sheet(cleaned);
    };

    XLSX.utils.book_append_sheet(wb, objectToSheet({
      ...player,
      exportedAt: new Date().toISOString(),
      exportType: 'GDPR data access request',
    }), 'Profile');

    XLSX.utils.book_append_sheet(wb, objectToSheet((betting ?? {}) as Record<string, unknown>), 'Betting Stats');
    /* kpis and raceStats arrive as arrays of {label, value} pairs from the
     * detail API. Map them into a flat object before flattening into a
     * key/value sheet so each KPI row gets its own Field|Value entry. */
    const kpisAsObj: Record<string, unknown> = Array.isArray(kpis)
      ? Object.fromEntries(kpis.map((k: any) => [k?.label ?? '?', k?.value]))
      : ((kpis ?? {}) as Record<string, unknown>);
    const raceStatsAsObj: Record<string, unknown> = Array.isArray(raceStats)
      ? Object.fromEntries(raceStats.map((r: any) => [r?.label ?? '?', r?.value]))
      : ((raceStats ?? {}) as Record<string, unknown>);
    XLSX.utils.book_append_sheet(wb, objectToSheet(kpisAsObj), 'KPIs');
    XLSX.utils.book_append_sheet(wb, objectToSheet(raceStatsAsObj), 'Race Stats');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(coinHistory?.bars ? coinHistory.bars.map((b: number, i: number) => ({ index: i, balance: b })) : []), 'Coin History');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(recentBets ?? []), 'Recent Bets');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(recentRaces ?? []), 'Recent Races');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(purchasesList ?? []), 'Purchases');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(marblePrefsRaw ?? []), 'Marble Preferences');
    XLSX.utils.book_append_sheet(wb, arrayToSheet(seasonProgressList ?? []), 'Season Progress');

    const safeName = (player.playerName || 'player').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `gdpr-export-${safeName}-${id}-${ts}.xlsx`);
  }

  async function handleDelete() {
    /* Actually deletes the player + cascades through every related table
     * (bets, coins, races, purchases, sessions, etc.). Previously this
     * handler called /ban by mistake — the modal said "Delete Forever"
     * but the action was a ban that flipped status without removing
     * data. Now hits the new /delete endpoint. Irreversible. */
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/delete`);
      setShowDeleteConfirm(false);
      // Player no longer exists — bounce back to the users list rather
      // than re-render a detail page for a deleted row.
      router.push('/users');
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to delete player');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePush() {
    /* One-off push to this player only. Server validates the title/body
     * length and that the player has a registered push token. Failures
     * surface via the alert so the admin sees why nothing landed. */
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/push`, { title: pushTitle.trim(), body: pushBody.trim() });
      setShowPushConfirm(false);
      setPushTitle('');
      setPushBody('');
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to send push');
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const coinBars: number[] = coinHistory.bars ?? [];
  const maxBar = coinBars.length > 0 ? Math.max(...coinBars, 1) : 1;

  return (
    <div className="space-y-5">
      {/* ============ BACK LINK ============ */}
      <Link href="/users" className="inline-flex items-center gap-1 text-xs font-bold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors">
        <span>&larr;</span> BACK TO USERS
      </Link>

      {/* ============ ROW 0: PROFILE HEADER ============ */}
      <div className="bg-gradient-to-br from-[#1a4fc2] to-[#0d3a8f] border-2 border-[#4d80ff] rounded-[20px] p-6">
        <div className="flex flex-col lg:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center font-heading text-3xl text-gold flex-shrink-0">
            {(player.playerName || '?').charAt(0).toUpperCase()}
          </div>

          {/* Center info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-[28px] leading-tight">{player.playerName || 'Unknown'}</h2>

            {/* Meta line */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <StatusBadge status={player.status ?? 'active'} />
              <span className="text-[11px] text-white/40 bg-white/5 px-2 py-0.5 rounded font-semibold">{player.platform || '---'}</span>
              <span className="text-[11px] text-white/35">Joined {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="text-[11px] text-white/35">&bull; Last active {player.lastActiveAt ? timeAgo(player.lastActiveAt) : 'N/A'}</span>
              <span className="text-[11px] text-white/35">&bull; {player.version ?? '---'}</span>
              <span className="text-[11px] text-white/25">&bull; {player.id}</span>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-5 mt-4">
              <div>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Coins</p>
                <p className="text-lg font-heading text-gold">{fmtNum(player.coins ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Total Spent</p>
                <p className="text-lg font-heading text-marble-green">${(player.totalSpent ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Races</p>
                <p className="text-lg font-heading text-white/80">{fmtNum(player.totalRaces ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Days Active</p>
                <p className="text-lg font-heading text-white/80">{daysActive}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Season Pass</p>
                <p className="text-lg font-heading text-marble-blue">{(player.passTier ?? 'free').toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={() => setShowAdjustCoins(true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors">
              Adjust Coins
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors">
              Message
            </button>
            <button onClick={() => { player.status === 'banned' ? handleUnban() : setShowBanConfirm(true); }} className="px-4 py-2 rounded-xl text-xs font-bold bg-marble-red/10 text-marble-red border border-marble-red/30 hover:bg-marble-red/20 transition-colors">
              {player.status === 'banned' ? 'Unban User' : 'Ban User'}
            </button>
          </div>
        </div>
      </div>

      {/* ============ ROW 1: 6 KPI CARDS ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi: any, idx: number) => {
          const colors = kpiColorMap[kpi.color] ?? kpiColorMap.white;
          const isChurnRisk = kpi.label === 'Churn Risk';
          return (
            <div key={idx} className={`bg-white/5 border-2 ${colors.border} rounded-2xl p-3.5 relative overflow-hidden`}>
              <div className={`absolute -top-4 -right-4 w-[50px] h-[50px] rounded-full ${colors.bg} opacity-[0.08]`} />
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className={`font-heading text-[22px] leading-none ${colors.text}`}>{kpi.value}</p>
              {isChurnRisk && (
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3, 4].map((i: number) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < (kpi.riskLevel ?? 2) ? colors.bg.replace('bg-', 'bg-') : 'bg-white/10'}`}
                      style={i < (kpi.riskLevel ?? 2) ? undefined : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ ROW 2: BETTING PROFILE + PURCHASE HISTORY ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Betting Profile */}
        <SectionCard title="Betting Profile">
          {/* Win / Loss / Rate */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-2xl text-marble-green">{betting.wins ?? 0}</span>
              <span className="text-xs text-marble-green font-bold">W</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-2xl text-marble-red">{betting.losses ?? 0}</span>
              <span className="text-xs text-marble-red font-bold">L</span>
            </div>
            <div className="flex items-baseline gap-1 ml-auto">
              <span className="font-heading text-2xl text-gold">{betting.winRate ?? 0}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/[0.08] rounded-full overflow-hidden flex mb-5">
            <div className="bg-marble-green h-full rounded-l-full" style={{ width: `${betting.winRate ?? 0}%` }} />
            <div className="bg-marble-red h-full flex-1 rounded-r-full" />
          </div>

          {/* Stat rows */}
          <div className="space-y-0.5">
            <StatRow label="Total Wagered" value={fmtNum(betting.totalWagered ?? 0)} />
            <StatRow label="Total Won" value={fmtNum(betting.totalWon ?? 0)} highlight="green" />
            <StatRow label="Net P/L" value={`${(betting.netPL ?? 0) >= 0 ? '+' : ''}${fmtNum(betting.netPL ?? 0)}`} highlight={(betting.netPL ?? 0) >= 0 ? 'green' : 'red'} />
            <StatRow label="Avg Bet Size" value={fmtNum(betting.avgBetSize ?? 0)} />
            <StatRow label="Biggest Win" value={fmtNum(betting.biggestWin ?? 0)} highlight="gold" />
          </div>
        </SectionCard>

        {/* Purchase History */}
        <SectionCard title="Purchase History">
          {/* Transaction timeline */}
          {purchaseTimeline.length > 0 ? (
            <div className="space-y-0 max-h-[340px] overflow-y-auto mb-4">
              {purchaseTimeline.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-marble-green flex-shrink-0" />
                    <span className="text-xs text-white/60">{t.desc}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-marble-green">{t.amount}</span>
                    <span className="text-[10px] text-white/25 w-20 text-right">{t.when}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 py-8 text-center">No purchases yet</p>
          )}

          {/* Bottom stats */}
          <div className="border-t border-white/[0.06] pt-3 space-y-0.5">
            <StatRow label="Total Spent" value={`$${purchaseTotal.toFixed(2)}`} />
            <StatRow label="Avg Purchase" value={`$${avgPurchase.toFixed(2)}`} />
            <StatRow label="Last Purchase" value={lastPurchase} />
          </div>
        </SectionCard>
      </div>

      {/* ============ ROW 3: MARBLE PREFERENCES + RACE HISTORY ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Marble Preferences */}
        <SectionCard title="Marble Preferences">
          {/* Favorite marble cards */}
          {sortedMarblePrefs.length > 0 ? (
            <div className="space-y-2.5 mb-5">
              {sortedMarblePrefs.map((m: any, idx: number) => {
                const marbleName = m.marbleId ?? m.name ?? 'Unknown';
                const isFavorite = idx === 0;
                return (
                  <div
                    key={marbleName}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isFavorite
                        ? 'bg-gold/[0.06] border-gold/30'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <MarbleDot name={marbleName} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/80 capitalize">{marbleName}</span>
                        {isFavorite && (
                          <span className="text-[9px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded uppercase">Favorite</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-white/35">{m.bets ?? 0} bets</span>
                        <span className="text-[10px] text-white/35">{m.wins ?? 0}W</span>
                        <span className="text-[10px] text-white/35">{m.winRate ?? 0}%</span>
                      </div>
                    </div>
                    {/* Mini bar */}
                    <div className="w-16 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gold/40 rounded-full" style={{ width: `${m.winRate ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/30 py-4 mb-5">No betting data yet</p>
          )}

          {/* Never Bet On */}
          {neverBetOn.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2">Never Bet On</p>
              <div className="flex gap-2 flex-wrap">
                {neverBetOn.map((name: string) => (
                  <div key={name} className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-lg">
                    <MarbleDot name={name} size={16} />
                    <span className="text-xs text-white/40">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Race History */}
        <SectionCard title="Race History" noPad>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {['Course', 'Mode', 'Marble', 'Place', 'Bet', 'Result', 'Payout', 'When'].map((h: string) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRaces.length > 0 ? pagedRaces.map((r: any, i: number) => {
                  const payout = Number(r.payout ?? 0);
                  const betAmt = Number(r.betAmount ?? 0);
                  const courseName = r.courseId ? r.courseId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '---';
                  const placement = Number(r.playerPlacement ?? 0);
                  const mode: string = r.gameMode ?? 'unknown';

                  /* Mode badge styling — gives ops a quick read on what kind
                   * of race produced this row. Bet races have meaningful
                   * win/loss; others are placement-only. */
                  const modeStyles: Record<string, { label: string; cls: string }> = {
                    bet:                   { label: 'BET',         cls: 'bg-gold/15 text-gold border-gold/30' },
                    quick_race:            { label: 'QUICK',       cls: 'bg-white/10 text-white/50 border-white/15' },
                    season:                { label: 'SEASON',      cls: 'bg-marble-blue/15 text-marble-blue border-marble-blue/30' },
                    playoff:               { label: 'PLAYOFF',     cls: 'bg-marble-blue/25 text-marble-blue border-marble-blue/40' },
                    national_race:         { label: 'NATIONAL',    cls: 'bg-[#c39bd3]/15 text-[#c39bd3] border-[#c39bd3]/30' },
                    tournament:            { label: 'TOURNEY',     cls: 'bg-marble-green/15 text-marble-green border-marble-green/30' },
                    multiplayer_tournament:{ label: 'MP TOURNEY',  cls: 'bg-marble-green/25 text-marble-green border-marble-green/40' },
                    unknown:               { label: '—',           cls: 'bg-white/[0.05] text-white/30 border-white/10' },
                  };
                  const modeBadge = modeStyles[mode] ?? modeStyles.unknown;

                  /* Result + payout semantics depend on mode:
                   *   bet            — WIN if r.won, else LOSS; payout = winnings or -betAmount
                   *   tournament     — WIN if 1st (champion); payout column shows the
                   *                    raceRecord.payout the mobile recorded for this
                   *                    round (survival or placement bonus). LOSS only
                   *                    when player marble was eliminated this round.
                   *   quick/season/national/playoff — show placement, no WIN/LOSS frame
                   * The previous code forced every non-bet race to "LOSS / -0",
                   * which painted tournament champions as 10 straight losses. */
                  let resultEl: React.ReactNode;
                  let payoutEl: React.ReactNode;
                  if (mode === 'bet') {
                    const isWin = r.won === true;
                    resultEl = <span className={`text-[10px] font-bold uppercase ${isWin ? 'text-marble-green' : 'text-marble-red'}`}>{isWin ? 'WIN' : 'LOSS'}</span>;
                    payoutEl = <span className={`text-xs font-semibold ${isWin ? 'text-marble-green' : 'text-marble-red'}`}>{isWin ? `+${fmtNum(payout)}` : `-${fmtNum(betAmt)}`}</span>;
                  } else if (mode === 'tournament' || mode === 'multiplayer_tournament') {
                    const isChamp = placement === 1;
                    const eliminated = r.modeContext?.eliminated === true || r.won === false && placement === 0;
                    resultEl = isChamp
                      ? <span className="text-[10px] font-bold uppercase text-gold">CHAMP</span>
                      : eliminated
                        ? <span className="text-[10px] font-bold uppercase text-marble-red">OUT</span>
                        : <span className="text-[10px] font-bold uppercase text-white/50">ADV</span>;
                    payoutEl = payout > 0
                      ? <span className="text-xs font-semibold text-marble-green">+{fmtNum(payout)}</span>
                      : <span className="text-xs text-white/30">—</span>;
                  } else {
                    resultEl = placement > 0
                      ? <span className="text-[10px] font-bold uppercase text-white/70">{placement === 1 ? '1ST' : placement === 2 ? '2ND' : placement === 3 ? '3RD' : `${placement}TH`}</span>
                      : <span className="text-[10px] text-white/30">—</span>;
                    payoutEl = payout > 0
                      ? <span className="text-xs font-semibold text-marble-green">+{fmtNum(payout)}</span>
                      : <span className="text-xs text-white/30">—</span>;
                  }

                  const placeEl = placement > 0
                    ? <span className="text-xs text-white/60">{placement === 1 ? '1st' : placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`}</span>
                    : <span className="text-xs text-white/25">—</span>;

                  return (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs text-white/60">{courseName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${modeBadge.cls}`}>
                          {modeBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {r.playerPickId ? <MarbleDot name={r.playerPickId} size={16} /> : <div className="w-4 h-4 rounded-full bg-white/[0.05]" />}
                          <span className="text-xs text-white/60 capitalize">{r.playerPickId ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">{placeEl}</td>
                      <td className="px-4 py-2.5 text-xs text-white/50">{betAmt > 0 ? fmtNum(betAmt) : <span className="text-white/25">—</span>}</td>
                      <td className="px-4 py-2.5">{resultEl}</td>
                      <td className="px-4 py-2.5">{payoutEl}</td>
                      <td className="px-4 py-2.5 text-[10px] text-white/30">{r.racedAt ? timeAgo(r.racedAt) : '---'}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-white/30 text-sm">No race history</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {recentRaces.length > RACE_PER_PAGE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <span className="text-[11px] text-white/30">
                {(racePage - 1) * RACE_PER_PAGE + 1}-{Math.min(racePage * RACE_PER_PAGE, recentRaces.length)} of {recentRaces.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setRacePage((p) => Math.max(1, p - 1))}
                  disabled={racePage === 1}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalRacePages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRacePage(p)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                      p === racePage ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setRacePage((p) => Math.min(totalRacePages, p + 1))}
                  disabled={racePage === totalRacePages}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/50 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Race Stats Summary */}
          <div className="px-5 py-4 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2">Race Stats Summary</p>
            <div className="space-y-0.5">
              {raceStats.map((s: any, i: number) => (
                <StatRow key={i} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ============ ROW 3.5: GAME MODE USAGE ============ */}
      {gameModes.length > 0 && (() => {
        const modeLabels: Record<string, { label: string; color: string; bg: string }> = {
          bet: { label: 'Betting', color: 'text-gold', bg: 'bg-gold' },
          quick_race: { label: 'Quick Race', color: 'text-marble-blue', bg: 'bg-marble-blue' },
          season: { label: 'Season', color: 'text-marble-green', bg: 'bg-marble-green' },
          national_race: { label: 'National Race', color: 'text-[#c39bd3]', bg: 'bg-[#c39bd3]' },
          tournament: { label: 'Tournament', color: 'text-marble-red', bg: 'bg-marble-red' },
          playoff: { label: 'Playoff', color: 'text-[#f39c12]', bg: 'bg-[#f39c12]' },
        };
        const sortedModes = [...gameModes].sort((a: any, b: any) => b.count - a.count);
        const totalModeRaces = sortedModes.reduce((s: number, m: any) => s + m.count, 0);
        return (
          <SectionCard title="Game Mode Usage">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {sortedModes.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', bg: 'bg-white' };
                const pct = totalModeRaces > 0 ? Math.round((m.count / totalModeRaces) * 100) : 0;
                return (
                  <div key={m.mode} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-center">
                    <p className={`font-heading text-[22px] leading-none ${meta.color}`}>{m.count}</p>
                    <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-1">{meta.label}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
            {/* Bar visualization */}
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden flex">
              {sortedModes.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', bg: 'bg-white' };
                const pct = totalModeRaces > 0 ? (m.count / totalModeRaces) * 100 : 0;
                return (
                  <div
                    key={m.mode}
                    className={`h-full ${meta.bg} opacity-60 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${pct}%` }}
                    title={`${meta.label}: ${m.count} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {sortedModes.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', bg: 'bg-white' };
                return (
                  <div key={m.mode} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.bg} opacity-60`} />
                    <span className="text-[11px] text-white/40">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })()}

      {/* ============ ROW 4: HEATMAP + COIN BALANCE + SEASON PASS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Heatmap */}
        <SectionCard title="Activity Heatmap">
          <p className="text-[10px] text-white/30 mb-2">Click any cell for an hour-by-hour breakdown.</p>
          {/* 7-day x 24-hour grid */}
          <div className="space-y-1 mb-4">
            {/* Hour labels */}
            <div className="flex items-center gap-0.5 ml-8">
              {Array.from({ length: 24 }, (_: any, h: number) => (
                <div key={h} className="flex-1 text-center">
                  {h % 6 === 0 && <span className="text-[8px] text-white/20">{h}</span>}
                </div>
              ))}
            </div>
            {(heatmap.days ?? []).map((day: any, di: number) => (
              <div key={day} className="flex items-center gap-0.5">
                <span className="text-[9px] text-white/25 w-7 text-right pr-1 flex-shrink-0">{day}</span>
                {((heatmap.grid ?? [])[di] ?? []).map((level: any, hi: number) => {
                  const isSelected = selectedHeatCell?.day === di && selectedHeatCell?.hour === hi;
                  const races = heatmap.racesGrid?.[di]?.[hi] ?? 0;
                  const bets = heatmap.betsGrid?.[di]?.[hi] ?? 0;
                  const total = races + bets;
                  return (
                    <button
                      key={hi}
                      type="button"
                      onClick={() => setSelectedHeatCell(isSelected ? null : { day: di, hour: hi })}
                      className={`flex-1 aspect-square rounded-[2px] transition-all cursor-pointer ${heatClass(level)} ${
                        isSelected
                          ? 'ring-2 ring-gold ring-offset-1 ring-offset-[#0a1a3a] scale-125 z-10 relative'
                          : 'hover:ring-1 hover:ring-white/30'
                      }`}
                      title={`${day} ${hi}:00 — ${total} event${total === 1 ? '' : 's'}`}
                      aria-label={`${day} ${hi}:00, ${total} events`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[9px] text-white/25 mr-1">Less</span>
            {[0, 1, 2, 3, 4, 5].map((l: number) => (
              <div key={l} className={`w-3 h-3 rounded-[2px] ${heatClass(l)}`} />
            ))}
            <span className="text-[9px] text-white/25 ml-1">More</span>
          </div>

          <StatRow label="Peak Play Time" value={heatmap.peakTime ?? 'N/A'} />
          <StatRow label="Most Active Day" value={heatmap.mostActiveDay ?? 'N/A'} />
        </SectionCard>

        {/* Coin Balance Over Time */}
        <SectionCard title="Coin Balance Over Time">
          {/* Spark chart */}
          {coinBars.length > 0 ? (
            <div className="flex items-end gap-[2px] h-28 mb-3">
              {coinBars.map((val: any, i: number) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gold/60 hover:bg-gold transition-colors"
                  style={{ height: `${(val / maxBar) * 100}%` }}
                  title={`Day ${i + 1}: ${fmtNum(val)} coins`}
                />
              ))}
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center mb-3">
              <span className="text-sm text-white/30">No transaction history</span>
            </div>
          )}

          {/* Date labels */}
          <div className="flex justify-between mb-4">
            <span className="text-[9px] text-white/20">30 days ago</span>
            <span className="text-[9px] text-white/20">Today</span>
          </div>

          {/* Stats */}
          <div className="space-y-0.5">
            <StatRow label="Current" value={fmtNum(coinHistory.current ?? 0)} highlight="gold" />
            <StatRow label="30-Day High" value={fmtNum(coinHistory.high ?? 0)} highlight="green" />
            <StatRow label="30-Day Low" value={fmtNum(coinHistory.low ?? 0)} highlight="red" />
            <StatRow label="Total In" value={fmtNum(coinHistory.totalIn ?? 0)} />
            <StatRow label="Total Out" value={fmtNum(coinHistory.totalOut ?? 0)} />
          </div>
        </SectionCard>

        {/* Season Pass Progress */}
        <SectionCard title="Season Pass Progress">
          {latestSeason ? (
            <>
              {/* Tier badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-marble-purple/15 text-marble-purple border border-marble-purple/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {(player.passTier ?? 'free').toUpperCase()}
                </span>
              </div>

              {/* Level */}
              <div className="text-center mb-4">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Level</p>
                <p className="font-heading text-[42px] leading-none text-gold mt-1">{latestSeason.level ?? player.passLevel ?? 0}</p>
              </div>

              {/* XP Bar */}
              <div className="mb-5">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-white/30">{latestSeason.xp ?? 0} / {latestSeason.xpNeeded ?? 1000} XP</span>
                  <span className="text-[10px] text-gold font-bold">
                    {Math.round(((latestSeason.xp ?? 0) / (latestSeason.xpNeeded ?? 1000)) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full"
                    style={{ width: `${((latestSeason.xp ?? 0) / (latestSeason.xpNeeded ?? 1000)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Season info */}
              <div className="space-y-0.5">
                <StatRow label="Season" value={`#${latestSeason.seasonNumber ?? '---'}`} />
                <StatRow label="Points" value={fmtNum(latestSeason.points ?? 0)} />
                <StatRow label="Wins" value={String(latestSeason.wins ?? 0)} />
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-white/30">No season data</p>
              <p className="text-xs text-white/20 mt-1">Player has not participated in a season</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ============ ROW 5: ADMIN NOTES + ACCOUNT ACTIONS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Admin Notes */}
        <SectionCard title="Admin Notes">
          {/* Existing notes */}
          <div className="space-y-3 mb-5">
            {adminNotes.length > 0 ? (
              adminNotes.map((note: any, i: number) => (
                <div key={i} className="bg-white/[0.04] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-marble-blue">{note.author ?? 'Admin'}</span>
                    <span className="text-[10px] text-white/25">{note.time ?? (note.createdAt ? timeAgo(note.createdAt) : '')}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{note.text ?? note.content ?? ''}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30 text-center py-4">No admin notes yet</p>
            )}
          </div>

          {/* Add note */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e: any) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-white/5 border-2 border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40 transition-colors"
            />
            <button
              onClick={() => setNoteText('')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors flex-shrink-0"
            >
              Add Note
            </button>
          </div>
        </SectionCard>

        {/* Account Actions */}
        <SectionCard title="Account Actions">
          <div className="space-y-2">
            <button onClick={() => setShowAdjustCoins(true)} className="w-full py-3 rounded-xl text-sm font-bold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors">
              Adjust Coins
            </button>
            <button
              onClick={() => {
                if (!player.hasPushToken) {
                  alert('This player has no registered push token. They need to launch the app at least once with notifications enabled.');
                  return;
                }
                setShowPushConfirm(true);
              }}
              className="w-full py-3 rounded-xl text-sm font-bold bg-marble-blue/15 text-marble-blue border border-marble-blue/30 hover:bg-marble-blue/25 transition-colors"
            >
              Send Push Notification
            </button>
            {/* "Reset Password" removed — the game uses device-ID auth, no
             * passwords exist to reset. If we ever add a password-based
             * sign-in path it returns here. */}
            <button onClick={handleExportGDPR} className="w-full py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors">
              Export User Data (GDPR)
            </button>
            {/* Single Ban/Unban button. The duplicate "Suspend Account" was
             * removed — both buttons opened the same modal and called the
             * same handler, so it was visual clutter that confused operators
             * into thinking they were two different actions. */}
            <button
              onClick={() => { player.status === 'banned' ? handleUnban() : setShowBanConfirm(true); }}
              className="w-full py-3 rounded-xl text-sm font-bold bg-marble-red/10 text-marble-red border border-marble-red/30 hover:bg-marble-red/20 transition-colors"
            >
              {player.status === 'banned' ? 'Unban Account' : 'Ban Account'}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-xl text-sm font-bold bg-marble-red/5 text-marble-red/50 border border-marble-red/15 hover:bg-marble-red/10 hover:text-marble-red/70 transition-colors">
              Delete Account
            </button>
          </div>
        </SectionCard>
      </div>

      {/* ============ MODALS ============ */}

      {/* Adjust Coins Modal */}
      {showAdjustCoins && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAdjustCoins(false)}>
          <div className="bg-[#0d1b3e] border-2 border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-gold mb-4">Adjust Coins</h3>
            <p className="text-xs text-white/40 mb-3">Current balance: <span className="text-gold font-bold">{fmtNum(player.coins)}</span></p>
            <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="Amount (positive to add, negative to deduct)" className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40 mb-3" />
            <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Reason (optional)" className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowAdjustCoins(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleAdjustCoins} disabled={actionLoading || !adjustAmount} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-50">
                {actionLoading ? 'Adjusting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Confirmation Modal */}
      {showBanConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowBanConfirm(false)}>
          <div className="bg-[#0d1b3e] border-2 border-marble-red/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-marble-red mb-2">Ban {player.playerName}?</h3>
            <p className="text-xs text-white/40 mb-4">This will ban the player and invalidate all their sessions. They won&apos;t be able to play until unbanned.</p>
            <input type="text" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Ban reason (optional)" className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-marble-red/40 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowBanConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleBan} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-marble-red text-white hover:bg-marble-red/80 transition-colors disabled:opacity-50">
                {actionLoading ? 'Banning...' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#0d1b3e] border-2 border-marble-red/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-marble-red mb-2">Delete {player.playerName}?</h3>
            <p className="text-xs text-white/60 mb-2">
              <strong className="text-marble-red">This permanently deletes the player record</strong> and cascades through every related table: bet history, coin transactions, race history, purchases, season progress, support tickets, push subscriptions, and active sessions.
            </p>
            <p className="text-xs text-white/40 mb-4">
              Cannot be undone. For temporary action use Ban instead — that preserves the row.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-marble-red text-white hover:bg-marble-red/80 transition-colors disabled:opacity-50">
                {actionLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Push Notification Modal */}
      {showPushConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPushConfirm(false)}>
          <div className="bg-[#0d1b3e] border-2 border-marble-blue/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-marble-blue mb-2">Send Push to {player.playerName}</h3>
            <p className="text-xs text-white/40 mb-4">
              Delivered to the player&apos;s device via Expo Push (Apple APNs / Google FCM). Failures will surface as an alert.
            </p>
            <input
              type="text"
              value={pushTitle}
              onChange={e => setPushTitle(e.target.value)}
              placeholder="Title (max 100 chars)"
              maxLength={100}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-marble-blue/40 mb-3"
            />
            <textarea
              value={pushBody}
              onChange={e => setPushBody(e.target.value)}
              placeholder="Body (max 500 chars)"
              maxLength={500}
              rows={3}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-marble-blue/40 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowPushConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button
                onClick={handlePush}
                disabled={actionLoading || !pushTitle.trim() || !pushBody.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-marble-blue text-white hover:bg-marble-blue/80 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Heatmap Cell Detail Modal */}
      {selectedHeatCell && (() => {
        const dayName = (heatmap.days ?? [])[selectedHeatCell.day] ?? '?';
        const hour = selectedHeatCell.hour;
        const races = heatmap.racesGrid?.[selectedHeatCell.day]?.[selectedHeatCell.hour] ?? 0;
        const bets = heatmap.betsGrid?.[selectedHeatCell.day]?.[selectedHeatCell.hour] ?? 0;
        const total = races + bets;
        const next = (hour + 1) % 24;
        const fmt = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
        return (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHeatCell(null)}
          >
            <div
              className="bg-[#0d1b3e] border-2 border-gold/30 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Activity Slot</div>
                  <h3 className="font-heading text-lg text-gold mt-1">{dayName} · {fmt(hour)} – {fmt(next)}</h3>
                  <p className="text-[11px] text-white/40 mt-1">
                    Aggregated from {player.playerName || 'this player'}&apos;s last 30 days (Eastern Time).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHeatCell(null)}
                  className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 rounded"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Races</div>
                  <div className="font-heading text-2xl text-marble-blue mt-1">{races}</div>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Bets</div>
                  <div className="font-heading text-2xl text-gold mt-1">{bets}</div>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Total</div>
                  <div className="font-heading text-2xl text-marble-green mt-1">{total}</div>
                </div>
              </div>

              {total === 0 && (
                <p className="text-[11px] text-white/40 mt-3 italic">
                  No activity recorded in this hour over the last 30 days.
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
