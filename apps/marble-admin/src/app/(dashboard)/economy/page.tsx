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

  /* ------------------------------------------------------------------ */
  /*  Category sections — keeps the page scannable now that 60+ keys     */
  /*  are admin-editable. Each section lists explicit keys in display    */
  /*  order. Unlisted keys land in "Other / Legacy" at the bottom so    */
  /*  nothing silently disappears.                                       */
  /* ------------------------------------------------------------------ */
  type SectionDef = { title: string; hint?: string; keys: string[] };
  const SECTIONS: SectionDef[] = [
    {
      title: 'Tournament · Bronze Cup',
      hint: 'Single-player 8-marble elimination (low-stakes tier, id "daily-blitz"). Survival = pays player after surviving that round.',
      keys: [
        'tournament_daily_entry',
        'tournament_daily_prize',
        'tournament_daily_second_prize',
        'tournament_daily_third_prize',
        'tournament_daily_round4_payout',
        'tournament_daily_round5_payout',
        'tournament_daily_round6_payout',
      ],
    },
    {
      title: 'Tournament · Silver Cup',
      hint: 'Mid-stakes tier (id "weekly-cup").',
      keys: [
        'tournament_weekly_entry',
        'tournament_weekly_prize',
        'tournament_weekly_second_prize',
        'tournament_weekly_third_prize',
        'tournament_weekly_round4_payout',
        'tournament_weekly_round5_payout',
        'tournament_weekly_round6_payout',
      ],
    },
    {
      title: 'Tournament · Gold Cup',
      hint: 'Top-stakes tier, Level 10+ (id "champion-invitational").',
      keys: [
        'tournament_champion_entry',
        'tournament_champion_prize',
        'tournament_champion_second_prize',
        'tournament_champion_third_prize',
        'tournament_champion_round4_payout',
        'tournament_champion_round5_payout',
        'tournament_champion_round6_payout',
      ],
    },
    {
      title: 'Multiplayer Tournaments',
      hint: 'Real-player 8-player lobbies. Rake + ratios apply to all tiers.',
      keys: [
        'mp_blitz_entry', 'mp_blitz_pool',
        'mp_cup_entry', 'mp_cup_pool',
        'mp_invitational_entry', 'mp_invitational_pool',
        'mp_rake',
        'mp_first_ratio', 'mp_second_ratio', 'mp_third_ratio',
      ],
    },
    {
      title: 'National Races',
      hint: '1st pays entry × multiplier. 2nd/3rd ratios apply to all 4 events.',
      keys: [
        'national_grand_prix_entry', 'national_grand_prix_mult',
        'national_marble_mile_entry', 'national_marble_mile_mult',
        'national_speed_demon_entry', 'national_speed_demon_mult',
        'national_chaos_cup_entry', 'national_chaos_cup_mult',
        'national_second_ratio', 'national_third_ratio',
      ],
    },
    {
      title: 'Season + Playoffs',
      hint: 'Franchise mode placement bonuses + bettor consolation + season starter formula.',
      keys: [
        'playoff_champion_prize',
        'playoff_runnerup_prize',
        'playoff_top3_prize',
        'playoff_qualified_prize',
        'season_complete_bettor_prize',
        'season_starter_base',
        'season_starter_increment',
        'season_starter_cap',
      ],
    },
    {
      title: 'Daily Login Rewards',
      hint: '7-day streak. Resets to Day 1 if a day is missed.',
      keys: [
        'daily_reward_1', 'daily_reward_2', 'daily_reward_3',
        'daily_reward_4', 'daily_reward_5', 'daily_reward_6', 'daily_reward_7',
      ],
    },
    {
      title: 'Challenges',
      keys: [
        'challenge_daily_win', 'challenge_daily_top3',
        'challenge_daily_streak2', 'challenge_daily_wins3',
        'challenge_weekly_races5', 'challenge_weekly_marbles3',
        'challenge_weekly_races10', 'challenge_weekly_marbles5',
      ],
    },
    {
      title: 'Season Pass Milestones',
      hint: 'Coin grants at fixed pass levels. NOTE: no claim flow is wired in the app yet — display only.',
      keys: [
        'pass_level2_coins', 'pass_level5_coins',
        'pass_level10_coins', 'pass_level15_coins', 'pass_level20_coins',
      ],
    },
    {
      title: 'Coin Store (IAP)',
      hint: 'Pack coin grants + promo multipliers. Dollar price is set in App Store / Play Console and can\'t be changed live.',
      keys: [
        'store_starter_coins',
        'store_popular_coins', 'store_popular_promo',
        'store_big_coins', 'store_big_promo',
        'store_whale_coins', 'store_whale_promo',
      ],
    },
    {
      title: 'Betting',
      keys: [
        'bet_amount_1', 'bet_amount_2', 'bet_amount_3', 'bet_amount_4',
        'bet_house_edge',
      ],
    },
    {
      title: 'Global Caps',
      keys: ['max_daily_purchases', 'max_daily_coins', 'xp_per_level'],
    },
  ];

  /* Combined map of every editable row keyed by config key, so a single
   * lookup serves both the explicit sections AND the catch-all. */
  const allByKey: Record<string, any> = {};
  for (const r of rewards) allByKey[r.key] = { ...r, _src: 'rewards' };
  for (const b of betting) allByKey[b.key] = { ...b, _src: 'betting' };

  /* Anything not claimed by a section goes here. Surfaces orphans so we
   * can clean them up (or fold them into a section in a follow-up). */
  const claimedKeys = new Set(SECTIONS.flatMap((s) => s.keys));
  const orphanRows = Object.values(allByKey).filter((r: any) => !claimedKeys.has(r.key));

  const suffixForKey = (k: string): string | undefined => {
    if (k.endsWith('_ratio') || k.endsWith('_rake') || k.endsWith('_promo') || k === 'house_edge' || k === 'bet_house_edge') return '× (0–1)';
    if (k.endsWith('_mult')) return '×';
    if (k === 'xp_per_level' || k.startsWith('pass_xp_') || k.startsWith('xp_')) return 'XP';
    if (k.startsWith('max_daily_purchases')) return 'packs/day';
    return 'coins';
  };

  const renderRow = (key: string) => {
    const r = allByKey[key];
    if (!r) {
      // Key listed in SECTIONS but missing in DB — surface so the gap is visible
      return (
        <div key={key} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0">
          <span className="text-[12px] text-white/35">{key.replace(/_/g, ' ')}</span>
          <span className="text-[11px] text-marble-red/70">missing</span>
        </div>
      );
    }
    return (
      <div key={r.key} className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-b-0">
        <span className="text-[13px] text-white/75">{r.label}</span>
        <EditableValue
          configKey={r.key}
          value={r.value}
          recommendation={recommendations[r.key]}
          suffix={suffixForKey(r.key)}
          onSave={handleSave}
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-5">
      {/* ============================================================ */}
      {/*  LEFT COLUMN — categorized payout sections                    */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <p className="text-[11px] text-white/40 -mb-1">
          Click any value to edit. Changes deploy to the game on the next
          remote-config refresh (within 60 s for active sessions).
        </p>

        {SECTIONS.map((sec) => (
          <Card key={sec.title} title={sec.title}>
            {sec.hint && (
              <p className="text-[10px] text-white/35 -mt-1 mb-3 leading-snug">{sec.hint}</p>
            )}
            {sec.keys.map(renderRow)}
          </Card>
        ))}

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

        {/* ---- Legacy / orphan keys ---- */}
        {orphanRows.length > 0 && (
          <Card title="Other / Legacy">
            <p className="text-[10px] text-white/35 mb-3">
              Keys not yet grouped into a section above. Mostly legacy duplicates from earlier seeds — safe to edit but consider migrating to the canonical key.
            </p>
            {orphanRows.map((r: any) => renderRow(r.key))}
          </Card>
        )}
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
