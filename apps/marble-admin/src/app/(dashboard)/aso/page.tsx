'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';
import { KeywordIntelligence } from '@/components/aso/KeywordIntelligence';
import { CURRENT_BUILDS } from '@/lib/keyword-playbook';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AppData {
  appId: string;
  title: string;
  score: number | null;
  ratings: number;
  reviews: number;
  installs: string;
  minInstalls: number;
  maxInstalls: number;
  version: string | null;
  updated: string | null;
  genre: string | null;
  developer: string | null;
  icon: string | null;
  headerImage: string | null;
  screenshots: string[];
  summary: string | null;
  description: string | null;
  contentRating: string | null;
  free: boolean;
  price: number;
  histogram: Record<string, number>;
  recentChanges: string | null;
  adSupported: boolean;
}

interface DashboardData {
  store: string;
  ourApp: AppData | null;
  competitors: AppData[];
  notListed?: boolean;
  message?: string;
  fetchedAt: string;
}

interface SearchResult {
  keyword: string;
  rank: number | null;
  topCompetitor: string | null;
  totalResults: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StarRating({ score }: { score: number | null }) {
  if (!score) return <span className="text-white/20 text-sm">No ratings yet</span>;
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`text-sm ${i <= full ? 'text-gold' : i === full + 1 && half ? 'text-gold/50' : 'text-white/10'}`}>
            &#9733;
          </span>
        ))}
      </div>
      <span className="font-heading text-lg text-gold">{score.toFixed(1)}</span>
    </div>
  );
}

