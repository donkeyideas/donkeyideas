// Buildwrk reader — construction ERP SaaS (Supabase), archetype "regulated-trust":
// low volume, high value. Favors demos / activations / contract value over DAU.
//
// Translated from the Buildwrk beacon (Construction.erp
// src/app/api/portfolio/stats/route.ts). Tables/columns used:
//   companies(id, created_at, subscription_status, subscription_plan,
//             stripe_subscription_id)
//   audit_logs(user_id, created_at)
//   projects(company_id, created_at)
//   beta_applications(id, created_at)
//   contact_submissions(id, created_at)
//   subscription_events(amount, event_type, created_at)
//   opportunities(stage, estimated_value, weighted_value, created_at, updated_at)
//   pricing_tiers(name, monthly_price)
import type { ProductReader, ReaderResult, ProductCredentials } from './index';
import type { UniversalMetrics } from '../types';
import { SupabaseReader, isoDaysAgo } from './supabaseRest';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (cur: number, prev: number): number | null => (prev === 0 ? null : r1(((cur - prev) / prev) * 100));
const ratio = (a: number, b: number): number | null => (b === 0 ? null : r3(a / b));

export const buildwrkReader: ProductReader = async (creds: ProductCredentials): Promise<ReaderResult> => {
  const errors: string[] = [];
  const u: Partial<UniversalMetrics> = {};
  const a: Record<string, unknown> = {};
  const db = new SupabaseReader(creds.url!, creds.key!);

  const d1 = isoDaysAgo(1), d7 = isoDaysAgo(7), d28 = isoDaysAgo(28), d56 = isoDaysAgo(56);
  const d0 = isoDaysAgo(0); // start of today UTC — upper bound for "complete days"

  // Universal — default everything to null; partial data beats no data.
  u.installs28d = null;            // not a mobile-install product
  u.retentionD1 = null;
  u.retentionD7 = null;
  u.retentionD30 = null;
  u.organicShare = null;           // filled centrally from GA4
  u.paidShare = null;
  u.funnelErrorRate = null;        // no per-endpoint error instrumentation here

  // Raw-row fetch helper (the shared SupabaseReader only exposes count/distinct/
  // sum; activations & pipeline need actual rows). Read-only, paginated like the
  // helper. Reuses the same base/key the SupabaseReader derives.
  const base = creds.url!.replace(/^https?:\/\//, '').replace(/^db\./, '').replace(/\/.*$/, '');
  const restBase = `https://${base}/rest/v1`;
  const rows = async (table: string, select: string, query = '', cap = 50000): Promise<Record<string, unknown>[]> => {
    const out: Record<string, unknown>[] = [];
    const pageSize = 1000;
    for (let offset = 0; offset < cap; offset += pageSize) {
      const url = `${restBase}/${table}?select=${select}${query ? `&${query}` : ''}`;
      const res = await fetch(url, {
        headers: { apikey: creds.key!, Authorization: `Bearer ${creds.key!}`, Range: `${offset}-${offset + pageSize - 1}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`rows ${table}: HTTP ${res.status} ${await res.text().catch(() => '')}`);
      const page = (await res.json()) as Record<string, unknown>[];
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  };

  // --- acquisition: signups = new companies (a new construction firm onboarding). ---
  try {
    const [s7, s28, sPrev28] = await Promise.all([
      db.count('companies', `created_at=gte.${d7}`),
      db.count('companies', `created_at=gte.${d28}`),
      db.count('companies', `created_at=gte.${d56}&created_at=lt.${d28}`),
    ]);
    u.signups7d = s7;
    u.signups28d = s28;
    u.signupsTrendPct = pct(s28, sPrev28);
  } catch (e) { errors.push(`acquisition: ${msg(e)}`); }

  // --- engagement: active = distinct user_id with an audit_logs action in window. ---
  try {
    const [dau, wau, mau] = await Promise.all([
      db.distinctCount('audit_logs', 'user_id', `created_at=gte.${d1}&user_id=not.is.null`),
      db.distinctCount('audit_logs', 'user_id', `created_at=gte.${d7}&user_id=not.is.null`),
      db.distinctCount('audit_logs', 'user_id', `created_at=gte.${d28}&user_id=not.is.null`),
    ]);
    u.dau = dau; u.wau = wau; u.mau = mau;
    u.stickiness = mau ? ratio(dau, mau) : null;
  } catch (e) { errors.push(`engagement: ${msg(e)}`); }

  // --- retention proxy: of last-28d new companies, share with a project created. ---
  try {
    const cohort = await db.distinctValues('companies', 'id', `created_at=gte.${d28}`);
    if (cohort.size) {
      const activated = await db.distinctValues('projects', 'company_id');
      let hit = 0;
      cohort.forEach((id) => { if (activated.has(id)) hit++; });
      u.retentionProxy = ratio(hit, cohort.size);
    }
  } catch (e) { errors.push(`retention: ${msg(e)}`); }

  // --- revenue MRR: pricing_tiers.monthly_price matched case-insensitively to
  //     companies.subscription_plan over active companies. Null if any active
  //     company's plan can't be priced (avoid misleading undercount). ---
  try {
    const [tierRows, activeCos] = await Promise.all([
      rows('pricing_tiers', 'name,monthly_price'),
      rows('companies', 'subscription_plan', `subscription_status=eq.active`),
    ]);
    const priceByPlan = new Map<string, number>();
    for (const t of tierRows) priceByPlan.set(String(t.name).toLowerCase(), Number(t.monthly_price) || 0);
    u.payingUsers = activeCos.length;
    let sum = 0;
    let priced = true;
    for (const c of activeCos) {
      const p = priceByPlan.get(String(c.subscription_plan ?? '').toLowerCase());
      if (p === undefined) { priced = false; continue; }
      sum += p;
    }
    u.mrr = priced ? r2(sum) : null;
    if (!priced) errors.push('revenue: some active companies have an unpriced plan; mrr left null');
  } catch (e) { errors.push(`revenue-mrr: ${msg(e)}`); }

  // --- revenue28d: sum subscription_events.amount for billing event types,
  //     current 28d vs prior 28d for the trend. ---
  try {
    const EVT = `event_type=in.(created,upgraded,downgraded,renewed)`;
    const [cur, prev] = await Promise.all([
      db.sum('subscription_events', 'amount', `created_at=gte.${d28}&${EVT}`),
      db.sum('subscription_events', 'amount', `created_at=gte.${d56}&created_at=lt.${d28}&${EVT}`),
    ]);
    u.revenue28d = r2(cur);
    u.revenueTrendPct = pct(cur, prev);
    u.arpu = u.mau ? ratio(u.revenue28d, u.mau) : null;
  } catch (e) { errors.push(`revenue-28d: ${msg(e)}`); }

  // --- funnel: critical step = company signup → first project (28d cohort). ---
  try {
    const cohort = await db.distinctValues('companies', 'id', `created_at=gte.${d28}`);
    u.funnelSampleSize = cohort.size;
    u.criticalStep = 'company_signup→first_project';
    if (cohort.size) {
      const activated = await db.distinctValues('projects', 'company_id');
      let hit = 0;
      cohort.forEach((id) => { if (activated.has(id)) hit++; });
      u.criticalConversion = ratio(hit, cohort.size);
    }
  } catch (e) { errors.push(`funnel: ${msg(e)}`); }

  // === archetype: regulated-trust ===

  // demosBooked28d: inbound sales conversations = beta_applications + contact_submissions.
  try {
    const [beta, contact] = await Promise.all([
      db.count('beta_applications', `created_at=gte.${d28}`),
      db.count('contact_submissions', `created_at=gte.${d28}`),
    ]);
    a.demosBooked28d = beta + contact;
  } catch (e) { errors.push(`demosBooked: ${msg(e)}`); }

  // applicationsBooked28d: companies created in last 28d with a non-empty
  // stripe_subscription_id (a signed/paying contract started).
  try {
    const data = await rows('companies', 'stripe_subscription_id', `created_at=gte.${d28}&stripe_subscription_id=not.is.null`, 10000);
    a.applicationsBooked28d = data.filter((c) => String(c.stripe_subscription_id ?? '').trim() !== '').length;
  } catch (e) { errors.push(`applicationsBooked: ${msg(e)}`); }

  // activations28d: companies whose FIRST project (by created_at) fell in the
  // last 28 complete UTC days. Look back to d56 to find each company's earliest.
  a.activationEvent = 'first project created';
  try {
    const data = await rows('projects', 'company_id,created_at', `created_at=gte.${d56}&order=created_at.asc`);
    const firstByCompany = new Map<string, string>();
    for (const p of data) {
      const cid = String(p.company_id);
      if (!firstByCompany.has(cid)) firstByCompany.set(cid, String(p.created_at));
    }
    const lo = new Date(d28).getTime();
    const hi = new Date(d0).getTime();
    let n = 0;
    for (const first of firstByCompany.values()) {
      const t = new Date(first).getTime();
      if (t >= lo && t < hi) n++;
    }
    a.activations28d = n;
  } catch (e) { errors.push(`activations: ${msg(e)}`); }

  // pipelineValue + avgDealValue + salesCycleDays from CRM opportunities.
  try {
    const data = await rows('opportunities', 'stage,estimated_value,weighted_value,created_at,updated_at,expected_close_date', '', 20000);

    const openStages = new Set(['lead', 'qualification', 'proposal', 'negotiation']);
    let openWeighted = 0;
    for (const o of data) {
      if (openStages.has(String(o.stage))) openWeighted += Number(o.weighted_value) || 0;
    }
    a.pipelineValue = r2(openWeighted);

    const won = data.filter((o) => o.stage === 'won');
    a.avgDealValue = null;
    a.salesCycleDays = null;
    if (won.length) {
      const total = won.reduce((acc, o) => acc + (Number(o.estimated_value) || 0), 0);
      a.avgDealValue = r2(total / won.length);

      const cycles = won
        .map((o) => (new Date(String(o.updated_at)).getTime() - new Date(String(o.created_at)).getTime()) / (1000 * 60 * 60 * 24))
        .filter((d) => Number.isFinite(d) && d >= 0)
        .sort((x, y) => x - y);
      if (cycles.length) {
        const mid = Math.floor(cycles.length / 2);
        const median = cycles.length % 2 === 0 ? (cycles[mid - 1] + cycles[mid]) / 2 : cycles[mid];
        a.salesCycleDays = Math.round(median);
      }
    }
  } catch (e) { errors.push(`pipeline: ${msg(e)}`); }

  return {
    universal: u,
    archetype: a,
    definitions: {
      activeUser:
        'Distinct audit_logs.user_id with an entry (created/edited a record — real ERP work, not just a login) in the window.',
      signup:
        'A new company (construction firm) row, by companies.created_at — the onboarding unit for a B2B ERP, not individual seats.',
      revenue28d:
        'Sum of subscription_events.amount for event_type in (created, upgraded, downgraded, renewed) over the last 28 complete UTC days. Buildwrk SaaS billing only; tenant project invoices excluded.',
      mrr:
        "Sum of pricing_tiers.monthly_price (matched case-insensitively to companies.subscription_plan) over companies with subscription_status='active'. Null if any active company's plan can't be priced.",
      payingUsers:
        "Count of companies with subscription_status='active' (paying accounts, not seats).",
      criticalStep:
        'company signup → first project created within the 28d signup cohort.',
      demosBooked28d:
        'Inbound sales conversations in last 28d = beta_applications + contact_submissions by created_at.',
      applicationsBooked28d:
        'New companies (created in last 28d) with a non-empty stripe_subscription_id — a signed/paying contract started.',
      activations28d:
        'Companies whose FIRST project (by projects.created_at) fell in the last 28 complete UTC days.',
      salesCycleDays:
        "Median days from opportunities.created_at to updated_at for stage='won' (updated_at as close proxy; no explicit closed_at). Null if no won deals.",
      avgDealValue: "Mean opportunities.estimated_value for stage='won'.",
      pipelineValue:
        'Sum of opportunities.weighted_value for open stages (lead, qualification, proposal, negotiation).',
    },
    status: errors.length >= 3 ? 'error' : 'live',
    errors,
  };
};
