/**
 * Server-side mirror of the game client's challenge generator.
 *
 * Challenges are deterministic from a date seed (mulberry32 PRNG). The
 * client and server independently generate the same challenges for any
 * given day/week, so the server can validate the reward amount without
 * trusting client-supplied values.
 *
 * IMPORTANT: must stay byte-identical with the game client's
 * data/challenges.ts. Update both files together.
 */

const MARBLE_IDS = ['rocky', 'dash', 'lucky', 'spike', 'nova', 'frosty', 'aqua', 'shadow'];

const MARBLE_NAMES: Record<string, string> = {
  rocky: 'Rocky', dash: 'Dash', lucky: 'Lucky', spike: 'Spike',
  nova: 'Nova', frosty: 'Frosty', aqua: 'Aqua', shadow: 'Shadow',
};

function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function getWeekStartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

interface ChallengeTemplate {
  description: string;
  target: number;
  reward: number;
}

export interface CanonicalChallenge {
  id: string;
  type: 'daily' | 'weekly';
  description: string;
  target: number;
  reward: number;
}

export function generateDailyChallenges(dateStr: string): CanonicalChallenge[] {
  const rng = createRNG(dateToSeed(dateStr));

  const templates: (() => ChallengeTemplate)[] = [
    () => {
      const mid = pickRandom(MARBLE_IDS, rng);
      return { description: `Win a race with ${MARBLE_NAMES[mid]}`, target: 1, reward: 300 };
    },
    () => {
      const mid = pickRandom(MARBLE_IDS, rng);
      return { description: `Finish top 3 with ${MARBLE_NAMES[mid]}`, target: 1, reward: 200 };
    },
    () => ({ description: 'Win 2 races in a row', target: 2, reward: 400 }),
    () => ({ description: 'Win 3 races today', target: 3, reward: 500 }),
  ];

  const shuffled = [...templates].sort(() => rng() - 0.5);
  const out: CanonicalChallenge[] = [];
  for (let i = 0; i < 3 && i < shuffled.length; i++) {
    const tmpl = shuffled[i]();
    out.push({
      id: `daily-${dateStr}-${i}`,
      type: 'daily',
      description: tmpl.description,
      target: tmpl.target,
      reward: tmpl.reward,
    });
  }
  return out;
}

export function generateWeeklyChallenges(weekStartDate: string): CanonicalChallenge[] {
  const rng = createRNG(dateToSeed(weekStartDate) + 7777);

  const templates: (() => ChallengeTemplate)[] = [
    () => ({ description: 'Win 5 races this week',           target: 5,  reward: 1500 }),
    () => ({ description: 'Win with 3 different marbles',    target: 3,  reward: 2000 }),
    () => ({ description: 'Win 10 races this week',          target: 10, reward: 2000 }),
    () => ({ description: 'Win with 5 different marbles',    target: 5,  reward: 2500 }),
  ];

  const shuffled = [...templates].sort(() => rng() - 0.5);
  const out: CanonicalChallenge[] = [];
  for (let i = 0; i < 2; i++) {
    const tmpl = shuffled[i]();
    out.push({
      id: `weekly-${weekStartDate}-${i}`,
      type: 'weekly',
      description: tmpl.description,
      target: tmpl.target,
      reward: tmpl.reward,
    });
  }
  return out;
}

/**
 * Resolve a challenge ID back to its canonical entry. Returns null if the ID
 * is malformed or for a date that wouldn't have been generated.
 */
export function resolveChallenge(challengeId: string): CanonicalChallenge | null {
  const dailyMatch = challengeId.match(/^daily-(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (dailyMatch) {
    const dateStr = dailyMatch[1];
    const idx = parseInt(dailyMatch[2], 10);
    const list = generateDailyChallenges(dateStr);
    return list[idx] ?? null;
  }
  const weeklyMatch = challengeId.match(/^weekly-(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (weeklyMatch) {
    const dateStr = weeklyMatch[1];
    const idx = parseInt(weeklyMatch[2], 10);
    const list = generateWeeklyChallenges(dateStr);
    return list[idx] ?? null;
  }
  return null;
}
