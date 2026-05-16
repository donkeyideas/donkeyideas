'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Keyword {
  id: string;
  store: string;
  keyword: string;
  rank: number | null;
  volume: string | null;
  difficulty: number;
  kei: number;
  topCompetitor: string | null;
  relevance: number;
  intent: string;
  delta7d: number | null;
  updatedAt: string;
}

interface StoreSnapshot {
  id: string;
  store: string;
  rating: number | null;
  reviews: number;
  installs: string | null;
  version: string | null;
  lastUpdated: string | null;
  genre: string | null;
  developer: string | null;
  rawData: any;
  fetchedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-white/20 text-xs">&mdash;</span>;
  if (rank <= 3) return <span className="font-heading text-lg text-marble-green">#{rank}</span>;
  if (rank <= 10) return <span className="font-heading text-lg text-gold">#{rank}</span>;
  if (rank <= 50) return <span className="font-heading text-lg text-white/60">#{rank}</span>;
  return <span className="font-heading text-lg text-marble-red">#{rank}</span>;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 0) return <span className="text-[10px] font-bold text-marble-green">&#9650;{delta}</span>;
  if (delta < 0) return <span className="text-[10px] font-bold text-marble-red">&#9660;{Math.abs(delta)}</span>;
  return <span className="text-[10px] font-bold text-white/30">&mdash;</span>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const emptyForm = { keyword: '', rank: '', volume: '', difficulty: '', kei: '', topCompetitor: '', relevance: '', intent: 'informational' };

export default function ASOPage() {
  const queryClient = useQueryClient();
  const [store, setStore] = useState<'play' | 'ios'>('play');
  const [sortKey, setSortKey] = useState<'rank' | 'volume' | 'kei' | 'relevance'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Search & Track state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<{ keyword: string; rank: number | null; topCompetitor: string | null; totalResults: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Fetch keywords
  const { data: kwData, isLoading } = useQuery({
    queryKey: ['aso-keywords', store],
    queryFn: () => api.get(`/aso/keywords?store=${store}`).then((r: any) => r.data),
  });
  const keywords: Keyword[] = kwData?.keywords ?? [];

  // Fetch store snapshot
  const { data: storeData } = useQuery({
    queryKey: ['aso-store', store],
    queryFn: () => api.get(`/aso/store?store=${store}`).then((r: any) => r.data),
  });
  const snapshot: StoreSnapshot | null = storeData?.snapshot ?? null;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/aso/keywords', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aso-keywords', store] });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/aso/keywords?id=${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aso-keywords', store] }),
  });

  const refreshStoreMutation = useMutation({
    mutationFn: () => api.post(`/aso/store?store=${store}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aso-store', store] }),
  });

  const refreshAllMutation = useMutation({
    mutationFn: () => api.post(`/aso/refresh?store=${store}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aso-keywords', store] }),
  });

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Suggest keywords as user types
  function handleSearchInput(val: string) {
    setSearchTerm(val);
    setSearchResult(null);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get(`/aso/suggest?term=${encodeURIComponent(val)}&store=${store}`);
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 300);
  }

  // Search for a keyword on the store
  async function handleSearch(term?: string) {
    const kw = term || searchTerm;
    if (!kw.trim()) return;
    setSearchTerm(kw);
    setIsSearching(true);
    setShowSuggestions(false);
    setSearchResult(null);
    try {
      const res = await api.post('/aso/search', { keyword: kw.trim().toLowerCase(), store });
      setSearchResult(res.data);
    } catch { /* ignore */ }
    setIsSearching(false);
  }

  // Track a searched keyword (save to DB with real rank)
  async function handleTrack() {
    if (!searchResult) return;
    setIsSearching(true);
    try {
      await api.post('/aso/search', {
        keyword: searchResult.keyword,
        store,
        track: true,
      });
      queryClient.invalidateQueries({ queryKey: ['aso-keywords', store] });
      setSearchTerm('');
      setSearchResult(null);
    } catch { /* ignore */ }
    setIsSearching(false);
  }

  function handleSave() {
    saveMutation.mutate({
      store,
      keyword: form.keyword,
      rank: form.rank ? parseInt(form.rank) : null,
      volume: form.volume || null,
      difficulty: parseInt(form.difficulty) || 0,
      kei: parseInt(form.kei) || 0,
      topCompetitor: form.topCompetitor || null,
      relevance: parseInt(form.relevance) || 0,
      intent: form.intent,
    });
  }

  function startEdit(kw: Keyword) {
    setEditId(kw.id);
    setForm({
      keyword: kw.keyword,
      rank: kw.rank !== null ? String(kw.rank) : '',
      volume: kw.volume || '',
      difficulty: String(kw.difficulty),
      kei: String(kw.kei),
      topCompetitor: kw.topCompetitor || '',
      relevance: String(kw.relevance),
      intent: kw.intent,
    });
    setShowForm(true);
  }

  // Sorting
  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...keywords].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === 'rank') { av = a.rank ?? 9999; bv = b.rank ?? 9999; }
    else if (sortKey === 'volume') { av = parseFloat((a.volume || '0').replace('K', '')) * 1000; bv = parseFloat((b.volume || '0').replace('K', '')) * 1000; }
    else if (sortKey === 'kei') { av = a.kei; bv = b.kei; }
    else { av = a.relevance; bv = b.relevance; }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // KPI stats
  const tracked = keywords.length;
  const rankingTop10 = keywords.filter((k) => k.rank !== null && k.rank <= 10).length;
  const ranking1 = keywords.filter((k) => k.rank === 1).length;
  const notRanking = keywords.filter((k) => k.rank === null).length;

  const lastUpdated = keywords.length > 0
    ? new Date(Math.max(...keywords.map((k) => new Date(k.updatedAt).getTime()))).toLocaleDateString()
    : 'Never';

  const alreadyTracked = searchResult ? keywords.some(k => k.keyword === searchResult.keyword) : false;

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <span className="text-white/15 ml-1">&udarr;</span>;
    return <span className="text-gold ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-wide">App Store Optimization</h1>
          <p className="text-[11px] text-white/35 mt-1">Live keyword rankings &middot; Last updated {lastUpdated}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <button onClick={() => { setStore('play'); setSearchResult(null); setSuggestions([]); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${store === 'play' ? 'bg-marble-green/20 text-marble-green border border-marble-green/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
              Play Store
            </button>
            <button onClick={() => { setStore('ios'); setSearchResult(null); setSuggestions([]); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${store === 'ios' ? 'bg-marble-blue/20 text-marble-blue border border-marble-blue/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}>
              App Store
            </button>
          </div>
          {keywords.length > 0 && (
            <button onClick={() => refreshAllMutation.mutate()} disabled={refreshAllMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
              {refreshAllMutation.isPending ? 'Refreshing...' : 'Refresh All Rankings'}
            </button>
          )}
          <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors">
            + Manual Entry
          </button>
        </div>
      </div>

      {/* Search & Track */}
      <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5">
        <div className="font-heading text-base tracking-wide mb-3">Search &amp; Track Keywords</div>
        <p className="text-[11px] text-white/35 mb-4">
          Search the {store === 'play' ? 'Google Play Store' : 'Apple App Store'} to find your real ranking for any keyword
        </p>
        <div className="flex gap-3" ref={searchBoxRef}>
          <div className="flex-1 relative">
            <input
              value={searchTerm}
              onChange={e => handleSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
              placeholder="e.g. marble racing game, marble bet, racing simulator..."
            />
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d1b3e] border-2 border-white/10 rounded-xl overflow-hidden z-20 shadow-lg">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => { setSearchTerm(s); setShowSuggestions(false); handleSearch(s); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors border-b border-white/[0.04] last:border-b-0">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => handleSearch()} disabled={isSearching || !searchTerm.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-50">
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mt-4 bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Keyword</p>
                  <p className="text-sm font-semibold text-white/80">{searchResult.keyword}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Your Rank</p>
                  {searchResult.rank !== null ? (
                    <RankBadge rank={searchResult.rank} />
                  ) : (
                    <p className="text-sm text-marble-red font-semibold">Not ranking</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Top Competitor</p>
                  <p className="text-sm text-white/50">{searchResult.topCompetitor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Results</p>
                  <p className="text-sm text-white/50">{searchResult.totalResults} apps</p>
                </div>
              </div>
              {alreadyTracked ? (
                <span className="px-4 py-2 rounded-xl text-xs font-bold text-marble-green border border-marble-green/30 bg-marble-green/10">
                  Already Tracked
                </span>
              ) : (
                <button onClick={handleTrack} disabled={isSearching}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-marble-green text-white hover:bg-marble-green/80 transition-colors disabled:opacity-50">
                  {isSearching ? 'Saving...' : 'Track This Keyword'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Store Snapshot Card */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-heading text-base tracking-wide">Store Listing</div>
          <button onClick={() => refreshStoreMutation.mutate()}
            disabled={refreshStoreMutation.isPending}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/40 hover:bg-white/10 disabled:opacity-30 transition-colors">
            {refreshStoreMutation.isPending ? 'Fetching...' : 'Fetch from Store'}
          </button>
        </div>
        {snapshot ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Rating</p>
              <p className="font-heading text-xl text-gold">{snapshot.rating ? Number(snapshot.rating).toFixed(1) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Reviews</p>
              <p className="font-heading text-xl text-white/70">{snapshot.reviews.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Installs</p>
              <p className="font-heading text-xl text-marble-green">{snapshot.installs || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Version</p>
              <p className="font-heading text-xl text-white/50">{snapshot.version || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Genre</p>
              <p className="text-sm text-white/50">{snapshot.genre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Fetched</p>
              <p className="text-sm text-white/50">{new Date(snapshot.fetchedAt).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/30 text-sm mb-3">No store data yet</p>
            <button onClick={() => refreshStoreMutation.mutate()} disabled={refreshStoreMutation.isPending}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light disabled:opacity-50 transition-colors">
              {refreshStoreMutation.isPending ? 'Fetching...' : 'Fetch Store Data'}
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Keywords Tracked</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">{tracked}</div>
        </div>
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Ranking #1</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">{ranking1}</div>
        </div>
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Top 10</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">{rankingTop10}</div>
        </div>
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Not Ranking</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">{notRanking}</div>
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && keywords.length === 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-8 text-center">
          <p className="text-white/40 mb-2">No keywords tracked for {store === 'play' ? 'Play Store' : 'App Store'} yet</p>
          <p className="text-[11px] text-white/25">Use the search above to find keywords and track your real rankings</p>
        </div>
      )}

      {/* Keyword Table */}
      {keywords.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <div className="font-heading text-base tracking-wide">Keyword Rankings</div>
              <p className="text-[11px] text-white/35 mt-0.5">
                {store === 'play' ? 'Google Play Store' : 'Apple App Store'} &middot; Live data from store search
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] border-t border-white/[0.04]">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Keyword</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('rank')}>
                    Rank <SortIcon col="rank" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Change</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Top Competitor</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('volume')}>
                    Vol. <SortIcon col="volume" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Updated</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((kw) => (
                  <tr key={kw.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3 text-sm text-white/70 font-medium">{kw.keyword}</td>
                    <td className="px-4 py-3"><RankBadge rank={kw.rank} /></td>
                    <td className="px-4 py-3"><DeltaBadge delta={kw.delta7d} /></td>
                    <td className="px-4 py-3 text-xs text-white/40">{kw.topCompetitor || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{kw.volume || '—'}</td>
                    <td className="px-4 py-3 text-[10px] text-white/30">{new Date(kw.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(kw)} className="text-[10px] text-marble-blue hover:text-marble-blue/80 font-bold">Edit</button>
                        <button onClick={() => { if (confirm('Delete this keyword?')) deleteMutation.mutate(kw.id); }} className="text-[10px] text-marble-red hover:text-marble-red/80 font-bold">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Opportunities + Competitors */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-3">Not Ranking</div>
            <p className="text-[11px] text-white/35 mb-4">Keywords where your app doesn&apos;t appear in search results</p>
            <div className="space-y-2">
              {keywords
                .filter((k) => k.rank === null)
                .map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-xs text-white/60">{kw.keyword}</span>
                    <span className="text-[10px] text-white/30">{kw.topCompetitor ? `#1: ${kw.topCompetitor}` : '—'}</span>
                  </div>
                ))}
              {keywords.filter((k) => k.rank === null).length === 0 && (
                <p className="text-xs text-marble-green py-2">All keywords are ranking!</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-3">Top Competitors</div>
            <p className="text-[11px] text-white/35 mb-4">Most frequently appearing #1 competitors</p>
            <div className="space-y-2">
              {(() => {
                const comp: Record<string, number> = {};
                for (const kw of keywords) {
                  if (kw.topCompetitor) comp[kw.topCompetitor] = (comp[kw.topCompetitor] ?? 0) + 1;
                }
                const entries = Object.entries(comp).sort(([, a], [, b]) => b - a);
                return entries.length > 0 ? entries.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-xs text-white/60">{name}</span>
                    <span className="text-[10px] font-semibold text-white/40">{count} keywords</span>
                  </div>
                )) : <p className="text-xs text-white/30 py-2">No competitor data yet</p>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0d1b3e] border-2 border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-gold mb-4">{editId ? 'Edit Keyword' : 'Add Keyword Manually'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Keyword *</label>
                <input value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
                  placeholder="marble racing bet" disabled={!!editId} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Rank</label>
                <input value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })} type="number"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
                  placeholder="Leave empty if not ranking" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Volume</label>
                <input value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
                  placeholder="4.8K" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Top Competitor</label>
                <input value={form.topCompetitor} onChange={e => setForm({ ...form, topCompetitor: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Intent</label>
                <select value={form.intent} onChange={e => setForm({ ...form, intent: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40">
                  <option value="informational">Informational</option>
                  <option value="navigational">Navigational</option>
                  <option value="transactional">Transactional</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending || !form.keyword}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Add Keyword'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
