'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EconomyData {
  totalCoinsInCirculation: number;
  coinsMintedToday: number;
  coinsSpentToday: number;
  coinsBurnedToday: number;
  netCoinFlow: number;
  netCoinFlowToday: number;
  inflationRate: number;
  avgBalance: number;
  medianBalance: number;
  playerCount: number;
  lowBalancePlayers: number;
  lowBalancePercent: number;
  distribution: { label: string; count: number }[];
}

interface ConfigData {
  rewards: { key: string; label: string; value: string; displayValue: string; pct: number }[];
  betting: { key: string; label: string; value: string; color: string }[];
  features: { key: string; label: string; desc: string; value: boolean; danger?: boolean }[];
}

interface Recommendation {
  recommended: number;
  reason: string;
  direction: 'increase' | 'decrease' | 'keep';
}

interface RecommendationsData {
  recommendations: Record<string, Recommendation>;
  metrics: { avgBalance: number; dailyMinted: number; dailyBurned: number; burnToEarnRatio: number; lowBalancePct: number; playerCount: number };
}

/* ------------------------------------------------------------------ */
/*  Inline Edit Cell                                                    */
/* ------------------------------------------------------------------ */

function EditableValue({
  configKey,
  value,
  recommendation,
  suffix,
  onSave,
}: {
  configKey: string;
  value: string;
  recommendation?: Recommendation;
  suffix?: string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const save = async () => {
    if (editVal === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(configKey, editVal);
    setSaving(false);
    setEditing(false);
  };

  const numVal = parseFloat(value) || 0;
  const recVal = recommendation?.recommended;
  const recDir = recommendation?.direction;

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditVal(value); setEditing(false); } }}
          className="w-24 px-2 py-1 rounded-lg bg-white/10 border border-gold/40 text-gold text-sm font-bold text-right focus:outline-none focus:border-gold"
          disabled={saving}
        />
      ) : (
        <button
          onClick={() => { setEditVal(value); setEditing(true); }}
          className="px-2 py-1 rounded-lg text-sm font-bold text-gold hover:bg-white/5 border border-transparent hover:border-gold/20 transition-all cursor-pointer"
          title="Click to edit"
        >
          {numVal.toLocaleString()}{suffix ? ` ${suffix}` : ''}
        </button>
      )}
      {/* Recommendation badge */}
      {recommendation && recDir !== 'keep' && recVal !== undefined && recVal !== numVal && (
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            recDir === 'increase'
              ? 'bg-marble-green/15 text-marble-green border border-marble-green/30'
              : 'bg-marble-red/15 text-marble-red border border-marble-red/30'
          }`}
          title={recommendation.reason}
        >
          REC: {recVal.toLocaleString()} {recDir === 'increase' ? '▲' : '▼'}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EconomyPage() {
  const queryClient = useQueryClient();

  const { data: economyRaw, isLoading: econLoading } = useQuery<EconomyData>({
    queryKey: ['economy'],
    queryFn: () => api.get('/economy').then((r: any) => r.data),
  });

  const { data: configRaw, isLoading: configLoading } = useQuery<ConfigData>({
    queryKey: ['config'],
    queryFn: () => api.get('/config').then((r: any) => r.data),
  });

  const { data: recsRaw } = useQuery<RecommendationsData>({
    queryKey: ['economy-recommendations'],
    queryFn: () => api.get('/economy/recommendations').then((r: any) => r.data),
  });

  const [toggleOverrides, setToggleOverrides] = useState<Record<string, boolean>>({});

  if (econLoading || configLoading) return <LoadingSpinner />;

  const econ = economyRaw ?? { totalCoinsInCirculation: 0, coinsMintedToday: 0, coinsSpentToday: 0, coinsBurnedToday: 0, netCoinFlow: 0, netCoinFlowToday: 0, inflationRate: 0, avgBalance: 0, medianBalance: 0, playerCount: 0, lowBalancePlayers: 0, lowBalancePercent: 0, distribution: [] };
  const config = configRaw ?? { rewards: [], betting: [], features: [] };
  const recommendations = recsRaw?.recommendations ?? {};

  const rewards = config.rewards ?? [];
  const betting = config.betting ?? [];
  const features = (config.features ?? []).map((f: any) => ({
    ...f,
    value: toggleOverrides[f.key] !== undefined ? toggleOverrides[f.key] : f.value,
  }));

  const distribution = econ.distribution ?? [];
  const maxCount = distribution.length > 0 ? Math.max(...distribution.map((d: any) => d.count)) : 1;

  const handleToggle = async (key: string, current: boolean) => {
    const next = !current;
    setToggleOverrides((prev: any) => ({ ...prev, [key]: next }));
    try {
      await api.put('/config', { key, value: String(next) });
    } catch {
      setToggleOverrides((prev: any) => ({ ...prev, [key]: current }));
    }
  };

  const handleSave = async (key: string, value: string) => {
    await api.put('/config', { key, value });
    queryClient.invalidateQueries({ queryKey: ['config'] });
    queryClient.invalidateQueries({ queryKey: ['economy-recommendations'] });
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

  /* ---- Economy Health rows ---- */
  const healthRows = [
    { label: 'Total Coins in Circulation', value: fmt(econ.totalCoinsInCirculation), color: 'text-gold' },
    { label: 'Coins Minted Today', value: `+${fmt(econ.coinsMintedToday)}`, color: 'text-marble-green' },
    { label: 'Coins Burned Today (Bets)', value: `-${fmt(econ.coinsBurnedToday ?? econ.coinsSpentToday ?? 0)}`, color: 'text-marble-red' },
    { label: 'Net Coin Flow', value: `${(econ.netCoinFlowToday ?? econ.netCoinFlow ?? 0) >= 0 ? '+' : ''}${fmt(econ.netCoinFlowToday ?? econ.netCoinFlow ?? 0)}`, color: 'text-gold' },
    { label: 'Avg User Balance', value: `${fmt(econ.avgBalance)} coins`, color: 'text-marble-blue' },
    { label: 'Total Players', value: fmt(econ.playerCount ?? 0), color: 'text-marble-blue' },
    { label: 'Users with <100 coins', value: `${fmt(econ.lowBalancePlayers)}`, color: 'text-marble-red' },
  ];

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-5">
      {/* ============================================================ */}
      {/*  LEFT COLUMN                                                  */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {/* ---- Coin Reward Configuration ---- */}
        <Card title="Coin Reward Configuration">
          <p className="text-[10px] text-white/30 mb-3">Click any value to edit. Changes apply to the game in real-time.</p>
          {rewards.length > 0 ? (
            rewards.map((r: any) => (
              <div key={r.key} className="py-3.5 border-b border-white/[0.06] last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[13px]">{r.label}</span>
                  <EditableValue
                    configKey={r.key}
                    value={r.value}
                    recommendation={recommendations[r.key]}
                    suffix={r.key.includes('xp') || r.key.includes('level') ? 'XP' : 'coins'}
                    onSave={handleSave}
                  />
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full relative">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-[#ff9a1a] rounded-full relative"
                    style={{ width: `${r.pct}%` }}
                  >
                    <div className="absolute -right-2 -top-[5px] w-4 h-4 bg-gold border-[3px] border-[#0a3a96] rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/30 text-center py-4">No reward config data</div>
          )}
        </Card>

        {/* ---- Betting & Purchase Limits ---- */}
        <Card title="Betting & Purchase Limits">
          <p className="text-[10px] text-white/30 mb-3">Click values to adjust. Recommendations based on player activity.</p>
          {betting.length > 0 ? (
            betting.map((b: any) => (
              <div key={b.key} className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-b-0">
                <span className="text-[13px] text-white/50">{b.label}</span>
                <EditableValue
                  configKey={b.key}
                  value={b.value}
                  recommendation={recommendations[b.key]}
                  suffix={b.key.includes('edge') ? '(×100=%)' : ''}
                  onSave={handleSave}
                />
              </div>
            ))
          ) : (
            <div className="text-sm text-white/30 text-center py-4">No betting config data</div>
          )}
        </Card>

        {/* ---- Feature Toggles ---- */}
        <Card title="Feature Toggles">
          {features.length > 0 ? (
            features.map((f: any) => (
              <div key={f.key} className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-b-0">
                <div>
                  <div className={`font-medium text-[13px] ${f.danger ? 'text-marble-red' : ''}`}>{f.label}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">{f.desc}</div>
                </div>
                <div
                  className={`w-11 h-6 rounded-xl relative cursor-pointer transition-colors ${f.value ? 'bg-marble-green' : 'bg-white/15'}`}
                  onClick={() => handleToggle(f.key, f.value)}
                >
                  <div className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform shadow-sm ${f.value ? 'translate-x-5' : ''}`} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/30 text-center py-4">No feature toggle data</div>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  RIGHT COLUMN                                                 */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {/* ---- Economy Health ---- */}
        <Card title="Economy Health">
          {healthRows.map((h: any) => (
            <div key={h.label} className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-b-0">
              <span className="text-[13px] text-white/50">{h.label}</span>
              <span className={`font-bold text-[13px] ${h.color}`}>{h.value}</span>
            </div>
          ))}
        </Card>

        {/* ---- Recommendations Summary ---- */}
        {recsRaw && (
          <Card title="System Recommendations">
            <div className="space-y-2">
              {Object.entries(recommendations)
                .filter(([, r]) => r.direction !== 'keep')
                .slice(0, 8)
                .map(([key, r]) => (
                  <div key={key} className="flex items-start gap-2 py-2 border-b border-white/[0.04] last:border-b-0">
                    <span className={`text-[11px] mt-0.5 ${r.direction === 'increase' ? 'text-marble-green' : 'text-marble-red'}`}>
                      {r.direction === 'increase' ? '▲' : '▼'}
                    </span>
                    <div className="flex-1">
                      <p className="text-[11px] text-white/60 font-semibold">{key.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-white/35">{r.reason}</p>
                    </div>
                    <span className="text-[11px] font-bold text-gold">{r.recommended.toLocaleString()}</span>
                  </div>
                ))}
              {Object.values(recommendations).every((r) => r.direction === 'keep') && (
                <p className="text-sm text-marble-green/70 text-center py-4">All values look good — no changes recommended</p>
              )}
            </div>
          </Card>
        )}

        {/* ---- Coin Balance Distribution ---- */}
        <Card title="Coin Balance Distribution">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mt-3">
            <div className="flex items-end gap-1.5 h-[120px]">
              {distribution.length > 0 ? (
                distribution.map((d: any) => {
                  const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                  let colorClass = 'from-marble-blue to-marble-blue/70';
                  if (d.label.startsWith('0-') || d.label === '0-99') {
                    colorClass = 'from-marble-red to-marble-red/70';
                  } else if (d.label.startsWith('1') || d.label.startsWith('5') && !d.label.includes('K')) {
                    colorClass = 'from-gold to-gold/70';
                  } else if (d.label.includes('1K') || d.label.includes('5K')) {
                    colorClass = 'from-marble-green to-marble-green/70';
                  }
                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="text-[9px] text-white/50 font-semibold">{fmt(d.count)}</div>
                      <div
                        className={`w-full max-w-[36px] rounded-t-md bg-gradient-to-b ${colorClass}`}
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                      <div className="text-[10px] text-white/35 font-semibold">{d.label}</div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-white/30">No distribution data</div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-white/35 text-center mt-3">User count by coin balance tier</p>
        </Card>
      </div>
    </div>
  );
}
