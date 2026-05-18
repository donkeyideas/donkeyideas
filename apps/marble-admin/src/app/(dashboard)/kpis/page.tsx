'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Types & Benchmarks                                                 */
/* ------------------------------------------------------------------ */

interface KpiEntry {
  id: string;
  weekOf: string;
  dau: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  sessionsPerDau: number;
  avgSessionSecs: number;
  arpdau: number;
  rating: number;
  crashRate: number;
  notes: string | null;
}

type MetricKey = keyof typeof BENCHMARKS;

const BENCHMARKS = {
  dau: { label: 'DAU', bad: 0, ok: 0, good: 0, excellent: 0, unit: '', higher: true, noBenchmark: true },
  d1Retention: { label: 'D1 Retention', bad: 20, ok: 25, good: 35, excellent: 45, unit: '%', higher: true },
  d7Retention: { label: 'D7 Retention', bad: 8, ok: 10, good: 15, excellent: 25, unit: '%', higher: true },
  d30Retention: { label: 'D30 Retention', bad: 3, ok: 5, good: 10, excellent: 15, unit: '%', higher: true },
  sessionsPerDau: { label: 'Sessions/DAU', bad: 1.5, ok: 2, good: 3, excellent: 5, unit: '', higher: true },
  avgSessionSecs: { label: 'Avg Session', bad: 0, ok: 0, good: 0, excellent: 0, unit: 's', higher: true, noBenchmark: true },
  arpdau: { label: 'ARPDAU', bad: 0.05, ok: 0.10, good: 0.25, excellent: 0.75, unit: '$', higher: true },
  rating: { label: 'Rating', bad: 3.5, ok: 3.5, good: 4.0, excellent: 4.5, unit: '★', higher: true },
  crashRate: { label: 'Crash Rate', bad: 2.0, ok: 1.5, good: 1.0, excellent: 0.5, unit: '%', higher: false },
} as const;

