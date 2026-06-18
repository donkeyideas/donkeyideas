// ArguFight reader — consumer-viral (Supabase Postgres, snake_case schema).
// Connects via connection string. Active = users with a recent last_login_date;
// AI/bot users excluded via is_ai. Activation = created a debate.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { pgRead, isoDaysAgo } from './postgresClient';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const NOTAI = `(is_ai IS NOT TRUE)`;

export const argufightReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  try {
    await pgRead(creds.connectionString!, async (q) => {
      const one = async (sql: string, params: unknown[] = []) => num((await q(sql, params))[0]?.n);

      // signups (exclude AI users)
      const s7 = await one(`SELECT count(*) n FROM "users" WHERE ${NOTAI} AND "created_at">=$1`, [d7]);
      const s28 = await one(`SELECT count(*) n FROM "users" WHERE ${NOTAI} AND "created_at">=$1`, [d28]);
      const sPrev = await one(`SELECT count(*) n FROM "users" WHERE ${NOTAI} AND "created_at">=$1 AND "created_at"<$2`, [d56, d28]);
      u.signups7d = s7; u.signups28d = s28;
      u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
      u.funnelSampleSize = s28;

      // active = distinct users with a login session in window (last_login_date is unused)
      const dau = await one(`SELECT count(DISTINCT "user_id") n FROM "sessions" WHERE "created_at">=$1`, [d1]);
      const wau = await one(`SELECT count(DISTINCT "user_id") n FROM "sessions" WHERE "created_at">=$1`, [d7]);
      const mau = await one(`SELECT count(DISTINCT "user_id") n FROM "sessions" WHERE "created_at">=$1`, [d28]);
      u.dau = dau; u.wau = wau; u.mau = mau;
      u.stickiness = mau ? r3(dau / mau) : null;

      // retention proxy: last-28d signups who have a session in last 7d
      if (s28) {
        const ret = await one(
          `SELECT count(DISTINCT u.id) n FROM "users" u JOIN "sessions" s ON s."user_id"=u.id
           WHERE ${NOTAI} AND u."created_at">=$1 AND s."created_at">=$2`,
          [d28, d7],
        );
        u.retentionProxy = r3(ret / s28);
      }

      // paying = ACTIVE subscriptions on a non-free tier (most "ACTIVE" rows are FREE)
      u.payingUsers = await one(`SELECT count(DISTINCT "user_id") n FROM "user_subscriptions" WHERE status='ACTIVE' AND upper(tier)<>'FREE'`);
      u.mrr = null; // tier→price map not available

      // funnel: signup → created a debate within 28d cohort
      if (s28) {
        const activated = await one(
          `SELECT count(DISTINCT u.id) n FROM "users" u
           WHERE ${NOTAI} AND u."created_at">=$1
             AND EXISTS (SELECT 1 FROM "debates" d WHERE d."challenger_id"=u.id)`,
          [d28],
        );
        u.criticalStep = 'signup→first_debate';
        u.criticalConversion = r3(activated / s28);
      }

      // viral signal: users referred in last 28d
      const referred = await one(`SELECT count(*) n FROM "users" WHERE "referred_at">=$1`, [d28]).catch(() => 0);
      a.referrals28d = referred;
      a.inviteRate = s28 ? r3(referred / s28) : null;
      a.appStoreRating = null;
      a.ratingTrend = null;
      a.seasonalPeak = null;

      // sessions per active user (7d)
      const sess7 = await one(`SELECT count(*) n FROM "sessions" WHERE "created_at">=$1`, [d7]).catch(() => 0);
      a.sessionsPerUser = wau ? r1(sess7 / wau) : null;
    });
  } catch (e) {
    errors.push(`argufight: ${msg(e)}`);
  }

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser: 'users.last_login_date within window (is_ai excluded).',
      signup: 'users row by created_at, is_ai not true.',
      payingUsers: 'user_subscriptions with status=ACTIVE.',
      criticalStep: 'signup (last 28d) → created ≥1 debate as challenger.',
    },
    status: errors.length ? 'error' : 'live',
    errors,
  };
};
