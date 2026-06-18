// Portfolio Growth Agent — shared types.
// Mirrors docs/portfolio-agent/metrics-contract.md (v1). Keep in sync with that
// doc: it is the single source of truth every product beacon conforms to.

export type Archetype =
  | 'consumer-viral'
  | 'b2b-saas'
  | 'regulated-trust'
  | 'pre-launch'
  | 'marketplace';

export type ProjectStatus = 'live' | 'pre-launch' | 'down' | 'error';

export type Zone =
  | 'double-down'
  | 'small-tests'
  | 'protect-or-partner'
  | 'cut-pause-sell';

// ---- The contract a beacon returns (GET /api/portfolio/stats) ----

export interface BeaconMeta {
  projectKey: string;
  displayName: string;
  archetype: Archetype;
  status: ProjectStatus;
  contractVersion: string;
  generatedAt: string;
  dataAsOf: string;
  currency: string;
}

export interface UniversalMetrics {
  // acquisition
  signups7d: number | null;
  signups28d: number | null;
  signupsTrendPct: number | null;
  installs28d: number | null;
  // engagement
  dau: number | null;
  wau: number | null;
  mau: number | null;
  stickiness: number | null;
  // retention
  retentionD1: number | null;
  retentionD7: number | null;
  retentionD30: number | null;
  retentionProxy: number | null;
  // revenue
  mrr: number | null;
  revenue28d: number | null;
  revenueTrendPct: number | null;
  payingUsers: number | null;
  arpu: number | null;
  // channels
  organicShare: number | null;
  paidShare: number | null;
  // funnel
  criticalStep: string | null;
  criticalConversion: number | null;
  funnelErrorRate: number | null;
  funnelSampleSize: number | null;
}

export interface BeaconResponse {
  meta: BeaconMeta;
  universal: Partial<UniversalMetrics>;
  archetype: Record<string, unknown>;
  definitions: Record<string, string>;
  errors: string[];
}

// ---- Normalized metrics the agent works with internally ----
// Beacon data + Layer-1 (dashboard-centralized) data, merged. Any field may be
// null = "no signal" (NOT zero). The scorer must treat null as unknown.

export interface ProjectMetrics {
  projectKey: string;
  displayName: string;
  archetype: Archetype;
  status: ProjectStatus;
  source: 'beacon' | 'reader' | 'dashboard' | 'merged' | 'unreachable';
  universal: UniversalMetrics;
  archetypeSignals: Record<string, unknown>;
  definitions: Record<string, string>;
  notes: string[]; // collection warnings (beacon down, partial data, etc.)
}

// ---- Scored output ----

export interface ScoredProject {
  projectKey: string;
  displayName: string;
  archetype: Archetype;
  status: ProjectStatus;
  traction: number; // 0-100, percentile within archetype
  leverage: number; // 0-100
  zone: Zone;
  why: string; // one-line rule-based rationale
  dataConfidence: number; // 0-100, how much real signal backed the score
  insufficientData: boolean; // true = score is "we can't see it", NOT "it's dead"
  metrics: ProjectMetrics;
}

export interface QuietlyBroken {
  projectKey: string;
  displayName: string;
  title: string;
  detail: string;
  kind: 'funnel' | 'error' | 'no-monetization' | 'no-data';
}

export interface ZoneCounts {
  doubleDown: number;
  smallTests: number;
  protectPartner: number;
  cutPauseSell: number;
}

// ---- The verdict (DeepSeek output) ----

export interface Verdict {
  headline: string; // the blunt one-paragraph call
  narrative: string; // supporting reasoning
  tokensUsed: number;
  cost: number;
  model: string;
}

// ---- A full briefing (what gets persisted / rendered) ----

export interface Briefing {
  date: string; // YYYY-MM-DD
  runAt: string;
  trigger: 'manual' | 'cron';
  products: ScoredProject[];
  quietlyBroken: QuietlyBroken[];
  zoneCounts: ZoneCounts;
  headline: string;
  narrative: string;
  beaconsReachable: number;
  beaconsTotal: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

export const ZONE_LABELS: Record<Zone, string> = {
  'double-down': 'Double down',
  'small-tests': 'Small tests',
  'protect-or-partner': 'Protect / partner',
  'cut-pause-sell': 'Cut · pause · sell',
};

export const CONTRACT_VERSION = '1.0.0';
