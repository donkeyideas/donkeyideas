import type { NextRequest } from 'next/server';

/**
 * Extract caller's geo from Vercel edge headers. These are populated for
 * free on every Vercel-served request — no MaxMind, no external API.
 *
 * Reference: https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
 *
 * All fields are nullable: local dev hits the route without Vercel edge,
 * and some traffic (proxies, anon networks) can't be geo-resolved.
 */
export interface RequestGeo {
  country: string | null; // ISO-3166-1 alpha-2, e.g. "US"
  region:  string | null; // ISO-3166-2 region without country prefix, e.g. "CA"
  city:    string | null; // URL-encoded UTF-8 from Vercel — decode for display
}

export function getRequestGeo(request: NextRequest): RequestGeo {
  const h = request.headers;
  const cityRaw = h.get('x-vercel-ip-city');
  return {
    country: h.get('x-vercel-ip-country') || null,
    region:  h.get('x-vercel-ip-country-region') || null,
    city:    cityRaw ? safeDecode(cityRaw) : null,
  };
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
