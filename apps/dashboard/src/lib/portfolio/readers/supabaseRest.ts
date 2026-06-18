// Dependency-free Supabase reader for the portfolio agent.
// Uses a project's service-role key + PostgREST API to run read-only counts and
// distinct-counts. No @supabase/supabase-js dependency; plain fetch. Service-role
// bypasses RLS, so aggregate reads across all rows work.

export class SupabaseReader {
  private base: string;
  private key: string;
  constructor(url: string, serviceKey: string) {
    // accept either https://ref.supabase.co or db.ref.supabase.co
    const ref = url.replace(/^https?:\/\//, '').replace(/^db\./, '').replace(/\/.*$/, '');
    this.base = `https://${ref}/rest/v1`;
    this.key = serviceKey;
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...extra };
  }

  // Total row count for table + PostgREST filter query (e.g. "created_at=gte.2026-..").
  async count(table: string, query = ''): Promise<number> {
    const url = `${this.base}/${table}?select=*&limit=1${query ? `&${query}` : ''}`;
    const res = await fetch(url, { headers: this.headers({ Prefer: 'count=exact', Range: '0-0' }), cache: 'no-store' });
    if (!res.ok) throw new Error(`count ${table}: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    const cr = res.headers.get('content-range') || '';
    const total = cr.split('/')[1];
    return total && total !== '*' ? parseInt(total, 10) : 0;
  }

  // Distinct count of a column over a filter, paginating up to `cap` rows.
  async distinctCount(table: string, column: string, query = '', cap = 50000): Promise<number> {
    const seen = new Set<string>();
    const pageSize = 1000;
    for (let offset = 0; offset < cap; offset += pageSize) {
      const url = `${this.base}/${table}?select=${column}${query ? `&${query}` : ''}`;
      const res = await fetch(url, {
        headers: this.headers({ Range: `${offset}-${offset + pageSize - 1}` }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`distinct ${table}.${column}: HTTP ${res.status}`);
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) {
        const v = r[column];
        if (v !== null && v !== undefined) seen.add(String(v));
      }
      if (rows.length < pageSize) break;
    }
    return seen.size;
  }

  // Sum a numeric column over a filter (paginated).
  async sum(table: string, column: string, query = '', cap = 50000): Promise<number> {
    let total = 0;
    const pageSize = 1000;
    for (let offset = 0; offset < cap; offset += pageSize) {
      const url = `${this.base}/${table}?select=${column}${query ? `&${query}` : ''}`;
      const res = await fetch(url, {
        headers: this.headers({ Range: `${offset}-${offset + pageSize - 1}` }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`sum ${table}.${column}: HTTP ${res.status}`);
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) total += Number(r[column]) || 0;
      if (rows.length < pageSize) break;
    }
    return total;
  }

  // Return the set of distinct values of a column (for cohort intersection).
  async distinctValues(table: string, column: string, query = '', cap = 50000): Promise<Set<string>> {
    const seen = new Set<string>();
    const pageSize = 1000;
    for (let offset = 0; offset < cap; offset += pageSize) {
      const url = `${this.base}/${table}?select=${column}${query ? `&${query}` : ''}`;
      const res = await fetch(url, {
        headers: this.headers({ Range: `${offset}-${offset + pageSize - 1}` }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`distinctValues ${table}.${column}: HTTP ${res.status}`);
      const rows = (await res.json()) as Record<string, unknown>[];
      for (const r of rows) { const v = r[column]; if (v != null) seen.add(String(v)); }
      if (rows.length < pageSize) break;
    }
    return seen;
  }
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
