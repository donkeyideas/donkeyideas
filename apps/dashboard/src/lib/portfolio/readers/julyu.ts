// Julyu reader — PRE-LAUNCH grocery price-comparison app (Supabase + Stripe).
// Translated from the Julyu beacon (app/api/portfolio/stats/route.ts).
//
// Schema mapping per the beacon:
//   users(id, created_at, subscription_tier)
//   shopping_lists(user_id, updated_at)
//   comparisons(user_id, created_at)
//   user_subscriptions(status, subscription_plans(price, billing_interval))
//   subscription_plans(price, billing_interval)
//
// Pre-launch: scored only against other pre-launch products, so the archetype
// block carries waitlist-style signals — none exist in this schema yet (no
// waitlist table), hence all null.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : r1(((cur - prev) / prev) * 100);
const ratio = (a: number, b: number): number | null => (b === 0 ? null : r3(a / b));

// Union of distinct user_id across two timestamped tables in a window — the
// beacon's notion of an "active user" (created/updated a list OR ran a
// comparison). Reuses the helper's paginated distinctValues + set union.
async function activeUsers(
  db: SupabaseReader,
  since: string,
  before?: string
): Promise<number> {
  const range = (col: string) =>
    `${col}=gte.${since}${before ? `&${col}=lt.${before}` : ''}&user_id=not.is.null`;
  const [lists, comps] = await Promise.all([
    db.distinctValues('shopping_lists', 'user_id', range('updated_at')),
    db.distinctValues('comparisons', 'user_id', range('created_at')),
  ]);
  const merged = new Set<string>(lists);
  comps.forEach((id) => merged.add(id));
  return merged.size;
}

export const julyuReader: ProductReader = async (
  creds: ProductCredentials
): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1),
    d7 = isoDaysAgo(7),
    d28 = isoDaysAgo(28),
    d56 = isoDaysAgo(56);

  // --- acquisition: new user records (users.created_at) ---
  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('users', `created_at=gte.${d7}`),
      db.count('users', `created_at=gte.${d28}`),
      db.count('users', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7;
    u.signups28d = s28;
    u.signupsTrendPct = pct(s28, sPrev);
  } catch (e) {
    errors.push(`acquisition: ${msg(e)}`);
  }

  // --- engagement: DAU/WAU/MAU = distinct active users across lists+comparisons ---
  try {
    const [dau, wau, mau] = await Promise.all([
      activeUsers(db, d1),
      activeUsers(db, d7),
      activeUsers(db, d28),
    ]);
    u.dau = dau;
    u.wau = wau;
    u.mau = mau;
    u.stickiness = mau ? ratio(dau, mau) : null;
  } catch (e) {
    errors.push(`engagement: ${msg(e)}`);
  }

  // --- retention proxy: share of last-28d signups who took a core action in
  //     the last 7d ---
  try {
    const cohort = await db.distinctValues('users', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const [lists, comps] = await Promise.all([
        db.distinctValues('shopping_lists', 'user_id', `updated_at=gte.${d7}`),
        db.distinctValues('comparisons', 'user_id', `created_at=gte.${d7}`),
      ]);
      const returned = new Set<string>(lists);
      comps.forEach((id) => returned.add(id));
      let hit = 0;
      cohort.forEach((id) => {
        if (returned.has(id)) hit++;
      });
      u.retentionProxy = ratio(hit, cohort.size);
    } else {
      u.retentionProxy = null;
    }
  } catch (e) {
    errors.push(`retention: ${msg(e)}`);
  }

  // --- revenue: paying users = premium/enterprise tier ---
  try {
    u.payingUsers = await db.count(
      'users',
      `subscription_tier=in.(premium,enterprise)`
    );
  } catch (e) {
    errors.push(`payingUsers: ${msg(e)}`);
  }

  // --- MRR: sum subscription_plans.price over active/trialing subscriptions,
  //     annual plans /12. PostgREST embedded-resource select joins
  //     user_subscriptions → subscription_plans. ---
  try {
    u.mrr = await mrrFromSubscriptions(db, creds);
  } catch (e) {
    u.mrr = null;
    errors.push(`mrr: ${msg(e)}`);
  }

  // --- funnel: critical step signup → first_list. Of last-28d signups, share
  //     who created at least one shopping list. ---
  try {
    const cohort = await db.distinctValues('users', 'id', `created_at=gte.${d28}`);
    u.funnelSampleSize = cohort.size;
    if (cohort.size) {
      const withLists = await db.distinctValues('shopping_lists', 'user_id');
      let hit = 0;
      cohort.forEach((id) => {
        if (withLists.has(id)) hit++;
      });
      u.criticalStep = 'signup→first_list';
      u.criticalConversion = ratio(hit, cohort.size);
      a.signupToFirstListRate = u.criticalConversion;
    } else {
      u.criticalStep = 'signup→first_list';
      u.criticalConversion = null;
    }
  } catch (e) {
    errors.push(`funnel: ${msg(e)}`);
  }

  // Explicit universal nulls (no signal — never zero).
  u.installs28d = null;
  u.retentionD1 = null;
  u.retentionD7 = null;
  u.retentionD30 = null;
  u.revenue28d = null;
  u.revenueTrendPct = null;
  u.arpu = null;
  u.organicShare = null; // filled centrally from GA4
  u.paidShare = null;
  u.funnelErrorRate = null;

  // Pre-launch archetype signals — no waitlist/landing-analytics table yet.
  a.waitlistSize = null;
  a.waitlistGrowthPct7d = null;
  a.landingConversionRate = null;
  a.designPartnerConversations = null;
  a.targetLaunchDate = null;

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser:
        'Distinct user who created/updated a shopping list (shopping_lists.updated_at) or ran a price comparison (comparisons.created_at) in the window.',
      signup: 'Row in public.users by created_at.',
      retentionProxy:
        'Share of last-28d signups who took a core action (list or comparison) in the last 7d.',
      mrr:
        'Sum of subscription_plans.price over user_subscriptions with status active/trialing, annual plans /12. USD.',
      payingUsers: 'users with subscription_tier in (premium, enterprise).',
      criticalStep:
        'signup → first shopping list created. Conversion = share of last-28d signups with ≥1 shopping_lists row.',
      archetype:
        'Pre-launch waitlist signals are all null: no waitlist/landing-analytics table exists in this Supabase schema yet.',
    },
    status: errors.length >= 3 ? 'error' : 'pre-launch',
    errors,
  };
};

