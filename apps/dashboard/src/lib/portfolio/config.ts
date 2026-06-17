// Portfolio Growth Agent — product registry.
//
// Each product is scored on its archetype's scoreboard. Beacon URLs live in env
// vars (never committed) of the form BEACON_URL_<KEY-UPPERCASED>, e.g.
//   BEACON_URL_ARGUFIGHT=https://www.argufight.com
// The agent appends `/api/portfolio/stats` and sends the shared
// PORTFOLIO_BEACON_SECRET header. A product with no beacon URL set is still
// scored from Layer-1 (dashboard-centralized) data alone.
//
// `companyNameMatch` links a product to its Company row in the dashboard DB so
// Layer-1 financial/KPI data (PLStatement, KPI, BusinessProfile) can be merged
// in. Matching is case-insensitive substring against Company.name.

import type { Archetype } from './types';

export interface ProductConfig {
  key: string; // stable slug, matches beacon meta.projectKey
  displayName: string;
  archetype: Archetype;
  companyNameMatch: string; // links to Company.name (case-insensitive contains)
  beaconEnvKey: string; // env var holding this product's base URL
  enabled: boolean; // false = skip entirely (e.g. truly dormant)
  note?: string;
}

export const PRODUCTS: ProductConfig[] = [
  {
    key: 'argufight',
    displayName: 'ArguFight',
    archetype: 'consumer-viral',
    companyNameMatch: 'argu',
    beaconEnvKey: 'BEACON_URL_ARGUFIGHT',
    enabled: true,
  },
  {
    key: 'opticrank',
    displayName: 'OpticRank',
    archetype: 'b2b-saas',
    companyNameMatch: 'optic',
    beaconEnvKey: 'BEACON_URL_OPTICRANK',
    enabled: true,
  },
  {
    key: 'topviso',
    displayName: 'Top Viso',
    archetype: 'b2b-saas',
    companyNameMatch: 'viso',
    beaconEnvKey: 'BEACON_URL_TOPVISO',
    enabled: true,
  },
  {
    key: 'goviral',
    displayName: 'go.viral',
    archetype: 'b2b-saas',
    companyNameMatch: 'viral',
    beaconEnvKey: 'BEACON_URL_GOVIRAL',
    enabled: true,
  },
  {
    key: 'buildwrk',
    displayName: 'Buildwrk',
    archetype: 'regulated-trust',
    companyNameMatch: 'build',
    beaconEnvKey: 'BEACON_URL_BUILDWRK',
    enabled: true,
    note: 'Construction ERP',
  },
  {
    key: 'havana',
    displayName: 'Havana Cleaning',
    archetype: 'marketplace',
    companyNameMatch: 'havana',
    beaconEnvKey: 'BEACON_URL_HAVANA',
    enabled: true,
  },
  {
    key: 'basktball',
    displayName: 'Basktball',
    archetype: 'consumer-viral',
    companyNameMatch: 'bask',
    beaconEnvKey: 'BEACON_URL_BASKTBALL',
    enabled: true,
  },
  {
    key: 'cfbsocial',
    displayName: 'CFB Social',
    archetype: 'consumer-viral',
    companyNameMatch: 'cfb',
    beaconEnvKey: 'BEACON_URL_CFBSOCIAL',
    enabled: true,
    note: 'Seasonal — peaks into football season',
  },
  {
    key: 'jetdale',
    displayName: 'Jetdale',
    archetype: 'pre-launch',
    companyNameMatch: 'jetdale',
    beaconEnvKey: 'BEACON_URL_JETDALE',
    enabled: true,
  },
  {
    key: 'julyu',
    displayName: 'Julyu',
    archetype: 'pre-launch',
    companyNameMatch: 'julyu',
    beaconEnvKey: 'BEACON_URL_JULYU',
    enabled: true,
  },
  {
    key: 'kamioi',
    displayName: 'Kamioi',
    archetype: 'regulated-trust',
    companyNameMatch: 'kamioi',
    beaconEnvKey: 'BEACON_URL_KAMIOI',
    enabled: true,
    note: 'Fintech — beacon targets the kamioi.v.1 Supabase repo',
  },
  {
    key: 'marble',
    displayName: 'Donkey Marble Racing',
    archetype: 'pre-launch',
    companyNameMatch: 'marble',
    beaconEnvKey: 'BEACON_URL_MARBLE',
    enabled: true,
    note: 'No backend yet — returns a stub until instrumented',
  },
];

export function beaconUrlFor(p: ProductConfig): string | null {
  const base = process.env[p.beaconEnvKey];
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/api/portfolio/stats`;
}

export const BEACON_SECRET = () => process.env.PORTFOLIO_BEACON_SECRET || '';
export const BEACON_TIMEOUT_MS = 10_000;
