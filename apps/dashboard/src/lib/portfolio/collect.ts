// Portfolio Growth Agent — metrics collector.
//
// Two layers, merged per product:
//   Layer 1 (zero-touch): data the dashboard already holds — latest KPI row,
//     BusinessProfile fields — keyed to each product's Company by name.
//   Layer 2 (beacon): each product's own /api/portfolio/stats endpoint.
// Beacon wins where present; Layer 1 fills the gaps. Fail-soft: an unreachable
// beacon flags the product and never throws.

import { prisma } from '@donkey-ideas/database';
import { fetchRealAnalytics } from '../google-analytics';
import { fetchAppStoreData } from '../app-store-connect';
import { fetchPlayStoreData } from '../google-play';
import { PRODUCTS, beaconUrlFor, BEACON_SECRET, BEACON_TIMEOUT_MS } from './config';
import { READERS, credsFor } from './readers';
import type {
  ProjectMetrics,
  UniversalMetrics,
  BeaconResponse,
  ProjectStatus,
} from './types';

function emptyUniversal(): UniversalMetrics {
  return {
    signups7d: null, signups28d: null, signupsTrendPct: null, installs28d: null,
    dau: null, wau: null, mau: null, stickiness: null,
    retentionD1: null, retentionD7: null, retentionD30: null, retentionProxy: null,
    mrr: null, revenue28d: null, revenueTrendPct: null, payingUsers: null, arpu: null,
    organicShare: null, paidShare: null,
    criticalStep: null, criticalConversion: null, funnelErrorRate: null, funnelSampleSize: null,
  };
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Beacon won't be null over a Layer-1 value, but Layer-1 fills a null beacon field.
function coalesce<T>(beaconVal: T | null, layer1Val: T | null): T | null {
  return beaconVal !== null && beaconVal !== undefined ? beaconVal : layer1Val ?? null;
}

// Channel groups that count as PAID (everything else is treated as organic).
const PAID_CHANNELS = ['Paid Search', 'Paid Social', 'Display', 'Paid Other', 'Cross-network', 'Paid Shopping', 'Paid Video'];

// Layer-1 GA4: the dashboard's real centralized signal (the KPI table is empty).
// Gives an audience-size (MAU≈users), new-user count, an organic split, a
// returning-user retention proxy, and a within-window momentum trend.
async function ga4Layer(propertyId: string): Promise<Partial<UniversalMetrics>> {
  const a: any = await fetchRealAnalytics(propertyId, '28d');
  const o = a.overview || {};
  const totalUsers = Number(o.totalUsers) || 0;
  const newUsers = Number(o.newUsers) || 0;
  const returning = Number(o.returningUsers) || 0;

  // organic share from channel groups
  const sources: any[] = a.trafficSources || [];
  const organicPct = sources
    .filter((s) => !PAID_CHANNELS.includes(s.source))
    .reduce((x, s) => x + (Number(s.percentage) || 0), 0);

  // momentum: users in 2nd half of the 28d window vs 1st half
  const sot: any[] = a.sessionsOverTime || [];
  let trend: number | null = null;
  if (sot.length >= 8) {
    const half = Math.floor(sot.length / 2);
    const first = sot.slice(0, half).reduce((x, d) => x + (Number(d.users) || 0), 0);
    const second = sot.slice(half).reduce((x, d) => x + (Number(d.users) || 0), 0);
    trend = first > 0 ? Math.round(((second - first) / first) * 1000) / 10 : null;
  }

  return {
    mau: totalUsers || null,
    signups28d: newUsers || null,
    signupsTrendPct: trend,
    organicShare: sources.length ? Math.min(1, organicPct / 100) : null,
    paidShare: sources.length ? Math.max(0, 1 - organicPct / 100) : null,
    retentionProxy: totalUsers > 0 ? Math.round((returning / totalUsers) * 1000) / 1000 : null,
  };
}

async function fetchBeacon(url: string): Promise<BeaconResponse | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), BEACON_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'x-portfolio-secret': BEACON_SECRET() },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as BeaconResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// App store / Play store layer: real installs + ratings (the App Stores page data).
// Uses the existing ASC/Play service-account env (already in production). Fail-soft
// (App Store CDN rejects local Node; works on Vercel).
async function appStoreLayer(bp: { ascBundleId?: string | null; gpPackageName?: string | null }): Promise<{ installs28d: number | null; rating: number | null }> {
  let installs = 0;
  let ratingSum = 0;
  let ratingN = 0;
  let any = false;
  if (bp.ascBundleId) {
    try {
      const d: any = await fetchAppStoreData(bp.ascBundleId, '28d');
      const o = d?.overview || {};
      installs += Number(o.totalInstalls) || 0;
      if (o.averageRating) { ratingSum += Number(o.averageRating); ratingN++; }
      any = true;
    } catch { /* fail-soft */ }
  }
  if (bp.gpPackageName) {
    try {
      const d: any = await fetchPlayStoreData(bp.gpPackageName, '28d');
      const o = d?.overview || {};
      installs += Number(o.totalInstalls) || 0;
      if (o.averageRating) { ratingSum += Number(o.averageRating); ratingN++; }
      any = true;
    } catch { /* fail-soft */ }
  }
  if (!any) return { installs28d: null, rating: null };
  return {
    installs28d: installs || null,
    rating: ratingN ? Math.round((ratingSum / ratingN) * 10) / 10 : null,
  };
}

interface CollectResult {
  metrics: ProjectMetrics[];
  beaconsReachable: number;
  beaconsTotal: number;
}

