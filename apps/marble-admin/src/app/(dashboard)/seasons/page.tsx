'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Marble gradients (display constants for marble colors)             */
/* ------------------------------------------------------------------ */

const marbleGradients: Record<string, string> = {
  dash: 'radial-gradient(circle at 35% 30%, #ff6b35, #cc4400)',
  lucky: 'radial-gradient(circle at 35% 30%, #ffd700, #daa520)',
  rocky: 'radial-gradient(circle at 35% 30%, #8b4513, #5c2d0e)',
  spike: 'radial-gradient(circle at 35% 30%, #4ecdc4, #2a9d8f)',
  aqua: 'radial-gradient(circle at 35% 30%, #00ced1, #008b8b)',
  nova: 'radial-gradient(circle at 35% 30%, #ff69b4, #c71585)',
  shadow: 'radial-gradient(circle at 35% 30%, #6a0dad, #2d0050)',
  frosty: 'radial-gradient(circle at 35% 30%, #87ceeb, #4169e1)',
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StandingEntry {
  marbleId: string;
  races: number;
  wins: number;
  losses: number;
  record: string;
  winRate: number;
  color: string;
  rank: number;
}

interface PassKpi {
  label: string;
  value: string;
  sub: string;
  color: string;
  border: string;
}

interface SeasonMeta {
  seasonName: string;
  week: number;
  totalWeeks: number;
  daysRemaining: number;
  progressPct: number;
}

interface SeasonsData {
  currentSeason: number;
  players: number;
  stats: {
    totalRaces: number;
    totalBets: number;
    coinsWon: number;
    avgRacesPerPlayer: number;
  };
  standings: StandingEntry[];
  passKpis: PassKpi[];
  seasonMeta: SeasonMeta;
  courses: any[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SeasonsPage() {
  const { data, isLoading } = useQuery<SeasonsData>({
    queryKey: ['seasons'],
    queryFn: () => api.get('/seasons').then((r: any) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const seasonNumber = data?.currentSeason ?? 0;
  const seasonName = data?.seasonMeta?.seasonName ?? '...';
  const week = data?.seasonMeta?.week ?? 0;
  const totalWeeks = data?.seasonMeta?.totalWeeks ?? 10;
  const daysRemaining = data?.seasonMeta?.daysRemaining ?? 0;
  const marblesCompeting = data?.standings?.length ?? 0;
  const progressPct = data?.seasonMeta?.progressPct ?? 0;
  const standings = data?.standings ?? [];
  const courses = data?.courses ?? [];
  const passKpis = data?.passKpis ?? [];

  const rankClass = (i: number) => {
    if (i === 0) return 'bg-gold text-navy-900';
    if (i === 1) return 'bg-[#c0c0c0] text-navy-900';
    if (i === 2) return 'bg-[#cd7f32] text-white';
    return 'bg-white/[0.08] text-white/50';
  };

  const wpColor = (winRate: number) => {
    if (winRate >= 60) return 'text-marble-green';
    if (winRate >= 50) return 'text-gold';
    if (winRate >= 40) return 'text-white';
    return 'text-white/40';
  };

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  Season Status Banner                                         */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-br from-[#1a4fc2] to-[#0d3a8f] border-2 border-[#4d80ff] rounded-2xl p-5 relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-[-20px] right-[-20px] w-[100px] h-[100px] bg-gold/[0.08] rounded-full" />

        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-2xl text-white tracking-wide">
              SEASON {seasonNumber} &mdash; {seasonName}
            </h2>
            <p className="text-[13px] text-white/60 mt-1">
              Week {week} of {totalWeeks} &bull; {daysRemaining} days remaining &bull; {marblesCompeting} marbles competing
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="px-4 py-2 bg-gold text-navy-900 font-bold text-[13px] rounded-xl hover:bg-gold-light transition-colors">
              Advance Week
            </button>
            <button className="px-4 py-2 border border-white/20 text-white/70 font-semibold text-[13px] rounded-xl hover:bg-white/[0.06] transition-colors">
              Edit Season
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-white/50">Progress</span>
            <span className="text-[11px] text-white/50">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Standings + Course Rotation                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-5">
        {/* ---- Current Standings ---- */}
        <Card
          title="Current Standings"
          headerAction={
            <button className="px-3 py-1 border border-white/15 text-white/50 text-[11px] font-semibold rounded-lg hover:bg-white/[0.06] transition-colors">
              Full Table
            </button>
          }
        >
          {standings.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">No season data yet</div>
          ) : (
            standings.map((m: any, i: number) => (
              <div key={m.marbleId} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${rankClass(i)}`}>
                  {m.rank}
                </div>
                <div
                  className="w-7 h-7 rounded-full shadow-[0_2px_0_rgba(0,0,0,0.25)] relative flex-shrink-0"
                  style={{ background: marbleGradients[m.marbleId] ?? marbleGradients.dash }}
                >
                  <div className="absolute top-1 left-[5px] w-[10px] h-[7px] bg-white/45 rounded-full -rotate-[20deg]" />
                </div>
                <div className="flex-1 font-semibold text-[13px] capitalize">{m.marbleId}</div>
                <div className="text-xs text-white/50">{m.record}</div>
                <div className={`font-bold text-[13px] ${wpColor(m.winRate)}`}>
                  .{String(m.winRate * 10).padStart(3, '0')}
                </div>
              </div>
            ))
          )}
        </Card>

        {/* ---- Course Rotation ---- */}
        <Card
          title="Course Rotation"
          headerAction={
            <span className="text-[11px] text-white/35">112 total courses</span>
          }
        >
          {courses.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              No course rotation data &mdash; course data lives in the game app
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((c: any) => (
                <div
                  key={c.name}
                  className={`bg-white/5 border-2 border-white/[0.08] rounded-[14px] p-4 flex items-center gap-3.5 ${c.disabled ? 'opacity-40' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-[10px] flex items-center justify-center font-heading text-2xl text-white/90 ${c.thumbBg}`}>
                    {c.letter}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-0.5">{c.name}</div>
                    <div className="text-[11px] text-white/40">{c.meta}</div>
                  </div>
                  {c.disabled ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide bg-white/10 text-white/40">DISABLED</span>
                  ) : (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide ${c.tagClass}`}>{c.theme}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  Season Pass Adoption                                         */}
      {/* ============================================================ */}
      <Card title="Season Pass Adoption">
        {passKpis.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">No pass data available</div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {passKpis.map((k: any) => (
              <div key={k.label} className={`bg-white/[0.03] border ${k.border} rounded-xl p-4 text-center`}>
                <div className="text-[11px] text-white/40 mb-1.5">{k.label}</div>
                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-[11px] text-white/35 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
