'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

type Zone = 'double-down' | 'small-tests' | 'protect-or-partner' | 'cut-pause-sell';

interface ScoredProject {
  projectKey: string;
  displayName: string;
  archetype: string;
  status: string;
  traction: number;
  leverage: number;
  zone: Zone;
  why: string;
}
interface QuietlyBroken {
  projectKey: string;
  displayName: string;
  title: string;
  detail: string;
  kind: string;
}
interface Briefing {
  date: string;
  runAt: string;
  trigger: string;
  products: ScoredProject[];
  quietlyBroken: QuietlyBroken[];
  zoneCounts: { doubleDown: number; smallTests: number; protectPartner: number; cutPauseSell: number };
  headline: string;
  narrative: string;
  beaconsReachable: number;
  beaconsTotal: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

const ZONE_META: Record<Zone, { label: string; color: string; bg: string }> = {
  'double-down': { label: 'Double down', color: '#34d399', bg: 'rgba(52,211,153,.10)' },
  'small-tests': { label: 'Small tests', color: '#4d8df6', bg: 'rgba(77,141,246,.10)' },
  'protect-or-partner': { label: 'Protect / partner', color: '#eab308', bg: 'rgba(234,179,8,.10)' },
  'cut-pause-sell': { label: 'Cut · pause · sell', color: '#f87171', bg: 'rgba(248,113,113,.10)' },
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 min-w-[56px] rounded bg-white/10 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-white/70 w-6">{value}</span>
    </div>
  );
}

