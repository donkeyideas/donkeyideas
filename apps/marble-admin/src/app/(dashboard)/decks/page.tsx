'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

/* ------------------------------------------------------------------ */
/*  Decks admin page                                                    */
/*                                                                     */
/*  Generates and manages the public-shareable pitch + business decks. */
/*  Each "Generate" produces a new snapshot row in generated_decks      */
/*  with a unique shareToken. The old rows stay around so the admin    */
/*  can roll back to a previous version if a fresh regenerate produces */
/*  something off.                                                     */
/*                                                                     */
/*  Share URL is `${origin}/p/decks/{shareToken}`. Anyone with the URL */
/*  can view the HTML — no auth required. Revoke a link by either      */
/*  generating a new deck (old token still works until deleted) or by  */
/*  deleting the row directly (not exposed in UI yet).                 */
/* ------------------------------------------------------------------ */

interface DeckRow {
  id: string;
  type: string;
  shareToken: string;
  title: string;
  generatedAt: string;
  generatedBy: string | null;
}

interface ListResponse {
  latest: { pitch: DeckRow | null; business: DeckRow | null };
  history: { pitch: DeckRow[]; business: DeckRow[] };
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (!Number.isFinite(t)) return '—';
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DecksPage() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['decks-list'],
    queryFn: () => api.get('/decks/list').then((r: any) => r.data),
    refetchOnWindowFocus: false,
  });

  async function generate(type: 'pitch' | 'business' | 'both') {
    setGenerating(true);
    setError(null);
    try {
      await api.post('/decks/generate', { type });
      await queryClient.invalidateQueries({ queryKey: ['decks-list'] });
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/p/decks/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((cur) => (cur === token ? null : cur)), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl tracking-wide">DECKS</h1>
        <p className="text-sm text-white/40 mt-1">
          Auto-generated pitch + business decks. Click <strong>Sync</strong> to capture a fresh
          snapshot of platform data and produce shareable HTML links.
        </p>
      </div>

      {/* Sync controls */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-heading text-base tracking-wide">Sync</div>
            <p className="text-[11px] text-white/35 mt-0.5">
              Generates both decks from the current data. Old links keep working until deleted.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => generate('pitch')}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-marble-blue/15 text-marble-blue border border-marble-blue/30 hover:bg-marble-blue/25 transition-colors disabled:opacity-40"
            >
              Pitch Only
            </button>
            <button
              type="button"
              onClick={() => generate('business')}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-marble-blue/15 text-marble-blue border border-marble-blue/30 hover:bg-marble-blue/25 transition-colors disabled:opacity-40"
            >
              Business Only
            </button>
            <button
              type="button"
              onClick={() => generate('both')}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gold text-navy-900 hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {generating ? 'Generating…' : 'Sync Both'}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-xs text-marble-red mt-3 px-3 py-2 rounded bg-marble-red/10 border border-marble-red/30">
            {error}
          </p>
        )}
      </div>

      {/* Latest decks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DeckCard
          title="Pitch Deck"
          subtitle="Marketing-flavored. Send to press, partners, casual investors."
          deck={data?.latest?.pitch ?? null}
          isLoading={isLoading}
          copiedToken={copiedToken}
          onCopy={copyLink}
        />
        <DeckCard
          title="Business Snapshot"
          subtitle="Investor-flavored. KPIs, unit economics, cohort retention."
          deck={data?.latest?.business ?? null}
          isLoading={isLoading}
          copiedToken={copiedToken}
          onCopy={copyLink}
        />
      </div>

      {/* History */}
      <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
        <div className="font-heading text-base tracking-wide mb-3">History</div>
        <p className="text-[11px] text-white/35 mb-4">
          Older generations. Any previous link still works — share whichever version you prefer.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HistoryColumn
            label="Pitch"
            rows={data?.history?.pitch ?? []}
            copiedToken={copiedToken}
            onCopy={copyLink}
          />
          <HistoryColumn
            label="Business"
            rows={data?.history?.business ?? []}
            copiedToken={copiedToken}
            onCopy={copyLink}
          />
        </div>
      </div>
    </div>
  );
}

interface DeckCardProps {
  title: string;
  subtitle: string;
  deck: DeckRow | null;
  isLoading: boolean;
  copiedToken: string | null;
  onCopy: (token: string) => void;
}

function DeckCard({ title, subtitle, deck, isLoading, copiedToken, onCopy }: DeckCardProps) {
  const url = deck ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/decks/${deck.shareToken}` : '';
  const copied = deck && copiedToken === deck.shareToken;

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-heading text-base tracking-wide">{title}</div>
          <p className="text-[11px] text-white/35 mt-0.5">{subtitle}</p>
        </div>
        {deck && (
          <span className="text-[10px] text-white/40 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-semibold">
            {timeAgo(deck.generatedAt)}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-white/40 mt-4">Loading…</p>
      ) : !deck ? (
        <p className="text-xs text-white/40 mt-4">
          No deck generated yet. Click <strong>Sync Both</strong> above to create one.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <input
              readOnly
              value={url}
              aria-label={`Public share link for ${title}`}
              title="Public share link"
              placeholder="Share link"
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 font-mono"
            />
            <button
              type="button"
              onClick={() => onCopy(deck.shareToken)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                copied
                  ? 'bg-marble-green/20 text-marble-green border border-marble-green/40'
                  : 'bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25'
              }`}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-marble-blue hover:text-marble-blue/80 underline"
          >
            Open in new tab ↗
          </a>
        </>
      )}
    </div>
  );
}

interface HistoryColumnProps {
  label: string;
  rows: DeckRow[];
  copiedToken: string | null;
  onCopy: (token: string) => void;
}

function HistoryColumn({ label, rows, copiedToken, onCopy }: HistoryColumnProps) {
  return (
    <div>
      <div className="text-[11px] text-white/50 uppercase tracking-wider font-bold mb-2">
        {label}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-white/30">None yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((d) => {
            const copied = copiedToken === d.shareToken;
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]"
              >
                <span className="text-xs text-white/60">{timeAgo(d.generatedAt)}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCopy(d.shareToken)}
                    className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                      copied
                        ? 'bg-marble-green/20 text-marble-green'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={typeof window !== 'undefined' ? `${window.location.origin}/p/decks/${d.shareToken}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold px-2 py-1 rounded bg-marble-blue/15 text-marble-blue hover:bg-marble-blue/25 transition-colors"
                  >
                    View
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
