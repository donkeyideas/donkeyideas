// Kamioi reader — regulated-trust fintech (Supabase Postgres). Subscriptions are
// tracked on the users table (user_subscriptions is empty). Core action = a
// transaction (round-up / investment). Demos = demo_access_log.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { pgRead, isoDaysAgo } from './postgresClient';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const kamioiReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  try {
    await pgRead(creds.connectionString!, async (q) => {
      const one = async (sql: string, params: unknown[] = []) => num((await q(sql, params))[0]?.n);

      // signups (new accounts)
      const s7 = await one(`SELECT count(*) n FROM "users" WHERE "created_at">=$1`, [d7]);
      const s28 = await one(`SELECT count(*) n FROM "users" WHERE "created_at">=$1`, [d28]);
      const sPrev = await one(`SELECT count(*) n FROM "users" WHERE "created_at">=$1 AND "created_at"<$2`, [d56, d28]);
      u.signups7d = s7; u.signups28d = s28;
      u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
      u.funnelSampleSize = s28;

      // active = distinct users with a transaction in window (core action)
      const dau = await one(`SELECT count(DISTINCT "user_id") n FROM "transactions" WHERE "created_at">=$1`, [d1]);
      const wau = await one(`SELECT count(DISTINCT "user_id") n FROM "transactions" WHERE "created_at">=$1`, [d7]);
      const mau = await one(`SELECT count(DISTINCT "user_id") n FROM "transactions" WHERE "created_at">=$1`, [d28]);
      u.dau = dau; u.wau = wau; u.mau = mau;
      u.stickiness = mau ? r3(dau / mau) : null;

      // retention proxy: last-28d signups who transacted in last 7d
      if (s28) {
        const ret = await one(
          `SELECT count(DISTINCT u.id) n FROM "users" u JOIN "transactions" t ON t."user_id"=u.id
           WHERE u."created_at">=$1 AND t."created_at">=$2`,
          [d28, d7],
        );
        u.retentionProxy = r3(ret / s28);
      }

      // paying = users with an active subscription status (subs live on users table)
      u.payingUsers = await one(`SELECT count(*) n FROM "users" WHERE lower(subscription_status)='active'`).catch(() => 0);
      u.mrr = null;

      // funnel: signup → funded account (first transaction)
      if (s28) {
        const funded = await one(
          `SELECT count(DISTINCT u.id) n FROM "users" u
           WHERE u."created_at">=$1 AND EXISTS (SELECT 1 FROM "transactions" t WHERE t."user_id"=u.id)`,
          [d28],
        );
        u.criticalStep = 'signup→funded_account';
        u.criticalConversion = r3(funded / s28);
      }

      // regulated-trust archetype
      a.demosBooked28d = await one(`SELECT count(*) n FROM "demo_access_log" WHERE "created_at">=$1`, [d28]).catch(() => null);
      a.applicationsBooked28d = s28; // new accounts opened
      a.activationEvent = 'first transaction (funded account)';
      // accounts whose FIRST transaction landed in the last 28 days
      a.activations28d = await one(
        `SELECT count(*) n FROM (
           SELECT "user_id", min("created_at") first FROM "transactions" GROUP BY "user_id"
         ) t WHERE t.first>=$1`,
        [d28],
      ).catch(() => null);
      a.salesCycleDays = null;
      a.avgDealValue = null;
      a.pipelineValue = null;
    });
  } catch (e) {
    errors.push(`kamioi: ${msg(e)}`);
  }

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser: 'Distinct user_id with a transaction in the window.',
      signup: 'users row by created_at (new account).',
      payingUsers: 'users with subscription_status=active.',
      criticalStep: 'signup (last 28d) → funded (has ≥1 transaction).',
      demosBooked28d: 'demo_access_log rows in last 28d.',
    },
    status: errors.length ? 'error' : 'live',
    errors,
  };
};
