'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AlertItem {
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
}

interface QuickStat {
  name: string;
  value: string;
  color: string;
}

interface RevenueChartPoint {
  month: string;
  revenue: number;
}

interface UserGrowthPoint {
  month: string;
  monthlyNewUsers: number;
  totalUsersIos: number;
  totalUsersAndroid: number;
  totalUsers: number;
}

interface ProductSlice {
  name: string;
  value: number;
  color: string;
}

interface HeatmapData {
  days: string[];
  grid: number[][];       // 0..5 color level
  racesGrid?: number[][]; // races count per cell (for click details)
  betsGrid?: number[][];  // bets count per cell
  totalsGrid?: number[][];// races + bets total per cell
  peakTime: string;
  mostActiveDay: string;
  totalEvents: number;
  totalRaces: number;
  totalBets: number;
}

interface OverviewData {
  players: {
    total: number;
    activeToday: number;
    activeWeek: number;
    banned: number;
    paying: number;
    newToday: number;
    newWeek: number;
  };
  races: { today: number; total: number };
  revenue: { total: number; today: number; week: number; month: number };
  economy: { totalCoinsInCirculation: number };
  heatmap: HeatmapData;
  revenueChart: RevenueChartPoint[];
  userGrowthChart: UserGrowthPoint[];
  revenueByProduct: ProductSlice[];
  quickStats: QuickStat[];
  alerts: AlertItem[];
  gameModes: { mode: string; count: number }[];
  trends: { revenue: number; dau: number; paying: number };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const alertStyles: Record<
  AlertItem['type'],
  { bg: string; border: string; icon: string }
> = {
  warning: {
    bg: 'bg-gold/[0.08]',
    border: 'border-gold/20',
    icon: '\u26A0',
  },
  danger: {
    bg: 'bg-marble-red/[0.08]',
    border: 'border-marble-red/20',
    icon: '\u2715',
  },
  info: {
    bg: 'bg-marble-blue/[0.08]',
    border: 'border-marble-blue/20',
    icon: '\u2139',
  },
  success: {
    bg: 'bg-marble-green/[0.08]',
    border: 'border-marble-green/20',
    icon: '\u2713',
  },
};

function trendLabel(value: number): { text: string; positive: boolean } {
  if (value > 0) return { text: `\u2191 +${value}%`, positive: true };
  if (value < 0) return { text: `\u2193 ${value}%`, positive: false };
  return { text: '- 0%', positive: true };
}

function h12(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function hourWindow(h: number): string {
  const next = (h + 1) % 24;
  return `${h12(h)} – ${h12(next)}`;
}

/* ------------------------------------------------------------------ */
/*  System Activity Heatmap                                            */
/*                                                                     */
/*  Each cell is clickable; selecting one shows a breakdown of races + */
/*  bets for that day/hour bucket in a panel below the grid. The panel */
/*  reads from racesGrid / betsGrid which the API now returns alongside */
/*  the pre-existing color-level grid. Without the per-cell raw counts  */
/*  the panel can only display the color bucket, which carries roughly  */
/*  no information.                                                    */
/* ------------------------------------------------------------------ */
function ActivityHeatmap({ heatmap }: { heatmap: HeatmapData }) {
  const [selected, setSelected] = useState<{ day: number; hour: number } | null>(null);

  const cellLevel = (level: number) => {
    if (level === 0) return 'bg-white/[0.04]';
    if (level === 1) return 'bg-marble-blue/[0.15]';
    if (level === 2) return 'bg-marble-blue/[0.30]';
    if (level === 3) return 'bg-marble-blue/[0.50]';
    if (level === 4) return 'bg-marble-blue/[0.75]';
    return 'bg-marble-blue';
  };

  const races = selected ? heatmap.racesGrid?.[selected.day]?.[selected.hour] ?? 0 : 0;
  const bets = selected ? heatmap.betsGrid?.[selected.day]?.[selected.hour] ?? 0 : 0;
  const total = races + bets;

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-heading text-base tracking-wide">System Activity &mdash; Last 30 Days</div>
          <p className="text-[11px] text-white/35 mt-0.5">
            {heatmap.totalEvents.toLocaleString()} events &middot; {heatmap.totalRaces.toLocaleString()} races &middot; {heatmap.totalBets.toLocaleString()} bets
            <span className="ml-2 text-white/25">&middot; click a cell for details</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Peak Time</p>
            <p className="text-sm font-semibold text-gold">{heatmap.peakTime}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Most Active</p>
            <p className="text-sm font-semibold text-marble-green">{heatmap.mostActiveDay}</p>
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1">
        <div className="flex items-center gap-[3px] ml-10">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 && <span className="text-[9px] text-white/25">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</span>}
            </div>
          ))}
        </div>
        {heatmap.days.map((day, di) => (
          <div key={day} className="flex items-center gap-[3px]">
            <span className="text-[10px] text-white/30 w-9 text-right pr-1.5 flex-shrink-0 font-semibold">{day}</span>
            {(heatmap.grid[di] ?? []).map((level, hi) => {
              const isSelected = selected?.day === di && selected?.hour === hi;
              const cellRaces = heatmap.racesGrid?.[di]?.[hi] ?? 0;
              const cellBets = heatmap.betsGrid?.[di]?.[hi] ?? 0;
              const cellTotal = cellRaces + cellBets;
              return (
                <button
                  key={hi}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : { day: di, hour: hi })}
                  className={`flex-1 aspect-square rounded-[3px] transition-all cursor-pointer ${cellLevel(level)} ${
                    isSelected ? 'ring-2 ring-gold ring-offset-1 ring-offset-[#0a1a3a] scale-110 z-10 relative' : 'hover:ring-1 hover:ring-white/30'
                  }`}
                  title={`${day} ${hourWindow(hi)} — ${cellTotal} event${cellTotal === 1 ? '' : 's'}`}
                  aria-label={`${day} ${hourWindow(hi)}, ${cellTotal} events`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-white/25 mr-1">Less</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div key={l} className={`w-3.5 h-3.5 rounded-[3px] ${cellLevel(l)}`} />
        ))}
        <span className="text-[10px] text-white/25 ml-1">More</span>
      </div>

      {/* Selected-cell detail panel */}
      {selected && (
        <div className="mt-4 p-4 rounded-xl bg-marble-blue/10 border border-marble-blue/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] text-white/45 uppercase tracking-wider font-bold">Selected Slot</div>
              <div className="font-heading text-base tracking-wide text-gold mt-0.5">
                {heatmap.days[selected.day]} &middot; {hourWindow(selected.hour)}
              </div>
              <p className="text-[11px] text-white/50 mt-1">
                Day-of-week aggregate across the last 30 days (ET).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] text-white/40 hover:text-white/70 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/[0.04] rounded-lg p-3">
              <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Races</div>
              <div className="font-heading text-xl text-marble-blue mt-1">{races.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3">
              <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Bets</div>
              <div className="font-heading text-xl text-gold mt-1">{bets.toLocaleString()}</div>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3">
              <div className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Total Events</div>
              <div className="font-heading text-xl text-marble-green mt-1">{total.toLocaleString()}</div>
            </div>
          </div>
          {total === 0 && (
            <p className="text-[11px] text-white/40 mt-3">
              No activity recorded in this slot over the last 30 days.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

// Apple/Google take a 15% cut for the first $1M/year under the Small Business
// Program. Used to translate gross revenue into net for the chart toggle.
const NET_REVENUE_FACTOR = 1 - 0.15;

export default function OverviewPage() {
  const { data, isLoading, isError } = useQuery<OverviewData>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview').then((res) => res.data),
  });
  const { data: admob } = useQuery<{ configured: boolean; yesterday: { revenueUsd: number; impressions: number }; monthToDate: { revenueUsd: number } }>({
    queryKey: ['admob-metrics'],
    queryFn: () => api.get('/admob/metrics').then((res) => res.data),
  });
  const [revenueView, setRevenueView] = useState<'gross' | 'net'>('gross');

  const revenueChartData = useMemo(() => {
    if (!data?.revenueChart) return [];
    if (revenueView === 'gross') return data.revenueChart;
    return data.revenueChart.map((p) => ({ ...p, revenue: Math.round(p.revenue * NET_REVENUE_FACTOR * 100) / 100 }));
  }, [data?.revenueChart, revenueView]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data)
    return (
      <div className="text-center py-20 text-white/40">Failed to load</div>
    );

  /* Derived values from API data */
  const revenueToday = data.revenue.today;
  const dau = data.players.activeToday;
  const payingUsers = data.players.paying;
  const newToday = data.players.newToday;

  const revTrend = trendLabel(data.trends.revenue);
  const dauTrend = trendLabel(data.trends.dau);
  const payTrend = trendLabel(data.trends.paying);

  const conversionRate = data.players.total > 0
    ? (data.players.paying / data.players.total * 100)
    : 0;

  const donutTotal = data.revenueByProduct.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* -- KPI Cards -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Today */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Revenue Today
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">
            ${revenueToday.toLocaleString()}
          </div>
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg ${
              revTrend.positive
                ? 'bg-marble-green/15 text-marble-green'
                : 'bg-marble-red/15 text-marble-red'
            }`}
          >
            {revTrend.text} vs yesterday
          </div>
          {admob?.configured && (
            <div className="text-[10px] text-white/40 mt-1.5 leading-tight">
              + ${admob.yesterday.revenueUsd.toFixed(2)} ad rev yesterday
              <span className="text-white/25"> · MTD ${admob.monthToDate.revenueUsd.toFixed(0)}</span>
            </div>
          )}
        </div>

        {/* Total Users */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Total Users
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {data.players.total.toLocaleString()}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {dau.toLocaleString()} active today
          </div>
        </div>

        {/* Paying Users */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Paying Users
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">
            {payingUsers.toLocaleString()}
          </div>
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg ${
              payTrend.positive
                ? 'bg-marble-green/15 text-marble-green'
                : 'bg-marble-red/15 text-marble-red'
            }`}
          >
            {payTrend.text} new payers vs last wk &middot; +{newToday} new today
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Conversion Rate
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">
            {conversionRate.toFixed(1)}%
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {payingUsers} of {data.players.total.toLocaleString()} players
          </div>
        </div>
      </div>

      {/* -- System Activity Heatmap -- */}
      <ActivityHeatmap heatmap={data.heatmap} />


      {/* -- User Growth (Last 6 Months) -- */}
      {(() => {
        const growth = data.userGrowthChart ?? [];
        const totalNew = growth.reduce((s, p) => s + p.monthlyNewUsers, 0);
        const endTotal = growth.length > 0 ? growth[growth.length - 1].totalUsers : 0;
        const startTotal = growth.length > 0 ? growth[0].totalUsers - growth[0].monthlyNewUsers : 0;
        const growthPct = startTotal > 0
          ? Math.round(((endTotal - startTotal) / startTotal) * 100)
          : (endTotal > 0 ? 100 : 0);
        return (
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-heading text-base tracking-wide">User Growth &mdash; Last 6 Months</div>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {totalNew.toLocaleString()} new signups &middot; {endTotal.toLocaleString()} total users
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">6-Mo Growth</p>
                  <p className={`text-sm font-semibold ${growthPct >= 0 ? 'text-marble-green' : 'text-marble-red'}`}>
                    {growthPct >= 0 ? '+' : ''}{growthPct}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Avg / Mo</p>
                  <p className="text-sm font-semibold text-marble-blue">
                    {growth.length > 0 ? Math.round(totalNew / growth.length).toLocaleString() : '0'}
                  </p>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growth} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,26,58,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                  itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
                  iconType="circle"
                />
                {/* All three lines plotted on a single cumulative axis so
                 * iOS + Android visually adds up to Total. Previously the
                 * chart used a dual y-axis (monthly-new left, cumulative
                 * right) which made Android-monthly appear to exceed
                 * Total-cumulative when the scales aligned — confusing
                 * because the implicit "iOS + Android ≤ Total" mental
                 * model was violated visually. */}
                <Line
                  type="monotone"
                  dataKey="totalUsersIos"
                  name="iOS"
                  stroke="#6ec1ff"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6ec1ff', stroke: '#6ec1ff' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalUsersAndroid"
                  name="Android"
                  stroke="#a4c639"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a4c639', stroke: '#a4c639' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  name="Total Users"
                  stroke="#2ecc71"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2ecc71', stroke: '#2ecc71' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* -- Charts Row -- */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Revenue -- Last 12 Months */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-base tracking-wide">
              Revenue &mdash; Last 12 Months ({revenueView === 'gross' ? 'Gross' : 'Net'})
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRevenueView('gross')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${revenueView === 'gross' ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-white/40 hover:bg-white/10'}`}
              >
                Gross
              </button>
              <button
                type="button"
                onClick={() => setRevenueView('net')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${revenueView === 'net' ? 'bg-marble-green/20 text-marble-green' : 'bg-white/[0.06] text-white/40 hover:bg-white/10'}`}
              >
                Net
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueChartData}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              />
              <Bar dataKey="revenue" fill={revenueView === 'gross' ? '#ffc220' : '#2ecc71'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-[11px] text-white/40">
            {revenueView === 'net'
              ? 'Net = gross × 0.85 (after 15% Small Business Program fee).'
              : 'Gross revenue before App Store / Play Store fees.'}
          </div>
        </div>

        {/* Revenue Breakdown (Donut) */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Revenue Breakdown
          </div>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.revenueByProduct}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.revenueByProduct.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading text-lg text-white">
                ${donutTotal >= 1000 ? `${(donutTotal / 1000).toFixed(1)}K` : donutTotal.toFixed(0)}
              </span>
              <span className="text-[10px] text-white/40">All Time</span>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 space-y-2">
            {data.revenueByProduct.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-semibold text-white/80">
                  ${item.value.toLocaleString()}
                </span>
              </div>
            ))}
            {data.revenueByProduct.length === 0 && (
              <div className="text-[12px] text-white/30 text-center py-4">
                No purchase data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -- Game Mode Distribution -- */}
      {data.gameModes && data.gameModes.length > 0 && (() => {
        const modeLabels: Record<string, { label: string; color: string; border: string; bg: string }> = {
          bet: { label: 'Betting', color: 'text-gold', border: 'border-gold/20', bg: 'bg-gold' },
          quick_race: { label: 'Quick Race', color: 'text-marble-blue', border: 'border-marble-blue/20', bg: 'bg-marble-blue' },
          season: { label: 'Season', color: 'text-marble-green', border: 'border-marble-green/20', bg: 'bg-marble-green' },
          national_race: { label: 'National Race', color: 'text-[#c39bd3]', border: 'border-[#c39bd3]/20', bg: 'bg-[#c39bd3]' },
          tournament: { label: 'Tournament', color: 'text-marble-red', border: 'border-marble-red/20', bg: 'bg-marble-red' },
          playoff: { label: 'Playoff', color: 'text-[#f39c12]', border: 'border-[#f39c12]/20', bg: 'bg-[#f39c12]' },
        };
        const sorted = [...(data as any).gameModes].sort((a: any, b: any) => b.count - a.count);
        const totalRaces = sorted.reduce((s: number, m: any) => s + m.count, 0);
        return (
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-base tracking-wide">Game Mode Distribution</div>
              <span className="text-[11px] text-white/35">{totalRaces.toLocaleString()} total races</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {sorted.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', border: 'border-white/10', bg: 'bg-white' };
                const pct = totalRaces > 0 ? Math.round((m.count / totalRaces) * 100) : 0;
                return (
                  <div key={m.mode} className={`bg-white/5 border-2 ${meta.border} rounded-2xl p-4 relative overflow-hidden`}>
                    <div className={`absolute -top-4 -right-4 w-[50px] h-[50px] rounded-full ${meta.bg} opacity-[0.08]`} />
                    <p className={`font-heading text-[24px] leading-none ${meta.color}`}>{m.count.toLocaleString()}</p>
                    <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-1.5">{meta.label}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
            {/* Stacked bar */}
            <div className="h-4 bg-white/[0.06] rounded-full overflow-hidden flex">
              {sorted.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', border: 'border-white/10', bg: 'bg-white' };
                const pct = totalRaces > 0 ? (m.count / totalRaces) * 100 : 0;
                return (
                  <div
                    key={m.mode}
                    className={`h-full ${meta.bg} opacity-60 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${pct}%` }}
                    title={`${meta.label}: ${m.count.toLocaleString()} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {sorted.map((m: any) => {
                const meta = modeLabels[m.mode] ?? { label: m.mode, color: 'text-white/60', border: 'border-white/10', bg: 'bg-white' };
                return (
                  <div key={m.mode} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.bg} opacity-60`} />
                    <span className="text-[11px] text-white/50">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* -- Alerts & Quick Stats -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Alerts */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Recent Alerts
          </div>
          {data.alerts.map((alert, i) => {
            const s = alertStyles[alert.type];
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 ${s.bg} border ${s.border}`}
              >
                <span className="text-lg">{s.icon}</span>
                <div className="flex-1">
                  <span className="text-[13px] font-semibold">{alert.title}</span>
                  <span className="text-[13px] text-white/70"> &mdash; {alert.message}</span>
                </div>
                <span className="text-[10px] text-white/30">{alert.time}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Quick Stats
          </div>
          {data.quickStats.map((stat) => (
            <div
              key={stat.name}
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0"
            >
              <span className="text-[13px] text-white/70">{stat.name}</span>
              <span className={`font-bold text-sm ${stat.color}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
