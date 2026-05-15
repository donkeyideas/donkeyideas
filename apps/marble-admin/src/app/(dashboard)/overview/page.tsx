'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  PieChart,
  Pie,
  Cell,
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

interface ProductSlice {
  name: string;
  value: number;
  color: string;
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
  revenueChart: RevenueChartPoint[];
  revenueByProduct: ProductSlice[];
  quickStats: QuickStat[];
  alerts: AlertItem[];
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OverviewPage() {
  const { data, isLoading, isError } = useQuery<OverviewData>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview').then((res) => res.data),
  });

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
        </div>

        {/* Daily Active Users */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Daily Active Users
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {dau.toLocaleString()}
          </div>
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg ${
              dauTrend.positive
                ? 'bg-marble-green/15 text-marble-green'
                : 'bg-marble-red/15 text-marble-red'
            }`}
          >
            {dauTrend.text} vs yesterday
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
            {payTrend.text} this week &middot; +{newToday} new today
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

      {/* -- Charts Row -- */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Revenue -- Last 12 Months */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-base tracking-wide">
              Revenue &mdash; Last 12 Months
            </div>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-gold/20 text-gold">
                Gross
              </button>
              <button className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/40">
                Net
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.revenueChart}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              />
              <Bar dataKey="revenue" fill="#ffc220" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="w-2 h-2 rounded-full bg-gold inline-block" />
              Gross Revenue
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="w-2 h-2 rounded-full bg-marble-green inline-block" />
              Net
            </div>
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
