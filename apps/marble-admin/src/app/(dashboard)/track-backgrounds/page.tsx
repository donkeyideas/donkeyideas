'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import tracksRaw from '@/data/tracks.json';

interface Track {
  id: string;
  name: string;
  theme: string;
  description: string;
  gradient: [string, string];
  themeColor: string;
}

interface TrackBgImage {
  courseId: string;
  imageUrl: string;
  label: string;
  updatedAt: string;
  updatedBy: string | null;
}

const TRACKS: Track[] = tracksRaw as Track[];

const THEMES = Array.from(new Set(TRACKS.map((t) => t.theme))).sort();

const PAGE_SIZE = 25;

/* ------------------------------------------------------------------ */
/*  Native bg preview                                                  */
/*                                                                     */
/*  Legacy themes (meadow/volcano/frozen/cyber) render in-game from     */
/*  bundled Kenney PNG tiles — copies live in /public/track-bg-previews */
/*  so the admin shows the actual asset, not a placeholder.             */
/*                                                                     */
/*  The 10 newer themes (beach, forest, desert, etc.) render in-game    */
/*  from Skia gradient rects, so the gradient swatch is pixel-accurate  */
/*  to what the player actually sees.                                   */
/* ------------------------------------------------------------------ */
const BUNDLED_BG_TILES: Record<string, string> = {
  meadow: '/track-bg-previews/meadow.png',
  volcano: '/track-bg-previews/volcano.png',
  frozen: '/track-bg-previews/frozen.png',
  cyber: '/track-bg-previews/cyber.png',
};

function NativeBgPreview({ track }: { track: Track }) {
  const tileUrl = BUNDLED_BG_TILES[track.theme];
  if (tileUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={tileUrl} alt={`${track.theme} background`} className="w-full h-full object-cover" />
    );
  }
  const [from, to] = track.gradient;
  return (
    <div
      className="w-full h-full"
      style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}
    />
  );
}

