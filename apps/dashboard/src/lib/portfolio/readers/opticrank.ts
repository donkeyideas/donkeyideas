// OpticRank reader — B2B SaaS (Supabase). Schema per the beacon mapping:
// profiles(created_at), audit_log(user_id, created_at), organizations
// (subscription_status, plan), projects(organization_id).
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// list plan price (monthly USD) — from the beacon report
const PLAN_PRICE: Record<string, number> = { starter: 29, pro: 79, business: 199, enterprise: 0 };

export const opticrankReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('profiles', `created_at=gte.${d7}`),
      db.count('profiles', `created_at=gte.${d28}`),
      db.count('profiles', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7; u.signups28d = s28;
    u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
  } catch (e) { errors.push(`signups: ${msg(e)}`); }

  try {
    const [dau, wau, mau] = await Promise.all([
      db.distinctCount('audit_log', 'user_id', `created_at=gte.${d1}`),
      db.distinctCount('audit_log', 'user_id', `created_at=gte.${d7}`),
      db.distinctCount('audit_log', 'user_id', `created_at=gte.${d28}`),
    ]);
    u.dau = dau; u.wau = wau; u.mau = mau;
    u.stickiness = mau ? r3(dau / mau) : null;
  } catch (e) { errors.push(`active: ${msg(e)}`); }

  try {
    const [starter, pro, business, paying] = await Promise.all([
      db.count('organizations', `subscription_status=eq.active&plan=eq.starter`),
      db.count('organizations', `subscription_status=eq.active&plan=eq.pro`),
      db.count('organizations', `subscription_status=eq.active&plan=eq.business`),
      db.count('organizations', `subscription_status=eq.active&plan=neq.free`),
    ]);
    u.mrr = starter * PLAN_PRICE.starter + pro * PLAN_PRICE.pro + business * PLAN_PRICE.business;
    u.payingUsers = paying;
    u.arpu = u.mau ? r3((u.mrr || 0) / u.mau) : null;
  } catch (e) { errors.push(`revenue: ${msg(e)}`); }

  try {
    const cohort = await db.distinctValues('organizations', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const activated = await db.distinctValues('projects', 'organization_id');
      let hit = 0;
      cohort.forEach((id) => { if (activated.has(id)) hit++; });
      u.criticalStep = 'signup→first_project';
      u.criticalConversion = r3(hit / cohort.size);
      u.funnelSampleSize = cohort.size;
      a.signupToActivationRate = u.criticalConversion;
    }
  } catch (e) { errors.push(`activation: ${msg(e)}`); }

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser: 'Distinct audit_log.user_id with an action in the window.',
      signup: 'profiles row by created_at.',
      mrr: 'Active non-free organizations × list plan price (starter 29 / pro 79 / business 199).',
      criticalStep: 'org signup (last 28d) that has ≥1 projects row.',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
