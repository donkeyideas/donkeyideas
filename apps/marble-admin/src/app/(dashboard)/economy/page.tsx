'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

/* ------------------------------------------------------------------ */
/*  Defaults (zero-value loading fallbacks only)                       */
/* ------------------------------------------------------------------ */

const defaultEconomy: EconomyData = {
  totalCoinsInCirculation: 0,
  coinsMintedToday: 0,
  coinsSpentToday: 0,
  coinsBurnedToday: 0,
  netCoinFlow: 0,
  netCoinFlowToday: 0,
  inflationRate: 0,
  avgBalance: 0,
  medianBalance: 0,
  playerCount: 0,
  lowBalancePlayers: 0,
  lowBalancePercent: 0,
  distribution: [],
};

const defaultConfig: ConfigData = {
  rewards: [],
  betting: [],
  features: [],
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EconomyPage() {
  const { data: economyRaw, isLoading: econLoading } = useQuery<EconomyData>({
    queryKey: ['economy'],
    queryFn: () => api.get('/economy').then((r: any) => r.data),
  });

  const { data: configRaw, isLoading: configLoading } = useQuery<ConfigData>({
    queryKey: ['config'],
    queryFn: () => api.get('/config').then((r: any) => r.data),
  });

  const [toggleOverrides, setToggleOverrides] = useState<Record<string, boolean>>({});

  if (econLoading || configLoading) return <LoadingSpinner />;

  const econ = economyRaw ?? defaultEconomy;
  const config = configRaw ?? defaultConfig;

  const rewards = config.rewards ?? [];
  const betting = config.betting ?? [];
  const features = (config.features ?? []).map((f: any) => ({
    ...f,
    value: toggleOverrides[f.key] !== undefined ? toggleOverrides[f.key] : f.value,
  }));

  // Distribution bars from API data
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
          {rewards.length > 0 ? (
            rewards.map((r: any) => (
              <div key={r.key} className="py-3.5 border-b border-white/[0.06] last:border-b-0">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-[13px]">{r.label}</span>
                  <span className="text-gold font-bold text-[13px]">{r.displayValue}</span>
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
          {betting.length > 0 ? (
            betting.map((b: any) => (
              <div key={b.key} className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-b-0">
                <span className="text-[13px] text-white/50">{b.label}</span>
                <span className={`font-bold text-[13px] ${b.color}`}>{b.value}</span>
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

        {/* ---- Coin Balance Distribution ---- */}
        <Card title="Coin Balance Distribution">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mt-3">
            <div className="flex items-end gap-1.5 h-[120px]">
              {distribution.length > 0 ? (
                distribution.map((d: any) => {
                  const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                  // Color based on tier label
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
