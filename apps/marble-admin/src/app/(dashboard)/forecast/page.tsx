'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';

interface ForecastApiResponse {
  months: { month: string; count: number }[];
  forecasts: Record<string, number>;
}

type SortKey =
  | 'month'
  | 'users'
  | 'avgUsers'
  | 'forecast'
  | 'fcstAvg'
  | 'avf'
  | 'variance'
  | 'cumulative'
  | 'growth';

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ForecastPage() {
  const queryClient = useQueryClient();
  const { sortKey, sortDir, handleSort } = useSort<SortKey>('month', 'asc');

  const [edits, setEdits] = useState<Record<string, number | null>>({});
  const [addedMonths, setAddedMonths] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<ForecastApiResponse>({
    queryKey: ['user-forecasts'],
    queryFn: () => api.get('/user-forecasts').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (forecasts: Record<string, number>) =>
      api.post('/user-forecasts', { forecasts }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-forecasts'] });
      setEdits({});
      setDirty(false);
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];

    const savedForecasts: Record<string, number> = { ...data.forecasts };
    const merged: Record<string, number> = { ...savedForecasts };
    for (const [m, v] of Object.entries(edits)) {
      if (v == null) delete merged[m];
      else merged[m] = v;
    }

    const apiKeys = new Set(data.months.map((m) => m.month));
    const all = [...data.months];
    for (const m of addedMonths) {
      if (!apiKeys.has(m)) all.push({ month: m, count: 0 });
    }
    for (const k of Object.keys(merged)) {
      if (!apiKeys.has(k) && !addedMonths.includes(k)) all.push({ month: k, count: 0 });
    }

    const sorted = all.sort((a, b) => a.month.localeCompare(b.month));
    const curKey = currentMonthKey();
    const now = new Date();

    let cumA = 0;
    let cumF = 0;
    return sorted.map((row, i) => {
      const isFuture = row.month > curKey;
      const isCurrent = row.month === curKey;
      const actual = isFuture ? null : row.count;
      const forecast = merged[row.month] ?? null;

      const [y, m] = row.month.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const daysElapsed = isCurrent ? now.getDate() : daysInMonth;

      const avgPerDay = actual != null && daysElapsed > 0 ? Math.round((actual / daysElapsed) * 10) / 10 : null;
      const fcstAvg = forecast != null && daysInMonth > 0 ? Math.round((forecast / daysInMonth) * 10) / 10 : null;
      const variance = actual != null && forecast != null ? actual - forecast : null;
      const avf = actual != null && forecast != null && forecast > 0 ? Math.round((actual / forecast) * 100) : null;

      const prevActual = i > 0 ? (sorted[i - 1].month > curKey ? null : sorted[i - 1].count) : null;
      const growth = actual != null && prevActual != null && prevActual > 0 ? ((actual - prevActual) / prevActual) * 100 : null;

      if (actual != null) cumA += actual;
      if (forecast != null) cumF += forecast;

      return {
        month: row.month,
        isFuture,
        isCurrent,
        actual,
        forecast,
        avgPerDay,
        fcstAvg,
        variance,
        avf,
        cumActual: actual != null ? cumA : null,
        cumForecast: forecast != null ? cumF : null,
        growth,
      };
    });
  }, [data, edits, addedMonths]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const map: Record<SortKey, (r: (typeof rows)[number]) => number | string> = {
      month: (r) => r.month,
      users: (r) => r.actual ?? -1,
      avgUsers: (r) => r.avgPerDay ?? -1,
      forecast: (r) => r.forecast ?? -1,
      fcstAvg: (r) => r.fcstAvg ?? -1,
      avf: (r) => r.avf ?? -1,
      variance: (r) => r.variance ?? -Infinity,
      cumulative: (r) => r.cumActual ?? -1,
      growth: (r) => r.growth ?? -Infinity,
    };
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = map[sortKey](a);
      const bv = map[sortKey](b);
      if (typeof av === 'string' && typeof bv === 'string') return sign * av.localeCompare(bv);
      return sign * ((av as number) - (bv as number));
    });
  }, [rows, sortKey, sortDir]);

  const summary = useMemo(() => {
    const past = rows.filter((r) => !r.isFuture);
    const totalActual = past.reduce((s, r) => s + (r.actual ?? 0), 0);
    const totalFcstYTD = past.reduce((s, r) => s + (r.forecast ?? 0), 0);
    const totalFcstAll = rows.reduce((s, r) => s + (r.forecast ?? 0), 0);
    const varianceYTD = totalFcstYTD > 0 ? totalActual - totalFcstYTD : null;
    const avgUsersMo = past.length > 0 ? Math.round(totalActual / past.length) : 0;
    const avf = totalFcstYTD > 0 ? Math.round((totalActual / totalFcstYTD) * 100) : null;
    const growths = past.map((r) => r.growth).filter((g): g is number => g != null);
    const avgGrowth = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : null;
    return { totalActual, totalFcstYTD, totalFcstAll, varianceYTD, avgUsersMo, avf, avgGrowth };
  }, [rows]);

  function handleEdit(month: string, raw: string) {
    const trimmed = raw.trim();
    setEdits((prev) => ({ ...prev, [month]: trimmed === '' ? null : Number(trimmed) }));
    setDirty(true);
  }
  function handleSave() {
    const savedForecasts = data?.forecasts ?? {};
    const merged: Record<string, number> = { ...savedForecasts };
    for (const [m, v] of Object.entries(edits)) {
      if (v == null) delete merged[m];
      else merged[m] = v;
    }
    saveMutation.mutate(merged);
  }
  function handleAddMonth() {
    if (!addValue) return;
    if (!addedMonths.includes(addValue)) setAddedMonths((prev) => [...prev, addValue]);
    setAddValue('');
    setAddOpen(false);
    setDirty(true);
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl text-white">User Forecast</h1>
          <p className="text-xs text-white/45 mt-1">
            Enter monthly forecast numbers &mdash; variance, growth, and cumulative totals auto-calculate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {addOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="month"
                aria-label="Forecast month"
                placeholder="YYYY-MM"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border-2 border-white/10 text-white focus:outline-none focus:border-gold/40"
              />
              <button
                type="button"
                onClick={handleAddMonth}
                disabled={!addValue}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  setAddValue('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white/80 hover:bg-white/5 border border-white/10 transition-colors"
            >
              + Add Month
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Forecasts'}
          </button>
        </div>
      </div>

      {/* SUMMARY TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryTile label="Users YTD" value={fmtNum(summary.totalActual)} />
        <SummaryTile label="Forecast YTD" value={fmtNum(summary.totalFcstYTD)} />
        <SummaryTile label="Total Forecast" value={fmtNum(summary.totalFcstAll)} />
        <SummaryTile
          label="Variance YTD"
          value={
            summary.varianceYTD == null
              ? '---'
              : `${summary.varianceYTD >= 0 ? '+' : ''}${fmtNum(summary.varianceYTD)}`
          }
          tone={
            summary.varianceYTD == null ? undefined : summary.varianceYTD >= 0 ? 'pos' : 'neg'
          }
        />
        <SummaryTile label="Avg Users / Mo" value={fmtNum(summary.avgUsersMo)} />
        <SummaryTile
          label="Actual vs Forecast"
          value={summary.avf == null ? '---' : `${summary.avf}%`}
          tone={summary.avf == null ? undefined : summary.avf >= 100 ? 'pos' : 'neg'}
        />
        <SummaryTile
          label="Avg Growth"
          value={
            summary.avgGrowth == null
              ? '---'
              : `${summary.avgGrowth >= 0 ? '+' : ''}${summary.avgGrowth.toFixed(1)}%`
          }
          tone={
            summary.avgGrowth == null ? undefined : summary.avgGrowth >= 0 ? 'pos' : 'neg'
          }
        />
      </div>

      {/* TABLE */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <SortableHeader label="Month" sortKey="month" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Users" sortKey="users" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Avg/Day" sortKey="avgUsers" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Forecast" sortKey="forecast" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="F Avg/Day" sortKey="fcstAvg" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Actual vs F" sortKey="avf" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Variance" sortKey="variance" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Cumulative" sortKey="cumulative" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Growth" sortKey="growth" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const editedVal = edits[r.month];
                const inputValue =
                  editedVal === null
                    ? ''
                    : editedVal !== undefined
                      ? editedVal
                      : r.forecast ?? '';
                return (
                  <tr
                    key={r.month}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                      r.isFuture ? 'opacity-60' : ''
                    } ${r.isCurrent ? 'bg-gold/[0.04]' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-white/90">{monthLabel(r.month)}</td>
                    <td className="px-4 py-3 text-sm text-white/80">
                      {r.isFuture ? <span className="text-white/30">---</span> : fmtNum(r.actual ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {r.avgPerDay != null ? r.avgPerDay : <span className="text-white/30">---</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          inputValue === '' || inputValue == null
                            ? ''
                            : Number(inputValue).toLocaleString('en-US')
                        }
                        onChange={(e) => handleEdit(r.month, e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="Set"
                        className="w-24 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white text-sm text-right font-semibold focus:outline-none focus:border-gold/50 focus:bg-gold/[0.08] placeholder:text-white/25 placeholder:italic placeholder:font-normal"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {r.fcstAvg != null ? r.fcstAvg : <span className="text-white/30">---</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {r.isFuture ? (
                        <span className="text-white/30">---</span>
                      ) : r.avf != null ? (
                        <span className={r.avf >= 100 ? 'text-marble-green' : 'text-marble-red'}>{r.avf}%</span>
                      ) : (
                        <span className="text-white/30">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {r.variance == null ? (
                        r.isFuture ? (
                          <span className="text-white/30 italic">Pending</span>
                        ) : (
                          <span className="text-white/30">---</span>
                        )
                      ) : (
                        <span className={r.variance >= 0 ? 'text-marble-green' : 'text-marble-red'}>
                          {r.variance >= 0 ? '+' : ''}
                          {r.variance}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/80">
                      {r.cumActual != null ? (
                        <>
                          {fmtNum(r.cumActual)}
                          {r.cumForecast != null && (
                            <>
                              <span className="text-white/30"> / {fmtNum(r.cumForecast)}</span>
                              <span
                                className={`ml-1 text-[11px] ${
                                  r.cumActual - r.cumForecast >= 0 ? 'text-marble-green' : 'text-marble-red'
                                }`}
                              >
                                ({r.cumActual - r.cumForecast >= 0 ? '+' : ''}
                                {r.cumActual - r.cumForecast})
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-white/30">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {r.growth == null ? (
                        <span className="text-white/30">---</span>
                      ) : (
                        <span className={r.growth >= 0 ? 'text-marble-green' : 'text-marble-red'}>
                          {r.growth >= 0 ? '+' : ''}
                          {r.growth.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-white/30 text-sm">
                    No forecast data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg';
}) {
  const color = tone === 'pos' ? 'text-marble-green' : tone === 'neg' ? 'text-marble-red' : 'text-white';
  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-4">
      <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">{label}</div>
      <div className={`font-heading text-2xl tracking-wide leading-none ${color}`}>{value}</div>
    </div>
  );
}