export async function collectMetrics(userId: string): Promise<CollectResult> {
  // Layer 1: pull the owner's companies once with latest KPI + profile.
  const companies = await prisma.company.findMany({
    where: { userId },
    include: {
      businessProfile: true,
      kpis: { orderBy: { period: 'desc' }, take: 1 },
    },
  });

  const findCompany = (match: string) =>
    companies.find((c) => c.name.toLowerCase().includes(match.toLowerCase()));

  const enabled = PRODUCTS.filter((p) => p.enabled);
  let beaconsReachable = 0;
  let beaconsTotal = 0;

  const metrics = await Promise.all(
    enabled.map(async (p): Promise<ProjectMetrics> => {
      const notes: string[] = [];
      const universal = emptyUniversal();
      let archetypeSignals: Record<string, unknown> = {};
      let definitions: Record<string, string> = {};
      let status: ProjectStatus = 'live';
      let source: ProjectMetrics['source'] = 'dashboard';
      let appRating: number | null = null;

      // ---- Layer 1: dashboard-centralized data ----
      const company = findCompany(p.companyNameMatch);
      const layer1 = emptyUniversal();
      if (company) {
        const kpi = company.kpis?.[0];
        const bp = company.businessProfile;
        if (kpi) {
          layer1.mrr = num(kpi.mrr);
          layer1.mau = num(kpi.activeUsers);
          layer1.signupsTrendPct = num(kpi.growthRate);
        }
        if (bp) {
          if (layer1.mrr === null) layer1.mrr = num(bp.monthlyRevenue);
          layer1.retentionProxy = num(bp.retentionRate);
          if (bp.projectStatus && /idea|alpha|development|beta/i.test(bp.projectStatus)) {
            status = 'pre-launch';
          }
          // GA4 — the actual centralized traction signal
          if (bp.gaPropertyId) {
            try {
              const ga = await ga4Layer(bp.gaPropertyId);
              (Object.keys(ga) as (keyof UniversalMetrics)[]).forEach((k) => {
                const v = (ga as Record<string, number | null>)[k];
                if (v !== null && v !== undefined) (layer1 as unknown as Record<string, number | null>)[k] = v;
              });
            } catch (e: any) {
              notes.push(`GA4 unavailable: ${e?.message || 'error'}`);
            }
          }
          // App store / Play installs + ratings (the App Stores page signal)
          if (bp.ascBundleId || bp.gpPackageName) {
            const as = await appStoreLayer(bp);
            if (as.installs28d != null) layer1.installs28d = as.installs28d;
            appRating = as.rating;
          }
        }
      } else {
        notes.push('No matching company in dashboard DB for Layer-1 data.');
      }

      // merge a data source's universal fields over the Layer-1 (GA4) baseline
      const mergeUniversal = (src: Record<string, unknown>) => {
        (Object.keys(universal) as (keyof UniversalMetrics)[]).forEach((k) => {
          const bv = src[k as string];
          if (k === 'criticalStep') {
            universal.criticalStep = (bv as string) ?? layer1.criticalStep;
          } else {
            (universal as unknown as Record<string, number | null>)[k] = coalesce(
              num(bv),
              (layer1 as unknown as Record<string, number | null>)[k],
            );
          }
        });
      };

      // ---- Layer 2: direct reader (preferred) → beacon → GA4-only ----
      const reader = READERS[p.key];
      const creds = reader ? credsFor(p.key) : null;
      const beaconUrl = beaconUrlFor(p);

      if (reader && creds) {
        beaconsTotal += 1;
        try {
          const result = await reader(creds);
          beaconsReachable += 1;
          source = company ? 'merged' : 'reader';
          status = result.status ?? status;
          archetypeSignals = result.archetype ?? {};
          definitions = result.definitions ?? {};
          mergeUniversal(result.universal as Record<string, unknown>);
          if (result.errors?.length) notes.push(...result.errors.map((e) => `reader: ${e}`));
        } catch (e: any) {
          source = company ? 'dashboard' : 'unreachable';
          notes.push(`Direct reader failed: ${e?.message || 'error'} — used Layer-1 data only.`);
          Object.assign(universal, layer1);
        }
      } else if (beaconUrl) {
        beaconsTotal += 1;
        const beacon = await fetchBeacon(beaconUrl);
        if (beacon) {
          beaconsReachable += 1;
          source = company ? 'merged' : 'beacon';
          status = beacon.meta?.status ?? status;
          archetypeSignals = beacon.archetype ?? {};
          definitions = beacon.definitions ?? {};
          mergeUniversal((beacon.universal ?? {}) as Record<string, unknown>);
          if (Array.isArray(beacon.errors) && beacon.errors.length) {
            notes.push(...beacon.errors.map((e) => `beacon: ${e}`));
          }
        } else {
          source = company ? 'dashboard' : 'unreachable';
          status = company ? status : 'down';
          notes.push('Beacon unreachable (timeout or error) — used Layer-1 data only.');
          Object.assign(universal, layer1);
        }
      } else {
        // No direct feed configured — Layer 1 (GA4) only.
        Object.assign(universal, layer1);
        notes.push('No data feed configured — Layer-1 (GA4) only.');
      }

      // app-store rating survives the reader/beacon archetype overwrite
      if (appRating != null) (archetypeSignals as Record<string, unknown>).appStoreRating = appRating;

      if (p.note) notes.push(p.note);

      return {
        projectKey: p.key,
        displayName: p.displayName,
        archetype: p.archetype,
        status,
        source,
        universal,
        archetypeSignals,
        definitions,
        notes,
      };
    }),
  );

  return { metrics, beaconsReachable, beaconsTotal };
}
