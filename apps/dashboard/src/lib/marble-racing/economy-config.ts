/**
 * Server-side canonical economy values. Must stay in sync with the game
 * client's data files (e:/Donkey.Marble.Racing/data/nationalRaces.ts,
 * state/gameStore.ts tournament configs, etc.).
 *
 * The server uses these to validate client-supplied entry fees and payout
 * amounts. Client-supplied values are ignored if they don't match the
 * canonical ones (or land outside computed ranges where applicable).
 */

export interface TournamentConfig {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
}

export const TOURNAMENT_CONFIGS: Record<string, TournamentConfig> = {
  'daily-blitz':           { id: 'daily-blitz',           name: 'Daily Blitz',           entryFee: 100,  prizePool: 5000 },
  'weekly-cup':            { id: 'weekly-cup',            name: 'Weekly Cup',            entryFee: 500,  prizePool: 25000 },
  'champion-invitational': { id: 'champion-invitational', name: 'Champion Invitational', entryFee: 1000, prizePool: 50000 },
};

export interface NationalEventConfig {
  id: string;
  name: string;
  entryFee: number;
  multiplier: number;
  seriesLength: number;
}

export const NATIONAL_EVENTS: Record<string, NationalEventConfig> = {
  'grand-prix':  { id: 'grand-prix',  name: 'The Grand Prix',  entryFee: 500, multiplier: 5, seriesLength: 3 },
  'marble-mile': { id: 'marble-mile', name: 'The Marble Mile', entryFee: 300, multiplier: 3, seriesLength: 1 },
  'speed-demon': { id: 'speed-demon', name: 'Speed Demon Dash', entryFee: 200, multiplier: 2, seriesLength: 1 },
  'chaos-cup':   { id: 'chaos-cup',   name: 'Chaos Cup',       entryFee: 400, multiplier: 4, seriesLength: 1 },
};

export const CUSTOM_TRACK_ENTRY_FEE = 50;

/** Max coins a player can possibly win on a single national race payout. */
export function maxNationalPayout(eventId: string): number {
  const event = NATIONAL_EVENTS[eventId];
  if (!event) return 0;
  // Top finisher wins entryFee × multiplier; cap is the same.
  return event.entryFee * event.multiplier;
}

/** Payout for a given national race placement. */
export function nationalPayoutForPlacement(eventId: string, placement: number): number {
  const event = NATIONAL_EVENTS[eventId];
  if (!event) return 0;
  const base = event.entryFee * event.multiplier;
  if (placement === 1) return base;
  if (placement === 2) return Math.round(base * 0.5);
  if (placement === 3) return Math.round(base * 0.25);
  return 0;
}
