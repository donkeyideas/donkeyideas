// go.viral reader — B2B SaaS (Supabase). Translated from the go.viral beacon
// (apps/web/app/api/portfolio/stats/route.ts). Schema per that beacon:
//   users(id, created_at, deleted_at)
//   posts(user_id, published_at)               — core action = published a post
//   subscriptions(user_id, amount_cents, interval, status, trial_end, canceled_at)
//   platform_accounts(user_id)                 — activation "aha"
//
// Windows are complete UTC days: [isoDaysAgo(n), isoDaysAgo(0)). Today (partial)
// is never counted. Each metric is isolated; partial failures land in errors[].
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (cur: number, prev: number): number | null =>
  prev === 0 ? null : r1(((cur - prev) / prev) * 100);
const ratio = (a: number, b: number): number | null => (b === 0 ? null : r3(a / b));

export const goviralReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);

  const d0 = isoDaysAgo(0); // midnight UTC today — exclusive upper bound (partial day)
  const d1 = isoDaysAgo(1);
  const d7 = isoDaysAgo(7);
  const d28 = isoDaysAgo(28);
  const d56 = isoDaysAgo(56);

  // --- acquisition: new users by created_at, excluding soft-deleted ---
  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('users', `created_at=gte.${d7}&created_at=lt.${d0}&deleted_at=is.null`),
      db.count('users', `created_at=gte.${d28}&created_at=lt.${d0}&deleted_at=is.null`),
      db.count('users', `created_at=gte.${d56}&created_at=lt.${d28}&deleted_at=is.null`),
    ]);
    u.signups7d = s7;
    u.signups28d = s28;
    u.signupsTrendPct = pct(s28, sPrev);
  } catch (e) {
    errors.push(`acquisition: ${msg(e)}`);
  }

  // --- engagement: core action = published a post (posts.published_at) ---
  try {
    const [dau, wau, mau] = await Promise.all([
      db.distinctCount('posts', 'user_id', `published_at=gte.${d1}&published_at=lt.${d0}`),
      db.distinctCount('posts', 'user_id', `published_at=gte.${d7}&published_at=lt.${d0}`),
      db.distinctCount('posts', 'user_id', `published_at=gte.${d28}&published_at=lt.${d0}`),
    ]);
    u.dau = dau;
    u.wau = wau;
    u.mau = mau;
    u.stickiness = mau ? ratio(dau, mau) : null;
  } catch (e) {
    errors.push(`engagement: ${msg(e)}`);
  }

  // --- retention proxy: of last-28d signups, share that published in last 7d ---
  try {
    const cohort = await db.distinctValues(
      'users',
      'id',
      `created_at=gte.${d28}&created_at=lt.${d0}&deleted_at=is.null`,
    );
    if (cohort.size) {
      const active = await db.distinctValues(
        'posts',
        'user_id',
        `published_at=gte.${d7}&published_at=lt.${d0}`,
      );
      let hit = 0;
      cohort.forEach((id) => {
        if (active.has(id)) hit++;
      });
      u.retentionProxy = ratio(hit, cohort.size);
    } else {
      u.retentionProxy = null;
    }
  } catch (e) {
    errors.push(`retention: ${msg(e)}`);
  }

  // --- revenue: MRR + paying users from subscriptions ---
  // MRR = sum(amount_cents) for status=active, yearly normalized to monthly (/12).
  // Done as two sums (monthly + yearly) since the helper can't branch per-row.
  // payingUsers = distinct user_id with status in (active, trialing).
  try {
    const [monthlyCents, yearlyCents, payers] = await Promise.all([
      db.sum('subscriptions', 'amount_cents', `status=eq.active&interval=neq.year`),
      db.sum('subscriptions', 'amount_cents', `status=eq.active&interval=eq.year`),
      db.distinctValues('subscriptions', 'user_id', `status=in.(active,trialing)`),
    ]);
    u.mrr = round2((monthlyCents + yearlyCents / 12) / 100);
    u.payingUsers = payers.size;
  } catch (e) {
    errors.push(`revenue: ${msg(e)}`);
  }

  // arpu = revenue28d / mau — revenue28d is null (no charge ledger), so arpu null.
  u.arpu = null;

  // --- funnel / activation: signup → connected first platform_account ---
  try {
    const cohort = await db.distinctValues(
      'users',
      'id',
      `created_at=gte.${d28}&created_at=lt.${d0}&deleted_at=is.null`,
    );
    u.funnelSampleSize = cohort.size;
    u.criticalStep = 'signup→connect_platform_account';
    if (cohort.size) {
      const connected = await db.distinctValues('platform_accounts', 'user_id');
      let hit = 0;
      cohort.forEach((id) => {
        if (connected.has(id)) hit++;
      });
      u.criticalConversion = ratio(hit, cohort.size);
      a.signupToActivationRate = u.criticalConversion; // same definition for this product
    } else {
      u.criticalConversion = null;
      a.signupToActivationRate = null;
    }
  } catch (e) {
    errors.push(`funnel: ${msg(e)}`);
  }

  // --- trial → paid: of subs that ever trialed (trial_end not null), share now active ---
  try {
    const trialed = await db.count('subscriptions', `trial_end=not.is.null`);
    if (trialed) {
      const converted = await db.count('subscriptions', `trial_end=not.is.null&status=eq.active`);
      a.trialToPaidRate = ratio(converted, trialed);
    } else {
      a.trialToPaidRate = null;
    }
  } catch (e) {
    errors.push(`trialToPaid: ${msg(e)}`);
  }

  // --- net churn: subs canceled in last 28d vs active-base at window start ---
  // logo churn proxy (no expansion-revenue tracking → net ≈ gross).
  try {
    const [canceled28d, activeNow] = await Promise.all([
      db.count(
        'subscriptions',
        `status=eq.canceled&canceled_at=gte.${d28}&canceled_at=lt.${d0}`,
      ),
      db.count('subscriptions', `status=eq.active`),
    ]);
    const base = activeNow + canceled28d;
    a.netChurnRate = base === 0 ? null : ratio(canceled28d, base);
  } catch (e) {
    errors.push(`churn: ${msg(e)}`);
  }

  // archetype fields with no DB source — filled centrally (GA4 / ASO).
  a.organicTraffic28d = null;
  a.avgKeywordRank = null;

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser:
        'Published a post (posts.published_at) in the window — the core creator action, not a mere app open.',
      signup: 'users row by created_at, excluding soft-deleted (deleted_at is null).',
      retentionProxy:
        'Share of last-28-complete-day signups who published a post in the last 7 complete days.',
      mrr:
        'Sum of subscriptions.amount_cents for status=active, yearly normalized to monthly (/12), in USD. Trialing subs contribute $0 until they convert.',
      payingUsers:
        'Distinct subscriptions.user_id with status in (active, trialing) — covers both Stripe and RevenueCat rows.',
      criticalStep:
        'signup → connected ≥1 platform_account (the go.viral activation "aha"; all scoring/analytics is gated on it).',
      signupToActivationRate:
        'Share of last-28d signups that connected ≥1 platform_account (same as criticalConversion for this product).',
      trialToPaidRate:
        'Of all subscriptions that ever had a trial (trial_end not null), share now status=active.',
      netChurnRate:
        'Logo churn proxy: subscriptions canceled in last 28d / (currently active + those canceled in window). No expansion-revenue tracking, so net ≈ gross.',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
