// Portfolio Growth Agent — rules-based scoring engine.
//
// No ML. Two scores per product, each 0-100:
//   traction  (grid x-axis): is this real? — retention + organic pull + revenue
//                            momentum, weighted on the ARCHETYPE's scoreboard.
//   leverage  (grid y-axis): would a focused push move it? — latent demand,
//                            a fixable funnel, and how early/compounding it is.
// Both are dampened by data confidence, so a product we can barely see (e.g. a
// product with no backend) sinks to cut/instrument rather than scoring high by
// accident. Weights below are deliberately explicit so they're tunable.

import type {
  ProjectMetrics,
  ScoredProject,
  QuietlyBroken,
  Zone,
  ZoneCounts,
  Archetype,
} from './types';

// ---- helpers ----
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// ratio of a value against a "good" target, capped at 1.
const target = (v: number | null, good: number) =>
  v === null ? null : clamp01(v / good);
// map a trend pct (-50%..+50%) onto 0..1 (0.5 = flat).
const momentum = (pct: number | null) =>
  pct === null ? null : clamp01(0.5 + pct / 100);

interface Signal {
  value: number | null; // 0..1
  weight: number;
}

// Weighted mean of the signals that are actually present. Missing signals don't
// drag the score to zero — they just don't count. Returns {score, confidence}
// where confidence = share of intended weight that had data.
function blend(signals: Signal[]): { score: number; confidence: number } {
  const present = signals.filter((s) => s.value !== null);
  const totalWeight = signals.reduce((a, s) => a + s.weight, 0);
  const presentWeight = present.reduce((a, s) => a + s.weight, 0);
  if (presentWeight === 0) return { score: 0, confidence: 0 };
  const weighted =
    present.reduce((a, s) => a + (s.value as number) * s.weight, 0) / presentWeight;
  return { score: weighted, confidence: presentWeight / totalWeight };
}

// Base "earliness" — how much effort compounds for this archetype (leverage floor).
const EARLINESS: Record<Archetype, number> = {
  'pre-launch': 0.7,
  'consumer-viral': 0.6,
  'b2b-saas': 0.6,
  marketplace: 0.45,
  'regulated-trust': 0.4,
};

function tractionSignals(m: ProjectMetrics): Signal[] {
  const u = m.universal;
  const a = m.archetypeSignals as Record<string, number | undefined>;
  switch (m.archetype) {
    case 'consumer-viral':
      return [
        { value: target(u.retentionD7 ?? u.retentionProxy, 0.25), weight: 0.3 },
        { value: u.organicShare, weight: 0.2 },
        { value: momentum(u.signupsTrendPct), weight: 0.2 },
        { value: target(u.stickiness, 0.2), weight: 0.15 },
        { value: target(a.inviteRate ?? null, 0.2), weight: 0.15 },
      ];
    case 'b2b-saas':
      return [
        { value: target(a.trialToPaidRate ?? null, 0.15), weight: 0.2 },
        { value: a.netChurnRate != null ? clamp01(1 - a.netChurnRate / 0.1) : null, weight: 0.15 },
        { value: momentum(u.revenueTrendPct ?? u.signupsTrendPct), weight: 0.25 },
        { value: u.organicShare, weight: 0.2 },
        { value: target(a.signupToActivationRate ?? u.retentionProxy ?? null, 0.5), weight: 0.2 },
      ];
    case 'regulated-trust':
      return [
        { value: target(a.activations28d ?? null, 4), weight: 0.35 },
        { value: target(a.demosBooked28d ?? null, 8), weight: 0.25 },
        { value: momentum(u.revenueTrendPct), weight: 0.2 },
        { value: target(a.pipelineValue ?? null, 50000), weight: 0.2 },
      ];
    case 'pre-launch':
      return [
        { value: target(a.waitlistGrowthPct7d ?? null, 10), weight: 0.4 },
        { value: target(a.landingConversionRate ?? null, 0.08), weight: 0.3 },
        { value: target(a.designPartnerConversations ?? null, 5), weight: 0.3 },
      ];
    case 'marketplace':
      return [
        { value: momentum(u.revenueTrendPct), weight: 0.3 },
        { value: target(u.retentionProxy, 0.4), weight: 0.25 },
        { value: u.organicShare, weight: 0.2 },
        { value: target(u.signups28d, 200), weight: 0.25 },
      ];
  }
}

function leverageSignals(m: ProjectMetrics): Signal[] {
  const u = m.universal;
  // Latent organic demand: people arriving without spend = cheap to grow.
  const latentDemand = u.organicShare;
  // Fixable funnel: a low conversion or a high error rate on the critical step,
  // BACKED by real traffic, is a high-leverage fix. No traffic => not leverage.
  const hasTraffic = (u.funnelSampleSize ?? 0) >= 30;
  const fixable =
    hasTraffic
      ? clamp01(
          (u.criticalConversion !== null ? 1 - u.criticalConversion : 0) * 0.6 +
            (u.funnelErrorRate ?? 0) * 4 * 0.4,
        )
      : null;
  return [
    { value: latentDemand, weight: 0.3 },
    { value: fixable, weight: 0.3 },
    { value: EARLINESS[m.archetype], weight: 0.4 },
  ];
}

