// Havana Cleaning reader — marketplace (Supabase Postgres, Prisma schema =
// PascalCase tables). Connects via the connection string (no Supabase API key
// available locally). Core action = a confirmed/active booking.
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { pgRead, isoDaysAgo } from './postgresClient';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const num = (v: unknown) => (v == null ? 0 : Number(v));
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// "real" bookings = a customer actually committed (not pending/cancelled)
const REAL = `('CONFIRMED','IN_PROGRESS','COMPLETED')`;

export const havanaReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);

  try {
    await pgRead(creds.connectionString!, async (q) => {
      const one = async (sql: string, params: unknown[] = []) => num((await q(sql, params))[0]?.n);

      // NOTE: one pg connection can't run concurrent queries — keep these sequential.
      // signups (customers)
      const s7 = await one(`SELECT count(*) n FROM "User" WHERE role='CUSTOMER' AND "createdAt">=$1`, [d7]);
      const s28 = await one(`SELECT count(*) n FROM "User" WHERE role='CUSTOMER' AND "createdAt">=$1`, [d28]);
      const sPrev = await one(`SELECT count(*) n FROM "User" WHERE role='CUSTOMER' AND "createdAt">=$1 AND "createdAt"<$2`, [d56, d28]);
      u.signups7d = s7; u.signups28d = s28;
      u.signupsTrendPct = sPrev ? r1(((s28 - sPrev) / sPrev) * 100) : null;
      u.funnelSampleSize = s28;

      // active = distinct customers with a real booking in window
      const dau = await one(`SELECT count(DISTINCT "customerId") n FROM "Booking" WHERE status IN ${REAL} AND "createdAt">=$1`, [d1]);
      const wau = await one(`SELECT count(DISTINCT "customerId") n FROM "Booking" WHERE status IN ${REAL} AND "createdAt">=$1`, [d7]);
      const mau = await one(`SELECT count(DISTINCT "customerId") n FROM "Booking" WHERE status IN ${REAL} AND "createdAt">=$1`, [d28]);
      u.dau = dau; u.wau = wau; u.mau = mau;
      u.stickiness = mau ? r3(dau / mau) : null;

      // revenue (succeeded payments)
      const rev28 = await one(`SELECT coalesce(sum(amount),0) n FROM "Payment" WHERE status='SUCCEEDED' AND "createdAt">=$1`, [d28]);
      const revPrev = await one(`SELECT coalesce(sum(amount),0) n FROM "Payment" WHERE status='SUCCEEDED' AND "createdAt">=$1 AND "createdAt"<$2`, [d56, d28]);
      u.revenue28d = r2(rev28);
      u.revenueTrendPct = revPrev ? r1(((rev28 - revPrev) / revPrev) * 100) : null;
      u.payingUsers = await one(`SELECT count(DISTINCT "customerId") n FROM "Payment" WHERE status='SUCCEEDED' AND "createdAt">=$1`, [d28]);
      u.arpu = u.mau ? r2(rev28 / u.mau) : null;
      u.mrr = null; // not subscription-based

      // retention proxy: last-28d signups with a real booking in last 7d
      if (s28) {
        const ret = await one(
          `SELECT count(DISTINCT u.id) n FROM "User" u JOIN "Booking" b ON b."customerId"=u.id
           WHERE u.role='CUSTOMER' AND u."createdAt">=$1 AND b.status IN ${REAL} AND b."createdAt">=$2`,
          [d28, d7],
        );
        u.retentionProxy = r3(ret / s28);
      }

      // funnel: signup → first booking (within 28d cohort)
      if (s28) {
        const booked = await one(
          `SELECT count(DISTINCT u.id) n FROM "User" u
           WHERE u.role='CUSTOMER' AND u."createdAt">=$1 AND EXISTS
             (SELECT 1 FROM "Booking" b WHERE b."customerId"=u.id AND b.status IN ${REAL})`,
          [d28],
        );
        u.criticalStep = 'signup→first_booking';
        u.criticalConversion = r3(booked / s28);
      }

      // marketplace archetype
      const bk = (await q(
        `SELECT count(*) n, coalesce(avg(total),0) avg FROM "Booking" WHERE status IN ${REAL} AND "createdAt">=$1`,
        [d28],
      ))[0];
      a.bookings28d = num(bk?.n);
      a.avgBookingValue = r2(num(bk?.avg));
      const rep = await one(
        `SELECT count(*) n FROM (
           SELECT "customerId" FROM "Booking" WHERE status IN ${REAL} AND "createdAt">=$1
           GROUP BY "customerId" HAVING count(*)>1) t`,
        [d28],
      );
      a.repeatBookingRate = mau ? r3(rep / mau) : null;
    });
  } catch (e) {
    errors.push(`havana: ${msg(e)}`);
  }

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser: 'Distinct customer with a CONFIRMED/IN_PROGRESS/COMPLETED Booking in window.',
      signup: 'User with role=CUSTOMER by createdAt.',
      revenue28d: 'Sum of SUCCEEDED Payment.amount in last 28d.',
      criticalStep: 'signup (last 28d) → has ≥1 real Booking.',
    },
    status: errors.length ? 'error' : 'live',
    errors,
  };
};
