import { unstable_cache } from 'next/cache';
import { prisma } from '@donkey-ideas/database';
import { fetchAllProjectOverview } from './external-users';

/**
 * Public, cached, fallback-safe live member counts for the marketing homepage.
 *
 * Reuses the SAME source the admin/API uses (fetchAllProjectOverview), but:
 *  - wrapped in unstable_cache (revalidate hourly) so a public visit never
 *    hammers the per-venture databases, and
 *  - guarded so any failure (a venture DB down, missing env) degrades to no
 *    numbers instead of breaking the page. The homepage must never hang or 500.
 *
 * Returns a map of external project slug -> total members, plus the grand total.
 */
export type VentureCounts = { counts: Record<string, number>; total: number };

async function fetchCounts(): Promise<VentureCounts> {
  try {
    const overview = await fetchAllProjectOverview();
    const counts: Record<string, number> = {};
    let total = 0;
    for (const p of overview.projects) {
      if (p.error || typeof p.total !== 'number') continue;
      counts[p.slug] = p.total;
      total += p.total;
    }
    return { counts, total };
  } catch (err) {
    console.error('[public-portfolio] live member counts unavailable; rendering without numbers', err);
    return { counts: {}, total: 0 };
  }
}

export const getVentureCounts = unstable_cache(fetchCounts, ['public-venture-counts-v2'], {
  revalidate: 3600,
  tags: ['venture-counts'],
});

/**
 * Real, admin-maintained venture statuses — the SAME source the public /ventures
 * page renders (websiteContent section 'ventures-page'). Each entry carries the
 * status (PRODUCTION / BETA / ALPHA / DEVELOPMENT / IDEA) plus a `search` blob
 * (title + websiteUrl, lowercased) so the homepage ledger can match a venture to
 * its real status by a stable token. Returns [] on any failure.
 */
export type VentureStatus = { search: string; status: string; slug: string };

// Mirror the slug logic used by /ventures and /ventures/[slug] so homepage links
// resolve to the exact same detail pages.
function slugifyTitle(title: string): string {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function fetchStatuses(): Promise<VentureStatus[]> {
  try {
    const row = await prisma.websiteContent.findFirst({
      where: { section: 'ventures-page', published: true },
    });
    let content: any = row?.content;
    if (!content) return [];
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch { return []; }
    }
    const ventures: any[] = content.ventures || content.sections || [];
    return ventures
      .filter((v) => v && v.status)
      .map((v) => ({
        search: `${v.title ?? ''} ${v.websiteUrl ?? ''}`.toLowerCase(),
        status: String(v.status).toUpperCase().trim(),
        slug: slugifyTitle(v.title ?? ''),
      }));
  } catch (err) {
    console.error('[public-portfolio] venture statuses unavailable', err);
    return [];
  }
}

export const getVentureStatuses = unstable_cache(fetchStatuses, ['public-venture-statuses-v1'], {
  revalidate: 3600,
  tags: ['venture-statuses'],
});

// === Full admin-driven portfolio ledger ==================================
// The homepage "The portfolio" table is generated entirely from the admin
// ventures-page data — add/edit/reorder a venture there and the homepage
// follows. Each row resolves its logo file and its external member-count slug.
export type PortfolioRow = {
  name: string;        // short display name (admin `name`, else derived from title)
  tagline: string;     // "what it is" (admin `tagline`, else first sentence of description)
  dumbness: string | null; // Severe | Elevated | Moderate | null
  status: string;      // raw admin status (PRODUCTION / BETA / …)
  slug: string;        // detail-page slug (/ventures/<slug>)
  logo: string | null; // /ventures/<key>.png when a logo file exists
  letter: string;      // fallback tile letter
  extSlug: string | null; // external-users slug for the live member count
  hasDetail: boolean;  // has enough data for a detail page
};

// Logos extracted to /public/ventures, matched to a venture by token.
const LEDGER_LOGO_KEYS = ['argufight', 'basketball', 'govirall', 'jetdale', 'kamioi', 'julyu', 'buildwrk', 'opticrank', 'marble', 'cfbsocial'];
// Map a venture to its external-users member-count slug.
const EXT_SLUGS: [string, string][] = [
  ['argufight', 'argufight'], ['basketball', 'basketball'], ['opticrank', 'opticrank'],
  ['buildwrk', 'construction'], ['cfbsocial', 'cfbsocial'], ['julyu', 'julyu'],
  ['govirall', 'govirall'], ['topviso', 'topviso'], ['jetdale', 'jetdale'],
];

function slugifyTitleForLedger(title: string): string {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}
function shortNameFrom(title: string): string {
  const head = String(title).split(/\s[–—-]\s/)[0].trim();
  return head || String(title);
}
function firstSentence(text?: string): string {
  if (!text) return '';
  const m = String(text).match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : String(text)).trim();
}

async function fetchPortfolio(): Promise<PortfolioRow[]> {
  try {
    const row = await prisma.websiteContent.findFirst({ where: { section: 'ventures-page', published: true } });
    let content: any = row?.content;
    if (typeof content === 'string') content = JSON.parse(content);
    const ventures: any[] = content?.ventures || content?.sections || [];
    return ventures
      .filter((v) => v && v.title)
      .map((v) => {
        const hay = `${v.title ?? ''} ${v.websiteUrl ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const logoKey = LEDGER_LOGO_KEYS.find((k) => hay.includes(k)) || null;
        const ext = EXT_SLUGS.find(([tok]) => hay.includes(tok));
        const name = (v.name && String(v.name).trim()) || shortNameFrom(v.title);
        return {
          name,
          tagline: (v.tagline && String(v.tagline).trim()) || firstSentence(v.description),
          dumbness: v.dumbness ? String(v.dumbness) : null,
          status: String(v.status || '').toUpperCase().trim(),
          slug: slugifyTitleForLedger(v.title),
          logo: logoKey ? `/ventures/${logoKey}.png` : null,
          letter: name.charAt(0).toUpperCase(),
          extSlug: ext ? ext[1] : null,
          hasDetail: true,
        };
      });
  } catch (err) {
    console.error('[public-portfolio] portfolio unavailable', err);
    return [];
  }
}

export const getPortfolio = unstable_cache(fetchPortfolio, ['public-portfolio-v1'], {
  revalidate: 3600,
  tags: ['venture-statuses'],
});
