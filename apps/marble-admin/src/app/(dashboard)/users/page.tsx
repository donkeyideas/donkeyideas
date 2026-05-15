'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Player {
  id: string;
  visibleId: string;
  playerName: string;
  platform: string;
  coins: number;
  totalSpent: number;
  totalRaces: number;
  passTier: string;
  status: string;
  lastActiveAt: string;
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 7;

  const { data, isLoading } = useQuery({
    queryKey: ['players', page, filter, search],
    queryFn: () =>
      api.get('/players', { params: { page, limit: perPage, search, filter } }).then((r) => r.data),
  });

  const players: Player[] = data?.players ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 0;

  const payingCount = data?.summary?.paying ?? 0;
  const bannedCount = data?.summary?.banned ?? 0;

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
      {/* ============ HEADER ROW ============ */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">
          {fmtNum(total)} total users &bull; {fmtNum(payingCount)} paying &bull; {bannedCount} banned
        </p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors">
            Export CSV
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-marble-blue/15 text-marble-blue border border-marble-blue/30 hover:bg-marble-blue/25 transition-colors">
            + Add Admin
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
                {['User', 'Status', 'Platform', 'Coins', 'Races', 'Total Spent', 'Season Pass', 'Last Active', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
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
                    onClick={() => router.push(`/users/${p.id}`)}
                  >
                    {/* User */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-xs text-gold font-heading flex-shrink-0">
                          {p.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/90">{p.playerName}</p>
                          <p className="text-[10px] text-white/30">{p.visibleId ?? `#${p.id.slice(0, 8)}`}</p>
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

                    {/* Last Active */}
                    <td className="px-4 py-3.5 align-middle text-xs text-white/40">
                      {isBanned ? 'Banned 3d ago' : p.lastActiveAt ? timeAgo(p.lastActiveAt) : '---'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/users/${p.id}`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors"
                        >
                          View
                        </button>
                        {isFlagged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-marble-red hover:bg-marble-red/10 border border-marble-red/30 transition-colors"
                          >
                            Ban
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
    </div>
  );
}