const METRIC_KEYS: MetricKey[] = [
  'dau', 'd1Retention', 'd7Retention', 'd30Retention',
  'sessionsPerDau', 'avgSessionSecs', 'arpdau', 'rating', 'crashRate',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getBenchmarkStatus(key: MetricKey, value: number): 'bad' | 'ok' | 'good' | 'excellent' {
  const b = BENCHMARKS[key];
  if ('noBenchmark' in b && b.noBenchmark) return 'good';

  if (b.higher) {
    if (value >= b.excellent) return 'excellent';
    if (value >= b.good) return 'good';
    if (value >= b.ok) return 'ok';
    return 'bad';
  } else {
    // Lower is better (crashRate)
    if (value <= b.excellent) return 'excellent';
    if (value <= b.good) return 'good';
    if (value <= b.ok) return 'ok';
    return 'bad';
  }
}

const STATUS_STYLES = {
  bad: 'bg-marble-red/15 text-marble-red border-marble-red/30',
  ok: 'bg-gold/15 text-gold border-gold/30',
  good: 'bg-marble-green/15 text-marble-green border-marble-green/30',
  excellent: 'bg-marble-blue/15 text-marble-blue border-marble-blue/30',
};

const STATUS_DOT = {
  bad: 'bg-marble-red',
  ok: 'bg-gold',
  good: 'bg-marble-green',
  excellent: 'bg-marble-blue',
};

function formatValue(key: MetricKey, value: number): string {
  const b = BENCHMARKS[key];
  if (key === 'arpdau') return `$${value.toFixed(2)}`;
  if (key === 'avgSessionSecs') {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  if (b.unit === '%') return `${value.toFixed(1)}%`;
  if (b.unit === '★') return `${value.toFixed(1)}★`;
  if (key === 'dau') return new Intl.NumberFormat('en-US').format(value);
  return value.toFixed(1);
}

function getChange(entries: KpiEntry[], key: MetricKey): { value: number; isUp: boolean } | null {
  if (entries.length < 2) return null;
  const curr = entries[0][key] as number;
  const prev = entries[1][key] as number;
  if (prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  const higher = BENCHMARKS[key].higher;
  return { value: Math.abs(pct), isUp: higher ? pct > 0 : pct < 0 };
}

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/* ------------------------------------------------------------------ */
/*  Entry Form                                                         */
/* ------------------------------------------------------------------ */

function EntryForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    weekOf: getCurrentMonday(),
    dau: '',
    d1Retention: '',
    d7Retention: '',
    d30Retention: '',
    sessionsPerDau: '',
    avgSessionSecs: '',
    arpdau: '',
    rating: '',
    crashRate: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/kpis', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const fields: { key: string; label: string; placeholder: string }[] = [
    { key: 'dau', label: 'DAU', placeholder: '1250' },
    { key: 'd1Retention', label: 'D1 Retention (%)', placeholder: '35.0' },
    { key: 'd7Retention', label: 'D7 Retention (%)', placeholder: '15.0' },
    { key: 'd30Retention', label: 'D30 Retention (%)', placeholder: '8.0' },
    { key: 'sessionsPerDau', label: 'Sessions/DAU', placeholder: '3.2' },
    { key: 'avgSessionSecs', label: 'Avg Session (seconds)', placeholder: '420' },
    { key: 'arpdau', label: 'ARPDAU ($)', placeholder: '0.25' },
    { key: 'rating', label: 'Rating', placeholder: '4.2' },
    { key: 'crashRate', label: 'Crash Rate (%)', placeholder: '1.2' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg mx-4 bg-[#0d1b3e] border-2 border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.08]">
          <h2 className="font-heading text-lg text-white/90">Log Weekly KPIs</h2>
          <p className="text-xs text-white/40 mt-1">Enter metrics from Play Console for this week</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Week picker */}
          <div>
            <label className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Week of (Monday)</label>
            <input
              type="date"
              value={form.weekOf}
              onChange={(e) => setForm({ ...form, weekOf: e.target.value })}
              className="mt-1 w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40"
            />
          </div>

          {/* Metric inputs */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] text-white/45 font-bold uppercase tracking-wider">{f.label}</label>
                <input
                  type="number"
                  step="any"
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1 w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40"
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any context for this week..."
              rows={2}
              className="mt-1 w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold/15 text-gold border-2 border-gold/30 hover:bg-gold/25 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save Entry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/70 border-2 border-white/10 hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-marble-red text-center">Failed to save. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Benchmark Bar                                                      */
/* ------------------------------------------------------------------ */

function BenchmarkBar({ metricKey, value }: { metricKey: MetricKey; value: number }) {
  const b = BENCHMARKS[metricKey];
  if ('noBenchmark' in b && b.noBenchmark) return null;

  const status = getBenchmarkStatus(metricKey, value);
  const segments = ['bad', 'ok', 'good', 'excellent'] as const;
  const segColors = {
    bad: 'bg-marble-red/40',
    ok: 'bg-gold/40',
    good: 'bg-marble-green/40',
    excellent: 'bg-marble-blue/40',
  };
  const activeColors = {
    bad: 'bg-marble-red',
    ok: 'bg-gold',
    good: 'bg-marble-green',
    excellent: 'bg-marble-blue',
  };

  // Status label is rendered inline next to the metric value in KpiCard,
  // so the bar itself is just the colored segments.
  return (
    <div className="flex items-center gap-1 mt-2">
      {segments.map((seg) => (
        <div
          key={seg}
          className={`h-1.5 flex-1 rounded-full ${seg === status ? activeColors[seg] : segColors[seg]}`}
        />
      ))}
    </div>
  );
}

// Color class for the inline status label next to a metric value.
const STATUS_TEXT_COLOR: Record<'bad' | 'ok' | 'good' | 'excellent', string> = {
  bad: 'text-marble-red',
  ok: 'text-gold',
  good: 'text-marble-green',
  excellent: 'text-marble-blue',
};

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ metricKey, entries }: { metricKey: MetricKey; entries: KpiEntry[] }) {
  const b = BENCHMARKS[metricKey];
  const hasBenchmarks = !('noBenchmark' in b && b.noBenchmark);
  const latest = entries[0];
  if (!latest) return null;

  const value = latest[metricKey] as number;
  const status = getBenchmarkStatus(metricKey, value);
  const change = getChange(entries, metricKey);

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-4 relative overflow-hidden">
      {/* Status dot */}
      <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />

      {/* Label */}
      <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider mb-1.5">{b.label}</p>

      {/* Value + inline status (status matched to value size per request) */}
      <p className="font-heading text-2xl tracking-wide text-white/90 leading-none flex items-baseline gap-3 flex-wrap">
        <span>{formatValue(metricKey, value)}</span>
        {hasBenchmarks && (
          <span className={`font-heading text-2xl tracking-wide ${STATUS_TEXT_COLOR[status]}`}>
            {status}
          </span>
        )}
      </p>

      {/* Change */}
      {change && (
        <p className={`text-[11px] font-semibold mt-1.5 ${change.isUp ? 'text-marble-green' : 'text-marble-red'}`}>
          {change.isUp ? '▲' : '▼'} {change.value.toFixed(1)}% vs last week
        </p>
      )}
      {!change && entries.length > 0 && (
        <p className="text-[11px] text-white/25 mt-1.5">No prior week</p>
      )}

      {/* Benchmark bar */}
      <BenchmarkBar metricKey={metricKey} value={value} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend Chart                                                        */
/* ------------------------------------------------------------------ */

function TrendChart({ metricKey, entries }: { metricKey: MetricKey; entries: KpiEntry[] }) {
  const b = BENCHMARKS[metricKey];
  const chartData = [...entries].reverse().map((e) => ({
    week: new Date(e.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: e[metricKey] as number,
  }));

  if (chartData.length < 2) return null;

  const hasBenchmarks = !('noBenchmark' in b && b.noBenchmark);

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-4">
      <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider mb-3">{b.label}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData}>
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={35} />
          <Tooltip
            contentStyle={{ background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
            itemStyle={{ color: '#ffc220' }}
          />
          {hasBenchmarks && (
            <>
              <ReferenceLine y={b.good} stroke="rgba(46,204,113,0.3)" strokeDasharray="4 4" />
              <ReferenceLine y={b.excellent} stroke="rgba(110,193,255,0.3)" strokeDasharray="4 4" />
            </>
          )}
          <Line type="monotone" dataKey="value" stroke="#ffc220" strokeWidth={2} dot={{ r: 3, fill: '#ffc220' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Benchmark Reference Table                                          */
/* ------------------------------------------------------------------ */

function BenchmarkTable() {
  const metricsWithBenchmarks = METRIC_KEYS.filter((k) => !('noBenchmark' in BENCHMARKS[k] && (BENCHMARKS[k] as any).noBenchmark));

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider">2026 Industry Benchmarks (Casual Mobile Games)</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Metric</th>
            <th className="text-center px-3 py-2 text-[10px] font-bold text-marble-red uppercase tracking-wider">Bad</th>
            <th className="text-center px-3 py-2 text-[10px] font-bold text-gold uppercase tracking-wider">OK</th>
            <th className="text-center px-3 py-2 text-[10px] font-bold text-marble-green uppercase tracking-wider">Good</th>
            <th className="text-center px-3 py-2 text-[10px] font-bold text-marble-blue uppercase tracking-wider">Excellent</th>
          </tr>
        </thead>
        <tbody>
          {metricsWithBenchmarks.map((key) => {
            const b = BENCHMARKS[key];
            return (
              <tr key={key} className="border-b border-white/[0.04]">
                <td className="px-4 py-2.5 text-xs text-white/70 font-semibold">{b.label}</td>
                <td className="text-center px-3 py-2.5 text-xs text-marble-red/70">
                  {b.higher ? `<${b.bad}` : `>${b.bad}`}{b.unit}
                </td>
                <td className="text-center px-3 py-2.5 text-xs text-gold/70">
                  {b.ok}{b.unit}
                </td>
                <td className="text-center px-3 py-2.5 text-xs text-marble-green/70">
                  {b.good}{b.unit}
                </td>
                <td className="text-center px-3 py-2.5 text-xs text-marble-blue/70">
                  {b.excellent}+{b.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KpisPage() {
  const [showForm, setShowForm] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ entries: KpiEntry[] }>({
    queryKey: ['kpis'],
    queryFn: () => api.get('/kpis').then((r) => r.data),
  });

  const handleAutoFetch = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      await api.post('/kpis/fetch');
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    } catch (err: any) {
      setFetchError(err?.response?.data?.error?.message || 'Failed to fetch from GA4');
    } finally {
      setFetching(false);
    }
  };

  const rawEntries = data?.entries ?? [];

  type KpiSortKey = 'weekOf' | 'dau' | 'd1Retention' | 'd7Retention' | 'd30Retention' | 'sessionsPerDau' | 'arpdau' | 'rating' | 'crashRate';
  const { sortKey: kpiSortKey, sortDir: kpiSortDir, handleSort: handleKpiSort, sortItems: sortKpiItems } = useSort<KpiSortKey>();
  const entries = sortKpiItems(rawEntries);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40">
            {entries.length > 0
              ? `${entries.length} week${entries.length > 1 ? 's' : ''} tracked · Last entry: ${new Date(entries[0].weekOf).toLocaleDateString()}`
              : 'No data yet — fetch from GA4 or log manually'}
          </p>
          {fetchError && <p className="text-xs text-marble-red mt-1">{fetchError}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFetch}
            disabled={fetching}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-marble-blue/15 text-marble-blue border-2 border-marble-blue/30 hover:bg-marble-blue/25 transition-colors disabled:opacity-50"
          >
            {fetching ? 'Fetching...' : 'Fetch from GA4'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gold/15 text-gold border-2 border-gold/30 hover:bg-gold/25 transition-colors"
          >
            + Manual Entry
          </button>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-12 text-center">
          <p className="font-heading text-xl text-white/60 mb-2">No KPI Data Yet</p>
          <p className="text-sm text-white/30 max-w-md mx-auto mb-6">
            Open Google Play Console every Monday morning, grab your metrics, and log them here.
            Track DAU, retention, sessions, ARPDAU, rating, and crash rate.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gold/15 text-gold border-2 border-gold/30 hover:bg-gold/25 transition-colors"
          >
            Log First Week
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {METRIC_KEYS.map((key) => (
            <KpiCard key={key} metricKey={key} entries={entries} />
          ))}
        </div>
      )}

      {/* Benchmark Reference Table */}
      <BenchmarkTable />

      {/* Trend Charts */}
      {entries.length >= 2 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Trends (last {entries.length} weeks)</p>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {METRIC_KEYS.map((key) => (
              <TrendChart key={key} metricKey={key} entries={entries} />
            ))}
          </div>
        </>
      )}

      {/* Weekly History */}
      {entries.length > 0 && (
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.08]">
            <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Weekly Log</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <SortableHeader label="Week" sortKey="weekOf" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} />
                  <SortableHeader label="DAU" sortKey="dau" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="D1" sortKey="d1Retention" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="D7" sortKey="d7Retention" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="D30" sortKey="d30Retention" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="Sess" sortKey="sessionsPerDau" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="ARPDAU" sortKey="arpdau" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="Rating" sortKey="rating" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <SortableHeader label="Crash" sortKey="crashRate" currentSort={kpiSortKey} currentDir={kpiSortDir} onSort={handleKpiSort} className="text-right" />
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs text-white/70 font-semibold">
                      {new Date(e.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.dau.toLocaleString()}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.d1Retention}%</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.d7Retention}%</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.d30Retention}%</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.sessionsPerDau}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">${e.arpdau.toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.rating.toFixed(1)}</td>
                    <td className="text-right px-3 py-2.5 text-xs text-white/60">{e.crashRate}%</td>
                    <td className="px-3 py-2.5 text-xs text-white/30 max-w-[150px] truncate">{e.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry Form Modal */}
      {showForm && (
        <EntryForm onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />
      )}
    </div>
  );
}
