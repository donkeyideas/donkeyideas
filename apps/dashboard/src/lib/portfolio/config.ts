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
  beaconPath?: string; // override the default '/api/portfolio/stats' (e.g. Supabase Edge Functions)
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
    displayName: 'Go Virall',
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
    // Kamioi is a Vite SPA, not Next.js — its beacon is a Supabase Edge Function.
    // Set BEACON_URL_KAMIOI to the functions base, e.g. https://<ref>.supabase.co
    beaconPath: '/functions/v1/portfolio-stats',
    enabled: true,
    note: 'Fintech — beacon is a Supabase Edge Function in the kamioi.v.1 repo',
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

// What each product IS and how to judge it — so the agent doesn't misread an
// app-first product (Basktball) as failing just because website signups are low.
export type PrimaryMetric = 'installs' | 'revenue' | 'engagement' | 'bookings' | 'waitlist';
export interface ProductContext {
  thesis: string; // plain-English: what it is + what success looks like
  primaryMetric: PrimaryMetric; // the metric that actually defines this product's traction
  domain?: string; // website to deep-dive (https://...)
}

export const PRODUCT_CONTEXT: Record<string, ProductContext> = {
  argufight: { thesis: 'A debate platform (web + mobile). Success = signups, debates created/played, retention, and viral invites. Engagement-led, not revenue-led.', primaryMetric: 'engagement', domain: 'https://www.argufight.com' },
  opticrank: { thesis: 'A B2B SEO/rank-tracking SaaS. Success = paying organizations, MRR, activation (first project), low churn.', primaryMetric: 'revenue', domain: 'https://opticrank.com' },
  topviso: { thesis: 'A B2B ASO/SEO SaaS sharing OpticRank\'s audience. Success = paying orgs, MRR, activation.', primaryMetric: 'revenue' },
  goviral: { thesis: 'A B2B creator/social-analytics SaaS. Success = paying creators, MRR, platforms connected, content posted.', primaryMetric: 'revenue' },
  buildwrk: { thesis: 'A construction-ERP SaaS — regulated, sales-led, low-volume high-value. Success = paying construction firms, contracts, demos booked, projects created.', primaryMetric: 'revenue' },
  havana: { thesis: 'A local cleaning-services marketplace. Success = completed bookings, booking revenue, repeat customers. Low ceiling, cash-generating.', primaryMetric: 'bookings' },
  basktball: { thesis: 'A consumer BASKETBALL stats/predictions MOBILE APP. Traction is driven by APP DOWNLOADS and in-app engagement, NOT website signups. No revenue model yet — judge it on installs + active users, never on web signups or revenue.', primaryMetric: 'installs' },
  cfbsocial: { thesis: 'A college-football social app (web + mobile), strongly SEASONAL (peaks into football season ~August). Success = installs + engagement. No revenue model — off-season lulls are expected, not failure.', primaryMetric: 'installs' },
  jetdale: { thesis: 'A pre-launch AI project tool. Judge on waitlist / early instrumentation, not traction it cannot have yet.', primaryMetric: 'waitlist' },
  julyu: { thesis: 'A pre-launch grocery price-comparison app. Judge on waitlist / signup momentum.', primaryMetric: 'waitlist' },
  kamioi: { thesis: 'An early regulated FINTECH (round-up investing). Success = funded accounts (first transaction), demos, trust milestones — low volume, high value. Dormancy is not death for an early fintech.', primaryMetric: 'revenue' },
  marble: { thesis: 'A consumer marble-racing MOBILE GAME. Success = APP DOWNLOADS and retention/ad revenue, NOT website signups. Judge primarily on installs.', primaryMetric: 'installs' },
};

export const contextFor = (key: string): ProductContext | undefined => PRODUCT_CONTEXT[key];

export function beaconUrlFor(p: ProductConfig): string | null {
  const base = process.env[p.beaconEnvKey];
  if (!base) return null;
  return `${base.replace(/\/$/, '')}${p.beaconPath ?? '/api/portfolio/stats'}`;
}

export const BEACON_SECRET = () => process.env.PORTFOLIO_BEACON_SECRET || '';
export const BEACON_TIMEOUT_MS = 10_000;
