'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Keyword data — update these when you check rankings               */
/* ------------------------------------------------------------------ */

interface Keyword {
  keyword: string;
  rank: number | null; // null = not ranking
  volume: string;
  difficulty: number;
  delta7d: number | null; // rank change in 7 days (positive = improved)
  kei: number;
  topCompetitor: string;
  relevance: number; // 0-99
  intent: 'informational' | 'navigational' | 'transactional';
}

const LAST_UPDATED = '2026-05-15';

const keywords: Keyword[] = [
  { keyword: 'donkey marble racing', rank: 1, volume: '4.8K', difficulty: 29, delta7d: null, kei: 164, topCompetitor: "Jelle's Marble Runs", relevance: 99, intent: 'informational' },
  { keyword: 'marble racing stats', rank: 1, volume: '3.5K', difficulty: 28, delta7d: null, kei: 126, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble racing bet', rank: 1, volume: '3.4K', difficulty: 24, delta7d: null, kei: 140, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble race bet', rank: 1, volume: '4.3K', difficulty: 27, delta7d: null, kei: 159, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'bet on marble race', rank: 1, volume: '1.2K', difficulty: 15, delta7d: null, kei: 80, topCompetitor: 'World Marble Race', relevance: 99, intent: 'informational' },
  { keyword: 'marble race stats', rank: 9, volume: '4.4K', difficulty: 21, delta7d: null, kei: 211, topCompetitor: 'World Marble Race', relevance: 91, intent: 'informational' },
  { keyword: 'marble racing 2D', rank: 245, volume: '4.0K', difficulty: 29, delta7d: null, kei: 137, topCompetitor: 'Sandbox 2D: Marble Run', relevance: 10, intent: 'informational' },
  { keyword: 'marble racing game', rank: null, volume: '7.1K', difficulty: 29, delta7d: null, kei: 246, topCompetitor: 'Labo Marble Race:Stem Game', relevance: 30, intent: 'informational' },
  { keyword: 'betting marble game', rank: null, volume: '7.2K', difficulty: 20, delta7d: null, kei: 360, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble race track', rank: null, volume: '3.4K', difficulty: 25, delta7d: null, kei: 136, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing app', rank: null, volume: '3.6K', difficulty: 20, delta7d: null, kei: 180, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing betting', rank: null, volume: '3.9K', difficulty: 28, delta7d: null, kei: 140, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble race game', rank: null, volume: '4.9K', difficulty: 22, delta7d: null, kei: 224, topCompetitor: 'Simple Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing simulator', rank: null, volume: '4.0K', difficulty: 21, delta7d: null, kei: 192, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
  { keyword: 'marble racing tracks', rank: null, volume: '4.7K', difficulty: 27, delta7d: null, kei: 173, topCompetitor: 'World Marble Race', relevance: 30, intent: 'informational' },
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

export default function ASOPage() {
  const [store, setStore] = useState<'play' | 'ios'>('play');
  const [sortKey, setSortKey] = useState<'rank' | 'volume' | 'kei' | 'relevance'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...keywords].sort((a, b) => {
    let av: number;
    let bv: number;
    if (sortKey === 'rank') {
      av = a.rank ?? 9999;
      bv = b.rank ?? 9999;
    } else if (sortKey === 'volume') {
      av = parseFloat(a.volume.replace('K', '')) * 1000;
      bv = parseFloat(b.volume.replace('K', '')) * 1000;
    } else if (sortKey === 'kei') {
      av = a.kei;
      bv = b.kei;
    } else {
      av = a.relevance;
      bv = b.relevance;
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // KPI stats
  const tracked = keywords.length;
  const rankingTop10 = keywords.filter((k) => k.rank !== null && k.rank <= 10).length;
  const ranking1 = keywords.filter((k) => k.rank === 1).length;
  const notRanking = keywords.filter((k) => k.rank === null).length;

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
          <p className="text-[11px] text-white/35 mt-1">Keyword intelligence &middot; Last updated {LAST_UPDATED}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setStore('play')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              store === 'play' ? 'bg-marble-green/20 text-marble-green border border-marble-green/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}
          >
            Play Store
          </button>
          <button
            onClick={() => setStore('ios')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              store === 'ios' ? 'bg-marble-blue/20 text-marble-blue border border-marble-blue/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}
          >
            App Store
          </button>
        </div>
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

      {/* Keyword Table */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="font-heading text-base tracking-wide">Keyword Rankings</div>
          <p className="text-[11px] text-white/35 mt-0.5">{store === 'play' ? 'Google Play Store' : 'Apple App Store'} &middot; US Region</p>
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
              </tr>
            </thead>
            <tbody>
              {sorted.map((kw) => (
                <tr key={kw.keyword} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm text-white/70 font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3"><RankBadge rank={kw.rank} /></td>
                  <td className="px-4 py-3 text-xs text-white/50">{kw.volume}</td>
                  <td className="px-4 py-3"><DifficultyBar value={kw.difficulty} /></td>
                  <td className="px-4 py-3 text-xs font-bold text-white/60">{kw.kei}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{kw.topCompetitor}</td>
                  <td className="px-4 py-3 text-xs font-bold text-white/60">{kw.relevance}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/[0.05] px-2 py-0.5 rounded">
                      {kw.intent}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* High Opportunity Keywords */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-3">High Opportunity</div>
          <p className="text-[11px] text-white/35 mb-4">High volume keywords where you&apos;re not yet ranking</p>
          <div className="space-y-2">
            {keywords
              .filter((k) => k.rank === null)
              .sort((a, b) => parseFloat(b.volume.replace('K', '')) - parseFloat(a.volume.replace('K', '')))
              .slice(0, 5)
              .map((kw) => (
                <div key={kw.keyword} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-xs text-white/60">{kw.keyword}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30">{kw.volume} vol</span>
                    <span className="text-[10px] font-bold text-gold">KEI {kw.kei}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Competitors */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-3">Top Competitors</div>
          <p className="text-[11px] text-white/35 mb-4">Most frequently appearing competitors across your keywords</p>
          <div className="space-y-2">
            {(() => {
              const comp: Record<string, number> = {};
              for (const kw of keywords) {
                comp[kw.topCompetitor] = (comp[kw.topCompetitor] ?? 0) + 1;
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
    </div>
  );
}
