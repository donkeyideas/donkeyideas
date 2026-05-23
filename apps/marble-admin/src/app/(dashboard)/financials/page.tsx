'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PricingMatrixRow {
  productId: string;
  productName: string;
  unitPrice: number;
  unitsSold: number;
  grossRevenue: number;
  appStoreFeeRate: number;
  appStoreFee: number;
  netPerUnit: number;
  netAt30PerUnit: number;
  savingsPerUnit: number;
  monthlyRevenue: number;
}

interface FeeTier {
  annualRevenue: number;
  at30pct: number;
  at15pct: number;
  keep30: number;
  keep15: number;
  savings: number;
}

interface AdMobMetrics {
  configured: boolean;
  yesterday: {
    date: string;
    revenueUsd: number;
    impressions: number;
    ios: { revenueUsd: number; impressions: number; ecpmUsd: number };
    android: { revenueUsd: number; impressions: number; ecpmUsd: number };
  };
  monthToDate: { revenueUsd: number; impressions: number; clicks: number };
  lifetime: { revenueUsd: number; impressions: number; clicks: number };
  daily: Array<{ date: string; earningsUsd: number; impressions: number; ios: number; android: number }>;
  lastSyncedAt: string | null;
}

interface FinancialsData {
  monthly: { gross: number; net: number; fees: number; feeRate: number; transactions: number };
  refunds: { amount: number; count: number };
  total: { gross: number; transactions: number };
  byProduct: Array<{ productId: string; productName?: string; units: number; revenue: number }>;
  byPlatform: Array<{ platform: string; revenue: number; transactions: number }>;
  pricingMatrix: PricingMatrixRow[];
  feeComparison: { totalRevenue: number; at15pct: number; at30pct: number; savings: number };
  feeTiers: FeeTier[];
  recentTransactions: Array<{
    id: string;
    productName: string;
    playerName?: string;
    platform: string;
    priceUsd: number;
    status: string;
    purchasedAt: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return formatCurrency(n);
}

/* ------------------------------------------------------------------ */
/*  Sort key types                                                     */
/* ------------------------------------------------------------------ */

type PricingSortKey = 'productName' | 'unitPrice' | 'appStoreFee' | 'netPerUnit' | 'unitsSold' | 'monthlyRevenue' | 'netAt30PerUnit' | 'savingsPerUnit';
type FeeTierSortKey = 'annualRevenue' | 'at30pct' | 'at15pct' | 'keep30' | 'keep15' | 'savings';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function FinancialsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<FinancialsData>({
    queryKey: ['financials'],
    queryFn: () => api.get('/financials').then((res: any) => res.data),
  });

  const { data: admob } = useQuery<AdMobMetrics>({
    queryKey: ['admob-metrics'],
    queryFn: () => api.get('/admob/metrics').then((res: any) => res.data),
  });

  const syncAdmob = useMutation({
    mutationFn: () => api.post('/admob/sync?days=35'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admob-metrics'] }),
  });

  const { sortKey: pricingSortKey, sortDir: pricingSortDir, handleSort: handlePricingSort, sortItems: sortPricingItems } = useSort<PricingSortKey>();
  const { sortKey: feeSortKey, sortDir: feeSortDir, handleSort: handleFeeSort, sortItems: sortFeeItems } = useSort<FeeTierSortKey>();
  // Pricing matrix fee-rate toggle. 0.15 = Small Business Program (default
  // for the first $1M/year), 0.30 = standard rate beyond that threshold.
  const [pricingFeeRate, setPricingFeeRate] = useState<0.15 | 0.30>(0.15);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data)
    return (
      <div className="text-center py-20 text-white/40">Failed to load</div>
    );

  const grossRevenue = data.monthly?.gross ?? 0;
  const netRevenue = data.monthly?.net ?? 0;
  const appStoreFees = data.monthly?.fees ?? 0;
  const feeRate = data.monthly?.feeRate ?? 0.15;
  const refundAmount = data.refunds?.amount ?? 0;
  const refundCount = data.refunds?.count ?? 0;

