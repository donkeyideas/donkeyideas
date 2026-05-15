'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarbleWinRate {
  marbleId: string;
  name: string;
  totalBets: number;
  totalWagered: number;
  totalPaidOut: number;
  avgOdds: number;
  wins: number;
  winRate: number;
  color: string;
  grad: string;
}

interface BetDistEntry {
  label: string;
  count: number;
  pct: number;
}

interface RetentionEntry {
  label: string;
  pct: number;
  value: string;
}

interface FeatureAdoptionEntry {
  name: string;
  pct: number;
  barColor: string;
  textColor: string;
}

interface AnalyticsData {
  marbles: MarbleWinRate[];
  marbleWinRates: MarbleWinRate[];
  gameModes: { mode: string; races: number }[];
  topCourses: { courseId: string; races: number }[];
  betting: { totalBets: number; totalWins: number; winRate: number; avgBetSize: number; biggestWin: number };
  racesThisWeek: number;
  kpis: { racesToday: number; betsToday: number; avgSession: string; d1Retention: number };
  betDistribution: BetDistEntry[];
  retentionCurve: RetentionEntry[];
  featureAdoption: FeatureAdoptionEntry[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/analytics').then((res: any) => res.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data)
    return (
      <div className="text-center py-20 text-white/40">Failed to load</div>
    );

  const winRates = data.marbleWinRates ?? data.marbles ?? [];
  const betDist = data.betDistribution ?? [];
  const retention = data.retentionCurve ?? [];
  const features = data.featureAdoption ?? [];
  const kpis = data.kpis ?? { racesToday: 0, betsToday: 0, avgSession: 'N/A', d1Retention: 0 };
  const betting = data.betting ?? { totalBets: 0, totalWins: 0, winRate: 0, avgBetSize: 0, biggestWin: 0 };

  // Find most/least bet-on marble
  const sortedByBets = [...winRates].sort((a: any, b: any) => b.totalBets - a.totalBets);
  const mostBetOn = sortedByBets[0];
  const leastBetOn = sortedByBets[sortedByBets.length - 1];
  const totalMarbleBets = winRates.reduce((s: number, m: any) => s + m.totalBets, 0);

  return (
    <div className="space-y-6">
      {/* -- KPI Cards -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Races Today */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Races Today
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {kpis.racesToday.toLocaleString()}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {data.racesThisWeek.toLocaleString()} this week
          </div>
        </div>

        {/* Bets Placed */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Bets Today
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">
            {kpis.betsToday.toLocaleString()}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {betting.totalBets.toLocaleString()} total
          </div>
        </div>

        {/* Avg Session */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Avg Session
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">
            {kpis.avgSession}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            No session model
          </div>
        </div>

        {/* D1 Retention */}
        <div className="bg-white/5 border-2 border-[#9b59b6]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-[#c39bd3] opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            D1 Retention
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-[#c39bd3]">
            {kpis.d1Retention}%
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            From player data
          </div>
        </div>
      </div>

      {/* -- Marble Win Rate + Betting Analytics -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Marble Win Rate */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Marble Win Rate
          </div>
          <div>
            {winRates.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">No marble data yet</div>
            ) : (
              winRates.map((m: any) => (
                <div key={m.marbleId} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                  <div
                    className="w-[22px] h-[22px] rounded-full shadow-[0_2px_0_rgba(0,0,0,0.25)] relative"
                    style={{ background: m.grad }}
                  >
                    <div className="absolute top-1 left-[5px] w-[10px] h-[7px] bg-white/45 rounded-full -rotate-[20deg]" />
                  </div>
                  <span className="w-[60px] text-xs font-semibold">{m.name}</span>
                  <div className="flex-1 h-2 bg-white/[0.08] rounded">
                    <div
                      className="h-full rounded"
                      style={{ width: `${m.winRate}%`, background: m.color }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right">{m.winRate}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Betting Analytics */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Betting Analytics
          </div>
          <div className="space-y-0">
            {/* Avg Bet Size */}
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
              <span className="text-[13px] text-white/70">Avg Bet Size</span>
              <span className="font-bold text-sm text-gold">{betting.avgBetSize} coins</span>
            </div>
            {/* Most Bet-On Marble */}
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
              <span className="text-[13px] text-white/70">Most Bet-On Marble</span>
              <div className="flex items-center gap-2">
                {mostBetOn && (
                  <>
                    <div
                      className="w-[16px] h-[16px] rounded-full shadow-[0_2px_0_rgba(0,0,0,0.25)] relative"
                      style={{ background: mostBetOn.grad }}
                    >
                      <div className="absolute top-[3px] left-[3px] w-[8px] h-[5px] bg-white/45 rounded-full -rotate-[20deg]" />
                    </div>
                    <span className="font-bold text-sm" style={{ color: mostBetOn.color }}>
                      {mostBetOn.name} ({totalMarbleBets > 0 ? Math.round((mostBetOn.totalBets / totalMarbleBets) * 100) : 0}%)
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Least Bet-On Marble */}
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
              <span className="text-[13px] text-white/70">Least Bet-On Marble</span>
              <div className="flex items-center gap-2">
                {leastBetOn && (
                  <>
                    <div
                      className="w-[16px] h-[16px] rounded-full shadow-[0_2px_0_rgba(0,0,0,0.25)] relative"
                      style={{ background: leastBetOn.grad }}
                    >
                      <div className="absolute top-[3px] left-[3px] w-[8px] h-[5px] bg-white/45 rounded-full -rotate-[20deg]" />
                    </div>
                    <span className="font-bold text-sm" style={{ color: leastBetOn.color }}>
                      {leastBetOn.name} ({totalMarbleBets > 0 ? Math.round((leastBetOn.totalBets / totalMarbleBets) * 100) : 0}%)
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* User Win Rate */}
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
              <span className="text-[13px] text-white/70">User Win Rate</span>
              <span className="font-bold text-sm text-marble-green">{betting.winRate}%</span>
            </div>
            {/* Biggest Win */}
            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0">
              <span className="text-[13px] text-white/70">Biggest Win</span>
              <span className="font-bold text-sm text-marble-green">{Number(betting.biggestWin).toLocaleString()} coins</span>
            </div>
          </div>

          {/* Bet Distribution */}
          <div className="border-t border-white/[0.08] mt-4 pt-4">
            <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-3">
              Bet Distribution
            </div>
            <div className="space-y-2.5">
              {betDist.length === 0 ? (
                <div className="text-center py-4 text-white/40 text-sm">No bet data</div>
              ) : (
                betDist.map((b: any) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-16">{b.label}</span>
                    <div className="flex-1 h-2 bg-white/[0.08] rounded">
                      <div
                        className="h-full rounded"
                        style={{ width: `${b.pct}%`, background: '#ffc220' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gold w-10 text-right">{b.pct}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* -- Retention Rates + Feature Adoption -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Retention Rates */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Retention Rates
          </div>
          {retention.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No retention data</div>
          ) : (
            <>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mt-3">
                <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
                  {retention.map((b: any) => (
                    <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div
                        className="w-full max-w-[36px] rounded-t-md"
                        style={{ height: `${b.pct}%`, background: 'linear-gradient(180deg, #69db7c, #2ecc71)' }}
                      />
                      <div className="text-[10px] text-white/35 font-semibold">{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Value labels below */}
              <div className="flex gap-1.5 mt-2">
                {retention.map((b: any) => (
                  <div key={b.label} className="flex-1 text-center text-[10px] text-white/50 font-semibold">
                    {b.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Feature Adoption */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Feature Adoption
          </div>
          {features.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No feature data</div>
          ) : (
            <div className="space-y-0">
              {features.map((f: any) => (
                <div key={f.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0">
                  <span className="text-[13px] text-white/70">{f.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-[100px] h-2 bg-white/[0.08] rounded">
                      <div
                        className="h-full rounded"
                        style={{ width: `${f.pct}%`, background: f.barColor }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${f.textColor}`}>{f.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
