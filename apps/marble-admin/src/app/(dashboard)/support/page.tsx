'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SortableHeader, useSort } from '@/components/ui/SortableHeader';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TicketMessage {
  id: string;
  authorName: string;
  authorType: 'player' | 'admin';
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  playerId: string;
  playerName: string;
  playerEmail: string | null;
  platform: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  messageCount: number;
  messages: TicketMessage[];
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
}

interface SupportData {
  kpis: {
    openTickets: number;
    avgResponseTime: string;
    resolvedThisWeek: number;
    urgentCount: number;
    refundRequests: number;
    flaggedPlayers: number;
  };
  tickets: Ticket[];
  refunds: { total: number; count: number; recent: RefundItem[] };
  flaggedPlayers: FlaggedPlayer[];
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const categoryStyles: Record<string, string> = {
  purchase: 'bg-gold/20 text-gold',
  deletion: 'bg-marble-red/20 text-marble-red',
  bug: 'bg-marble-blue/20 text-marble-blue',
  account: 'bg-[#9b59b6]/20 text-[#c39bd3]',
  refund: 'bg-marble-red/20 text-marble-red',
};

const priorityStyles: Record<string, string> = {
  urgent: 'bg-marble-red/15 text-marble-red',
  high: 'bg-gold/15 text-gold',
  low: 'bg-white/[0.08] text-white/40',
};

const statusStyles: Record<string, string> = {
  open: 'bg-marble-red/15 text-marble-red',
  pending: 'bg-gold/15 text-gold',
  resolved: 'bg-marble-green/15 text-marble-green',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Ticket Detail Modal                                                */
/* ------------------------------------------------------------------ */

function TicketModal({
  ticket,
  onClose,
  onRefresh,
}: {
  ticket: Ticket;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${ticket.id}`, { content: reply });
      setReply('');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.put(`/support/tickets/${ticket.id}`, { status: 'resolved', resolution: 'Resolved by admin' });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
    setResolving(false);
  };

  const handleReopen = async () => {
    try {
      await api.put(`/support/tickets/${ticket.id}`, { status: 'open' });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d2350] border-2 border-white/[0.12] rounded-2xl w-[680px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="font-heading text-lg tracking-wide">{ticket.ticketNumber}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${categoryStyles[ticket.category] || 'bg-white/10 text-white/50'}`}>
                  {ticket.category}
                </span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${priorityStyles[ticket.priority] || priorityStyles.low}`}>
                  {ticket.priority}
                </span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusStyles[ticket.status] || statusStyles.open}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="text-sm text-white/80 font-semibold mb-1">{ticket.subject}</div>
              <div className="text-[11px] text-white/40">
                {ticket.playerName} &bull; {ticket.platform} &bull; {timeAgo(ticket.createdAt)}
                {ticket.playerEmail && ` \u2022 ${ticket.playerEmail}`}
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none px-2">&times;</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
          {ticket.messages.length === 0 ? (
            <div className="text-center text-white/30 text-sm py-8">No messages yet — send the first reply</div>
          ) : (
            ticket.messages.map((m) => {
              const isAdmin = m.authorType === 'admin';
              return (
                <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isAdmin ? 'bg-gold/15 border border-gold/20' : 'bg-white/[0.06] border border-white/[0.08]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase ${isAdmin ? 'text-gold' : 'text-marble-blue'}`}>
                        {isAdmin ? 'ADMIN' : 'PLAYER'}
                      </span>
                      <span className="text-[10px] text-white/30">{m.authorName}</span>
                      <span className="text-[10px] text-white/25">{timeAgo(m.createdAt)}</span>
                    </div>
                    <div className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply + Actions */}
        <div className="p-5 border-t border-white/[0.08] flex-shrink-0">
          {ticket.status !== 'resolved' ? (
            <>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply to the player..."
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-gold/40 resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
                  }}
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-4 py-2 bg-marble-green/20 text-marble-green text-[12px] font-bold rounded-xl hover:bg-marble-green/30 transition-colors disabled:opacity-50"
                >
                  {resolving ? 'Resolving...' : 'Mark Resolved'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                  className="px-5 py-2 bg-gold text-navy-900 font-bold text-[12px] rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-[12px] text-marble-green font-semibold">
                Resolved {ticket.resolvedAt ? timeAgo(ticket.resolvedAt) : ''}
                {ticket.resolution && ` \u2014 ${ticket.resolution}`}
              </div>
              <button
                onClick={handleReopen}
                className="px-4 py-2 border border-white/20 text-white/60 font-semibold text-[12px] rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                Reopen Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

type TicketSortKey = 'ticketNumber' | 'playerName' | 'category' | 'priority' | 'status' | 'createdAt';

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<SupportData>({
    queryKey: ['support'],
    queryFn: () => api.get('/support').then((res: any) => res.data),
  });

  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { sortKey, sortDir, handleSort, sortItems } = useSort<TicketSortKey>();

  const banFlagged = useMutation({
    mutationFn: (id: string) => api.post(`/players/${id}/ban`, { reason: 'Banned from Support flagged-players panel' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support'] }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <div className="text-center py-20 text-white/40">Failed to load</div>;

  const kpis = data.kpis;
  const allTickets = data.tickets ?? [];
  const filteredTickets = filter === 'all' ? allTickets : allTickets.filter((t) => t.status === filter);
  const selectedTicket = allTickets.find((t) => t.id === selectedTicketId) || null;

  const filterPills: { label: string; value: typeof filter; count: number }[] = [
    { label: 'All', value: 'all', count: allTickets.length },
    { label: 'Open', value: 'open', count: allTickets.filter((t) => t.status === 'open').length },
    { label: 'Pending', value: 'pending', count: allTickets.filter((t) => t.status === 'pending').length },
    { label: 'Resolved', value: 'resolved', count: allTickets.filter((t) => t.status === 'resolved').length },
  ];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['support'] });

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border-2 border-marble-red/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-red opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Open Tickets</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-red">{kpis.openTickets}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-red/15 text-marble-red">
            {kpis.urgentCount} urgent
          </div>
        </div>

        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Avg Response Time</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">{kpis.avgResponseTime}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            Based on first reply
          </div>
        </div>

        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Resolved This Week</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green">{kpis.resolvedThisWeek}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-marble-green/15 text-marble-green">
            This week
          </div>
        </div>

        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">Refund Requests</div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">{kpis.refundRequests}</div>
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/40">
            ${data.refunds.total.toFixed(2)} total
          </div>
        </div>
      </div>

      {/* ── Ticket Table (2fr) + Right Column (1fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Ticket Queue */}
        <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="font-heading text-base tracking-wide">Support Tickets</div>
            <div className="flex gap-1.5">
              {filterPills.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setFilter(p.value)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    filter === p.value
                      ? 'bg-gold/20 text-gold'
                      : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.1]'
                  }`}
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-white/20 text-4xl mb-3">&#9993;</div>
              <div className="text-white/40 text-sm font-semibold mb-1">
                {allTickets.length === 0 ? 'No support tickets yet' : 'No tickets match this filter'}
              </div>
              <div className="text-white/25 text-xs">
                Tickets appear here when players submit them from the app
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <SortableHeader label="Ticket" sortKey="ticketNumber" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="User" sortKey="playerName" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Category" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Priority" sortKey="priority" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Created" sortKey="createdAt" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <th className="text-right text-[10px] text-white/40 uppercase px-4 py-2 tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortItems(filteredTickets).map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold text-marble-blue">{t.ticketNumber}</div>
                        <div className="text-[10px] text-white/35 truncate max-w-[160px]">{t.subject}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] text-white/70">{t.playerName}</div>
                        <div className="text-[10px] text-white/30">{t.platform}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${categoryStyles[t.category] || 'bg-white/10 text-white/50'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${priorityStyles[t.priority] || priorityStyles.low}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusStyles[t.status] || statusStyles.open}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-white/40">{timeAgo(t.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTicketId(t.id); }}
                          className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Flagged Players */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-1">Flagged Players</div>
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
                        <div className="text-[10px] text-white/40">{p.email || 'No email'}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-marble-red/15 text-marble-red">FLAGGED</span>
                    </div>
                    {p.flagReason && <div className="text-[11px] text-white/50 mb-2">Reason: &quot;{p.flagReason}&quot;</div>}
                    <div className="flex gap-1.5 mb-2 text-[10px]">
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">{p.coins.toLocaleString()} coins</span>
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">${Number(p.totalSpent).toFixed(2)} spent</span>
                      <span className="bg-white/[0.06] px-2 py-0.5 rounded text-white/40">{p.totalRaces} races</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Ban "${p.playerName}"? This invalidates their sessions.`)) {
                            banFlagged.mutate(p.id);
                          }
                        }}
                        disabled={banFlagged.isPending}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-marble-red/20 text-marble-red hover:bg-marble-red/30 transition-colors disabled:opacity-40"
                      >
                        {banFlagged.isPending && banFlagged.variables === p.id ? '...' : 'Ban'}
                      </button>
                      {/* Review action removed — there's no per-player review
                          flow yet. Operator can click the player elsewhere
                          (Users tab) for full context. */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Requests */}
          <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
            <div className="font-heading text-base tracking-wide mb-1">Refund Requests</div>
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
            {data.refunds.recent.length > 0 ? (
              <div className="border-t border-white/[0.08] mt-3 pt-3 space-y-3">
                {data.refunds.recent.map((r: RefundItem) => (
                  <div key={r.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="text-[12px] font-semibold text-white/70">{r.product}</div>
                        <div className="text-[10px] text-white/35">{r.playerName} &bull; ${r.amount.toFixed(2)} &bull; {r.platform}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-marble-red/15 text-marble-red">REFUNDED</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-t border-white/[0.08] mt-3 pt-3 text-center py-4">
                <div className="text-white/25 text-xs">No refunds recorded</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ticket Detail Modal ── */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicketId(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
