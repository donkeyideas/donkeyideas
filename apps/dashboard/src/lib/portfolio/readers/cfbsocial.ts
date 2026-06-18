// CFB Social reader — consumer-viral, seasonal (Supabase). Translated from the
// product's portfolio beacon (apps/web/app/api/portfolio/stats/route.ts).
//
// Data notes (why these sources):
//  - analytics_events / daily_stats exist but are NOT populated. The web app
//    writes core activity to posts / reactions; the admin dashboard defines an
//    "active user" as having posted or reacted, so we mirror that here:
//    active = distinct (posts.author_id) UNION (reactions.user_id) in window.
//  - There is NO payment system (no stripe/subscription/invoice tables), so
//    mrr / revenue28d / payingUsers are MEASURED zeros, not nulls.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Active users = distinct (posts.author_id) UNION (reactions.user_id) since `since`.
async function activeUserIds(db: SupabaseReader, since: string): Promise<Set<string>> {
  const [posters, reactors] = await Promise.all([
    db.distinctValues('posts', 'author_id', `created_at=gte.${since}`),
    db.distinctValues('reactions', 'user_id', `created_at=gte.${since}`),
  ]);
  const ids = new Set<string>(posters);
  reactors.forEach((id) => ids.add(id));
  return ids;
}

export const cfbsocialReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  // --- acquisition: new profiles by created_at ---
  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('profiles', `created_at=gte.${d7}`),
      db.count('profiles', `created_at=gte.${d28}`),
      db.count('profiles', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7;
    u.signups28d = s28;
    u.funnelSampleSize = s28;
    u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
  } catch (e) { errors.push(`acquisition: ${msg(e)}`); }

  // --- engagement: active = posted or reacted in the window ---
  let mauIds: Set<string> | null = null;
  try {
    const [dauIds, wauIds, _mauIds] = await Promise.all([
      activeUserIds(db, d1),
      activeUserIds(db, d7),
      activeUserIds(db, d28),
    ]);
    mauIds = _mauIds;
    u.dau = dauIds.size;
    u.wau = wauIds.size;
    u.mau = _mauIds.size;
    u.stickiness = u.mau ? r3(u.dau / u.mau) : null;
  } catch (e) { errors.push(`engagement: ${msg(e)}`); }

  // --- sessions per active user (7d): distinct user_events.session_id / WAU ---
  try {
    const sessions = await db.distinctCount('user_events', 'session_id', `created_at=gte.${d7}&session_id=not.is.null`);
    a.sessionsPerUser = u.wau ? r1(sessions / u.wau) : null;
  } catch (e) { errors.push(`sessions: ${msg(e)}`); }

  // --- retention proxy: share of last-28d signups active (post/react) in 7d ---
  try {
    const cohort = await db.distinctValues('profiles', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const active7d = await activeUserIds(db, d7);
      let returned = 0;
      cohort.forEach((id) => { if (active7d.has(id)) returned++; });
      u.retentionProxy = r3(returned / cohort.size);
    }
  } catch (e) { errors.push(`retention: ${msg(e)}`); }

  // --- funnel: signup -> first_post within the 28d signup cohort ---
  try {
    const cohort = await db.distinctValues('profiles', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const posters = await db.distinctValues('posts', 'author_id', `created_at=gte.${d28}`);
      let activated = 0;
      cohort.forEach((id) => { if (posters.has(id)) activated++; });
      u.criticalStep = 'signup→first_post';
      u.criticalConversion = r3(activated / cohort.size);
    }
  } catch (e) { errors.push(`funnel: ${msg(e)}`); }

  // --- inviteRate: share of 28d active users who created a follow (or referral) ---
  try {
    if (mauIds && mauIds.size) {
      const inviters = await db.distinctValues('follows', 'follower_id', `created_at=gte.${d28}`);
      // referrals table may not exist on every deploy — best-effort union.
      try {
        const refs = await db.distinctValues('referrals', 'referrer_id', `created_at=gte.${d28}`);
        refs.forEach((id) => inviters.add(id));
      } catch { /* no referrals table — ignore */ }
      let invitedActive = 0;
      mauIds.forEach((id) => { if (inviters.has(id)) invitedActive++; });
      a.inviteRate = r3(invitedActive / mauIds.size);
    }
  } catch (e) { errors.push(`inviteRate: ${msg(e)}`); }

  // --- universal fields not measured here / not applicable ---
  u.installs28d = null;
  u.retentionD1 = null;
  u.retentionD7 = null;
  u.retentionD30 = null;
  u.mrr = 0;            // measured 0 — no payment system exists
  u.revenue28d = 0;     // measured 0 — no payment system exists
  u.revenueTrendPct = null;
  u.payingUsers = 0;    // measured 0 — no payment system exists
  u.arpu = null;
  u.organicShare = null; // filled centrally from GA4
  u.paidShare = null;
  u.funnelErrorRate = null;

  // --- archetype (consumer-viral) defaults ---
  if (!('sessionsPerUser' in a)) a.sessionsPerUser = null;
  if (!('inviteRate' in a)) a.inviteRate = null;
  a.appStoreRating = null;
  a.ratingTrend = null;
  a.seasonalPeak = '2026-08';

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser:
        'Posted or reacted in the window — a core action, not a passive view. Distinct (posts.author_id) UNION (reactions.user_id). analytics_events/daily_stats are unpopulated, so they are not used.',
      signup: 'profiles row by created_at (one per auth.users via on-signup trigger).',
      retentionProxy:
        'Share of last-28d signups who posted or reacted in the last 7 complete days.',
      criticalStep:
        'signup → first post: share of the last-28d signup cohort with >=1 post in that window.',
      sessionsPerUser:
        'Distinct user_events.session_id over the last 7d, divided by WAU.',
      inviteRate:
        'Share of 28d active users who created >=1 follow (or sent >=1 referral) in the last 28d.',
      mrr: 'Measured 0: no subscription system.',
      revenue28d: 'Measured 0: CFB Social has no payment system.',
      payingUsers: 'Measured 0: no payment system.',
      seasonalPeak: 'Structural peak heading into the college-football season (~August).',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
