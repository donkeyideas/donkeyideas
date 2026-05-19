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

interface FunnelStep {
  step: string;
  count: number;
  pct: number;
}

interface PlayerSegment {
  name: string;
  count: number;
  color: string;
  desc: string;
}

interface RevenueWeek {
  week: string;
  revenue: number;
  count: number;
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
  funnel?: FunnelStep[];
  segments?: PlayerSegment[];
  revenueWeeks?: RevenueWeek[];
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
  const funnel = data.funnel ?? [];
  const segments = data.segments ?? [];
  const revenueWeeks = data.revenueWeeks ?? [];

  // Find most/least bet-on marble. Only valid when SOMEONE has actually
  // placed a bet — on a freshly wiped DB every marble has 0 bets and the
  // sorted array would still return the alphabetically-first marble as
  // "Most Bet" with "(0%)", which looks like a UI bug. Setting both to
  // null when no bets exist makes the consumer-side render guards work as
  // intended (the existing `{mostBetOn && (...)}` checks already short-
  // circuit on null).
  const sortedByBets = [...winRates].sort((a: any, b: any) => b.totalBets - a.totalBets);
  const totalMarbleBets = winRates.reduce((s: number, m: any) => s + m.totalBets, 0);
  const mostBetOn = totalMarbleBets > 0 ? sortedByBets[0] : null;
  const leastBetOn = totalMarbleBets > 0 ? sortedByBets[sortedByBets.length - 1] : null;

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
            {kpis.avgSession === 'N/A' ? 'Awaiting mobile session data' : 'Last 30 days'}
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

      {/* -- Conversion Funnel + Player Segments -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Conversion Funnel
          </div>
          {funnel.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No funnel data</div>
          ) : (
            <div className="space-y-3">
              {funnel.map((step, i) => {
                const funnelColors = ['#6ec1ff', '#2ecc71', '#ffc220', '#e74c3c'];
                const maxCount = funnel[0]?.count || 1;
                const barWidth = Math.max(8, (step.count / maxCount) * 100);
                const dropOff = i > 0 ? funnel[i - 1].count - step.count : 0;
                return (
                  <div key={step.step}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-white/70">{step.step}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: funnelColors[i] }}>
                          {step.count.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-white/40">({step.pct}%)</span>
                      </div>
                    </div>
                    <div className="h-6 bg-white/[0.04] rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all"
                        style={{ width: `${barWidth}%`, background: funnelColors[i], opacity: 0.85 }}
                      />
                      {i > 0 && dropOff > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-semibold">
                          -{dropOff.toLocaleString()} drop
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Overall conversion */}
              {funnel.length >= 4 && funnel[0].count > 0 && (
                <div className="border-t border-white/[0.06] pt-3 mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Install → Purchase</span>
                  <span className="text-sm font-bold text-gold">
                    {Math.round((funnel[3].count / funnel[0].count) * 100)}% conversion
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Player Segments */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Player Segments
          </div>
          {segments.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No segment data</div>
          ) : (() => {
            const totalSeg = segments.reduce((s, seg) => s + seg.count, 0) || 1;
            return (
              <div className="space-y-0">
                {/* Segment bar */}
                <div className="h-8 rounded-xl overflow-hidden flex mb-4">
                  {segments.filter(s => s.count > 0).map((seg) => (
                    <div
                      key={seg.name}
                      className="h-full relative group"
                      style={{ width: `${Math.max(2, (seg.count / totalSeg) * 100)}%`, background: seg.color }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white drop-shadow">
                        {seg.name}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Segment rows */}
                {segments.map((seg) => (
                  <div key={seg.name} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
                      <div>
                        <span className="text-[13px] text-white/80 font-medium">{seg.name}</span>
                        <span className="text-[10px] text-white/30 ml-2">{seg.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: seg.color }}>
                        {seg.count.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-white/40 w-10 text-right">
                        {Math.round((seg.count / totalSeg) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* -- Revenue Trend -- */}
      {revenueWeeks.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Weekly Revenue (Last 8 Weeks)
          </div>
          {(() => {
            const maxRev = Math.max(...revenueWeeks.map((w) => w.revenue), 1);
            const totalRev = revenueWeeks.reduce((s, w) => s + w.revenue, 0);
            const totalTxns = revenueWeeks.reduce((s, w) => s + w.count, 0);
            return (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1">Total Revenue</div>
                    <div className="font-heading text-lg text-gold">${totalRev.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1">Transactions</div>
                    <div className="font-heading text-lg text-marble-blue">{totalTxns}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1">Avg per Week</div>
                    <div className="font-heading text-lg text-marble-green">${(totalRev / (revenueWeeks.length || 1)).toFixed(2)}</div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-end gap-2" style={{ height: '140px' }}>
                    {revenueWeeks.map((w) => (
                      <div key={w.week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="text-[10px] font-bold text-gold">
                          {w.revenue > 0 ? `$${w.revenue.toFixed(0)}` : ''}
                        </div>
                        <div
                          className="w-full max-w-[36px] rounded-t-md"
                          style={{
                            height: `${Math.max(2, (w.revenue / maxRev) * 100)}%`,
                            background: w.revenue > 0 ? 'linear-gradient(180deg, #ffc220, #e6a800)' : 'rgba(255,255,255,0.05)',
                          }}
                        />
                        <div className="text-[10px] text-white/35 font-semibold">{w.week}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
