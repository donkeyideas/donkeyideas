'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CohortFilters {
  platform: string;
  passTier: string;
  status: string;
  coinBalanceMin: string;
  coinBalanceMax: string;
  totalSpentMin: string;
  totalSpentMax: string;
  totalRacesMin: string;
  totalRacesMax: string;
  minStreak: string;
  lastActiveAfter: string;
  lastActiveBefore: string;
  createdAfter: string;
  createdBefore: string;
}

interface SamplePlayer {
  id: string;
  playerName: string;
  platform: string;
  coins: number;
  totalSpent: number;
  totalRaces: number;
  passTier: string;
  lastActiveAt: string;
}

interface CohortResult {
  totalMatched: number;
  avgCoins: number;
  avgSpent: number;
  avgRaces: number;
  avgStreak: number;
  platformBreakdown: { label: string; count: number; pct: number }[];
  tierBreakdown: { label: string; count: number; pct: number }[];
  samplePlayers: SamplePlayer[];
}

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const INITIAL_FILTERS: CohortFilters = {
  platform: 'all',
  passTier: 'all',
  status: 'all',
  coinBalanceMin: '',
  coinBalanceMax: '',
  totalSpentMin: '',
  totalSpentMax: '',
  totalRacesMin: '',
  totalRacesMax: '',
  minStreak: '',
  lastActiveAfter: '',
  lastActiveBefore: '',
  createdAfter: '',
  createdBefore: '',
};

