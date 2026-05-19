'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LiveOpsMetrics {
  concurrentUsers: number;
  racesLastHour: number;
  betsLastHour: number;
  apiErrorsLastHour: number;
  avgResponseTime: number;
  activeAnnouncements: number;
  activePromos: number;
  pendingMessages: number;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'maintenance' | 'promo';
  priority: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired';
}

interface DeliveryStat {
  sent: number;
  delivered: number;
  failed: number;
  status: 'pending' | 'passed' | 'failed' | 'partial';
}

interface AnnouncementDelivery {
  id: string;
  title: string;
  type: string;
  sentAt: string;
  ios: DeliveryStat;
  android: DeliveryStat;
}

interface Promo {
  id: string;
  name: string;
  type: 'double_coins' | 'bonus_reward' | 'discount' | 'free_entry';
  multiplier: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired';
}

interface Tournament {
  id: string;
  name: string;
  type: 'daily-blitz' | 'weekly-cup' | 'champion-invitational' | 'custom';
  entryFee: number;
  prizePool: number;
  startDate: string;
  endDate: string;
  recurring: 'none' | 'daily' | 'weekly';
  active: boolean;
}

interface Message {
  id: string;
  playerId: string;
  title: string;
  body: string;
  type: 'info' | 'reward' | 'warning' | 'compensation';
  coinsAttached: number;
  sentAt: string;
}

