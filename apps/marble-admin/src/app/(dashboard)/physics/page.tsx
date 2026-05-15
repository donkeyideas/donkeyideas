'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import dynamic from 'next/dynamic';

const PhilosophySection = dynamic(
  () => import('@/components/physics/PhilosophySection').then((m) => ({ default: m.PhilosophySection })),
  { ssr: false, loading: () => <div className="h-[700px] bg-white/5 rounded-2xl animate-pulse" /> },
);
import { ObstacleAnimation } from '@/components/physics/ObstacleAnimation';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarbleDynamic {
  marbleId: string;
  name: string;
  color: string;
  grad: string;
  stats: { speed: number; power: number; bounce: number; luck: number };
  physics: { frictionAir: number; density: number; restitution: number; friction: number; frictionStatic: number };
  avgFinish: number;
  totalRaces: number;
  wins: number;
  winRate: number;
  totalBets: number;
}

interface FairnessEntry {
  marbleId: string;
  name: string;
  color: string;
  positionCounts: number[];
  entropy: number;
  chiSquared: number;
  isFair: boolean;
}

interface BettingParityEntry {
  marbleId: string;
  name: string;
  color: string;
  avgOdds: number;
  impliedProb: number;
  actualWinRate: number;
  delta: number;
  accuracy: 'excellent' | 'good' | 'poor';
  totalBets: number;
  totalWagered: number;
  totalPaidOut: number;
  marbleHouseEdge: number;
}