function HistogramBar({ histogram }: { histogram: Record<string, number> }) {
  const total = Object.values(histogram).reduce((s, v) => s + v, 0) || 1;
  const maxVal = Math.max(...Object.values(histogram), 1);
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = histogram[String(star)] ?? 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 w-3 text-right">{star}</span>
            <span className="text-[10px] text-gold">&#9733;</span>
            <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(count / maxVal) * 100}%` }} />
            </div>
            <span className="text-[10px] text-white/25 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function CompetitorCard({ app, ourInstalls }: { app: AppData; ourInstalls: number }) {
  const installDiff = app.minInstalls > 0 && ourInstalls > 0
    ? Math.round((app.minInstalls / ourInstalls))
    : null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start gap-3 mb-3">
        {app.icon && (
          <img src={app.icon} alt={app.title} className="w-12 h-12 rounded-xl" crossOrigin="anonymous" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/80 truncate">{app.title}</p>
          <p className="text-[10px] text-white/30">{app.developer}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider font-bold">Rating</p>
          <p className="text-sm font-heading text-gold">{app.score ? app.score.toFixed(1) : 'N/A'}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider font-bold">Reviews</p>
          <p className="text-sm font-heading text-white/60">{app.reviews?.toLocaleString() ?? '0'}</p>
        </div>
        <div>
          <p className="text-[9px] text-white/25 uppercase tracking-wider font-bold">Installs</p>
          <p className="text-sm font-heading text-marble-green">{app.installs}</p>
        </div>
      </div>
      {installDiff !== null && installDiff > 1 && (
        <div className="mt-2 text-[10px] text-marble-red/70">{installDiff}x more installs than you</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Store Conversion: impressions -> installs funnel                   */
/* ------------------------------------------------------------------ */

interface ConversionData {
  store: 'play' | 'ios';
  months: { month: string; installs: number }[];
  impressions: Record<string, number>;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function StoreConversion({ store }: { store: 'play' | 'ios' }) {
  const queryClient = useQueryClient();
  const benchmark = store === 'play' ? 25 : 18; // % conversion target
  const benchmarkLabel = store === 'play' ? '25% (Play Store avg)' : '18% (App Store avg)';

  const [edits, setEdits] = useState<Record<string, number | null>>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<ConversionData>({
    queryKey: ['aso-conversion', store],
    queryFn: () => api.get(`/aso/conversion?store=${store}`).then((r) => r.data),
  });

  // Reset edits when store changes
  useEffect(() => {
    setEdits({});
    setDirty(false);
  }, [store]);

  const saveMutation = useMutation({
    mutationFn: (impressions: Record<string, number>) =>
      api.post('/aso/conversion', { store, impressions }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aso-conversion', store] });
      setEdits({});
      setDirty(false);
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const merged: Record<string, number> = { ...data.impressions };
    for (const [m, v] of Object.entries(edits)) {
      if (v == null) delete merged[m];
      else merged[m] = v;
    }
    return data.months.slice(0, 6).map((m) => {
      const impressions = merged[m.month] ?? null;
      const cvr = impressions != null && impressions > 0 ? (m.installs / impressions) * 100 : null;
      return { month: m.month, installs: m.installs, impressions, cvr };
    });
  }, [data, edits]);

  const currentRow = rows[0];

  function handleEdit(month: string, raw: string) {
    const digits = raw.replace(/[^\d]/g, '');
    setEdits((prev) => ({ ...prev, [month]: digits === '' ? null : Number(digits) }));
    setDirty(true);
  }

  function handleSave() {
    const merged: Record<string, number> = { ...(data?.impressions ?? {}) };
    for (const [m, v] of Object.entries(edits)) {
      if (v == null) delete merged[m];
      else merged[m] = v;
    }
    saveMutation.mutate(merged);
  }

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="font-heading text-base tracking-wide">Store Conversion</div>
          <p className="text-[11px] text-white/35 mt-0.5">
            Impressions &rarr; Installs funnel &middot; Target {benchmarkLabel}
          </p>
          <p className="text-[10px] text-white/25 mt-0.5">
            {store === 'play'
              ? 'Source: Play Console &rarr; Statistics &rarr; Store performance'
              : 'Source: App Store Connect &rarr; Trends &rarr; Impressions'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveMutation.isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Impressions'}
        </button>
      </div>

      {/* Current-month summary tile */}
      {currentRow && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <SummaryStat
            label="Current Month"
            value={monthLabel(currentRow.month)}
          />
          <SummaryStat
            label="Impressions"
            value={currentRow.impressions != null ? currentRow.impressions.toLocaleString() : '---'}
          />
          <SummaryStat
            label="Installs"
            value={currentRow.installs.toLocaleString()}
          />
          <SummaryStat
            label="Conversion"
            value={currentRow.cvr != null ? `${currentRow.cvr.toFixed(1)}%` : '---'}
            tone={
              currentRow.cvr == null
                ? undefined
                : currentRow.cvr >= benchmark
                  ? 'pos'
                  : 'neg'
            }
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Month</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Impressions</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Installs</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Conversion</th>
                <th className="text-right px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">vs Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const editedVal = edits[r.month];
                const inputValue =
                  editedVal === null
                    ? ''
                    : editedVal !== undefined
                      ? editedVal
                      : r.impressions ?? '';
                const displayValue =
                  inputValue === '' || inputValue == null
                    ? ''
                    : Number(inputValue).toLocaleString('en-US');
                const delta = r.cvr != null ? r.cvr - benchmark : null;
                return (
                  <tr key={r.month} className="border-b border-white/[0.04]">
                    <td className="px-3 py-3 text-sm font-semibold text-white/80">{monthLabel(r.month)}</td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={displayValue}
                        placeholder="Enter"
                        aria-label={`Impressions for ${monthLabel(r.month)}`}
                        onChange={(e) => handleEdit(r.month, e.target.value)}
                        className="w-32 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white text-sm text-right font-semibold focus:outline-none focus:border-gold/50 focus:bg-gold/[0.08] placeholder:text-white/25 placeholder:italic placeholder:font-normal"
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-white/80">{r.installs.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold">
                      {r.cvr == null ? (
                        <span className="text-white/30">---</span>
                      ) : (
                        <span className={r.cvr >= benchmark ? 'text-marble-green' : 'text-marble-red'}>
                          {r.cvr.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {delta == null ? (
                        <span className="text-white/30">---</span>
                      ) : (
                        <span className={delta >= 0 ? 'text-marble-green' : 'text-marble-red'}>
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(1)} pts
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-white/30 text-sm">
                    No install data yet for this store.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
}) {
  const color = tone === 'pos' ? 'text-marble-green' : tone === 'neg' ? 'text-marble-red' : 'text-white/80';
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-white/35 uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className={`text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort key types                                                     */
/* ------------------------------------------------------------------ */

