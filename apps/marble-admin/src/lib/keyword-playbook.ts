/**
 * Curated marble-racing keyword playbook.
 *
 * 30 hand-picked keywords spanning core (high volume), niche (medium
 * volume + low difficulty), and long-tail (very low difficulty,
 * specific intent). Designed to be the discoverability spine for the
 * Marble Race Bet Game listing on iOS + Android.
 *
 * Each keyword runs through:
 *   1. Static enrichment (heuristic volume / difficulty / intent / KEI)
 *   2. Live ranking against both stores via /api/aso/keywords/sync
 *
 * Results are cached in the `aso_keyword_cache` GameConfig row so the
 * ASO dashboard + deck generator can read without re-hitting the
 * stores on every page load.
 */

export const APP_IDS = {
  android: 'com.donkeymarble.racing',
  /* iTunes trackId (numeric). Used by iTunes Search API to match the
   * app in result sets. The string form of ascAppId from eas.json. */
  ios: '6769627792',
} as const;

export const SEED_KEYWORDS: string[] = [
  // Core — high-volume head terms
  'marble race',
  'marble racing',
  'marble game',
  'marble racing game',
  'marble race betting',

  // Bet / casino adjacent
  'betting marble game',
  'marble bet',
  'marble betting',
  'social casino',
  'virtual coin betting',

  // Marble-content brand adjacency (where the audience already lives)
  'jelle marble runs',
  'marbles on stream',
  'marble league',
  'marbleympics',
  'marble tournament',

  // Casual gaming
  'physics racing game',
  '2d marble game',
  'multiplayer racing game',
  'mobile racing game',
  'casual betting game',

  // Long-tail / discovery
  'marble race app',
  'race marbles online',
  'pick a marble to win',
  'marble race with friends',
  'best marble game ios',
  'best marble game android',
  'free marble racing',
  'marble race championship',
  'donkey marble racing',
  'donkey marble',
];

/** Shape we cache + serve from the API. */
export interface KeywordPlaybookEntry {
  keyword: string;
  // Enrichment
  volume: number;
  difficulty: number;
  cpc: number;
  intent: 'navigational' | 'informational' | 'transactional' | 'commercial';
  kei: number;
  // Live ranks (null when unranked or not yet synced)
  androidRank: number | null;
  iosRank: number | null;
  androidTopCompetitor?: string;
  iosTopCompetitor?: string;
  // Bookkeeping
  lastSyncedAt?: string; // ISO
}

export interface PlaybookCachePayload {
  entries: KeywordPlaybookEntry[];
  lastSyncedAt: string | null;
  androidAppId: string;
  iosAppId: string;
}

export const CACHE_KEY = 'aso_keyword_cache';
