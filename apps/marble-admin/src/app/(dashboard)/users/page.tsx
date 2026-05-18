'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Player {
  id: string;
  deviceId: string;
  playerName: string;
  platform: string;
  coins: number;
  totalSpent: number;
  totalRaces: number;
  passTier: string;
  status: string;
  lastActiveAt: string;
  createdAt: string;
  bannedAt: string | null;
}

/* ------------------------------------------------------------------ */
/*  Filter pill definitions                                            */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { label: 'All Users', value: 'all' },
  { label: 'Paying', value: 'paying' },
  { label: 'Free', value: 'free' },
  { label: 'Banned', value: 'banned' },
  { label: 'Flagged', value: 'flagged' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function timeAgo(date: string) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr${Math.floor(sec / 3600) > 1 ? 's' : ''} ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Inline sub-components                                              */
/* ------------------------------------------------------------------ */

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

function PlatformBadge({ platform }: { platform: string }) {
  const isIos = platform.toLowerCase() === 'ios';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        isIos ? 'bg-marble-blue/15 text-marble-blue' : 'bg-marble-green/15 text-marble-green'
      }`}
    >
      {platform}
    </span>
  );
}

function PassBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase();
  const map: Record<string, string> = {
    plus: 'bg-marble-purple/15 text-marble-purple border-marble-purple/30',
    premium: 'bg-marble-blue/15 text-marble-blue border-marble-blue/30',
    free: 'bg-white/[0.08] text-white/35 border-white/10',
    revoked: 'bg-white/[0.08] text-white/35 border-white/10',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[t] ?? map.free}`}>
      {tier.toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Player Summary Modal                                               */
/* ------------------------------------------------------------------ */

interface PlayerDetail {
  player: {
    id: string;
    playerName: string;
    platform: string;
    coins: number;
    totalSpent: number;
    totalRaces: number;
    passTier: string;
    status: string;
    lastActiveAt: string;
    totalWins: number;
  };
  betting: {
    totalBets: number;
    wins: number;
    losses: number;
    winRate: number;
    totalWagered: number;
    totalWon: number;
    netPL: number;
    avgBetSize: number;
    biggestWin: number;
  };
  kpis: { label: string; value: string; color: string; riskLevel?: number }[];
}

function PlayerSummaryModal({
  playerId,
  onClose,
  onViewFull,
}: {
  playerId: string;
  onClose: () => void;
  onViewFull: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<PlayerDetail>({
    queryKey: ['player-summary', playerId],
    queryFn: () => api.get(`/players/${playerId}`).then((r) => r.data),
    enabled: !!playerId,
  });

  const adjustCoins = useMutation({
    mutationFn: (vars: { amount: number; note: string }) =>
      api.post(`/players/${playerId}/adjust-coins`, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-summary', playerId] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });

  const reconcileBalance = useMutation({
    mutationFn: (mobileBalance: number) =>
      api.post(`/players/${playerId}/reconcile-balance`, { mobileBalance }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['player-summary', playerId] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      const data = res?.data ?? res;
      if (data?.replayed) {
        alert(`Already reconciled (server balance: ${data.balance}). The "v1" backfill only runs once per player.`);
      } else if (data?.credited === 0) {
        alert(`No gap to reconcile — server already has ${data.balance} coins.`);
      } else {
        alert(`Credited ${data.credited} coins. New server balance: ${data.balance}.${data.capped ? ' (Capped at 50,000 — partial credit.)' : ''}`);
      }
    },
  });

  const handleReconcile = () => {
    const current = data?.player?.coins ?? 0;
    const input = window.prompt(
      `Reconcile ${data?.player?.playerName} from their mobile balance.\n\nLook at their phone. Type the coin number shown there.\n\nServer currently shows: ${current.toLocaleString()}\nIf you type a number HIGHER than that, the gap is credited (capped at 50,000).\nIf you type a LOWER or equal number, nothing happens.\nThis only works ONCE per player.`,
      String(current),
    );
    if (input === null) return;
    const mobileBalance = Number(input);
    if (!Number.isFinite(mobileBalance) || mobileBalance < 0 || !Number.isInteger(mobileBalance)) {
      alert('Mobile balance must be a non-negative integer.');
      return;
    }
    reconcileBalance.mutate(mobileBalance);
  };

  const handleAdjustCoins = () => {
    const currentBalance = data?.player?.coins ?? 0;
    const input = window.prompt(
      `Adjust coins for ${data?.player?.playerName}.\nCurrent balance: ${currentBalance.toLocaleString()}\n\nEnter NEW balance (positive integer):`,
      String(currentBalance),
    );
    if (input === null) return;
    const target = Number(input);
    if (!Number.isFinite(target) || target < 0 || !Number.isInteger(target)) {
      alert('New balance must be a non-negative integer.');
      return;
    }
    const delta = target - currentBalance;
    if (delta === 0) return;
    const note = window.prompt(
      `Reason for ${delta > 0 ? 'granting' : 'removing'} ${Math.abs(delta).toLocaleString()} coins?\n(Recorded as admin_adjustment with your admin ID)`,
      '',
    );
    if (note === null) return;
    adjustCoins.mutate({ amount: delta, note: note || `Adjusted from ${currentBalance} to ${target}` });
  };

  const player = data?.player;
  const betting = data?.betting;
  const kpis = data?.kpis ?? [];

  const churnKpi = kpis.find((k) => k.label === 'Churn Risk');
  const churnRisk = churnKpi?.value ?? '---';
  const churnColor =
    churnRisk === 'Low'
      ? 'text-marble-green'
      : churnRisk === 'Medium'
        ? 'text-gold'
        : 'text-marble-red';

  const winRate =
    player && player.totalRaces > 0
      ? Math.round(((player.totalWins ?? 0) / player.totalRaces) * 100)
      : 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-md mx-4 bg-[#0d1b3e] border-2 border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-marble-red">Failed to load player data.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white/80 border border-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Content */}
        {player && !isLoading && !isError && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-xl text-gold font-heading flex-shrink-0">
                  {player.playerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white/90 truncate">{player.playerName}</p>
                  <p className="text-[10px] text-white/30 mb-1.5">#{player.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={player.status} />
                    <PlatformBadge platform={player.platform || '---'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="px-6 py-4 grid grid-cols-2 gap-3">
              {/* Coins */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Coins</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReconcile}
                      disabled={reconcileBalance.isPending}
                      className="text-[9px] font-bold uppercase tracking-wider text-marble-green hover:text-marble-green/80 disabled:opacity-40"
                      title="Reconcile from mobile — type the player's actual phone balance, server credits the gap (one-time, capped at 50K)"
                    >
                      {reconcileBalance.isPending ? '...' : 'Reconcile'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAdjustCoins}
                      disabled={adjustCoins.isPending}
                      className="text-[9px] font-bold uppercase tracking-wider text-marble-blue hover:text-marble-blue/80 disabled:opacity-40"
                      title="Set an exact balance (records as admin_adjustment, repeatable)"
                    >
                      {adjustCoins.isPending ? 'Saving...' : 'Adjust'}
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block flex-shrink-0" />
                  {fmtNum(player.coins)}
                </p>
              </div>

              {/* Total Spent */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Total Spent</p>
                <p className={`text-sm font-semibold ${player.totalSpent > 0 ? 'text-marble-green' : 'text-white/40'}`}>
                  ${player.totalSpent.toFixed(2)}
                </p>
              </div>

              {/* Races */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Races</p>
                <p className="text-sm font-semibold text-white/80">{fmtNum(player.totalRaces)}</p>
              </div>

              {/* Win Rate */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Win Rate</p>
                <p className="text-sm font-semibold text-marble-blue">{winRate}%</p>
              </div>

              {/* Pass Tier */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Pass Tier</p>
                <div className="mt-0.5">
                  <PassBadge tier={player.passTier ?? 'free'} />
                </div>
              </div>

              {/* Churn Risk */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Churn Risk</p>
                <p className={`text-sm font-semibold ${churnColor}`}>{churnRisk}</p>
              </div>
            </div>

            {/* Betting summary */}
            {betting && (
              <div className="px-6 pb-3">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-2">Betting</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-marble-green font-semibold">{fmtNum(betting.wins)} W</span>
                    <span className="text-marble-red font-semibold">{fmtNum(betting.losses)} L</span>
                    <span className="text-white/50">|</span>
                    <span className="text-marble-blue font-semibold">{betting.winRate}% rate</span>
                  </div>
                </div>
              </div>
            )}

            {/* Last Active */}
            <div className="px-6 pb-4">
              <p className="text-[10px] text-white/30">
                Last active: {player.lastActiveAt ? timeAgo(player.lastActiveAt) : '---'}
              </p>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 flex items-center gap-3">
              <button
                onClick={() => onViewFull(player.id)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold/15 text-gold border-2 border-gold/30 hover:bg-gold/25 transition-colors"
              >
                View Full Profile
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/70 border-2 border-white/10 hover:border-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type SortKey = 'playerName' | 'status' | 'platform' | 'coins' | 'totalRaces' | 'totalSpent' | 'passTier' | 'createdAt' | 'lastActiveAt';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Sort state drives the server request — pass it through as sort/dir params
  // so the entire result set is ordered, not just the current 20-row page.
  const { sortKey, sortDir, handleSort } = useSort<SortKey>('createdAt', 'desc');
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['players', page, filter, search, sortKey, sortDir],
    queryFn: () =>
      api.get('/players', {
        params: { page, limit: perPage, search, filter, sort: sortKey, dir: sortDir },
      }).then((r) => r.data),
  });

  const players: Player[] = data?.players ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  const payingCount = data?.summary?.paying ?? 0;
  const bannedCount = data?.summary?.banned ?? 0;

  const banPlayer = useMutation({
    mutationFn: (id: string) => api.post(`/players/${id}/ban`, { reason: 'Banned from Users tab' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
  });

  const handleExportCsv = () => {
    if (players.length === 0) return;
    const cols = ['id', 'playerName', 'platform', 'status', 'coins', 'totalRaces', 'totalSpent', 'passTier', 'createdAt', 'lastActiveAt'] as const;
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(',')];
    for (const p of players) {
      lines.push(cols.map((c) => esc((p as any)[c])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `players-${filter}-page${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---- Pagination helpers ---- */
  const buildPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-5">
      {/* ============ KPI CARDS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Total Users</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">{fmtNum(total)}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            All registered players
          </div>
        </div>

        {/* Paying Users */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Paying Users</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">{fmtNum(payingCount)}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {total > 0 ? ((payingCount / total) * 100).toFixed(1) : 0}% conversion
          </div>
        </div>

        {/* Free Users */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Free Users</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">{fmtNum(Math.max(0, total - payingCount - bannedCount))}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            Non-paying (excl. banned)
          </div>
        </div>

        {/* Banned */}
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Banned</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">{fmtNum(bannedCount)}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            Suspended accounts
          </div>
        </div>
      </div>

      {/* ============ HEADER ROW ============ */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={players.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ============ SEARCH BAR ============ */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by username, email, or user ID..."
          className="w-full bg-white/5 border-2 border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* ============ FILTER PILLS ============ */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
              filter === f.value
                ? 'bg-gold/[0.12] border-gold text-gold'
                : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ============ DATA TABLE ============ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <SortableHeader label="User" sortKey="playerName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Platform" sortKey="platform" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Coins" sortKey="coins" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Races" sortKey="totalRaces" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Total Spent" sortKey="totalSpent" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Season Pass" sortKey="passTier" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Joined" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Last Active" sortKey="lastActiveAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <th className="text-left px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const isBanned = p.status.toLowerCase() === 'banned';
                const isFlagged = p.status.toLowerCase() === 'flagged';
                const spentVal = p.totalSpent;

                return (
                  <tr
                    key={p.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => setSelectedPlayerId(p.id)}
                  >
                    {/* User */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-xs text-gold font-heading flex-shrink-0">
                          {p.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/90">{p.playerName}</p>
                          <p className="text-[10px] text-white/30">#{p.id.slice(0, 8)}</p>
                          {p.deviceId && (
                            <p className="text-[9px] text-white/20 font-mono mt-0.5" title={p.deviceId}>
                              device: {p.deviceId.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 align-middle">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3.5 align-middle">
                      <PlatformBadge platform={p.platform || '---'} />
                    </td>

                    {/* Coins */}
                    <td className="px-4 py-3.5 align-middle">
                      <span className="text-sm text-white/80 flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-gold inline-block flex-shrink-0" />
                        {fmtNum(p.coins)}
                      </span>
                    </td>

                    {/* Races */}
                    <td className="px-4 py-3.5 align-middle text-sm text-white/60">
                      {fmtNum(p.totalRaces)}
                    </td>

                    {/* Total Spent */}
                    <td className="px-4 py-3.5 align-middle text-sm font-medium">
                      <span className={spentVal > 0 ? 'text-marble-green' : 'text-white/40'}>
                        {spentVal > 0 ? `$${spentVal.toFixed(2)}` : '$0.00'}
                      </span>
                    </td>

                    {/* Season Pass */}
                    <td className="px-4 py-3.5 align-middle">
                      <PassBadge tier={p.passTier ?? 'free'} />
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 align-middle text-xs text-white/40">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '---'}
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-3.5 align-middle text-xs text-white/40">
                      {isBanned
                        ? p.bannedAt
                          ? `Banned ${timeAgo(p.bannedAt)}`
                          : 'Banned'
                        : p.lastActiveAt
                          ? timeAgo(p.lastActiveAt)
                          : '---'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlayerId(p.id);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors"
                        >
                          View
                        </button>
                        {isFlagged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Ban "${p.playerName}"? This invalidates their sessions.`)) {
                                banPlayer.mutate(p.id);
                              }
                            }}
                            disabled={banPlayer.isPending}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-marble-red hover:bg-marble-red/10 border border-marble-red/30 transition-colors disabled:opacity-40"
                          >
                            {banPlayer.isPending && banPlayer.variables === p.id ? '...' : 'Ban'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {players.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-white/30 text-sm">
                    No players found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ============ PAGINATION ============ */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/30">
          Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {fmtNum(total)} users
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2.5 py-1 rounded-lg text-xs text-white/50 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &lsaquo;
          </button>

          {buildPageNumbers().map((pn, i) =>
            pn === '...' ? (
              <span key={`dots-${i}`} className="px-1 text-xs text-white/30">
                ...
              </span>
            ) : (
              <button
                key={pn}
                onClick={() => setPage(pn as number)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  pn === page
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'text-white/50 hover:bg-white/5'
                }`}
              >
                {pn}
              </button>
            ),
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded-lg text-xs text-white/50 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      {/* ============ PLAYER SUMMARY MODAL ============ */}
      {selectedPlayerId && (
        <PlayerSummaryModal
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
          onViewFull={(id) => {
            setSelectedPlayerId(null);
            router.push(`/users/${id}`);
          }}
        />
      )}
    </div>
  );
}