type CompetitorSortKey = 'title' | 'score' | 'reviews' | 'minInstalls' | 'version';
type SearchHistorySortKey = 'keyword' | 'rank' | 'topCompetitor' | 'totalResults';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ASOPage() {
  const [store, setStore] = useState<'play' | 'ios'>('play');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  const { sortKey: compSortKey, sortDir: compSortDir, handleSort: handleCompSort, sortItems: sortCompItems } = useSort<CompetitorSortKey>();
  const { sortKey: histSortKey, sortDir: histSortDir, handleSort: handleHistSort, sortItems: sortHistItems } = useSort<SearchHistorySortKey>();

  // Auto-fetch dashboard data
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['aso-dashboard', store],
    queryFn: () => api.get(`/aso/dashboard?store=${store}`).then((r: any) => r.data),
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });

  const ourApp = data?.ourApp;
  const competitors = data?.competitors ?? [];

  // Search for keyword rank
  async function handleSearch() {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await api.post('/aso/search', { keyword: searchTerm.trim().toLowerCase(), store });
      const result = res.data;
      setSearchResult(result);
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => h.keyword !== result.keyword);
        return [result, ...filtered].slice(0, 20);
      });
    } catch { /* ignore */ }
    setIsSearching(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-wide">Store Intelligence</h1>
          <p className="text-[11px] text-white/35 mt-1">
            Live data from {store === 'play' ? 'Google Play' : 'Apple App Store'}
            {data?.fetchedAt && ` \u00b7 Fetched ${new Date(data.fetchedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <button onClick={() => setStore('play')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${store === 'play' ? 'bg-marble-green/20 text-marble-green border border-marble-green/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
              Play Store
            </button>
            <button onClick={() => setStore('ios')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${store === 'ios' ? 'bg-marble-blue/20 text-marble-blue border border-marble-blue/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
              App Store
            </button>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
          <p className="text-white/40 text-sm">Fetching live data from {store === 'play' ? 'Google Play' : 'App Store'}...</p>
        </div>
      )}

      {isError && (
        <div className="bg-marble-red/10 border-2 border-marble-red/20 rounded-2xl p-6 text-center">
          <p className="text-marble-red font-semibold mb-2">Failed to fetch store data</p>
          <p className="text-white/40 text-xs mb-4">The store scraper may have timed out. Try refreshing.</p>
          <button onClick={() => refetch()}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-marble-red text-white hover:bg-marble-red/80 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* iOS not listed */}
      {!isLoading && data?.notListed && (
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-8 text-center">
          <p className="font-heading text-lg text-marble-blue mb-2">Not Listed on App Store</p>
          <p className="text-white/40 text-sm">Your app is not yet available on the Apple App Store.</p>
          <p className="text-white/25 text-xs mt-2">Switch to Play Store to see your live listing data.</p>
        </div>
      )}

      {/* Our App - Main Card */}
      {ourApp && (
        <div className="bg-white/5 border-2 border-gold/15 rounded-2xl overflow-hidden">
          {/* Header with icon */}
          <div className="p-6 flex items-start gap-5">
            {ourApp.icon && (
              <img src={ourApp.icon} alt={ourApp.title} className="w-20 h-20 rounded-2xl shadow-lg flex-shrink-0" crossOrigin="anonymous" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-heading text-xl tracking-wide">{ourApp.title}</h2>
                {ourApp.free && (
                  <span className="text-[10px] font-bold text-marble-green bg-marble-green/10 px-2 py-0.5 rounded-full uppercase">Free</span>
                )}
              </div>
              <p className="text-xs text-white/40 mb-2">{ourApp.developer} &middot; {ourApp.genre} &middot; {ourApp.contentRating}</p>
              <StarRating score={ourApp.score} />
              {ourApp.summary && (
                <p className="text-xs text-white/40 mt-2 line-clamp-2">{ourApp.summary}</p>
              )}
            </div>
          </div>

          {/* Stats Row. Build # comes from CURRENT_BUILDS since the public
              store APIs don't expose it — bump that constant on release. */}
          <div className="border-t border-white/[0.06] px-6 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Installs</p>
              <p className="font-heading text-xl text-marble-green">{ourApp.installs}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Reviews</p>
              <p className="font-heading text-xl text-white/60">{ourApp.reviews.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Version</p>
              <p className="font-heading text-xl text-white/50">{ourApp.version || CURRENT_BUILDS[store === 'play' ? 'android' : 'ios'].version}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">{store === 'play' ? 'Release #' : 'Build #'}</p>
              <p className="font-heading text-xl text-gold">{CURRENT_BUILDS[store === 'play' ? 'android' : 'ios'].build}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-white/50">{ourApp.updated ? new Date(ourApp.updated).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Screenshots</p>
              <p className="font-heading text-xl text-white/50">{ourApp.screenshots.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Ads</p>
              <p className="text-sm text-white/50">{ourApp.adSupported ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Rating Histogram */}
          {ourApp.histogram && Object.values(ourApp.histogram).some((v) => v > 0) && (
            <div className="border-t border-white/[0.06] px-6 py-4">
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-3">Rating Breakdown</p>
              <div className="max-w-xs">
                <HistogramBar histogram={ourApp.histogram} />
              </div>
            </div>
          )}

          {/* Screenshots Preview */}
          {ourApp.screenshots.length > 0 && (
            <div className="border-t border-white/[0.06] px-6 py-4">
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-3">Screenshots ({ourApp.screenshots.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ourApp.screenshots.slice(0, 6).map((url, i) => (
                  <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="h-40 rounded-lg flex-shrink-0 border border-white/[0.06]" crossOrigin="anonymous" />
                ))}
              </div>
            </div>
          )}

          {/* Recent Changes */}
          {ourApp.recentChanges && (
            <div className="border-t border-white/[0.06] px-6 py-4">
              <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-2">What&apos;s New</p>
              <p className="text-xs text-white/40 whitespace-pre-line">{ourApp.recentChanges}</p>
            </div>
          )}
        </div>
      )}

      {/* Store Conversion (Impressions → Installs) */}
      {!isLoading && !data?.notListed && <StoreConversion store={store} />}

      {/* Competitor Landscape */}
      {competitors.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-heading text-base tracking-wide">Competitor Landscape</div>
              <p className="text-[11px] text-white/35 mt-0.5">Top marble racing apps on {store === 'play' ? 'Google Play' : 'App Store'}</p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <SortableHeader label="App" sortKey="title" currentSort={compSortKey} currentDir={compSortDir} onSort={handleCompSort} />
                  <SortableHeader label="Rating" sortKey="score" currentSort={compSortKey} currentDir={compSortDir} onSort={handleCompSort} className="text-center" />
                  <SortableHeader label="Reviews" sortKey="reviews" currentSort={compSortKey} currentDir={compSortDir} onSort={handleCompSort} className="text-center" />
                  <SortableHeader label="Installs" sortKey="minInstalls" currentSort={compSortKey} currentDir={compSortDir} onSort={handleCompSort} className="text-center" />
                  <SortableHeader label="Version" sortKey="version" currentSort={compSortKey} currentDir={compSortDir} onSort={handleCompSort} className="text-center" />
                </tr>
              </thead>
              <tbody>
                {/* Our app row (highlighted) */}
                {ourApp && (
                  <tr className="border-b border-gold/10 bg-gold/[0.04]">
                    <td className="px-3 py-3 flex items-center gap-2">
                      {ourApp.icon && <img src={ourApp.icon} alt="" className="w-7 h-7 rounded-lg" crossOrigin="anonymous" />}
                      <div>
                        <span className="text-sm font-semibold text-gold">{ourApp.title}</span>
                        <span className="text-[9px] text-gold/50 ml-2 uppercase">You</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 font-heading text-sm text-gold">{ourApp.score?.toFixed(1) ?? '—'}</td>
                    <td className="text-center px-3 py-3 text-sm text-gold">{ourApp.reviews.toLocaleString()}</td>
                    <td className="text-center px-3 py-3 text-sm text-gold">{ourApp.installs}</td>
                    <td className="text-center px-3 py-3 text-xs text-gold/60">{ourApp.version}</td>
                  </tr>
                )}
                {/* Competitor rows */}
                {sortCompItems(competitors).map((app) => (
                  <tr key={app.appId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 flex items-center gap-2">
                      {app.icon && <img src={app.icon} alt="" className="w-7 h-7 rounded-lg" crossOrigin="anonymous" />}
                      <div>
                        <span className="text-sm text-white/70">{app.title}</span>
                        <p className="text-[10px] text-white/25">{app.developer}</p>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 font-heading text-sm text-white/60">{app.score?.toFixed(1) ?? '—'}</td>
                    <td className="text-center px-3 py-3 text-sm text-white/50">{app.reviews?.toLocaleString() ?? '0'}</td>
                    <td className="text-center px-3 py-3 text-sm text-marble-green">{app.installs}</td>
                    <td className="text-center px-3 py-3 text-xs text-white/30">{app.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keyword Rank Checker */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="font-heading text-base tracking-wide mb-1">Keyword Rank Checker</div>
        <p className="text-[11px] text-white/35 mb-4">
          Search any keyword to see where your app ranks in {store === 'play' ? 'Google Play' : 'App Store'} results
        </p>
        <div className="flex gap-3">
          <input
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setSearchResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
            placeholder="e.g. marble racing, betting game, marble simulator..."
          />
          <button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-50">
            {isSearching ? 'Searching...' : 'Check Rank'}
          </button>
        </div>

        {/* Result */}
        {searchResult && (
          <div className="mt-4 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Keyword</p>
                <p className="text-base font-semibold text-white/80">&ldquo;{searchResult.keyword}&rdquo;</p>
              </div>
              <div>
                <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Your Rank</p>
                {searchResult.rank !== null ? (
                  <p className={`font-heading text-2xl ${searchResult.rank <= 3 ? 'text-marble-green' : searchResult.rank <= 10 ? 'text-gold' : 'text-marble-red'}`}>
                    #{searchResult.rank}
                  </p>
                ) : (
                  <p className="font-heading text-lg text-marble-red">Not Found</p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">#1 Result</p>
                <p className="text-sm text-white/50">{searchResult.topCompetitor || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/25 uppercase font-bold tracking-wider mb-1">Total Results</p>
                <p className="text-sm text-white/50">{searchResult.totalResults} apps</p>
              </div>
            </div>
            {searchResult.rank !== null && searchResult.rank <= 5 && (
              <div className="mt-3 text-[11px] text-marble-green bg-marble-green/10 px-3 py-1.5 rounded-lg inline-block">
                Great position! You&apos;re in the top {searchResult.rank} for this keyword.
              </div>
            )}
            {searchResult.rank === null && (
              <div className="mt-3 text-[11px] text-marble-red/70 bg-marble-red/10 px-3 py-1.5 rounded-lg inline-block">
                Your app doesn&apos;t appear in the top 250 results for this keyword.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base tracking-wide">Search History</div>
            <button onClick={() => setSearchHistory([])}
              className="text-[10px] text-white/25 hover:text-white/50 transition-colors">
              Clear
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <SortableHeader label="Keyword" sortKey="keyword" currentSort={histSortKey} currentDir={histSortDir} onSort={handleHistSort} />
                  <SortableHeader label="Rank" sortKey="rank" currentSort={histSortKey} currentDir={histSortDir} onSort={handleHistSort} className="text-center" />
                  <SortableHeader label="#1 Result" sortKey="topCompetitor" currentSort={histSortKey} currentDir={histSortDir} onSort={handleHistSort} />
                  <SortableHeader label="Results" sortKey="totalResults" currentSort={histSortKey} currentDir={histSortDir} onSort={handleHistSort} className="text-center" />
                </tr>
              </thead>
              <tbody>
                {sortHistItems(searchHistory).map((h) => (
                  <tr key={h.keyword} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => { setSearchTerm(h.keyword); setSearchResult(h); }}>
                    <td className="px-4 py-2.5 text-sm text-white/60">{h.keyword}</td>
                    <td className="text-center px-4 py-2.5">
                      {h.rank !== null ? (
                        <span className={`font-heading text-base ${h.rank <= 3 ? 'text-marble-green' : h.rank <= 10 ? 'text-gold' : h.rank <= 50 ? 'text-white/50' : 'text-marble-red'}`}>
                          #{h.rank}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{h.topCompetitor || '—'}</td>
                    <td className="text-center px-4 py-2.5 text-xs text-white/30">{h.totalResults}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keyword Intelligence — curated playbook with live rank checks */}
      <KeywordIntelligence />
    </div>
  );
}
