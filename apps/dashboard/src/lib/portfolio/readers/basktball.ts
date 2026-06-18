// Basktball reader — consumer-viral (Supabase, Prisma schema = PascalCase tables,
// camelCase columns). Real $0 revenue (no payment system; AdCampaign is house ads).
// Active users via User.lastActiveAt; bots excluded via isBot.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const NOTBOT = 'isBot=eq.false';

export const basktballReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  try {
    const [s7, s28, sPrev] = await Promise.all([
      db.count('User', `createdAt=gte.${d7}&${NOTBOT}`),
      db.count('User', `createdAt=gte.${d28}&${NOTBOT}`),
      db.count('User', `createdAt=gte.${d56}&createdAt=lt.${d28}&${NOTBOT}`),
    ]);
    u.signups7d = s7; u.signups28d = s28;
    u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
    u.funnelSampleSize = s28;
  } catch (e) { errors.push(`signups: ${msg(e)}`); }

  try {
    const [dau, wau, mau] = await Promise.all([
      db.count('User', `lastActiveAt=gte.${d1}&${NOTBOT}`),
      db.count('User', `lastActiveAt=gte.${d7}&${NOTBOT}`),
      db.count('User', `lastActiveAt=gte.${d28}&${NOTBOT}`),
    ]);
    u.dau = dau; u.wau = wau; u.mau = mau;
    u.stickiness = mau ? r3(dau / mau) : null;
  } catch (e) { errors.push(`active: ${msg(e)}`); }

  try {
    // retention proxy: of last-28d signups, share active (lastActiveAt) in last 7d
    if (u.signups28d) {
      const returned = await db.count('User', `createdAt=gte.${d28}&lastActiveAt=gte.${d7}&${NOTBOT}`);
      u.retentionProxy = r3(returned / u.signups28d);
    }
  } catch (e) { errors.push(`retention: ${msg(e)}`); }

  // No monetization — measured zeros (a real signal, not missing data)
  u.mrr = 0; u.revenue28d = 0; u.payingUsers = 0;

  try {
    // critical: signup → first prediction within the 28d cohort
    const cohort = await db.distinctValues('User', 'id', `createdAt=gte.${d28}&${NOTBOT}`);
    if (cohort.size) {
      const predicted = await db.distinctValues('Prediction', 'userId');
      let hit = 0;
      cohort.forEach((id) => { if (predicted.has(id)) hit++; });
      u.criticalStep = 'signup→first_prediction';
      u.criticalConversion = r3(hit / cohort.size);
    }
  } catch (e) { errors.push(`funnel: ${msg(e)}`); }

  a.sessionsPerUser = null; // Session has no created_at timestamp
  a.inviteRate = null;
  a.appStoreRating = null;
  a.ratingTrend = null;
  a.seasonalPeak = null;

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser: 'User.lastActiveAt within the window (excludes isBot=true).',
      signup: 'User row by createdAt, isBot=false.',
      revenue: 'Measured $0 — no payment/subscription system exists.',
      criticalStep: 'signup (last 28d) → has ≥1 Prediction.',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