// MRR via a paginated PostgREST embedded-resource select. The shared
// SupabaseReader has no generic "select rows" method, so this fetches directly
// (same headers/pagination shape as distinctValues) to preserve the beacon's
// exact monthly-normalized sum rather than approximating from a fixed price.
async function mrrFromSubscriptions(
  db: SupabaseReader,
  creds: ProductCredentials
): Promise<number> {
  const ref = creds
    .url!.replace(/^https?:\/\//, '')
    .replace(/^db\./, '')
    .replace(/\/.*$/, '');
  const base = `https://${ref}/rest/v1`;
  const headers = { apikey: creds.key!, Authorization: `Bearer ${creds.key!}` };
  const select = 'status,subscription_plans(price,billing_interval)';
  const query = `status=in.(active,trialing)`;

  let sum = 0;
  const pageSize = 1000;
  const cap = 50000;
  for (let offset = 0; offset < cap; offset += pageSize) {
    const url = `${base}/user_subscriptions?select=${select}&${query}`;
    const res = await fetch(url, {
      headers: { ...headers, Range: `${offset}-${offset + pageSize - 1}` },
      cache: 'no-store',
    });
    if (!res.ok)
      throw new Error(`user_subscriptions: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    const rows = (await res.json()) as Array<{
      subscription_plans?:
        | { price?: number; billing_interval?: string }
        | Array<{ price?: number; billing_interval?: string }>
        | null;
    }>;
    for (const s of rows) {
      const plan = Array.isArray(s.subscription_plans)
        ? s.subscription_plans[0]
        : s.subscription_plans;
      const price = Number(plan?.price ?? 0);
      if (!price) continue;
      sum += plan?.billing_interval === 'year' ? price / 12 : price;
    }
    if (rows.length < pageSize) break;
  }
  return Math.round(sum * 100) / 100;
}
