// Postgres reader for products that expose only a connection string (no Supabase
// API key). Uses the `pg` client already in the dashboard. Read-only: opens one
// connection, runs the queries, closes. SSL relaxed for Supabase pooler/direct.
import { Client } from 'pg';

export async function pgRead<T>(
  conn: string,
  fn: (q: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const q = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as Record<string, unknown>[];
    return await fn(q);
  } finally {
    await client.end().catch(() => {});
  }
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