interface PhysicsData {
  engineConfig: {
    engine: string;
    substeps: number;
    fixedDt: number;
    frameDt: number;
    maxSpeed: number;
    positionIterations: number;
    velocityIterations: number;
    gravity: { handCrafted: number; proceduralRange: string };
    doomsday: { triggerMs: number; deadlineMs: number };
    collisionCategories: Record<string, string>;
    surfaceFriction: Record<string, { friction: number; restitution: number }>;
  };
  marbleDynamics: MarbleDynamic[];
  raceTimeOverall: { avg: number; min: number; max: number };
  raceTimeDistribution: { label: string; count: number }[];
  courseDifficulty: { courseId: string; theme: string; avgTime: number; minTime: number; maxTime: number; races: number; doomsdayPct: number }[];
  themePerformance: { theme: string; avgTime: number; races: number }[];
  modePerformance: { mode: string; avgTime: number; races: number }[];
  fairness: FairnessEntry[];
  fairnessScore: number;
  avgEntropy: number;
  doomsdayStats: {
    triggerRate: number;
    totalTriggers: number;
    zones: { safe: { count: number; pct: number }; normal: { count: number; pct: number }; doomsday: { count: number; pct: number } };
    worstCourses: { courseId: string; doomsdayRate: number; total: number; doomsdayCount: number }[];
  };
  bettingParity: BettingParityEntry[];
  realizedHouseEdge: number;
  totalRaces: number;
  racesAnalyzed: number;
  obstacleTools: {
    id: string;
    name: string;
    category: string;
    description: string;
    physics: Record<string, any>;
    collisionLayer: string;
    tracks: string[];
    instances: number;
    behavior: string;
    color: string;
    icon: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const THEME_COLORS: Record<string, string> = {
  grass: '#2ecc71', lava: '#e74c3c', ice: '#6ec1ff', cyber: '#9b59b6', unknown: '#888',
};
const THEME_BG: Record<string, string> = {
  grass: 'bg-marble-green/15 text-marble-green',
  lava: 'bg-marble-red/15 text-marble-red',
  ice: 'bg-marble-blue/15 text-marble-blue',
  cyber: 'bg-purple-500/15 text-purple-400',
  unknown: 'bg-white/10 text-white/60',
};

const PIE_COLORS = ['#2ecc71', '#ffc220', '#e74c3c'];


/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PhysicsPage() {
  const { data, isLoading } = useQuery<PhysicsData>({
    queryKey: ['physics'],
    queryFn: () => api.get('/physics').then((r: any) => r.data),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  const ec = data.engineConfig;
  const dms = data.doomsdayStats;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl tracking-wide">PHYSICS ENGINE ANALYTICS</h1>
        <p className="text-white/40 text-sm mt-1">
          Deep simulation telemetry — {data.totalRaces.toLocaleString()} total races, {data.racesAnalyzed} analyzed
        </p>
      </div>

      {/* ============================================================ */}
      {/*  ROW 1: KPI Cards                                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard color="blue" label="Total Races" value={data.totalRaces.toLocaleString()} />
        <KpiCard color="gold" label="Avg Race Time" value={`${data.raceTimeOverall.avg}s`} />
        <KpiCard color="green" label="Fairness Score" value={`${data.fairnessScore}%`} sub={`Entropy: ${data.avgEntropy}/3.0`} />
        <KpiCard color="red" label="House Edge" value={`${data.realizedHouseEdge}%`} sub="Realized" />
      </div>

      {/* ============================================================ */}
      {/*  ROW 2: Engine Configuration Panel                           */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <h2 className="font-heading text-lg tracking-wide mb-4 flex items-center gap-2">
          <span className="text-gold">MATTER.JS</span> ENGINE CONFIGURATION
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3 text-sm">
          <ConfigRow label="Engine" value={ec.engine} />
          <ConfigRow label="Substeps / Frame" value={String(ec.substeps)} />
          <ConfigRow label="Fixed DT" value={`${ec.fixedDt}ms`} />
          <ConfigRow label="Frame DT" value={`${ec.frameDt}ms (60fps)`} />
          <ConfigRow label="Max Speed" value={String(ec.maxSpeed)} />
          <ConfigRow label="Position Iterations" value={String(ec.positionIterations)} />
          <ConfigRow label="Velocity Iterations" value={String(ec.velocityIterations)} />
          <ConfigRow label="Gravity (Hand-crafted)" value={String(ec.gravity.handCrafted)} />
          <ConfigRow label="Gravity (Procedural)" value={ec.gravity.proceduralRange} />
          <ConfigRow label="Doomsday Trigger" value={`${ec.doomsday.triggerMs / 1000}s`} />
          <ConfigRow label="Doomsday Deadline" value={`${ec.doomsday.deadlineMs / 1000}s`} />
          <ConfigRow label="Collision Categories" value="4 layers" />
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Surface Physics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(ec.surfaceFriction).map(([name, vals]) => (
              <div key={name} className="bg-white/[0.03] rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/40 uppercase tracking-wider">{name}</div>
                <div className="text-xs mt-1">
                  <span className="text-marble-blue">F:</span> <span className="font-semibold text-white/80">{vals.friction}</span>
                </div>
                <div className="text-xs">
                  <span className="text-marble-green">R:</span> <span className="font-semibold text-white/80">{vals.restitution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 2.25: Core Physics Philosophy                           */}
      {/* ============================================================ */}
      <PhilosophySection />

      {/* ============================================================ */}
      {/*  ROW 2.5: Physics Obstacle Toolkit                           */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <h2 className="font-heading text-lg tracking-wide mb-2">PHYSICS OBSTACLE TOOLKIT</h2>
        <p className="text-xs text-white/40 mb-5">
          Every obstacle type in the simulation — physics properties, track usage, and real-time behavior.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.obstacleTools?.map((tool) => (
            <div key={tool.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-4">
              {/* Animated Visual */}
              <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center relative">
                <ObstacleAnimation id={tool.id} color={tool.color} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-sm" style={{ color: tool.color }}>{tool.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                    tool.category === 'dynamic' ? 'bg-marble-red/20 text-marble-red' :
                    tool.category === 'sensor' ? 'bg-gold/20 text-gold' :
                    tool.category === 'static' ? 'bg-marble-blue/20 text-marble-blue' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {tool.category}
                  </span>
                  <span className="text-[9px] text-white/30 ml-auto">{tool.instances} instances</span>
                </div>
                <p className="text-[11px] text-white/50 mb-2 leading-relaxed">{tool.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(tool.physics).map(([k, v]) => (
                    <span key={k} className="text-[9px] bg-white/[0.05] px-1.5 py-0.5 rounded font-semibold">
                      <span className="text-white/30">{k}:</span> <span className="text-white/70">{String(v)}</span>
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-white/30">
                  <span className="text-white/40">Tracks:</span> {tool.tracks.join(' · ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 3: Marble Dynamics Table                                */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <h2 className="font-heading text-lg tracking-wide mb-4">MARBLE DYNAMICS PROFILES</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                <th className="text-left py-3 px-2">Marble</th>
                <th className="text-center py-3 px-2">Spd</th>
                <th className="text-center py-3 px-2">Pwr</th>
                <th className="text-center py-3 px-2">Bnc</th>
                <th className="text-center py-3 px-2">Luck</th>
                <th className="text-center py-3 px-2">Friction Air</th>
                <th className="text-center py-3 px-2">Density</th>
                <th className="text-center py-3 px-2">Restitution</th>
                <th className="text-center py-3 px-2">Avg Finish</th>
                <th className="text-center py-3 px-2">Win Rate</th>
                <th className="text-center py-3 px-2">Races</th>
              </tr>
            </thead>
            <tbody>
              {data.marbleDynamics.map((m, i) => (
                <tr key={m.marbleId} className={`border-b border-white/[0.04] ${i === 0 ? 'bg-gold/[0.04]' : ''}`}>
                  <td className="py-3 px-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: m.grad }} />
                    <span className="font-semibold">{m.name}</span>
                  </td>
                  <td className="text-center py-3 px-2"><StatPill val={m.stats.speed} /></td>
                  <td className="text-center py-3 px-2"><StatPill val={m.stats.power} /></td>
                  <td className="text-center py-3 px-2"><StatPill val={m.stats.bounce} /></td>
                  <td className="text-center py-3 px-2"><StatPill val={m.stats.luck} /></td>
                  <td className="text-center py-3 px-2 text-xs font-semibold text-white/70">{m.physics.frictionAir}</td>
                  <td className="text-center py-3 px-2 text-xs font-semibold text-white/70">{m.physics.density}</td>
                  <td className="text-center py-3 px-2 text-xs font-semibold text-white/70">{m.physics.restitution}</td>
                  <td className="text-center py-3 px-2">
                    <span className={`font-semibold ${m.avgFinish <= 3 ? 'text-marble-green' : m.avgFinish >= 6 ? 'text-marble-red' : 'text-white/80'}`}>
                      {m.avgFinish > 0 ? `#${m.avgFinish}` : '--'}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-gold font-semibold">{m.winRate}%</span>
                  </td>
                  <td className="text-center py-3 px-2 text-white/50">{m.totalRaces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 4: Race Time Distribution + Theme Performance            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Race Time Distribution Chart */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <h2 className="font-heading text-lg tracking-wide mb-4">RACE TIME DISTRIBUTION</h2>
          <div className="text-xs text-white/40 mb-3 flex gap-4">
            <span>Min: <span className="text-marble-green font-bold">{data.raceTimeOverall.min}s</span></span>
            <span>Avg: <span className="text-gold font-bold">{data.raceTimeOverall.avg}s</span></span>
            <span>Max: <span className="text-marble-red font-bold">{data.raceTimeOverall.max}s</span></span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.raceTimeDistribution} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0d2350', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#fff' }}
              />
              <Bar dataKey="count" fill="#ffc220" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Theme Performance Cards */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <h2 className="font-heading text-lg tracking-wide mb-4">THEME PERFORMANCE</h2>
          <div className="grid grid-cols-2 gap-3">
            {['grass', 'lava', 'ice', 'cyber'].map((theme) => {
              const tp = data.themePerformance.find((t) => t.theme === theme);
              return (
                <div key={theme} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME_COLORS[theme] }} />
                    <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: THEME_COLORS[theme] }}>
                      {theme}
                    </span>
                  </div>
                  <div className="text-xl font-heading">{tp ? `${tp.avgTime}s` : '--'}</div>
                  <div className="text-[10px] text-white/40">avg race time</div>
                  <div className="text-xs text-white/50 mt-1">{tp ? `${tp.races} races` : '0 races'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 5: Course Difficulty Ranking                            */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <h2 className="font-heading text-lg tracking-wide mb-4">COURSE DIFFICULTY RANKING</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-left py-3 px-2">Course</th>
                <th className="text-left py-3 px-2">Theme</th>
                <th className="text-center py-3 px-2">Avg Time</th>
                <th className="text-center py-3 px-2">Min</th>
                <th className="text-center py-3 px-2">Max</th>
                <th className="text-center py-3 px-2">Races</th>
                <th className="text-center py-3 px-2">Doomsday %</th>
              </tr>
            </thead>
            <tbody>
              {data.courseDifficulty.slice(0, 15).map((c, i) => {
                const theme = c.theme || 'unknown';
                return (
                  <tr key={c.courseId} className="border-b border-white/[0.04]">
                    <td className="py-2.5 px-2 text-white/40 text-xs">{i + 1}</td>
                    <td className="py-2.5 px-2 text-xs font-semibold">{c.courseId}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${THEME_BG[theme]}`}>
                        {theme}
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-2 font-semibold">{c.avgTime}s</td>
                    <td className="text-center py-2.5 px-2 text-marble-green text-xs">{c.minTime}s</td>
                    <td className="text-center py-2.5 px-2 text-marble-red text-xs">{c.maxTime}s</td>
                    <td className="text-center py-2.5 px-2 text-white/50">{c.races}</td>
                    <td className="text-center py-2.5 px-2">
                      <span className={`font-semibold ${c.doomsdayPct > 10 ? 'text-marble-red' : c.doomsdayPct > 0 ? 'text-yellow-400' : 'text-marble-green'}`}>
                        {c.doomsdayPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.courseDifficulty.length === 0 && (
            <div className="text-center text-white/30 py-8 text-sm">No race data yet</div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 6: Finish Position Fairness Heatmap                     */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg tracking-wide">FINISH POSITION FAIRNESS</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
              data.fairnessScore >= 90 ? 'bg-marble-green/20 text-marble-green' :
              data.fairnessScore >= 70 ? 'bg-yellow-400/20 text-yellow-400' :
              'bg-marble-red/20 text-marble-red'
            }`}>
              {data.fairnessScore >= 90 ? 'FAIR' : data.fairnessScore >= 70 ? 'MODERATE' : 'BIASED'} ({data.fairnessScore}%)
            </span>
          </div>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Shannon entropy per marble (perfect = 3.0 bits for uniform distribution over 8 positions). Based on last {data.racesAnalyzed} races.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                <th className="text-left py-3 px-2">Marble</th>
                {[1,2,3,4,5,6,7,8].map((p) => (
                  <th key={p} className="text-center py-3 px-2 w-16">P{p}</th>
                ))}
                <th className="text-center py-3 px-2">Entropy</th>
                <th className="text-center py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.fairness.map((f) => {
                const maxCount = Math.max(...f.positionCounts, 1);
                return (
                  <tr key={f.marbleId} className="border-b border-white/[0.04]">
                    <td className="py-3 px-2 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="font-semibold text-xs">{f.name}</span>
                    </td>
                    {f.positionCounts.map((count, i) => {
                      const intensity = maxCount > 0 ? count / maxCount : 0;
                      return (
                        <td key={i} className="text-center py-3 px-2">
                          <div
                            className="mx-auto w-10 h-8 rounded flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `rgba(${i < 3 ? '46,204,113' : i < 6 ? '255,194,32' : '231,76,60'}, ${0.1 + intensity * 0.5})`,
                              color: intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.6)',
                            }}
                          >
                            {count}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-2">
                      <span className="text-xs font-semibold">{f.entropy.toFixed(2)}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        f.isFair ? 'bg-marble-green/20 text-marble-green' : 'bg-marble-red/20 text-marble-red'
                      }`}>
                        {f.isFair ? 'FAIR' : 'BIASED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 7: Doomsday & Safety + Race Time by Mode                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Doomsday & Race Safety */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <h2 className="font-heading text-lg tracking-wide mb-4">DOOMSDAY & RACE SAFETY</h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-marble-green/10">
              <div className="text-lg font-heading text-marble-green">{dms.zones.safe.pct}%</div>
              <div className="text-[10px] text-white/40 uppercase">Safe (&lt;30s)</div>
              <div className="text-xs text-white/50">{dms.zones.safe.count}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-gold/10">
              <div className="text-lg font-heading text-gold">{dms.zones.normal.pct}%</div>
              <div className="text-[10px] text-white/40 uppercase">Normal (30-45s)</div>
              <div className="text-xs text-white/50">{dms.zones.normal.count}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-marble-red/10">
              <div className="text-lg font-heading text-marble-red">{dms.zones.doomsday.pct}%</div>
              <div className="text-[10px] text-white/40 uppercase">Doomsday (&gt;45s)</div>
              <div className="text-xs text-white/50">{dms.zones.doomsday.count}</div>
            </div>
          </div>

          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Safe', value: dms.zones.safe.count },
                    { name: 'Normal', value: dms.zones.normal.count },
                    { name: 'Doomsday', value: dms.zones.doomsday.count },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0d2350', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {dms.worstCourses.length > 0 && (
            <div>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Worst Offenders</h3>
              {dms.worstCourses.map((c) => (
                <div key={c.courseId} className="flex justify-between text-xs py-1.5 border-b border-white/[0.04]">
                  <span className="font-semibold text-white/70">{c.courseId}</span>
                  <span className="text-marble-red font-semibold">{c.doomsdayRate}% ({c.doomsdayCount}/{c.total})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Race Time by Game Mode */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <h2 className="font-heading text-lg tracking-wide mb-4">RACE TIME BY MODE</h2>
          {data.modePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.modePerformance}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} unit="s" />
                <YAxis
                  dataKey="mode"
                  type="category"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                  width={75}
                />
                <Tooltip contentStyle={{ backgroundColor: '#0d2350', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#fff' }} />
                <Bar dataKey="avgTime" fill="#6ec1ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-white/30 py-12 text-sm">No mode data yet</div>
          )}
          <div className="mt-3 space-y-1">
            {data.modePerformance.map((m) => (
              <div key={m.mode} className="flex justify-between text-xs text-white/50">
                <span>{m.mode}</span>
                <span>{m.races} races</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 8: Betting vs Physics Parity                            */}
      {/* ============================================================ */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg tracking-wide">BETTING vs PHYSICS PARITY</h2>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/60">
            House Edge: <span className="text-gold font-semibold">{data.realizedHouseEdge}%</span>
          </span>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Compares implied win probability from odds engine against actual race outcomes. Delta shows over/under-valuation.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
                <th className="text-left py-3 px-2">Marble</th>
                <th className="text-center py-3 px-2">Avg Odds</th>
                <th className="text-center py-3 px-2">Implied %</th>
                <th className="text-center py-3 px-2">Actual %</th>
                <th className="text-center py-3 px-2">Delta</th>
                <th className="text-center py-3 px-2">Accuracy</th>
                <th className="text-center py-3 px-2">Bets</th>
                <th className="text-center py-3 px-2">Wagered</th>
                <th className="text-center py-3 px-2">Paid Out</th>
                <th className="text-center py-3 px-2">Edge</th>
              </tr>
            </thead>
            <tbody>
              {data.bettingParity.map((b) => (
                <tr key={b.marbleId} className="border-b border-white/[0.04]">
                  <td className="py-3 px-2 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="font-semibold text-xs">{b.name}</span>
                  </td>
                  <td className="text-center py-3 px-2 text-xs font-semibold">{b.avgOdds}x</td>
                  <td className="text-center py-3 px-2 text-white/70">{b.impliedProb}%</td>
                  <td className="text-center py-3 px-2 text-white/70">{b.actualWinRate}%</td>
                  <td className="text-center py-3 px-2">
                    <span className={`font-semibold ${
                      Math.abs(b.delta) < 3 ? 'text-marble-green' :
                      Math.abs(b.delta) < 7 ? 'text-yellow-400' :
                      'text-marble-red'
                    }`}>
                      {b.delta > 0 ? '+' : ''}{b.delta}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      b.accuracy === 'excellent' ? 'bg-marble-green/20 text-marble-green' :
                      b.accuracy === 'good' ? 'bg-yellow-400/20 text-yellow-400' :
                      'bg-marble-red/20 text-marble-red'
                    }`}>
                      {b.accuracy.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-white/50">{b.totalBets.toLocaleString()}</td>
                  <td className="text-center py-3 px-2 text-white/50">{b.totalWagered.toLocaleString()}</td>
                  <td className="text-center py-3 px-2 text-white/50">{b.totalPaidOut.toLocaleString()}</td>
                  <td className="text-center py-3 px-2">
                    <span className={`text-xs font-semibold ${b.marbleHouseEdge > 0 ? 'text-marble-green' : 'text-marble-red'}`}>
                      {b.marbleHouseEdge}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.12]">
                <td className="py-3 px-2 font-heading text-gold" colSpan={6}>OVERALL</td>
                <td className="text-center py-3 px-2 text-white/70 font-semibold">
                  {data.bettingParity.reduce((s, b) => s + b.totalBets, 0).toLocaleString()}
                </td>
                <td className="text-center py-3 px-2 text-white/70 font-semibold">
                  {data.bettingParity.reduce((s, b) => s + b.totalWagered, 0).toLocaleString()}
                </td>
                <td className="text-center py-3 px-2 text-white/70 font-semibold">
                  {data.bettingParity.reduce((s, b) => s + b.totalPaidOut, 0).toLocaleString()}
                </td>
                <td className="text-center py-3 px-2">
                  <span className="text-gold font-heading">{data.realizedHouseEdge}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({ color, label, value, sub }: { color: string; label: string; value: string; sub?: string }) {
  const borderColor =
    color === 'blue' ? 'border-marble-blue' :
    color === 'gold' ? 'border-gold' :
    color === 'green' ? 'border-marble-green' :
    'border-marble-red';
  const textColor =
    color === 'blue' ? 'text-marble-blue' :
    color === 'gold' ? 'text-gold' :
    color === 'green' ? 'text-marble-green' :
    'text-marble-red';

  return (
    <div className={`bg-white/5 rounded-2xl p-5 border-l-4 ${borderColor}`}>
      <div className="text-[11px] text-white/40 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-heading mt-1 ${textColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-xs font-semibold text-white/80">{value}</span>
    </div>
  );
}

function StatPill({ val }: { val: number }) {
  const bg = val >= 5 ? 'bg-marble-green/20 text-marble-green' :
             val >= 4 ? 'bg-marble-blue/20 text-marble-blue' :
             val >= 3 ? 'bg-gold/20 text-gold' :
             'bg-white/10 text-white/50';
  return (
    <span className={`inline-flex w-7 h-6 items-center justify-center rounded text-xs font-semibold ${bg}`}>
      {val}
    </span>
  );
}

