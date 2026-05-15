'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';

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
  netRevenue: number;
  coinsPerDollar: number;
}

interface FinancialsData {
  monthly: { gross: number; net: number; fees: number; feeRate: number; transactions: number };
  refunds: { amount: number; count: number };
  total: { gross: number; transactions: number };
  byProduct: Array<{ productId: string; productName?: string; units: number; revenue: number }>;
  byPlatform: Array<{ platform: string; revenue: number; transactions: number }>;
  pricingMatrix: PricingMatrixRow[];
  feeComparison: { totalRevenue: number; at15pct: number; at30pct: number; savings: number };
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function FinancialsPage() {
  const { data, isLoading, isError } = useQuery<FinancialsData>({
    queryKey: ['financials'],
    queryFn: () => api.get('/financials').then((res: any) => res.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data)
    return (
      <div className="text-center py-20 text-white/40">Failed to load</div>
    );

  /* KPI values from API */
  const grossRevenue = data.monthly?.gross ?? 0;
  const netRevenue = data.monthly?.net ?? 0;
  const appStoreFees = data.monthly?.fees ?? 0;
  const feeRate = data.monthly?.feeRate ?? 0;
  const refundAmount = data.refunds?.amount ?? 0;
  const refundCount = data.refunds?.count ?? 0;

  /* Platform data from API */
  const platforms = data.byPlatform ?? [];
  const totalPlatformRevenue = platforms.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0);

  /* Pricing matrix from API */
  const pricingMatrix: PricingMatrixRow[] = data.pricingMatrix ?? [];

  /* Compute totals from pricingMatrix */
  const pricingTotals = {
    units: pricingMatrix.reduce((s: number, r: any) => s + r.unitsSold, 0),
    gross: pricingMatrix.reduce((s: number, r: any) => s + r.grossRevenue, 0),
    net: pricingMatrix.reduce((s: number, r: any) => s + r.netRevenue, 0),
    savings: pricingMatrix.reduce((s: number, r: any) => s + (r.grossRevenue * 0.30 - r.appStoreFee), 0),
  };

  /* Fee comparison from API */
  const feeComp = data.feeComparison ?? { totalRevenue: 0, at15pct: 0, at30pct: 0, savings: 0 };

  /* Recent transactions from API */
  const recentTxns = data.recentTransactions ?? [];

  return (
    <div className="space-y-6">
      {/* -- KPI Cards -- */}
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

      {/* -- Pricing Matrix Table -- */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-heading text-base tracking-wide">
            Pricing Matrix — Net Revenue Per Sale
          </div>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-gold/20 text-gold">
              15% Fee
            </button>
            <button className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] text-white/40">
              30% Fee
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Product</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Price</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">App Store Fee</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">You Receive</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Units Sold</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Gross Revenue</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">If 30% Fee</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Savings from 15%</th>
              </tr>
            </thead>
            <tbody>
              {pricingMatrix.map((row: any) => {
                const fee15 = row.unitPrice * row.appStoreFeeRate;
                const net15 = row.unitPrice - fee15;
                const net30 = row.unitPrice * 0.70;
                const savingsPerUnit = (row.unitPrice * 0.30) - fee15;
                const totalSavings = savingsPerUnit * row.unitsSold;

                return (
                  <tr
                    key={row.productId}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="px-3 py-2.5 text-sm text-white/70">{row.productName}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/60">{formatCurrency(row.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-red/70">-{formatCurrency(fee15)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-green font-medium">{formatCurrency(net15)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/60">{row.unitsSold}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-gold font-medium">{formatCurrency(row.grossRevenue)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-white/40">{formatCurrency(net30)}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-marble-green font-semibold">+{formatCurrency(totalSavings)}</td>
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
                <td className="px-3 py-2.5 text-sm text-right font-bold text-white/50">{formatCurrency(pricingTotals.net)}</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold text-marble-green">+{formatCurrency(pricingTotals.savings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* -- Platform Split + Recent Transactions -- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Platform */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
          <div className="font-heading text-base tracking-wide mb-4">
            Revenue by Platform
          </div>
          <div className="space-y-5">
            {platforms.length > 0 ? (
              platforms.map((p: any) => {
                const pct = totalPlatformRevenue > 0 ? Math.round((p.revenue / totalPlatformRevenue) * 100) : 0;
                const colorClass = p.platform?.toLowerCase() === 'ios'
                  ? 'from-marble-blue to-marble-blue/50'
                  : 'from-marble-green to-marble-green/50';
                return (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">{p.platform}</span>
                      <span className="text-white/80 font-medium">
                        {formatCurrency(p.revenue)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-white/30 text-center py-4">No platform data</div>
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
              recentTxns.map((t: any) => {
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
              <div className="text-sm text-white/30 text-center py-4">No recent transactions</div>
            )}
          </div>
        </div>
      </div>

      {/* -- Fee Comparison -- */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="font-heading text-base tracking-wide mb-4">
          App Store Fee Impact — 15% vs 30%
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Metric</th>
                <th className="text-right text-[10px] text-white/40 uppercase px-3 py-2 tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-sm text-white/70 font-medium">Total Revenue</td>
                <td className="px-3 py-2.5 text-sm text-right text-gold font-medium">{formatCurrency(feeComp.totalRevenue)}</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-sm text-white/70 font-medium">Fees at 30%</td>
                <td className="px-3 py-2.5 text-sm text-right text-marble-red">{formatCurrency(feeComp.at30pct)}</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-sm text-white/70 font-medium">Fees at 15%</td>
                <td className="px-3 py-2.5 text-sm text-right text-marble-red/60">{formatCurrency(feeComp.at15pct)}</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-sm text-white/70 font-medium">You Keep at 30%</td>
                <td className="px-3 py-2.5 text-sm text-right text-white/50">{formatCurrency(feeComp.totalRevenue - feeComp.at30pct)}</td>
              </tr>
              <tr className="border-b border-white/[0.04]">
                <td className="px-3 py-2.5 text-sm text-white/70 font-medium">You Keep at 15%</td>
                <td className="px-3 py-2.5 text-sm text-right text-marble-green font-medium">{formatCurrency(feeComp.totalRevenue - feeComp.at15pct)}</td>
              </tr>
              <tr className="border-t-2 border-white/[0.08]">
                <td className="px-3 py-2.5 text-sm font-bold">Savings from 15% Program</td>
                <td className="px-3 py-2.5 text-sm text-right text-gold font-semibold">+{formatCurrency(feeComp.savings)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
