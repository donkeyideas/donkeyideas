'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

function timeAgo(date: string) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
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
  const [noteText, setNoteText] = useState('');
  const [showAdjustCoins, setShowAdjustCoins] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
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
    const exportData = { player, betting, kpis, heatmap, coinHistory, raceStats, marblePreferences: marblePrefsRaw, purchases: purchasesList, recentBets, recentRaces, seasonProgress: seasonProgressList };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-${player.playerName}-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await api.post(`/players/${id}/ban`, { reason: 'Account deleted by admin' });
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      setShowDeleteConfirm(false);
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed');
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
                  {['Course', 'Marble', 'Bet', 'Result', 'Payout', 'When'].map((h: string) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRaces.length > 0 ? recentRaces.map((r: any, i: number) => {
                  const isWin = r.won === true;
                  const payout = Number(r.payout ?? 0);
                  const betAmt = Number(r.betAmount ?? 0);
                  const courseName = r.courseId ? r.courseId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '---';
                  return (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs text-white/60">{courseName}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MarbleDot name={r.playerPickId ?? 'dash'} size={16} />
                          <span className="text-xs text-white/60 capitalize">{r.playerPickId ?? '---'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-white/50">{fmtNum(betAmt)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold uppercase ${isWin ? 'text-marble-green' : 'text-marble-red'}`}>
                          {isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${isWin ? 'text-marble-green' : 'text-marble-red'}`}>
                        {isWin ? `+${fmtNum(payout)}` : `-${fmtNum(betAmt)}`}
                      </td>
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

      {/* ============ ROW 4: HEATMAP + COIN BALANCE + SEASON PASS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Heatmap */}
        <SectionCard title="Activity Heatmap">
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
                {((heatmap.grid ?? [])[di] ?? []).map((level: any, hi: number) => (
                  <div
                    key={hi}
                    className={`flex-1 aspect-square rounded-[2px] ${heatClass(level)}`}
                  />
                ))}
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
            <button className="w-full py-3 rounded-xl text-sm font-bold bg-marble-blue/15 text-marble-blue border border-marble-blue/30 hover:bg-marble-blue/25 transition-colors">
              Send Push Notification
            </button>
            <button className="w-full py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors">
              Reset Password
            </button>
            <button onClick={handleExportGDPR} className="w-full py-3 rounded-xl text-sm font-bold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors">
              Export User Data (GDPR)
            </button>
            <button onClick={() => { player.status === 'banned' ? handleUnban() : setShowBanConfirm(true); }} className="w-full py-3 rounded-xl text-sm font-bold text-gold border-2 border-gold/30 hover:bg-gold/10 transition-colors">
              {player.status === 'banned' ? 'Unban Account' : 'Suspend Account'}
            </button>
            <button onClick={() => setShowBanConfirm(true)} className="w-full py-3 rounded-xl text-sm font-bold bg-marble-red/10 text-marble-red border border-marble-red/30 hover:bg-marble-red/20 transition-colors">
              {player.status === 'banned' ? 'Already Banned' : 'Ban Account'}
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
            <p className="text-xs text-white/40 mb-4">This action cannot be undone. The player&apos;s account will be permanently banned and marked for deletion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-marble-red text-white hover:bg-marble-red/80 transition-colors disabled:opacity-50">
                {actionLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