  const platforms = data.byPlatform ?? [];
  const totalPlatformRevenue = platforms.reduce((s, p) => s + (p.revenue ?? 0), 0);

  const pricingMatrix: PricingMatrixRow[] = data.pricingMatrix ?? [];

  const pricingTotals = {
    units: pricingMatrix.reduce((s, r) => s + r.unitsSold, 0),
    gross: pricingMatrix.reduce((s, r) => s + r.monthlyRevenue, 0),
  };

  const feeTiers: FeeTier[] = data.feeTiers ?? [];
  const recentTxns = data.recentTransactions ?? [];

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Gross Revenue (Month)
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">
            {formatCurrency(grossRevenue)}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-green/15 text-marble-green">
            {data.monthly?.transactions ?? 0} transactions
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Net Revenue (After Fees)
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">
            {formatCurrency(netRevenue)}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-green/15 text-marble-green">
            {(feeRate * 100).toFixed(0)}% fee rate applied
          </div>
        </div>

        {/* App Store Fees */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            App Store Fees Paid
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {formatCurrency(appStoreFees)}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            {(feeRate * 100).toFixed(0)}% Small Business rate
          </div>
        </div>

        {/* Refunds / Chargebacks */}
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Refunds / Chargebacks
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">
            {formatCurrency(refundAmount)}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-red/15 text-marble-red">
            {refundCount} refund requests
          </div>
        </div>
      </div>

      {/* ── AdMob Ad Revenue ── */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-heading text-base tracking-wide">Ad Revenue — AdMob</div>
            <div className="text-[11px] text-white/35 mt-0.5">
              Rewarded video ads. AdMob data lags ~24h so yesterday is the latest final number.
              {admob?.lastSyncedAt && (
                <span> · Last synced {timeAgo(admob.lastSyncedAt)}</span>
              )}
            </div>
          </div>
          {admob?.configured && (
            <button
              type="button"
              onClick={() => syncAdmob.mutate()}
              disabled={syncAdmob.isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-marble-blue/15 text-marble-blue hover:bg-marble-blue/25 transition-colors disabled:opacity-50"
            >
              {syncAdmob.isPending ? 'Syncing…' : 'Sync now'}
            </button>
          )}
        </div>

        {!admob?.configured ? (
          <div className="text-sm text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="font-semibold text-white/70 mb-1">AdMob API not configured</div>
            <div className="text-[12px]">
              Set <code className="text-marble-blue">ADMOB_SERVICE_ACCOUNT_JSON</code> and{' '}
              <code className="text-marble-blue">ADMOB_PUBLISHER_ID</code> in Vercel env vars,
              then invite the service account email to AdMob (Settings → Access &amp; authorization → Read access).
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Yesterday Revenue */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                  Yesterday ({admob.yesterday.date.slice(5)})
                </div>
                <div className="font-heading text-[24px] text-gold mt-1">
                  {formatCurrency(admob.yesterday.revenueUsd)}
                </div>
                <div className="text-[11px] text-white/40 mt-1">
                  {admob.yesterday.impressions.toLocaleString()} impressions
                </div>
              </div>

              {/* MTD Revenue */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                  Month-to-Date
                </div>
                <div className="font-heading text-[24px] text-marble-green mt-1">
                  {formatCurrency(admob.monthToDate.revenueUsd)}
                </div>
                <div className="text-[11px] text-white/40 mt-1">
                  {admob.monthToDate.impressions.toLocaleString()} impressions
                </div>
              </div>

              {/* Lifetime */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                  Lifetime
                </div>
                <div className="font-heading text-[24px] text-marble-blue mt-1">
                  {formatCurrency(admob.lifetime.revenueUsd)}
                </div>
                <div className="text-[11px] text-white/40 mt-1">
                  {admob.lifetime.impressions.toLocaleString()} impressions
                </div>
              </div>

              {/* Yesterday split iOS vs Android */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                  Yesterday by Platform
                </div>
                <div className="flex justify-between text-[12px] mt-1.5">
                  <span className="text-white/50">iOS</span>
                  <span className="text-marble-blue font-semibold">{formatCurrency(admob.yesterday.ios.revenueUsd)}</span>
                </div>
                <div className="text-[10px] text-white/30 text-right">
                  eCPM ${admob.yesterday.ios.ecpmUsd.toFixed(2)}
                </div>
                <div className="flex justify-between text-[12px] mt-1">
                  <span className="text-white/50">Android</span>
                  <span className="text-marble-green font-semibold">{formatCurrency(admob.yesterday.android.revenueUsd)}</span>
                </div>
                <div className="text-[10px] text-white/30 text-right">
                  eCPM ${admob.yesterday.android.ecpmUsd.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Daily series chart (last 30 days, simple bar viz) */}
            {admob.daily.length > 0 && (
              <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
                  Last 30 Days — Daily Revenue
                </div>
                {(() => {
                  const maxRev = Math.max(...admob.daily.map((d) => d.earningsUsd), 0.01);
                  return (
                    <div className="flex items-end gap-1 h-[80px]">
                      {admob.daily.map((d) => {
                        const pct = Math.round((d.earningsUsd / maxRev) * 100);
                        return (
                          <div
                            key={d.date}
                            title={`${d.date}: $${d.earningsUsd.toFixed(2)} · ${d.impressions.toLocaleString()} imp`}
                            className="flex-1 bg-gradient-to-b from-gold to-gold/40 rounded-t"
                            style={{ height: `${Math.max(pct, 1)}%` }}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>{admob.daily[0]?.date.slice(5)}</span>
                  <span>{admob.daily[admob.daily.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Pricing Matrix Table ── */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-heading text-base tracking-wide">
            Pricing Matrix — Net Revenue Per Sale ({(pricingFeeRate * 100).toFixed(0)}% Fee)
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPricingFeeRate(0.15)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${pricingFeeRate === 0.15 ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-white/40 hover:bg-white/10'}`}
            >
              15% Fee
            </button>
            <button
              type="button"
              onClick={() => setPricingFeeRate(0.30)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${pricingFeeRate === 0.30 ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-white/40 hover:bg-white/10'}`}
            >
              30% Fee
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <SortableHeader label="Product" sortKey="productName" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} />
                <SortableHeader label="Price" sortKey="unitPrice" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label={`App Store Fee (${(pricingFeeRate * 100).toFixed(0)}%)`} sortKey="appStoreFee" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label="You Receive" sortKey="netPerUnit" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label="Units Sold (Month)" sortKey="unitsSold" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label="Monthly Revenue" sortKey="monthlyRevenue" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label={pricingFeeRate === 0.15 ? 'If 30% Fee' : 'If 15% Fee'} sortKey="netAt30PerUnit" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
                <SortableHeader label="Tier Savings" sortKey="savingsPerUnit" currentSort={pricingSortKey} currentDir={pricingSortDir} onSort={handlePricingSort} className="text-right" />
              </tr>
            </thead>
            <tbody>
              {sortPricingItems(pricingMatrix).map((row) => {
                const fee = row.unitPrice * pricingFeeRate;
                const net = row.unitPrice - fee;
                const altRate = pricingFeeRate === 0.15 ? 0.30 : 0.15;
                const altNet = row.unitPrice * (1 - altRate);
                const savingsPerUnit = Math.abs(net - altNet);
                return (
                  <tr key={row.productId} className="border-b border-white/[0.04]">
                    <td className="px-3 py-2.5 text-sm text-white/70">{row.productName}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/60">{formatCurrency(row.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-red/70">-{formatCurrency(fee)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-green font-medium">{formatCurrency(net)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/60">{row.unitsSold}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-gold font-medium">{formatCurrency(row.monthlyRevenue)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/40">{formatCurrency(altNet)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-green font-semibold">{pricingFeeRate === 0.15 ? '+' : '-'}{formatCurrency(savingsPerUnit * row.unitsSold)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.08]">
                <td className="px-3 py-2.5 text-sm font-bold">TOTAL</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-sm text-right font-bold">{pricingTotals.units}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold text-gold">{formatCurrency(pricingTotals.gross)}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Platform Split + Recent Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Platform */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Revenue by Platform
          </div>
          <div className="space-y-5">
            {platforms.map((p) => {
              const pct = totalPlatformRevenue > 0 ? Math.round((p.revenue / totalPlatformRevenue) * 100) : 0;
              const isIOS = p.platform?.toLowerCase() === 'ios';
              const colorClass = isIOS
                ? 'from-marble-blue to-marble-blue/50'
                : 'from-marble-green to-marble-green/50';
              return (
                <div key={p.platform}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60 font-medium">{p.platform}</span>
                    <span className="text-white/80 font-medium">
                      {formatCurrency(p.revenue)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all`}
                      style={{ width: `${Math.max(pct, totalPlatformRevenue === 0 ? 0 : 2)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">{p.transactions} transactions</div>
                </div>
              );
            })}
            {totalPlatformRevenue === 0 && (
              <div className="text-[11px] text-white/25 text-center mt-2">No transactions yet — platform data will appear after first purchase</div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Recent Transactions
          </div>
          <div className="space-y-0">
            {recentTxns.length > 0 ? (
              recentTxns.map((t) => {
                const isRefund = t.status === 'refunded';
                const displayAmount = isRefund ? -t.priceUsd : t.priceUsd;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          !isRefund
                            ? 'bg-marble-green/10 text-marble-green'
                            : 'bg-marble-red/10 text-marble-red'
                        }`}
                      >
                        {isRefund ? 'REFUND' : 'PURCHASE'}
                      </span>
                      <div>
                        <p className="text-[13px] text-white/70">{t.productName}</p>
                        <p className="text-[10px] text-white/30">{t.playerName || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          displayAmount >= 0 ? 'text-gold' : 'text-marble-red'
                        }`}
                      >
                        {displayAmount >= 0
                          ? formatCurrency(displayAmount)
                          : `-${formatCurrency(Math.abs(displayAmount))}`}
                      </p>
                      <p className="text-[10px] text-white/30">{timeAgo(t.purchasedAt)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-white/30 text-center py-4">No transactions yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── App Store Fee Impact — 15% vs 30% ── */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-heading text-base tracking-wide">
            App Store Fee Impact — 15% vs 30%
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-marble-green/15 text-marble-green">
            Small Business Program Enrolled
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <SortableHeader label="Annual Revenue" sortKey="annualRevenue" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} />
                <SortableHeader label="At 30% Fee" sortKey="at30pct" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} className="text-right" />
                <SortableHeader label="At 15% Fee" sortKey="at15pct" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} className="text-right" />
                <SortableHeader label="You Keep (30%)" sortKey="keep30" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} className="text-right" />
                <SortableHeader label="You Keep (15%)" sortKey="keep15" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} className="text-right" />
                <SortableHeader label="Annual Savings" sortKey="savings" currentSort={feeSortKey} currentDir={feeSortDir} onSort={handleFeeSort} className="text-right" />
              </tr>
            </thead>
            <tbody>
              {sortFeeItems(feeTiers).map((tier) => (
                <tr key={tier.annualRevenue} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2.5 text-sm text-white/70 font-medium">{fmtK(tier.annualRevenue)}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-marble-red">-{fmtK(tier.at30pct)}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-marble-red/60">-{fmtK(tier.at15pct)}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-white/50">{fmtK(tier.keep30)}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-marble-green font-medium">{fmtK(tier.keep15)}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-gold font-semibold">+{fmtK(tier.savings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