interface ConfigFeature {
  key: string;
  label: string;
  desc: string;
  value: boolean;
  danger?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color ?? 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-white/40 mt-1 font-medium">{label}</div>
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: 'info' | 'warning' | 'success' | 'error' | 'neutral' }) {
  const colors = {
    info: 'bg-marble-blue/15 text-marble-blue border-marble-blue/30',
    warning: 'bg-gold/15 text-gold border-gold/30',
    success: 'bg-marble-green/15 text-marble-green border-marble-green/30',
    error: 'bg-marble-red/15 text-marble-red border-marble-red/30',
    neutral: 'bg-white/10 text-white/60 border-white/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${colors[variant]}`}>
      {label}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-marble-green' : 'bg-white/20'}`} />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function LiveOpsPage() {
  const queryClient = useQueryClient();

  /* ---- Data Queries ---- */
  const { data: metrics, isLoading: metricsLoading } = useQuery<LiveOpsMetrics>({
    queryKey: ['live-ops'],
    queryFn: () => api.get('/live-ops').then((r: any) => r.data),
    refetchInterval: 30000,
  });

  const { data: announcements, isLoading: annLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r: any) => r.data.announcements ?? []),
  });

  const { data: promos, isLoading: promosLoading } = useQuery<Promo[]>({
    queryKey: ['promos'],
    queryFn: () => api.get('/promos').then((r: any) => r.data.promos ?? []),
  });

  const { data: deliveries } = useQuery<AnnouncementDelivery[]>({
    queryKey: ['announcements-delivery'],
    queryFn: () => api.get('/announcements/delivery').then((r: any) => r.data.deliveries ?? []),
    refetchInterval: 60000,
  });

  const resendPush = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/resend`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements-delivery'] }); },
  });

  const checkReceipts = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/resend?receiptsOnly=1`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements-delivery'] }); },
  });

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery<Tournament[]>({
    queryKey: ['tournaments-schedule'],
    queryFn: () => api.get('/tournaments/schedule').then((r: any) => r.data.tournaments ?? []),
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages').then((r: any) => r.data.messages ?? []),
  });

  const { data: configRaw } = useQuery<{ features: ConfigFeature[] }>({
    queryKey: ['config'],
    queryFn: () => api.get('/config').then((r: any) => r.data),
  });

  /* ---- Form State ---- */
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', body: '', type: 'info' as Announcement['type'], priority: 0, startDate: '', endDate: '' });
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [editAnnForm, setEditAnnForm] = useState<Partial<Announcement>>({});

  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ name: '', type: 'double_coins' as Promo['type'], multiplier: 1, startDate: '', endDate: '' });
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editPromoForm, setEditPromoForm] = useState<Partial<Promo>>({});

  const [showTournForm, setShowTournForm] = useState(false);
  const [tournForm, setTournForm] = useState({ name: '', type: 'daily-blitz' as Tournament['type'], entryFee: 100, prizePool: 5000, startDate: '', endDate: '', recurring: 'none' as Tournament['recurring'] });

  const [msgForm, setMsgForm] = useState({ playerId: '', title: '', body: '', type: 'info' as Message['type'], coinsAttached: 0 });

  const [toggleOverrides, setToggleOverrides] = useState<Record<string, boolean>>({});

  /* ---- Mutations ---- */
  const createAnnouncement = useMutation({
    mutationFn: (data: typeof annForm) => api.post('/announcements', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); queryClient.invalidateQueries({ queryKey: ['live-ops'] }); setShowAnnForm(false); setAnnForm({ title: '', body: '', type: 'info', priority: 0, startDate: '', endDate: '' }); },
  });

  const updateAnnouncement = useMutation({
    mutationFn: (data: Partial<Announcement> & { id: string }) => api.put('/announcements', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setEditingAnnId(null); },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements?id=${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); queryClient.invalidateQueries({ queryKey: ['live-ops'] }); },
  });

  const createPromo = useMutation({
    mutationFn: (data: typeof promoForm) => api.post('/promos', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['promos'] }); queryClient.invalidateQueries({ queryKey: ['live-ops'] }); setShowPromoForm(false); setPromoForm({ name: '', type: 'double_coins', multiplier: 1, startDate: '', endDate: '' }); },
  });

  const updatePromo = useMutation({
    mutationFn: (data: Partial<Promo> & { id: string }) => api.put('/promos', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['promos'] }); setEditingPromoId(null); },
  });

  const deletePromo = useMutation({
    mutationFn: (id: string) => api.delete(`/promos?id=${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['promos'] }); queryClient.invalidateQueries({ queryKey: ['live-ops'] }); },
  });

  const createTournament = useMutation({
    mutationFn: (data: typeof tournForm) => api.post('/tournaments/schedule', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournaments-schedule'] }); setShowTournForm(false); setTournForm({ name: '', type: 'daily-blitz', entryFee: 100, prizePool: 5000, startDate: '', endDate: '', recurring: 'none' }); },
  });

  const toggleTournament = useMutation({
    mutationFn: (data: { id: string; active: boolean }) => api.put('/tournaments/schedule', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournaments-schedule'] }); },
  });

  const deleteTournament = useMutation({
    mutationFn: (id: string) => api.delete(`/tournaments/schedule?id=${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournaments-schedule'] }); },
  });

  const sendMessage = useMutation({
    mutationFn: (data: typeof msgForm) => api.post('/messages', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messages'] }); queryClient.invalidateQueries({ queryKey: ['live-ops'] }); setMsgForm({ playerId: '', title: '', body: '', type: 'info', coinsAttached: 0 }); },
  });

  /* ---- Emergency Toggle Handler ---- */
  const handleEmergencyToggle = async (key: string, current: boolean) => {
    const next = !current;
    setToggleOverrides((prev) => ({ ...prev, [key]: next }));
    try {
      await api.put('/config', { key, value: String(next) });
      queryClient.invalidateQueries({ queryKey: ['config'] });
    } catch {
      setToggleOverrides((prev) => ({ ...prev, [key]: current }));
    }
  };

  /* ---- Loading ---- */
  if (metricsLoading || annLoading || promosLoading || tournamentsLoading) return <LoadingSpinner />;

  const m = metrics ?? { concurrentUsers: 0, racesLastHour: 0, betsLastHour: 0, apiErrorsLastHour: 0, avgResponseTime: 0, activeAnnouncements: 0, activePromos: 0, pendingMessages: 0 };
  const annList = announcements ?? [];
  const promoList = promos ?? [];
  const tournList = tournaments ?? [];
  const msgList = (messages ?? []).slice(0, 10);

  const features = (configRaw?.features ?? []).map((f) => ({
    ...f,
    value: toggleOverrides[f.key] !== undefined ? toggleOverrides[f.key] : f.value,
  }));

  const emergencyKeys = ['feature_pause_purchases', 'feature_maintenance_mode', 'feature_disable_betting'];
  const emergencyToggles = emergencyKeys.map((key) => {
    const feat = features.find((f) => f.key === key);
    return {
      key,
      label: key === 'feature_pause_purchases' ? 'Pause Coin Purchases' : key === 'feature_maintenance_mode' ? 'Enable Maintenance Mode' : 'Disable Betting',
      value: feat?.value ?? false,
      danger: true,
    };
  });

  const isPromoLive = (p: Promo) => {
    const now = new Date();
    if (new Date(p.startDate) > now) return false;
    // Evergreen promos have no endDate — live as long as startDate has passed.
    if (!p.endDate) return true;
    return now <= new Date(p.endDate);
  };

  const typeBadgeVariant = (type: string): 'info' | 'warning' | 'success' | 'error' | 'neutral' => {
    if (type === 'info' || type === 'double_coins' || type === 'daily-blitz') return 'info';
    if (type === 'warning' || type === 'promo' || type === 'bonus_reward' || type === 'weekly-cup') return 'warning';
    if (type === 'maintenance' || type === 'discount' || type === 'champion-invitational') return 'error';
    if (type === 'free_entry' || type === 'custom') return 'success';
    return 'neutral';
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '-';

  /* ---- Render ---- */
  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  LIVE STATUS BAR                                             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard label="Concurrent Users" value={m.concurrentUsers} color={m.concurrentUsers > 0 ? 'text-marble-green' : 'text-white/40'} />
        <MetricCard label="Races Last Hour" value={m.racesLastHour} color="text-marble-blue" />
        <MetricCard label="Bets Last Hour" value={m.betsLastHour} color="text-gold" />
        <MetricCard label="API Errors" value={m.apiErrorsLastHour} color={m.apiErrorsLastHour > 0 ? 'text-marble-red' : 'text-white/40'} />
        <MetricCard label="Avg Response (ms)" value={`${m.avgResponseTime}ms`} color={m.avgResponseTime > 500 ? 'text-marble-red' : 'text-marble-green'} />
        <MetricCard label="Active Announcements" value={m.activeAnnouncements} color="text-marble-blue" />
        <MetricCard label="Active Promos" value={m.activePromos} color="text-gold" />
        <MetricCard label="Pending Messages" value={m.pendingMessages} color="text-white/60" />
      </div>

      {/* ============================================================ */}
      {/*  TWO COLUMN LAYOUT                                           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-[3fr_2fr] gap-5">
        {/* ========================================================== */}
        {/*  LEFT COLUMN                                               */}
        {/* ========================================================== */}
        <div className="space-y-5">
          {/* ---- Announcements ---- */}
          <Card
            title="Announcements"
            headerAction={
              <button
                onClick={() => setShowAnnForm(!showAnnForm)}
                className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-[11px] font-bold hover:bg-gold/20 transition-colors"
              >
                {showAnnForm ? 'Cancel' : '+ Create Announcement'}
              </button>
            }
          >
            {/* Create Form */}
            {showAnnForm && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Title"
                    value={annForm.title}
                    onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <select
                    value={annForm.type}
                    onChange={(e) => setAnnForm({ ...annForm, type: e.target.value as Announcement['type'] })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="promo">Promo</option>
                  </select>
                </div>
                <textarea
                  placeholder="Body"
                  value={annForm.body}
                  onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none h-20"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Priority"
                    value={annForm.priority || ''}
                    onChange={(e) => setAnnForm({ ...annForm, priority: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <input
                    type="datetime-local"
                    value={annForm.startDate}
                    onChange={(e) => setAnnForm({ ...annForm, startDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                  <input
                    type="datetime-local"
                    value={annForm.endDate}
                    onChange={(e) => setAnnForm({ ...annForm, endDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <button
                  onClick={() => createAnnouncement.mutate(annForm)}
                  disabled={createAnnouncement.isPending || !annForm.title}
                  className="px-4 py-2 rounded-lg bg-gold text-[#0a1a3a] text-sm font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
                >
                  {createAnnouncement.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2 text-white/40 font-medium">Title</th>
                    <th className="text-left py-2 text-white/40 font-medium">Type</th>
                    <th className="text-left py-2 text-white/40 font-medium">Status</th>
                    <th className="text-left py-2 text-white/40 font-medium">Start</th>
                    <th className="text-left py-2 text-white/40 font-medium">End</th>
                    <th className="text-left py-2 text-white/40 font-medium">Priority</th>
                    <th className="text-right py-2 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {annList.map((ann) => (
                    <tr key={ann.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      {editingAnnId === ann.id ? (
                        <>
                          <td className="py-2">
                            <input
                              type="text"
                              value={editAnnForm.title ?? ann.title}
                              onChange={(e) => setEditAnnForm({ ...editAnnForm, title: e.target.value })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white w-full focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <select
                              value={editAnnForm.type ?? ann.type}
                              onChange={(e) => setEditAnnForm({ ...editAnnForm, type: e.target.value as Announcement['type'] })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white focus:outline-none focus:border-gold/40"
                            >
                              <option value="info">Info</option>
                              <option value="warning">Warning</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="promo">Promo</option>
                            </select>
                          </td>
                          <td className="py-2"><StatusDot active={ann.status === 'active'} /> <span className="text-white/50">{ann.status}</span></td>
                          <td className="py-2">
                            <input
                              type="datetime-local"
                              value={editAnnForm.startDate ?? ann.startDate?.slice(0, 16)}
                              onChange={(e) => setEditAnnForm({ ...editAnnForm, startDate: e.target.value })}
                              className="px-1 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="datetime-local"
                              value={editAnnForm.endDate ?? ann.endDate?.slice(0, 16)}
                              onChange={(e) => setEditAnnForm({ ...editAnnForm, endDate: e.target.value })}
                              className="px-1 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              value={editAnnForm.priority ?? ann.priority}
                              onChange={(e) => setEditAnnForm({ ...editAnnForm, priority: parseInt(e.target.value) || 0 })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white w-14 focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2 text-right space-x-1">
                            <button
                              onClick={() => updateAnnouncement.mutate({ id: ann.id, ...editAnnForm })}
                              className="px-2 py-1 rounded bg-marble-green/15 text-marble-green text-[10px] font-bold hover:bg-marble-green/25"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingAnnId(null); setEditAnnForm({}); }}
                              className="px-2 py-1 rounded bg-white/10 text-white/50 text-[10px] font-bold hover:bg-white/15"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 text-white/80 font-medium">{ann.title}</td>
                          <td className="py-2"><Badge label={ann.type} variant={typeBadgeVariant(ann.type)} /></td>
                          <td className="py-2 flex items-center gap-1.5"><StatusDot active={ann.status === 'active'} /> <span className="text-white/50">{ann.status}</span></td>
                          <td className="py-2 text-white/40">{fmtDate(ann.startDate)}</td>
                          <td className="py-2 text-white/40">{fmtDate(ann.endDate)}</td>
                          <td className="py-2 text-white/50">{ann.priority}</td>
                          <td className="py-2 text-right space-x-1">
                            <button
                              onClick={() => { setEditingAnnId(ann.id); setEditAnnForm({ title: ann.title, type: ann.type, priority: ann.priority, startDate: ann.startDate?.slice(0, 16), endDate: ann.endDate?.slice(0, 16) }); }}
                              className="px-2 py-1 rounded bg-marble-blue/15 text-marble-blue text-[10px] font-bold hover:bg-marble-blue/25"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteAnnouncement.mutate(ann.id)}
                              className="px-2 py-1 rounded bg-marble-red/15 text-marble-red text-[10px] font-bold hover:bg-marble-red/25"
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {annList.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-white/30 text-sm">No announcements</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ---- Notification Delivery History ---- */}
          <Card title="Notification Delivery History">
            <p className="text-[11px] text-white/40 mb-3">
              Per-platform push delivery results for each announcement. Verify notifications reach both iOS and Android users.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2 text-white/40 font-medium">Title</th>
                    <th className="text-left py-2 text-white/40 font-medium">Type</th>
                    <th className="text-left py-2 text-white/40 font-medium">Sent</th>
                    <th className="text-center py-2 text-white/40 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-marble-blue" />
                        iOS
                      </span>
                    </th>
                    <th className="text-center py-2 text-white/40 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-marble-green" />
                        Android
                      </span>
                    </th>
                    <th className="text-right py-2 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(deliveries ?? []).map((d) => {
                    const renderPlatform = (p: DeliveryStat) => {
                      const variant: 'success' | 'error' | 'warning' | 'neutral' =
                        p.status === 'passed' ? 'success'
                        : p.status === 'failed' ? 'error'
                        : p.status === 'partial' ? 'warning'
                        : 'neutral';
                      const label = p.status === 'pending'
                        ? 'Pending'
                        : `${p.delivered}/${p.sent} ${p.status}`;
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge label={label.toUpperCase()} variant={variant} />
                          {p.failed > 0 && (
                            <span className="text-[10px] text-marble-red">{p.failed} failed</span>
                          )}
                        </div>
                      );
                    };
                    const busy =
                      (resendPush.isPending && resendPush.variables === d.id) ||
                      (checkReceipts.isPending && checkReceipts.variables === d.id);
                    return (
                      <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2 text-white/80 font-medium">{d.title}</td>
                        <td className="py-2"><Badge label={d.type} variant={typeBadgeVariant(d.type)} /></td>
                        <td className="py-2 text-white/40">{fmtDate(d.sentAt)}</td>
                        <td className="py-2">{renderPlatform(d.ios)}</td>
                        <td className="py-2">{renderPlatform(d.android)}</td>
                        <td className="py-2 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => resendPush.mutate(d.id)}
                            disabled={busy}
                            className="px-2 py-1 rounded bg-gold/15 text-gold text-[10px] font-bold hover:bg-gold/25 disabled:opacity-40"
                          >
                            {resendPush.isPending && resendPush.variables === d.id ? '...' : 'Resend'}
                          </button>
                          <button
                            onClick={() => checkReceipts.mutate(d.id)}
                            disabled={busy}
                            className="px-2 py-1 rounded bg-marble-blue/15 text-marble-blue text-[10px] font-bold hover:bg-marble-blue/25 disabled:opacity-40"
                          >
                            {checkReceipts.isPending && checkReceipts.variables === d.id ? '...' : 'Receipts'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!deliveries || deliveries.length === 0) && (
                    <tr><td colSpan={6} className="py-6 text-center text-white/30 text-sm">No delivery history</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ---- Promo Events ---- */}
          <Card
            title="Promo Events"
            headerAction={
              <button
                onClick={() => setShowPromoForm(!showPromoForm)}
                className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-[11px] font-bold hover:bg-gold/20 transition-colors"
              >
                {showPromoForm ? 'Cancel' : '+ Create Promo'}
              </button>
            }
          >
            {/* Create Form */}
            {showPromoForm && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={promoForm.name}
                    onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <select
                    value={promoForm.type}
                    onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as Promo['type'] })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="double_coins">Double Coins</option>
                    <option value="bonus_reward">Bonus Reward</option>
                    <option value="discount">Discount</option>
                    <option value="free_entry">Free Entry</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Multiplier"
                    value={promoForm.multiplier || ''}
                    onChange={(e) => setPromoForm({ ...promoForm, multiplier: parseFloat(e.target.value) || 1 })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                  <input
                    type="datetime-local"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <button
                  onClick={() => createPromo.mutate(promoForm)}
                  disabled={createPromo.isPending || !promoForm.name}
                  className="px-4 py-2 rounded-lg bg-gold text-[#0a1a3a] text-sm font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
                >
                  {createPromo.isPending ? 'Creating...' : 'Create Promo'}
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2 text-white/40 font-medium">Name</th>
                    <th className="text-left py-2 text-white/40 font-medium">Type</th>
                    <th className="text-left py-2 text-white/40 font-medium">Multiplier</th>
                    <th className="text-left py-2 text-white/40 font-medium">Start</th>
                    <th className="text-left py-2 text-white/40 font-medium">End</th>
                    <th className="text-left py-2 text-white/40 font-medium">Status</th>
                    <th className="text-right py-2 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoList.map((promo) => (
                    <tr key={promo.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      {editingPromoId === promo.id ? (
                        <>
                          <td className="py-2">
                            <input
                              type="text"
                              value={editPromoForm.name ?? promo.name}
                              onChange={(e) => setEditPromoForm({ ...editPromoForm, name: e.target.value })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white w-full focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <select
                              value={editPromoForm.type ?? promo.type}
                              onChange={(e) => setEditPromoForm({ ...editPromoForm, type: e.target.value as Promo['type'] })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white focus:outline-none focus:border-gold/40"
                            >
                              <option value="double_coins">Double Coins</option>
                              <option value="bonus_reward">Bonus Reward</option>
                              <option value="discount">Discount</option>
                              <option value="free_entry">Free Entry</option>
                            </select>
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editPromoForm.multiplier ?? promo.multiplier}
                              onChange={(e) => setEditPromoForm({ ...editPromoForm, multiplier: parseFloat(e.target.value) || 1 })}
                              className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[12px] text-white w-16 focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="datetime-local"
                              value={editPromoForm.startDate ?? promo.startDate?.slice(0, 16)}
                              onChange={(e) => setEditPromoForm({ ...editPromoForm, startDate: e.target.value })}
                              className="px-1 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="datetime-local"
                              value={editPromoForm.endDate ?? promo.endDate?.slice(0, 16)}
                              onChange={(e) => setEditPromoForm({ ...editPromoForm, endDate: e.target.value })}
                              className="px-1 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-gold/40"
                            />
                          </td>
                          <td className="py-2"><span className="text-white/50">{promo.status}</span></td>
                          <td className="py-2 text-right space-x-1">
                            <button
                              onClick={() => updatePromo.mutate({ id: promo.id, ...editPromoForm })}
                              className="px-2 py-1 rounded bg-marble-green/15 text-marble-green text-[10px] font-bold hover:bg-marble-green/25"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingPromoId(null); setEditPromoForm({}); }}
                              className="px-2 py-1 rounded bg-white/10 text-white/50 text-[10px] font-bold hover:bg-white/15"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 text-white/80 font-medium">{promo.name}</td>
                          <td className="py-2"><Badge label={promo.type.replace('_', ' ')} variant={typeBadgeVariant(promo.type)} /></td>
                          <td className="py-2 text-gold font-bold">{promo.multiplier}x</td>
                          <td className="py-2 text-white/40">{fmtDate(promo.startDate)}</td>
                          <td className="py-2 text-white/40">{fmtDate(promo.endDate)}</td>
                          <td className="py-2">
                            {isPromoLive(promo) ? (
                              <Badge label="LIVE" variant="success" />
                            ) : (
                              <span className="text-white/40">{promo.status}</span>
                            )}
                          </td>
                          <td className="py-2 text-right space-x-1">
                            <button
                              onClick={() => { setEditingPromoId(promo.id); setEditPromoForm({ name: promo.name, type: promo.type, multiplier: promo.multiplier, startDate: promo.startDate?.slice(0, 16), endDate: promo.endDate?.slice(0, 16) }); }}
                              className="px-2 py-1 rounded bg-marble-blue/15 text-marble-blue text-[10px] font-bold hover:bg-marble-blue/25"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePromo.mutate(promo.id)}
                              className="px-2 py-1 rounded bg-marble-red/15 text-marble-red text-[10px] font-bold hover:bg-marble-red/25"
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {promoList.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-white/30 text-sm">No promos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ---- Scheduled Tournaments ---- */}
          <Card
            title="Scheduled Tournaments"
            headerAction={
              <button
                onClick={() => setShowTournForm(!showTournForm)}
                className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-[11px] font-bold hover:bg-gold/20 transition-colors"
              >
                {showTournForm ? 'Cancel' : '+ Schedule Tournament'}
              </button>
            }
          >
            {/* Create Form */}
            {showTournForm && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={tournForm.name}
                    onChange={(e) => setTournForm({ ...tournForm, name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <select
                    value={tournForm.type}
                    onChange={(e) => setTournForm({ ...tournForm, type: e.target.value as Tournament['type'] })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="daily-blitz">Daily Blitz</option>
                    <option value="weekly-cup">Weekly Cup</option>
                    <option value="champion-invitational">Champion Invitational</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Entry Fee"
                    value={tournForm.entryFee || ''}
                    onChange={(e) => setTournForm({ ...tournForm, entryFee: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <input
                    type="number"
                    placeholder="Prize Pool"
                    value={tournForm.prizePool || ''}
                    onChange={(e) => setTournForm({ ...tournForm, prizePool: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                  />
                  <select
                    value={tournForm.recurring}
                    onChange={(e) => setTournForm({ ...tournForm, recurring: e.target.value as Tournament['recurring'] })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="none">No Recurring</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    value={tournForm.startDate}
                    onChange={(e) => setTournForm({ ...tournForm, startDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                  <input
                    type="datetime-local"
                    value={tournForm.endDate}
                    onChange={(e) => setTournForm({ ...tournForm, endDate: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <button
                  onClick={() => createTournament.mutate(tournForm)}
                  disabled={createTournament.isPending || !tournForm.name}
                  className="px-4 py-2 rounded-lg bg-gold text-[#0a1a3a] text-sm font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
                >
                  {createTournament.isPending ? 'Scheduling...' : 'Schedule Tournament'}
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-2 text-white/40 font-medium">Name</th>
                    <th className="text-left py-2 text-white/40 font-medium">Type</th>
                    <th className="text-left py-2 text-white/40 font-medium">Entry Fee</th>
                    <th className="text-left py-2 text-white/40 font-medium">Prize Pool</th>
                    <th className="text-left py-2 text-white/40 font-medium">Start</th>
                    <th className="text-left py-2 text-white/40 font-medium">Recurring</th>
                    <th className="text-left py-2 text-white/40 font-medium">Active</th>
                    <th className="text-right py-2 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournList.map((t) => (
                    <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2 text-white/80 font-medium">{t.name}</td>
                      <td className="py-2"><Badge label={t.type} variant={typeBadgeVariant(t.type)} /></td>
                      <td className="py-2 text-gold font-bold">{t.entryFee.toLocaleString()}</td>
                      <td className="py-2 text-marble-green font-bold">{t.prizePool.toLocaleString()}</td>
                      <td className="py-2 text-white/40">{fmtDate(t.startDate)}</td>
                      <td className="py-2 text-white/50">{t.recurring === 'none' ? '-' : t.recurring}</td>
                      <td className="py-2">
                        <div
                          className={`w-9 h-5 rounded-xl relative cursor-pointer transition-colors ${t.active ? 'bg-marble-green' : 'bg-white/15'}`}
                          onClick={() => toggleTournament.mutate({ id: t.id, active: !t.active })}
                        >
                          <div className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${t.active ? 'translate-x-4' : ''}`} />
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteTournament.mutate(t.id)}
                          className="px-2 py-1 rounded bg-marble-red/15 text-marble-red text-[10px] font-bold hover:bg-marble-red/25"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tournList.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-white/30 text-sm">No scheduled tournaments</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ========================================================== */}
        {/*  RIGHT COLUMN                                              */}
        {/* ========================================================== */}
        <div className="space-y-5">
          {/* ---- Send Message ---- */}
          <Card title="Send Message to Player">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Player ID"
                value={msgForm.playerId}
                onChange={(e) => setMsgForm({ ...msgForm, playerId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              />
              <input
                type="text"
                placeholder="Title"
                value={msgForm.title}
                onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              />
              <textarea
                placeholder="Message body"
                value={msgForm.body}
                onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none h-20"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={msgForm.type}
                  onChange={(e) => setMsgForm({ ...msgForm, type: e.target.value as Message['type'] })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
                >
                  <option value="info">Info</option>
                  <option value="reward">Reward</option>
                  <option value="warning">Warning</option>
                  <option value="compensation">Compensation</option>
                </select>
                <input
                  type="number"
                  placeholder="Coins Attached (0)"
                  value={msgForm.coinsAttached || ''}
                  onChange={(e) => setMsgForm({ ...msgForm, coinsAttached: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                />
              </div>
              <button
                onClick={() => sendMessage.mutate(msgForm)}
                disabled={sendMessage.isPending || !msgForm.playerId || !msgForm.title}
                className="w-full px-4 py-2 rounded-lg bg-gold text-[#0a1a3a] text-sm font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
              >
                {sendMessage.isPending ? 'Sending...' : 'Send Message'}
              </button>
            </div>

            {/* Recent Messages */}
            {msgList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/40 font-medium mb-2">Last 10 Sent Messages</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {msgList.map((msg) => (
                    <div key={msg.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-white/70 font-medium">{msg.title}</span>
                        <Badge label={msg.type} variant={typeBadgeVariant(msg.type)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/35">To: {msg.playerId}</span>
                        <span className="text-[10px] text-white/35">{msg.coinsAttached > 0 ? `+${msg.coinsAttached} coins` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ---- Emergency Controls ---- */}
          <Card title="Emergency Controls">
            <p className="text-[10px] text-marble-red/60 mb-3 font-medium">These toggles affect the live game immediately. Use with caution.</p>
            {emergencyToggles.map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-b-0">
                <div>
                  <div className="font-medium text-[13px] text-marble-red">{toggle.label}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">{toggle.value ? 'Active — affects live game' : 'Inactive'}</div>
                </div>
                <div
                  className={`w-11 h-6 rounded-xl relative cursor-pointer transition-colors ${toggle.value ? 'bg-marble-red' : 'bg-white/15'}`}
                  onClick={() => handleEmergencyToggle(toggle.key, toggle.value)}
                >
                  <div className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform shadow-sm ${toggle.value ? 'translate-x-5' : ''}`} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