function QuadrantCell({ zone, products }: { zone: Zone; products: ScoredProject[] }) {
  const m = ZONE_META[zone];
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-3 flex flex-col gap-2" style={{ background: m.bg }}>
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: m.color }}>
        {zone === 'double-down' ? '★ ' : ''}{m.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {products.length === 0 && <span className="text-xs text-white/30">—</span>}
        {products.map((p) => (
          <span key={p.projectKey} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border text-white/85 whitespace-nowrap" style={{ borderColor: m.color + '55' }}>
            {p.displayName}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioAgentPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/portfolio/latest');
      setBriefing(res.data?.briefing ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = useCallback(async (withEmail: boolean) => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.post('/portfolio/run', { email: withEmail });
      setBriefing(res.data?.briefing ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to run briefing');
    } finally {
      setRunning(false);
    }
  }, []);

  const byZone = (z: Zone) => (briefing?.products ?? []).filter((p) => p.zone === z);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Portfolio Growth Agent</h1>
          <p className="text-white/50 mt-2 max-w-2xl">
            Daily allocation briefing across all products — where to point your next hour and dollar,
            and what&apos;s quietly broken. Scored within each product&apos;s archetype.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => runNow(true)} disabled={running}>
            Run &amp; email
          </Button>
          <Button onClick={() => runNow(false)} disabled={running}>
            {running ? 'Running…' : '⟳ Run Briefing Now'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="text-white/40">Loading…</div>
      ) : !briefing ? (
        <Card>
          <CardContent className="py-14 text-center">
            <div className="text-lg font-semibold">No briefing yet</div>
            <p className="text-white/50 mt-2">Run the agent to generate your first portfolio allocation briefing.</p>
            <div className="mt-5">
              <Button onClick={() => runNow(false)} disabled={running}>
                {running ? 'Running…' : 'Run Briefing Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Products Tracked</div>
              <div className="text-3xl font-extrabold mt-2">{briefing.products.length}</div>
              <div className="text-xs text-white/50 mt-1">{briefing.beaconsReachable}/{briefing.beaconsTotal} beacons reachable</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Double-Down</div>
              <div className="text-3xl font-extrabold mt-2" style={{ color: ZONE_META['double-down'].color }}>{briefing.zoneCounts.doubleDown}</div>
              <div className="text-xs text-white/50 mt-1 truncate">{byZone('double-down').map((p) => p.displayName).join(' · ') || '—'}</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Quietly Broken</div>
              <div className="text-3xl font-extrabold mt-2" style={{ color: ZONE_META['cut-pause-sell'].color }}>{briefing.quietlyBroken.length}</div>
              <div className="text-xs text-white/50 mt-1">Funnel / error issues — not marketing</div>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-white/50">Run Cost</div>
              <div className="text-3xl font-extrabold mt-2" style={{ color: ZONE_META['small-tests'].color }}>${briefing.cost.toFixed(4)}</div>
              <div className="text-xs text-white/50 mt-1">{briefing.tokensUsed.toLocaleString()} tokens · {briefing.model}</div>
            </CardContent></Card>
          </div>

          {/* verdict */}
          <div className="rounded-xl border border-[#20303f] p-6" style={{ background: 'linear-gradient(180deg,#121821,#0f1216)' }}>
            <div className="text-[11px] uppercase tracking-[0.1em] font-bold" style={{ color: ZONE_META['small-tests'].color }}>
              ● DeepSeek verdict · the headline call
            </div>
            <h2 className="text-xl font-extrabold mt-3 leading-snug">{briefing.headline}</h2>
            <p className="text-[#c9ccd2] mt-2.5 max-w-4xl">{briefing.narrative}</p>
            <div className="mt-4 text-xs text-white/35 flex gap-4 flex-wrap">
              <span>{briefing.date} · trigger: {briefing.trigger}</span>
              <span>{briefing.beaconsReachable}/{briefing.beaconsTotal} beacons</span>
              <span>{new Date(briefing.runAt).toLocaleString()}</span>
            </div>
          </div>

          {/* grid + broken */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
            <Card><CardContent className="p-6">
              <h2 className="text-lg font-bold">Allocation Grid</h2>
              <p className="text-white/50 text-sm mb-4">Traction (is it real?) × Leverage (would a push move it?), within archetype.</p>
              <div className="grid grid-cols-2 grid-rows-2 gap-2.5" style={{ minHeight: 360 }}>
                <QuadrantCell zone="small-tests" products={byZone('small-tests')} />
                <QuadrantCell zone="double-down" products={byZone('double-down')} />
                <QuadrantCell zone="cut-pause-sell" products={byZone('cut-pause-sell')} />
                <QuadrantCell zone="protect-or-partner" products={byZone('protect-or-partner')} />
              </div>
              <div className="text-[11px] text-white/40 mt-3">↑ rows = higher leverage · → columns = higher traction</div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <h2 className="text-lg font-bold">Quietly Broken</h2>
              <p className="text-white/50 text-sm mb-3">Erroring or converting far below peers — a bug, not bad marketing.</p>
              <div className="divide-y divide-white/5">
                {briefing.quietlyBroken.length === 0 && <div className="text-white/40 text-sm py-3">None detected.</div>}
                {briefing.quietlyBroken.map((q) => (
                  <div key={q.projectKey + q.title} className="flex gap-3 py-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: 'rgba(248,113,113,.12)', color: '#f87171' }}>
                      {q.kind === 'no-monetization' ? '$' : '!'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{q.title}</div>
                      <div className="text-white/50 text-xs mt-0.5">{q.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </div>

          {/* ranked table */}
          <Card><CardContent className="p-6">
            <h2 className="text-lg font-bold">All Products — Ranked</h2>
            <p className="text-white/50 text-sm mb-3">Sorted by zone, then combined traction × leverage.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 text-[10.5px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Archetype</th>
                    <th className="py-2.5 px-3 w-40">Traction</th>
                    <th className="py-2.5 px-3 w-40">Leverage</th>
                    <th className="py-2.5 px-3">Zone</th>
                    <th className="py-2.5 px-3">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {briefing.products.map((p) => {
                    const m = ZONE_META[p.zone];
                    return (
                      <tr key={p.projectKey} className="border-t border-white/5">
                        <td className="py-3 px-3 font-semibold">{p.displayName}</td>
                        <td className="py-3 px-3 text-white/50 text-xs capitalize">{p.archetype.replace(/-/g, ' / ')}</td>
                        <td className="py-3 px-3"><ScoreBar value={p.traction} color={p.traction >= 55 ? '#34d399' : p.traction >= 35 ? '#4d8df6' : '#f87171'} /></td>
                        <td className="py-3 px-3"><ScoreBar value={p.leverage} color={p.leverage >= 55 ? '#34d399' : p.leverage >= 35 ? '#4d8df6' : '#f87171'} /></td>
                        <td className="py-3 px-3"><span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ color: m.color, background: m.bg }}>{m.label}</span></td>
                        <td className="py-3 px-3 text-white/50 text-xs max-w-[360px]">{p.why}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
