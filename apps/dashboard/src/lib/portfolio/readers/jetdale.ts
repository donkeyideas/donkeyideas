// Jetdale reader — pre-launch B2C/SaaS (Supabase). Schema per the beacon mapping:
// profiles(id, created_at), product_events(user_id, created_at),
// ai_events(user_id, created_at), subscriptions(user_id, amount_cents, interval,
// plan_tier, status), projects(user_id).
//
// Translated 1:1 from the Jetdale beacon
// (apps/admin/src/app/api/portfolio/stats/route.ts). Active = distinct user_id
// across product_events UNION ai_events in the window. MRR = active/trialing paid
// subscriptions, each amount normalized to monthly via interval. criticalStep =
// signup→first_project. Pre-launch archetype fields are null (no waitlist table).
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const jetdaleReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  // --- acquisition: new accounts = profiles.created_at ---
  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('profiles', `created_at=gte.${d7}`),
      db.count('profiles', `created_at=gte.${d28}`),
      db.count('profiles', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7; u.signups28d = s28;
    u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
  } catch (e) { errors.push(`acquisition: ${msg(e)}`); }

  // --- engagement: active = distinct user_id in product_events UNION ai_events ---
  try {
    const activeSince = async (since: string): Promise<number> => {
      const [pe, ae] = await Promise.all([
        db.distinctValues('product_events', 'user_id', `created_at=gte.${since}&user_id=not.is.null`),
        db.distinctValues('ai_events', 'user_id', `created_at=gte.${since}&user_id=not.is.null`),
      ]);
      const set = new Set<string>(pe);
      ae.forEach((id) => set.add(id));
      return set.size;
    };
    const [dau, wau, mau] = await Promise.all([
      activeSince(d1),
      activeSince(d7),
      activeSince(d28),
    ]);
    u.dau = dau; u.wau = wau; u.mau = mau;
    u.stickiness = mau ? r3(dau / mau) : null;
  } catch (e) { errors.push(`engagement: ${msg(e)}`); }

  // --- retention proxy: of last-28d signups, share active (event/ai) in last 7d ---
  try {
    const newUsers = await db.distinctValues('profiles', 'id', `created_at=gte.${d28}`);
    if (newUsers.size) {
      const [pe, ae] = await Promise.all([
        db.distinctValues('product_events', 'user_id', `created_at=gte.${d7}&user_id=not.is.null`),
        db.distinctValues('ai_events', 'user_id', `created_at=gte.${d7}&user_id=not.is.null`),
      ]);
      const returned = new Set<string>();
      pe.forEach((id) => { if (newUsers.has(id)) returned.add(id); });
      ae.forEach((id) => { if (newUsers.has(id)) returned.add(id); });
      u.retentionProxy = r3(returned.size / newUsers.size);
    }
  } catch (e) { errors.push(`retention: ${msg(e)}`); }

  // --- revenue: active/trialing paid subscriptions; MRR from amount_cents ---
  // Normalize each subscription's amount to a monthly figure via its interval.
  try {
    const base = `plan_tier=neq.free&status=in.(active,trialing)`;
    const paying = await db.distinctValues('subscriptions', 'user_id', base);
    u.payingUsers = paying.size;

    // Sum amount_cents per interval bucket, then normalize to monthly.
    const [monthCents, yearCents, weekCents] = await Promise.all([
      // monthly is the default bucket: interval = month OR null/empty/anything not year|annual|week
      db.sum('subscriptions', 'amount_cents',
        `${base}&or=(interval.ilike.month*,interval.is.null,and(interval.not.ilike.year*,interval.not.ilike.annual,interval.not.ilike.week*))`),
      db.sum('subscriptions', 'amount_cents',
        `${base}&or=(interval.ilike.year*,interval.eq.annual)`),
      db.sum('subscriptions', 'amount_cents', `${base}&interval=ilike.week*`),
    ]);
    const mrrCents = monthCents + yearCents / 12 + (weekCents * 52) / 12;
    u.mrr = Math.round(mrrCents) / 100;
  } catch (e) { errors.push(`revenue: ${msg(e)}`); }

  // --- funnel: signup → first project. Of last-28d signups, share with a project. ---
  try {
    const cohort = await db.distinctValues('profiles', 'id', `created_at=gte.${d28}`);
    u.funnelSampleSize = cohort.size;
    if (cohort.size) {
      const activated = await db.distinctValues('projects', 'user_id');
      let hit = 0;
      cohort.forEach((id) => { if (activated.has(id)) hit++; });
      u.criticalStep = 'signup→first_project';
      u.criticalConversion = r3(hit / cohort.size);
    }
  } catch (e) { errors.push(`funnel: ${msg(e)}`); }

  // --- pre-launch archetype: all null — Jetdale has no waitlist/landing/CRM tables ---
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
        'Distinct user with a row in product_events OR ai_events in the window (clickstream event or AI call) — not merely an app open.',
      signup: 'profiles row by created_at (one per auth.users via signup trigger).',
      retentionProxy:
        'Share of last-28d new profiles with a product_events/ai_events row in the last 7d.',
      mrr: 'Sum of subscriptions.amount_cents (plan_tier != free, status active/trialing), each normalized to a monthly amount via interval.',
      payingUsers:
        'Distinct user_id in subscriptions with plan_tier != free and status active/trialing.',
      criticalStep:
        'signup → first project: share of last-28d signups with ≥1 row in projects.',
      waitlistSize: 'null — Jetdale has no waitlist table in its schema yet.',
      landingConversionRate: 'null — no landing-page traffic table to derive visitor→signup.',
      designPartnerConversations: 'null — no CRM/partner-conversation table.',
    },
    status: errors.length >= 3 ? 'error' : 'pre-launch',
    errors,
  };
};