function reasonFor(m: ProjectMetrics, zone: Zone): string {
  const u = m.universal;
  const bits: string[] = [];
  if (u.organicShare !== null) bits.push(`${Math.round(u.organicShare * 100)}% organic`);
  if (u.retentionD7 !== null) bits.push(`D7 ${Math.round(u.retentionD7 * 100)}%`);
  if (u.mrr) bits.push(`$${Math.round(u.mrr).toLocaleString()} MRR`);
  if (m.status === 'pre-launch') bits.push('pre-launch');
  if (m.source === 'unreachable' || m.source === 'dashboard') bits.push('limited data');
  const detail = bits.length ? bits.join(', ') : 'little signal yet';
  const head: Record<Zone, string> = {
    'double-down': 'Concentrate here',
    'small-tests': 'Worth focused tests',
    'protect-or-partner': 'Protect / partner',
    'cut-pause-sell': 'Cut, pause, or instrument',
  };
  return `${head[zone]} — ${detail}.`;
}

const HIGH = 55; // zone threshold on the 0-100 scale

function zoneFor(traction: number, leverage: number): Zone {
  const t = traction >= HIGH;
  const l = leverage >= HIGH;
  if (t && l) return 'double-down';
  if (!t && l) return 'small-tests';
  if (t && !l) return 'protect-or-partner';
  return 'cut-pause-sell';
}

export function scoreProject(m: ProjectMetrics): ScoredProject {
  const t = blend(tractionSignals(m));
  const l = blend(leverageSignals(m));
  // Dampen by data confidence: you can't fairly credit (or push) what you can't see.
  const tConf = 0.5 + 0.5 * t.confidence;
  const lConf = 0.55 + 0.45 * l.confidence;
  const traction = Math.round(t.score * tConf * 100);
  const leverage = Math.round(l.score * lConf * 100);
  const zone = zoneFor(traction, leverage);
  return {
    projectKey: m.projectKey,
    displayName: m.displayName,
    archetype: m.archetype,
    status: m.status,
    traction,
    leverage,
    zone,
    why: reasonFor(m, zone),
    metrics: m,
  };
}

// Detects products where the funnel is erroring or converting far below peers,
// or where there's usage but no revenue path — i.e. a BUG/gap, not bad marketing.
export function detectQuietlyBroken(scored: ScoredProject[]): QuietlyBroken[] {
  const out: QuietlyBroken[] = [];
  // portfolio median critical conversion among products that report it
  const convs = scored
    .map((s) => s.metrics.universal.criticalConversion)
    .filter((v): v is number => v !== null);
  const median =
    convs.length > 0
      ? [...convs].sort((a, b) => a - b)[Math.floor(convs.length / 2)]
      : null;

  for (const s of scored) {
    const u = s.metrics.universal;
    if (u.funnelErrorRate !== null && u.funnelErrorRate >= 0.03) {
      out.push({
        projectKey: s.projectKey,
        displayName: s.displayName,
        title: `${s.displayName} — ${u.criticalStep ?? 'critical endpoint'} erroring`,
        detail: `${(u.funnelErrorRate * 100).toFixed(1)}% error rate on the critical step. Fix the bug before blaming marketing.`,
        kind: 'error',
      });
    } else if (
      median !== null &&
      u.criticalConversion !== null &&
      (u.funnelSampleSize ?? 0) >= 30 &&
      u.criticalConversion < median * 0.5
    ) {
      out.push({
        projectKey: s.projectKey,
        displayName: s.displayName,
        title: `${s.displayName} — onboarding converts far below peers`,
        detail: `${Math.round(u.criticalConversion * 100)}% vs ${Math.round(median * 100)}% portfolio median. Broken funnel, not an empty one.`,
        kind: 'funnel',
      });
    }
    if ((u.mau ?? 0) >= 200 && u.mrr === 0 && u.revenue28d === 0) {
      out.push({
        projectKey: s.projectKey,
        displayName: s.displayName,
        title: `${s.displayName} — no monetization wired`,
        detail: `${u.mau} MAU and $0 revenue. Not broken code — there's no revenue path at all.`,
        kind: 'no-monetization',
      });
    }
    if (s.metrics.source === 'unreachable' || (s.traction <= 12 && s.leverage <= 22)) {
      if (s.metrics.status !== 'live' && (u.mau === null && u.signups28d === null)) {
        out.push({
          projectKey: s.projectKey,
          displayName: s.displayName,
          title: `${s.displayName} — invisible to the agent`,
          detail: 'No usable data reaching the agent. Instrument it or park it — you can\'t decide blind.',
          kind: 'no-data',
        });
      }
    }
  }
  return out;
}

export function countZones(scored: ScoredProject[]): ZoneCounts {
  return {
    doubleDown: scored.filter((s) => s.zone === 'double-down').length,
    smallTests: scored.filter((s) => s.zone === 'small-tests').length,
    protectPartner: scored.filter((s) => s.zone === 'protect-or-partner').length,
    cutPauseSell: scored.filter((s) => s.zone === 'cut-pause-sell').length,
  };
}

// Combined rank for table ordering: traction × leverage, double-down first.
export function rankProjects(scored: ScoredProject[]): ScoredProject[] {
  const zoneRank: Record<Zone, number> = {
    'double-down': 0,
    'small-tests': 1,
    'protect-or-partner': 2,
    'cut-pause-sell': 3,
  };
  return [...scored].sort((a, b) => {
    if (zoneRank[a.zone] !== zoneRank[b.zone]) return zoneRank[a.zone] - zoneRank[b.zone];
    return b.traction + b.leverage - (a.traction + a.leverage);
  });
}