export default function TrackBackgroundsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ images: TrackBgImage[] }>({
    queryKey: ['track-bg-images'],
    queryFn: () => api.get('/track-bg-images').then((r: any) => r.data),
  });

  const [search, setSearch] = useState('');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'custom' | 'native'>('all');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* Reset to page 1 whenever the filter changes */
  useEffect(() => {
    setPage(1);
  }, [search, themeFilter, statusFilter]);

  /* Index custom images by courseId for quick lookup */
  const customByCourse = useMemo(() => {
    const map: Record<string, TrackBgImage> = {};
    for (const img of data?.images ?? []) map[img.courseId] = img;
    return map;
  }, [data]);

  const saveImage = useMutation({
    mutationFn: (payload: { courseId: string; imageUrl: string; label: string }) =>
      api.post('/track-bg-images', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-bg-images'] });
      cancelEdit();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err.message || 'Save failed');
    },
  });

  const deleteImage = useMutation({
    mutationFn: (courseId: string) =>
      api.delete(`/track-bg-images?courseId=${encodeURIComponent(courseId)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-bg-images'] });
      cancelEdit();
    },
  });

  function startEdit(track: Track) {
    const existing = customByCourse[track.id];
    setEditingId(track.id);
    setNewUrl(existing?.imageUrl ?? '');
    setNewLabel(existing?.label ?? '');
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setNewUrl('');
    setNewLabel('');
    setError(null);
  }

  if (isLoading) return <LoadingSpinner />;

  /* Filter the track list */
  const filtered = TRACKS.filter((t) => {
    if (themeFilter !== 'all' && t.theme !== themeFilter) return false;
    const hasCustom = !!customByCourse[t.id];
    if (statusFilter === 'custom' && !hasCustom) return false;
    if (statusFilter === 'native' && hasCustom) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const customCount = Object.keys(customByCourse).length;

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/*  HEADER                                                      */}
      {/* ============================================================ */}
      <Card title="Track Backgrounds">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-white/60 leading-relaxed flex-1 min-w-[300px]">
            Click any track below to replace its background with a custom image. Used for sponsored
            backdrops (e.g., &quot;Pepsi presents Iron Run&quot;) or seasonal swaps — no app build needed.
          </p>
          <div className="flex gap-2">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total</div>
              <div className="text-xl text-white font-bold">{TRACKS.length}</div>
            </div>
            <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-2">
              <div className="text-[10px] text-gold/70 uppercase tracking-wider font-semibold">Custom</div>
              <div className="text-xl text-gold font-bold">{customCount}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-2">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Native</div>
              <div className="text-xl text-white/70 font-bold">{TRACKS.length - customCount}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  FILTERS                                                     */}
      {/* ============================================================ */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by track name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
          <select
            aria-label="Filter by theme"
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40"
          >
            <option value="all">All Themes ({TRACKS.length})</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)} ({TRACKS.filter((tr) => tr.theme === t).length})
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-lg overflow-hidden border border-white/10">
            {(['all', 'custom', 'native'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-[12px] font-bold transition-colors ${
                  statusFilter === s
                    ? 'bg-gold text-[#0a1a3a]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {s === 'all' ? 'All' : s === 'custom' ? `Custom (${customCount})` : `Native (${TRACKS.length - customCount})`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/*  TRACK GRID                                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visible.map((track) => {
          const custom = customByCourse[track.id];
          const isEditing = editingId === track.id;
          const newUrlValid = isEditing && newUrl && /^https?:\/\//i.test(newUrl);
          /* When editing and a valid-looking new URL has been typed, the
             top thumbnail previews the new image. Otherwise it shows the
             custom (if one was saved) or falls back to the native bg. */
          const topPreviewUrl = newUrlValid ? newUrl : custom?.imageUrl;
          return (
            <div
              key={track.id}
              className={`bg-white/[0.03] border-2 rounded-2xl p-3 transition-all ${
                isEditing
                  ? 'border-gold/60 shadow-[0_0_0_3px_rgba(255,194,32,0.15)]'
                  : custom
                  ? 'border-gold/40'
                  : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              {/* Track preview thumbnail. When editing with a valid new
                  URL, this swaps live to preview the swap. */}
              <button
                type="button"
                onClick={() => (isEditing ? cancelEdit() : startEdit(track))}
                className="block w-full aspect-[9/16] rounded-lg overflow-hidden bg-white/5 mb-2 relative"
              >
                {topPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={topPreviewUrl}
                    src={topPreviewUrl}
                    alt={track.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                ) : (
                  <NativeBgPreview track={track} />
                )}
                {newUrlValid && newUrl !== custom?.imageUrl && (
                  <span className="absolute top-1.5 right-1.5 bg-marble-blue text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Preview
                  </span>
                )}
                {!newUrlValid && custom && (
                  <span className="absolute top-1.5 right-1.5 bg-gold text-[#0a1a3a] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Custom
                  </span>
                )}
              </button>

              {/* Track meta */}
              <div className="px-1">
                <div className="text-[13px] font-bold text-white truncate" title={track.name}>
                  {track.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: track.themeColor }}
                  />
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">
                    {track.theme}
                  </span>
                </div>
                <div className="text-[10px] text-white/30 font-mono mt-1 truncate" title={track.id}>
                  {track.id}
                </div>
              </div>

              {/* Edit panel */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2">
                  <div>
                    <label className="block text-[9px] text-white/40 font-semibold uppercase tracking-wider mb-1">
                      New Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://i.ibb.co/.../image.png"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                      autoFocus
                    />
                    {/^https?:\/\/(?:www\.)?ibb\.co\//i.test(newUrl) && (
                      <p className="text-[10px] text-marble-red mt-1">
                        That&apos;s an ImgBB <em>page</em> URL. Use the &quot;Direct link&quot; — looks like{' '}
                        <code className="text-white/70">https://i.ibb.co/&lt;id&gt;/file.png</code>.
                      </p>
                    )}
                    {/^https?:\/\/(?:www\.)?imgur\.com\/(?!gallery|a\/)/i.test(newUrl) && (
                      <p className="text-[10px] text-marble-red mt-1">
                        That&apos;s an Imgur page URL. Use{' '}
                        <code className="text-white/70">https://i.imgur.com/&lt;id&gt;.png</code> instead.
                      </p>
                    )}
                    {/^https?:\/\/postimg(?:es)?\.(?:org|cc)\//i.test(newUrl) && (
                      <p className="text-[10px] text-marble-red mt-1">
                        That&apos;s a Postimages page URL. Use the &quot;Direct Link&quot; —{' '}
                        <code className="text-white/70">https://i.postimg.cc/...</code>.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/40 font-semibold uppercase tracking-wider mb-1">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pepsi sponsor"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
                    />
                  </div>

                  {error && (
                    <div className="bg-marble-red/10 border border-marble-red/30 rounded px-2 py-1.5 text-marble-red text-[10px]">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        saveImage.mutate({ courseId: track.id, imageUrl: newUrl, label: newLabel })
                      }
                      disabled={saveImage.isPending || !newUrl}
                      className="flex-1 px-2 py-1.5 rounded bg-gold text-[#0a1a3a] text-[11px] font-bold hover:bg-gold/90 disabled:opacity-50 transition-colors"
                    >
                      {saveImage.isPending ? 'Saving...' : 'Save'}
                    </button>
                    {custom && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Revert "${track.name}" to its bundled background?`,
                            )
                          ) {
                            deleteImage.mutate(track.id);
                          }
                        }}
                        disabled={deleteImage.isPending}
                        className="px-2 py-1.5 rounded bg-marble-red/15 text-marble-red text-[11px] font-bold hover:bg-marble-red/25 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-2 py-1.5 rounded bg-white/10 text-white/60 text-[11px] font-bold hover:bg-white/15"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <div className="py-10 text-center text-white/30 text-sm">
            No tracks match your filters.
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  PAGINATION                                                  */}
      {/* ============================================================ */}
      {filtered.length > PAGE_SIZE && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-white/50">
              Showing <span className="text-white font-bold">{startIdx + 1}</span>–
              <span className="text-white font-bold">{Math.min(startIdx + PAGE_SIZE, filtered.length)}</span> of{' '}
              <span className="text-white font-bold">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                « First
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹ Prev
              </button>
              <span className="px-3 py-1.5 rounded bg-gold/10 border border-gold/30 text-[11px] font-bold text-gold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Last »
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
