// Central reader registry for the portfolio agent.
//
// Each product can be read directly (read-only) from its own database using
// credentials harvested into the dashboard's env. Supabase products use the
// service-role key + REST; the few Prisma/Postgres products use a connection
// string. This replaces per-app beacons with one central, credential-driven
// reader — simpler to operate for a solo portfolio.

import type { UniversalMetrics, ProjectStatus } from '../types';
import { opticrankReader } from './opticrank';
import { topvisoReader } from './topviso';
import { goviralReader } from './goviral';
import { buildwrkReader } from './buildwrk';
import { cfbsocialReader } from './cfbsocial';
import { jetdaleReader } from './jetdale';
import { julyuReader } from './julyu';

export interface ProductCredentials {
  type: 'supabase' | 'postgres';
  url?: string; // supabase project URL
  key?: string; // supabase service-role key
  connectionString?: string; // postgres
}

export interface ReaderResult {
  universal: Partial<UniversalMetrics>;
  archetype: Record<string, unknown>;
  definitions: Record<string, string>;
  status: ProjectStatus;
  errors: string[];
}

export type ProductReader = (creds: ProductCredentials) => Promise<ReaderResult>;

// Resolve a product's credentials from env. Naming: <KEY>_SUPABASE_URL +
// <KEY>_SUPABASE_KEY, or <KEY>_DATABASE_URL. Returns null if none configured.
export function credsFor(productKey: string): ProductCredentials | null {
  const K = productKey.toUpperCase();
  const url = process.env[`${K}_SUPABASE_URL`];
  const key = process.env[`${K}_SUPABASE_KEY`];
  const pg = process.env[`${K}_DATABASE_URL`];
  if (url && key) return { type: 'supabase', url, key };
  if (pg) return { type: 'postgres', connectionString: pg };
  return null;
}

// Map product key → reader. Only products with a reader AND creds are read
// directly; everything else falls back to GA4 (Layer 1).
export const READERS: Record<string, ProductReader | undefined> = {
  opticrank: opticrankReader,
  topviso: topvisoReader,
  goviral: goviralReader,
  buildwrk: buildwrkReader,
  cfbsocial: cfbsocialReader,
  jetdale: jetdaleReader,
  julyu: julyuReader,
};
