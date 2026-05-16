'use client';

import { useState } from 'react';
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
  fetchedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Seed data (used when database is empty to pre-populate)            */
/* ------------------------------------------------------------------ */

const SEED_KEYWORDS = [
  { keyword: 'donkey marble racing', rank: 1, volume: '4.8K', difficulty: 29, kei: 164, topCompetitor: "Jelle's Marble Runs", relevance: 99, intent: 'informational' },
  { keyword: 'marble racing stats', rank: 1, volume: '3.5K', difficulty: 28, kei: 126, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble racing bet', rank: 1, volume: '3.4K', difficulty: 24, kei: 140, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble race bet', rank: 1, volume: '4.3K', difficulty: 27, kei: 159, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'bet on marble race', rank: 1, volume: '1.2K', difficulty: 15, kei: 80, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble race stats', rank: 9, volume: '4.4K', difficulty: 21, kei: 211, topCompetitor: 'World Marble Race', relevance: 91, intent: 'informational' },
  { keyword: 'marble racing 2D', rank: 245, volume: '4.0K', difficulty: 29, kei: 137, topCompetitor: 'Sandbox 2D: Marble Run', relevance: 10, intent: 'informational' },
  { keyword: 'marble racing game', rank: null, volume: '7.1K', difficulty: 29, kei: 246, topCompetitor: 'Labo Marble Race:Stem Game', relevance: 30, intent: 'informational' },
  { keyword: 'betting marble game', rank: null, volume: '7.2K', difficulty: 20, kei: 360, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble race track', rank: null, volume: '3.4K', difficulty: 25, kei: 136, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing app', rank: null, volume: '3.6K', difficulty: 20, kei: 180, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing betting', rank: null, volume: '3.9K', difficulty: 28, kei: 140, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble race game', rank: null, volume: '4.9K', difficulty: 22, kei: 224, topCompetitor: 'Simple Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing simulator', rank: null, volume: '4.0K', difficulty: 21, kei: 192, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing tracks', rank: null, volume: '4.7K', difficulty: 27, kei: 173, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
];

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

function DifficultyBar({ value }: { value: number }) {
  const color = value <= 20 ? 'bg-marble-green' : value <= 40 ? 'bg-gold' : value <= 60 ? 'bg-[#f39c12]' : 'bg-marble-red';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-white/40">{value}</span>
    </div>
  );
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
  const [seeding, setSeeding] = useState(false);

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

  // Seed initial data
  async function seedKeywords() {
    setSeeding(true);
    try {
      for (const kw of SEED_KEYWORDS) {
        await api.post('/aso/keywords', { store, ...kw });
      }
      queryClient.invalidateQueries({ queryKey: ['aso-keywords', store] });
    } finally {
      setSeeding(false);
    }
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

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <span className="text-white/15 ml-1">&udarr;</span>;
    return <span className="text-gold ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl tracking-wide">App Store Optimization</h1>
          <p className="text-[11px] text-white/35 mt-1">Keyword intelligence &middot; Last updated {lastUpdated}</p>
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
          <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors">
            + Add Keyword
          </button>
        </div>
      </div>

      {/* Store Snapshot Card */}
      {snapshot && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-heading text-base tracking-wide">Store Listing</div>
            <button onClick={() => refreshStoreMutation.mutate()}
              disabled={refreshStoreMutation.isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/40 hover:bg-white/10 disabled:opacity-30 transition-colors">
              {refreshStoreMutation.isPending ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
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
        </div>
      )}

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

      {/* Empty state with seed button */}
      {!isLoading && keywords.length === 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-8 text-center">
          <p className="text-white/40 mb-3">No keywords tracked for {store === 'play' ? 'Play Store' : 'App Store'} yet</p>
          <div className="flex gap-3 justify-center">
            <button onClick={seedKeywords} disabled={seeding}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gold text-navy-900 hover:bg-gold-light disabled:opacity-50 transition-colors">
              {seeding ? 'Importing...' : 'Import Starter Keywords'}
            </button>
            <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:bg-white/5 transition-colors">
              Add Manually
            </button>
          </div>
        </div>
      )}

      {/* Keyword Table */}
      {keywords.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <div className="font-heading text-base tracking-wide">Keyword Rankings</div>
              <p className="text-[11px] text-white/35 mt-0.5">{store === 'play' ? 'Google Play Store' : 'Apple App Store'} &middot; US Region</p>
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
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('volume')}>
                    Vol. <SortIcon col="volume" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Diff.</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('kei')}>
                    KEI <SortIcon col="kei" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Top Competitor</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('relevance')}>
                    Rel. <SortIcon col="relevance" />
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider">Intent</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((kw) => (
                  <tr key={kw.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3 text-sm text-white/70 font-medium">{kw.keyword}</td>
                    <td className="px-4 py-3"><RankBadge rank={kw.rank} /></td>
                    <td className="px-4 py-3 text-xs text-white/50">{kw.volume || '—'}</td>
                    <td className="px-4 py-3"><DifficultyBar value={kw.difficulty} /></td>
                    <td className="px-4 py-3 text-xs font-bold text-white/60">{kw.kei}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{kw.topCompetitor || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-white/60">{kw.relevance}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.05] px-2 py-0.5 rounded">
                        {kw.intent}
                      </span>
                    </td>
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

      {/* Opportunities Section */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-3">High Opportunity</div>
            <p className="text-[11px] text-white/35 mb-4">High volume keywords where you&apos;re not yet ranking</p>
            <div className="space-y-2">
              {keywords
                .filter((k) => k.rank === null)
                .sort((a, b) => parseFloat((b.volume || '0').replace('K', '')) - parseFloat((a.volume || '0').replace('K', '')))
                .slice(0, 5)
                .map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-xs text-white/60">{kw.keyword}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-white/30">{kw.volume} vol</span>
                      <span className="text-[10px] font-bold text-gold">KEI {kw.kei}</span>
                    </div>
                  </div>
                ))}
              {keywords.filter((k) => k.rank === null).length === 0 && (
                <p className="text-xs text-white/30 py-2">All keywords are ranking</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-3">Top Competitors</div>
            <p className="text-[11px] text-white/35 mb-4">Most frequently appearing competitors</p>
            <div className="space-y-2">
              {(() => {
                const comp: Record<string, number> = {};
                for (const kw of keywords) {
                  if (kw.topCompetitor) comp[kw.topCompetitor] = (comp[kw.topCompetitor] ?? 0) + 1;
                }
                return Object.entries(comp)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                      <span className="text-xs text-white/60">{name}</span>
                      <span className="text-[10px] font-semibold text-white/40">{count} keywords</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0d1b3e] border-2 border-white/10 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-gold mb-4">{editId ? 'Edit Keyword' : 'Add Keyword'}</h3>

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
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Difficulty (0-100)</label>
                <input value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} type="number"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">KEI</label>
                <input value={form.kei} onChange={e => setForm({ ...form, kei: e.target.value })} type="number"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Top Competitor</label>
                <input value={form.topCompetitor} onChange={e => setForm({ ...form, topCompetitor: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Relevance (0-99)</label>
                <input value={form.relevance} onChange={e => setForm({ ...form, relevance: e.target.value })} type="number"
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
