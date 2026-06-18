// Top Viso reader — B2B SaaS / ASO (Supabase). Schema per the beacon mapping:
// profiles(created_at), apps(organization_id, created_at), keywords(organization_id,
// created_at), organizations(id, created_at, plan_tier, stripe_subscription_id).
// ASO has no session/event table, so "active" = an org that created an app OR a
// keyword in the window (the core product action). Mirrors the Top Viso beacon.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Paid tiers and their monthly list price (USD). 'solo' is the free tier.
// Mirrors PLANS in the Top Viso app (solo=0, team=49, enterprise=199).
const TIER_PRICE: Record<string, number> = { solo: 0, team: 49, enterprise: 199 };

export const topvisoReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  // Distinct organizations that created an app OR a keyword in [since, now).
  const activeOrgsSince = async (since: string): Promise<Set<string>> => {
    const [apps, keywords] = await Promise.all([
      db.distinctValues('apps', 'organization_id', `created_at=gte.${since}`),
      db.distinctValues('keywords', 'organization_id', `created_at=gte.${since}`),
    ]);
    const set = new Set<string>(apps);
    keywords.forEach((id) => set.add(id));
    return set;
  };

  // --- acquisition: new users = profiles.created_at ---
  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('profiles', `created_at=gte.${d7}`),
      db.count('profiles', `created_at=gte.${d28}`),
      db.count('profiles', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7; u.signups28d = s28;
    u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
  } catch (e) { errors.push(`acquisition: ${msg(e)}`); }

  // --- engagement: active org = created an app OR keyword in the window ---
  try {
    const [a1, a7, a28] = await Promise.all([
      activeOrgsSince(d1),
      activeOrgsSince(d7),
      activeOrgsSince(d28),
    ]);
    u.dau = a1.size; u.wau = a7.size; u.mau = a28.size;
    u.stickiness = u.mau ? r3(u.dau / u.mau) : null;
  } catch (e) { errors.push(`engagement: ${msg(e)}`); }

  // --- retention proxy: last-28d-signup orgs active (app/keyword) in last 7d ---
  try {
    const cohort = await db.distinctValues('organizations', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const active = await activeOrgsSince(d7);
      let returned = 0;
      cohort.forEach((id) => { if (active.has(id)) returned++; });
      u.retentionProxy = r3(returned / cohort.size);
    } else {
      u.retentionProxy = null;
    }
  } catch (e) { errors.push(`retention: ${msg(e)}`); }

  // --- revenue: paying orgs = plan_tier != 'solo' with a live stripe subscription ---
  // MRR = sum of list prices over those orgs (team=$49, enterprise=$199).
  try {
    const [paying, team, enterprise] = await Promise.all([
      db.count('organizations', `plan_tier=neq.solo&stripe_subscription_id=not.is.null`),
      db.count('organizations', `plan_tier=eq.team&stripe_subscription_id=not.is.null`),
      db.count('organizations', `plan_tier=eq.enterprise&stripe_subscription_id=not.is.null`),
    ]);
    u.payingUsers = paying;
    u.mrr = team * TIER_PRICE.team + enterprise * TIER_PRICE.enterprise;
    // Recurring-only product: recognized 28d revenue ≈ current MRR (one full cycle).
    u.revenue28d = u.mrr;
    u.arpu = u.mau ? r2(u.revenue28d / u.mau) : null;
  } catch (e) { errors.push(`revenue: ${msg(e)}`); }

  // --- funnel / activation: last-28d-signup orgs that tracked ≥1 keyword ---
  try {
    const cohort = await db.distinctValues('organizations', 'id', `created_at=gte.${d28}`);
    u.funnelSampleSize = cohort.size;
    if (cohort.size) {
      const activated = await db.distinctValues('keywords', 'organization_id');
      let hit = 0;
      cohort.forEach((id) => { if (activated.has(id)) hit++; });
      u.criticalStep = 'signup→first_keyword_tracked';
      u.criticalConversion = r3(hit / cohort.size);
      a.signupToActivationRate = u.criticalConversion;
    }
  } catch (e) { errors.push(`funnel: ${msg(e)}`); }

  // --- universal nulls (not computable from this DB via the REST reader) ---
  u.installs28d = null;
  u.retentionD1 = null;
  u.retentionD7 = null;
  u.retentionD30 = null;
  u.revenueTrendPct = null;
  u.organicShare = null;
  u.paidShare = null;
  u.funnelErrorRate = null;
  if (u.criticalStep === undefined) u.criticalStep = 'signup→first_keyword_tracked';
  if (u.criticalConversion === undefined) u.criticalConversion = null;

  // --- archetype (b2b-saas) ---
  if (a.signupToActivationRate === undefined) a.signupToActivationRate = null;
  a.trialToPaidRate = null;      // no trial/subscription-status timeline stored here
  a.netChurnRate = null;         // needs ordered multi-column daily_mrr_snapshot rows — not via REST reader
  a.organicTraffic28d = null;    // marketing-site sessions live in the central GA4 layer
  a.avgKeywordRank = null;       // needs latest-rank aggregation from keyword_ranks_daily — not via REST reader

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser:
        'An organization that created an app or a keyword (apps/keywords.created_at) in the window — ASO has no session/event table, so creating tracked work is the core action.',
      signup: 'A profiles row by created_at (one per auth.users signup).',
      retentionProxy:
        'Share of organizations created in the last 28d that created an app or keyword in the last 7d.',
      mrr: 'Sum of list prices (team=$49, enterprise=$199) over organizations with plan_tier != solo and a non-null stripe_subscription_id.',
      revenue28d: 'Equal to current MRR — recurring-only product, no per-charge revenue table stored here.',
      payingUsers:
        'Organizations (the billable B2B unit) with plan_tier in {team,enterprise} and a live Stripe subscription.',
      criticalStep:
        'signup → first keyword tracked: % of last-28d-signup organizations that have ≥1 keyword.',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
