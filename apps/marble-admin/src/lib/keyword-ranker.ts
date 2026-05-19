/**
 * Real keyword ranking via live store search APIs.
 *
 * Ported from C:/Users/beltr/ASO/apps/web/src/lib/store-scraper.ts. Two
 * platforms, two paths:
 *
 *   - Android: `google-play-scraper` npm package, searches top 250
 *     results for the target appId.
 *   - iOS: direct fetch to iTunes Search API (`itunes.apple.com/search`),
 *     limit 200 results, match by trackId.
 *
 * Returns null position when the app isn't in the top-200/250 results
 * (unranked). Top competitor is captured for context — the first non-
 * target app in the result set.
 *
 * Rate-limited via sequential batching with a configurable delay so we
 * don't hammer the public APIs and trigger 429s.
 */

export interface KeywordRankResult {
  keyword: string;
  platform: 'ios' | 'android';
  position: number | null;
  country: string;
  topCompetitor?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Android — Google Play
// ─────────────────────────────────────────────────────────────────────

export async function checkKeywordRankingAndroid(
  keyword: string,
  targetAppId: string,
  country: string = 'us',
): Promise<KeywordRankResult> {
  try {
    /* google-play-scraper is a CJS module with an ESM default-export
     * shim — both forms appear in this repo's existing code. */
    /* eslint-disable @typescript-eslint/no-require-imports */
    const mod = require('google-play-scraper');
    const gplay = mod.default || mod;
    const results = await gplay.search({
      term: keyword,
      num: 250,
      lang: 'en',
      country,
    });
    const position = results.findIndex((r: { appId: string }) => r.appId === targetAppId);
    const topComp = results.find((r: { appId: string }) => r.appId !== targetAppId);
    return {
      keyword,
      platform: 'android',
      position: position >= 0 ? position + 1 : null,
      country,
      topCompetitor: topComp?.title ?? undefined,
    };
  } catch (err: any) {
    console.warn(`[keyword-ranker] Android search failed for "${keyword}":`, err?.message);
    return { keyword, platform: 'android', position: null, country };
  }
}

// ─────────────────────────────────────────────────────────────────────
// iOS — iTunes Search API
// ─────────────────────────────────────────────────────────────────────

export async function checkKeywordRankingIOS(
  keyword: string,
  targetAppId: string,
  country: string = 'us',
): Promise<KeywordRankResult> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&country=${country}&media=software&limit=200`;
    const res = await fetch(url);
    if (!res.ok) return { keyword, platform: 'ios', position: null, country };
    const data = await res.json();
    const results: Record<string, unknown>[] = data.results ?? [];
    const position = results.findIndex((r) => String(r.trackId) === targetAppId);
    const topComp = results.find((r) => String(r.trackId) !== targetAppId);
    return {
      keyword,
      platform: 'ios',
      position: position >= 0 ? position + 1 : null,
      country,
      topCompetitor: topComp ? String(topComp.trackName ?? '') : undefined,
    };
  } catch (err: any) {
    console.warn(`[keyword-ranker] iOS search failed for "${keyword}":`, err?.message);
    return { keyword, platform: 'ios', position: null, country };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Batch helpers — sequential with delay so we don't trigger rate limits
// ─────────────────────────────────────────────────────────────────────

export async function batchCheckKeywords(
  keywords: string[],
  opts: {
    androidAppId?: string;
    iosAppId?: string;
    country?: string;
    androidDelayMs?: number;
    iosDelayMs?: number;
  },
): Promise<KeywordRankResult[]> {
  const country = opts.country ?? 'us';
  const androidDelay = opts.androidDelayMs ?? 300;
  const iosDelay = opts.iosDelayMs ?? 400;
  const out: KeywordRankResult[] = [];

  for (const kw of keywords) {
    if (opts.androidAppId) {
      out.push(await checkKeywordRankingAndroid(kw, opts.androidAppId, country));
      if (androidDelay > 0) await new Promise((r) => setTimeout(r, androidDelay));
    }
    if (opts.iosAppId) {
      out.push(await checkKeywordRankingIOS(kw, opts.iosAppId, country));
      if (iosDelay > 0) await new Promise((r) => setTimeout(r, iosDelay));
    }
  }
  return out;
}