export default function CohortsPage() {
  const [filters, setFilters] = useState<CohortFilters>(INITIAL_FILTERS);
  const [results, setResults] = useState<CohortResult | null>(null);

  const mutation = useMutation({
    mutationFn: (body: CohortFilters) =>
      api.post('/cohorts', body).then((r) => r.data as CohortResult),
    onSuccess: (data) => setResults(data),
  });

  const updateFilter = (key: keyof CohortFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuery = () => {
    mutation.mutate(filters);
  };

  /* ---- Shared input styles ---- */
  const selectCls =
    'w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-gold/40 transition-colors appearance-none cursor-pointer';
  const inputCls =
    'w-full bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-gold/40 transition-colors';
  const labelCls = 'text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5 block';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
      {/* ============ LEFT: FILTER BUILDER ============ */}
      <Card title="Cohort Builder">
        <div className="space-y-4">
          {/* Platform */}
          <div>
            <label className={labelCls}>Platform</label>
            <select
              className={selectCls}
              value={filters.platform}
              onChange={(e) => updateFilter('platform', e.target.value)}
            >
              <option value="all">All</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>
          </div>

          {/* Pass Tier */}
          <div>
            <label className={labelCls}>Pass Tier</label>
            <select
              className={selectCls}
              value={filters.passTier}
              onChange={(e) => updateFilter('passTier', e.target.value)}
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="plus">Plus</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <select
              className={selectCls}
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="flagged">Flagged</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Coin Balance */}
          <div>
            <label className={labelCls}>Coin Balance</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className={inputCls}
                placeholder="Min"
                value={filters.coinBalanceMin}
                onChange={(e) => updateFilter('coinBalanceMin', e.target.value)}
              />
              <input
                type="number"
                className={inputCls}
                placeholder="Max"
                value={filters.coinBalanceMax}
                onChange={(e) => updateFilter('coinBalanceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Total Spent */}
          <div>
            <label className={labelCls}>Total Spent ($)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className={inputCls}
                placeholder="Min"
                value={filters.totalSpentMin}
                onChange={(e) => updateFilter('totalSpentMin', e.target.value)}
              />
              <input
                type="number"
                className={inputCls}
                placeholder="Max"
                value={filters.totalSpentMax}
                onChange={(e) => updateFilter('totalSpentMax', e.target.value)}
              />
            </div>
          </div>

          {/* Total Races */}
          <div>
            <label className={labelCls}>Total Races</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className={inputCls}
                placeholder="Min"
                value={filters.totalRacesMin}
                onChange={(e) => updateFilter('totalRacesMin', e.target.value)}
              />
              <input
                type="number"
                className={inputCls}
                placeholder="Max"
                value={filters.totalRacesMax}
                onChange={(e) => updateFilter('totalRacesMax', e.target.value)}
              />
            </div>
          </div>

          {/* Min Streak */}
          <div>
            <label className={labelCls}>Min Streak</label>
            <input
              type="number"
              className={inputCls}
              placeholder="Minimum streak days"
              value={filters.minStreak}
              onChange={(e) => updateFilter('minStreak', e.target.value)}
            />
          </div>

          {/* Last Active */}
          <div>
            <label className={labelCls}>Last Active</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className={inputCls}
                placeholder="After"
                value={filters.lastActiveAfter}
                onChange={(e) => updateFilter('lastActiveAfter', e.target.value)}
              />
              <input
                type="date"
                className={inputCls}
                placeholder="Before"
                value={filters.lastActiveBefore}
                onChange={(e) => updateFilter('lastActiveBefore', e.target.value)}
              />
            </div>
          </div>

          {/* Created */}
          <div>
            <label className={labelCls}>Created</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className={inputCls}
                placeholder="After"
                value={filters.createdAfter}
                onChange={(e) => updateFilter('createdAfter', e.target.value)}
              />
              <input
                type="date"
                className={inputCls}
                placeholder="Before"
                value={filters.createdBefore}
                onChange={(e) => updateFilter('createdBefore', e.target.value)}
              />
            </div>
          </div>

          {/* Query Button */}
          <button
            onClick={handleQuery}
            disabled={mutation.isPending}
            className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-bold bg-gold/15 text-gold border-2 border-gold/30 hover:bg-gold/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Querying...' : 'Query Cohort'}
          </button>
        </div>
      </Card>

      {/* ============ RIGHT: RESULTS ============ */}
      <div className="space-y-4">
        {mutation.isPending && <LoadingSpinner />}

        {results && !mutation.isPending && (
          <>
            {/* -- Summary Card -- */}
            <Card title="Results">
              <div className="mb-4">
                <span className="font-heading text-[36px] tracking-wide leading-none text-gold">
                  {fmtNum(results.totalMatched)}
                </span>
                <span className="text-sm text-white/50 ml-2">players match</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Avg Coins</p>
                  <p className="text-sm font-semibold text-gold">{fmtNum(Math.round(results.avgCoins))}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Avg Spent</p>
                  <p className="text-sm font-semibold text-marble-green">${results.avgSpent.toFixed(2)}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Avg Races</p>
                  <p className="text-sm font-semibold text-marble-blue">{fmtNum(Math.round(results.avgRaces))}</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">Avg Streak</p>
                  <p className="text-sm font-semibold text-white/80">{results.avgStreak.toFixed(1)}</p>
                </div>
              </div>
            </Card>

            {/* -- Platform & Tier Breakdown -- */}
            <Card title="Platform & Tier Breakdown">
              {/* Platform bars */}
              <div className="mb-4">
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-2">Platform</p>
                <div className="space-y-1.5">
                  {results.platformBreakdown.map((p) => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="text-xs text-white/50 w-16">{p.label}</span>
                      <div className="flex-1 h-2.5 bg-white/[0.08] rounded">
                        <div
                          className="h-full rounded bg-marble-blue"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-marble-blue w-12 text-right">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier bars */}
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-2">Tier</p>
                <div className="space-y-1.5">
                  {results.tierBreakdown.map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className="text-xs text-white/50 w-16">{t.label}</span>
                      <div className="flex-1 h-2.5 bg-white/[0.08] rounded">
                        <div
                          className="h-full rounded bg-gold"
                          style={{ width: `${t.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gold w-12 text-right">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* -- Sample Players Table -- */}
            <Card title="Sample Players">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Name</th>
                      <th className="text-left px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Platform</th>
                      <th className="text-right px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Coins</th>
                      <th className="text-right px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Spent</th>
                      <th className="text-right px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Races</th>
                      <th className="text-left px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Tier</th>
                      <th className="text-right px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.samplePlayers.map((p) => (
                      <tr key={p.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                        <td className="px-2 py-2.5 text-[13px] text-white/80 font-medium">{p.playerName}</td>
                        <td className="px-2 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              p.platform.toLowerCase() === 'ios'
                                ? 'bg-marble-blue/15 text-marble-blue'
                                : 'bg-marble-green/15 text-marble-green'
                            }`}
                          >
                            {p.platform}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-[13px] text-gold text-right font-medium">{fmtNum(p.coins)}</td>
                        <td className="px-2 py-2.5 text-[13px] text-marble-green text-right font-medium">
                          ${p.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-2 py-2.5 text-[13px] text-white/60 text-right">{fmtNum(p.totalRaces)}</td>
                        <td className="px-2 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              p.passTier.toLowerCase() === 'plus'
                                ? 'bg-marble-purple/15 text-marble-purple border-marble-purple/30'
                                : p.passTier.toLowerCase() === 'premium'
                                  ? 'bg-marble-blue/15 text-marble-blue border-marble-blue/30'
                                  : 'bg-white/[0.08] text-white/35 border-white/10'
                            }`}
                          >
                            {p.passTier}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-[13px] text-white/40 text-right">
                          {p.lastActiveAt ? timeAgo(p.lastActiveAt) : '---'}
                        </td>
                      </tr>
                    ))}
                    {results.samplePlayers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-white/30 text-sm">
                          No players in this cohort
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Empty state before first query */}
        {!results && !mutation.isPending && (
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-10 text-center">
            <div className="text-white/20 text-sm">
              Configure filters and click <span className="text-gold font-semibold">Query Cohort</span> to see results.
            </div>
          </div>
        )}

        {/* Error state */}
        {mutation.isError && (
          <div className="bg-marble-red/10 border-2 border-marble-red/20 rounded-2xl p-4 text-center">
            <p className="text-sm text-marble-red">Failed to query cohort. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
