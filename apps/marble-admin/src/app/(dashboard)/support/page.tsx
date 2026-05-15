'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SupportKpis {
  openTickets: number;
  avgResponseTime: string;
  resolvedThisWeek: number;
  deletionRequests: number;
  refundRequests: number;
  flaggedPlayers: number;
}

interface RefundItem {
  id: string;
  playerName: string;
  product: string;
  amount: number;
  platform: string;
  purchasedAt: string;
  refundedAt: string | null;
}

interface FlaggedPlayer {
  id: string;
  playerName: string;
  email: string | null;
  coins: number;
  totalSpent: number;
  totalRaces: number;
  passTier: string;
  flagReason: string | null;
  lastActiveAt: string;
  createdAt: string;
}

interface SupportData {
  kpis: SupportKpis;
  tickets: any[];
  deletionQueue: any[];
  refunds: {
    total: number;
    count: number;
    recent: RefundItem[];
  };
  flaggedPlayers: FlaggedPlayer[];
  notifications: any[];
  reviews: any[];
}

/* ------------------------------------------------------------------ */
/*  Display constants                                                  */
/* ------------------------------------------------------------------ */

type TicketPriority = 'URGENT' | 'HIGH' | 'LOW';
type TicketStatus = 'OPEN' | 'PENDING' | 'RESOLVED';
type TicketCategory = 'PURCHASE' | 'DELETION' | 'BUG' | 'ACCOUNT' | 'REFUND';

const categoryStyles: Record<TicketCategory, string> = {
  PURCHASE: 'bg-gold/20 text-gold',
  DELETION: 'bg-marble-red/20 text-marble-red',
  BUG: 'bg-marble-blue/20 text-marble-blue',
  ACCOUNT: 'bg-[#9b59b6]/20 text-[#c39bd3]',
  REFUND: 'bg-marble-red/20 text-marble-red',
};

const priorityStyles: Record<TicketPriority, string> = {
  URGENT: 'bg-marble-red/15 text-marble-red',
  HIGH: 'bg-gold/15 text-gold',
  LOW: 'bg-white/[0.08] text-white/40',
};

const statusStyles: Record<TicketStatus, string> = {
  OPEN: 'bg-marble-red/15 text-marble-red',
  PENDING: 'bg-gold/15 text-gold',
  RESOLVED: 'bg-marble-green/15 text-marble-green',
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SupportPage() {
  const { data, isLoading, isError } = useQuery<SupportData>({
    queryKey: ['support'],
    queryFn: () => api.get('/support').then((res: any) => res.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data)
    return (
      <div className="text-center py-20 text-white/40">Failed to load support data</div>
    );

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Open Tickets
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">
            {kpis.openTickets}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            No ticket system yet
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Avg Response Time
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">
            {kpis.avgResponseTime}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            No ticket system yet
          </div>
        </div>

        {/* Refund Requests */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Refund Requests
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">
            {kpis.refundRequests}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-green/15 text-marble-green">
            ${data.refunds.total.toFixed(2)} total
          </div>
        </div>

        {/* Flagged Players */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Flagged Players
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {kpis.flaggedPlayers}
          </div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            Pending review
          </div>
        </div>
      </div>

      {/* ── Ticket Table (2fr) + Right Column (1fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Ticket Queue */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="font-heading text-base tracking-wide">Support Tickets</div>
          </div>

          {/* Empty state */}
          <div className="px-5 py-12 text-center">
            <div className="text-white/20 text-4xl mb-3">&#9993;</div>
            <div className="text-white/40 text-sm font-semibold mb-1">No support ticket system configured yet</div>
            <div className="text-white/25 text-xs">Add a SupportTicket model to the database to enable ticket tracking</div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* ── Flagged Players ── */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-1">
              Flagged Players
            </div>
            <div className="text-[11px] text-white/35 mb-4">Players requiring review</div>

            {data.flaggedPlayers.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-white/20 text-2xl mb-2">&#10003;</div>
                <div className="text-white/40 text-xs">No flagged players</div>
              </div>
            ) : (
              <div className="space-y-3">
                {data.flaggedPlayers.map((p: FlaggedPlayer) => (
                  <div key={p.id} className="bg-marble-red/[0.06] border border-marble-red/15 rounded-xl p-3.5">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-semibold text-[13px]">{p.playerName}</div>
                        <div className="text-[10px] text-white/40">
                          {p.email || 'No email'} -- Last active {new Date(p.lastActiveAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-marble-red/15 text-marble-red">
                        FLAGGED
                      </span>
                    </div>
                    {p.flagReason && (
                      <div className="text-[11px] text-white/50 mb-2.5">
                        Reason: &quot;{p.flagReason}&quot;
                      </div>
                    )}
                    <div className="flex gap-1.5 mb-2 text-[10px]">
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">{p.coins.toLocaleString()} coins</span>
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">${Number(p.totalSpent).toFixed(2)} spent</span>
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">{p.totalRaces} races</span>
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">{p.passTier.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-marble-red/20 text-marble-red">
                        Ban Player
                      </button>
                      <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/40">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Refund Requests ── */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-1">
              Refund Requests
            </div>
            <div className="text-[11px] text-white/35 mb-4">Processed refunds from purchases</div>

            <div className="space-y-0">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[13px] text-white/70">Total Refunds</span>
                <span className="font-bold text-sm text-gold">{data.refunds.count}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-white/70">Amount</span>
                <span className="font-bold text-sm text-gold">${data.refunds.total.toFixed(2)}</span>
              </div>
            </div>

            {data.refunds.recent.length > 0 && (
              <div className="border-t border-white/[0.08] mt-3 pt-3 space-y-3">
                {data.refunds.recent.map((r: RefundItem) => (
                  <div key={r.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[12px] font-semibold text-white/70">{r.product}</div>
                        <div className="text-[10px] text-white/35">{r.playerName} -- ${r.amount.toFixed(2)} -- {r.platform}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-marble-red/15 text-marble-red">REFUNDED</span>
                    </div>
                    {r.refundedAt && (
                      <div className="text-[10px] text-white/30">
                        Refunded {new Date(r.refundedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.refunds.recent.length === 0 && (
              <div className="border-t border-white/[0.08] mt-3 pt-3 text-center py-4">
                <div className="text-white/25 text-xs">No refunds recorded</div>
              </div>
            )}
          </div>

          {/* ── Push Notifications ── */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-base tracking-wide">Push Notifications</div>
            </div>

            <div className="text-center py-6">
              <div className="text-white/20 text-2xl mb-2">&#128276;</div>
              <div className="text-white/40 text-xs font-semibold mb-1">No notification system configured yet</div>
              <div className="text-white/25 text-[10px]">Add a PushNotification model to enable this feature</div>
            </div>
          </div>

          {/* ── Recent App Store Reviews ── */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-base tracking-wide">Recent App Store Reviews</div>
            </div>

            <div className="text-center py-6">
              <div className="text-white/20 text-2xl mb-2">&#9733;</div>
              <div className="text-white/40 text-xs font-semibold mb-1">No review integration configured yet</div>
              <div className="text-white/25 text-[10px]">Connect App Store / Play Store to import reviews</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
