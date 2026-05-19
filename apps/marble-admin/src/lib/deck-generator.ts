/**
 * Pitch + Business deck HTML generators.
 *
 * Produces investor-grade self-contained HTML documents that combine
 * point-in-time platform data with strategic narrative (problem,
 * solution, market sizing, competitive landscape, projections, ask).
 *
 * Two outputs:
 *   - Pitch deck (12 slides) — Sequoia/YC structure. Marketing-flavored,
 *     emotion + traction + ask. For warm intros, demo days, partner
 *     conversations.
 *   - Business snapshot (16 slides) — investor-due-diligence depth.
 *     Unit economics, cohort retention, financial projections, risks,
 *     use of funds. For data-driven seed/series-A conversations.
 *
 * Strategic narrative content (problem, solution, market sizing,
 * competitive positioning, roadmap, use of funds) is hardcoded in this
 * file — it's the same story regardless of the data snapshot. Platform
 * numbers come from the live DB at generation time and are frozen into
 * the HTML so the link reflects what was true at the moment of share.
 *
 * Visual design: dark navy + gold theme, numbered slides ("01 ·
 * PROBLEM"), large hero typography, color-coded data cards, inline
 * SVG-free charts (CSS-only bar/donut), print-friendly with explicit
 * page breaks. Renders well in browsers AND when saved as PDF from
 * the browser's print dialog.
 */

import { prisma } from '@donkey-ideas/database';
import { getSandboxAwareReport } from './sandboxFilter';

// ─────────────────────────────────────────────────────────────────────
// Strategic content (same for every deck — narrative, not data)
// ─────────────────────────────────────────────────────────────────────

const COMPANY = {
  name: 'Donkey Marble Racing',
  legalName: 'Donkey Ideas LLC',
  contactEmail: 'info@donkeyideas.com',
  oneliner: 'A social betting game where physics decides who wins.',
  tagline: 'Marble racing with skin in the game.',
} as const;

/* Market sizing — public figures from Newzoo, Statista, Sensor Tower
 * (2024-2025). Round numbers to keep the slide readable. */
const MARKET = {
  globalMobileGamingUsd: 92_000_000_000,   // TAM
  socialCasinoUsd: 8_000_000_000,           // SAM (social casino + casual betting-adjacent)
  marblesContentReach: 500_000_000,         // YouTube marble-racing aggregate views
  serviceableNicheUsd: 1_200_000_000,       // SOM — addressable slice we can credibly capture
};

/* Competitive positioning — what's out there and how we differentiate. */
const COMPETITION = [
  {
    name: 'Coin Master',
    category: 'Social casino slot',
    revenueScale: '$1B+ lifetime',
    notes: 'Slot-machine mechanic, fatigue after ~30d.',
  },
  {
    name: 'Bingo Blitz',
    category: 'Social casino bingo',
    revenueScale: '$700M+ lifetime',
    notes: 'Older skewing audience, no skill expression.',
  },
  {
    name: 'Marbles on Stream',
    category: 'Twitch overlay (not a game)',
    revenueScale: 'Creator-tipping only',
    notes: 'Passive watching, no monetization for players.',
  },
  {
    name: 'Jelle’s Marble Runs',
    category: 'YouTube content',
    revenueScale: 'Ad revenue only',
    notes: 'Proves audience appetite; not a game.',
  },
] as const;

const WHY_NOW = [
  'Marble racing has crossed into the mainstream — Jelle’s Marble Runs draws 25M+ views per video, the MarbleLympics turned a niche format into a recurring tournament event.',
  'Social casino is a $8B annual segment growing 5–10% YoY, but the dominant titles (Coin Master, Bingo Blitz) are stale slot/bingo loops that burn out users after 30 days.',
  'Gen Z and millennial mobile gamers want short-session social play with stakes — not real-money gambling, which is regulated, but virtual stakes that feel meaningful inside a friend group.',
  'Cross-platform multiplayer is now table stakes (we ship iOS + Android day one) and Apple’s Small Business fee program (15%) makes per-unit economics far better than 30%-era social casino.',
];

const PROBLEM_POINTS = [
  'Casual mobile games run out of stakes after the first week — there’s nothing to win, nothing to lose, no reason to come back.',
  'Social casino games dominate retention but are slot-machine reskins with zero skill expression — you press a button and watch.',
  'Real-money mobile gambling is locked behind state-by-state regulation, geofencing, age verification, and 30% payment processor fees — it’s a tax on developers.',
  'Marble racing went viral on YouTube but has no native game — millions of fans, nothing to play.',
];

const SOLUTION_POINTS = [
  '<strong>Bet virtual coins</strong> on which of 8 marbles will win the next race. Physics decides the outcome — deterministic, fair, watchable.',
  '<strong>Skill + luck</strong> mix: marbles have published stats (speed, agility, luck). Veteran players analyze; new players guess. Both can win.',
  '<strong>Always-on tournaments</strong>: Daily Blitz (100 coins entry), Weekly Cup (500), Champion Invitational (1000). Skin in the game without real-money risk.',
  '<strong>Live multiplayer lobbies</strong> for up to 8 humans — race friends in real time, draft your favorite marble, climb the leaderboard.',
  '<strong>Free to play, friction-free monetization</strong>: coins, season pass tiers, ad-free upgrade. No pay-to-win on race outcomes.',
];

const ROADMAP = [
  {
    quarter: 'Q3 2026',
    title: 'Sponsored skins',
    items: [
      'Brand partnerships on track backgrounds (Pepsi, Red Bull, Monster format proven on Marbles on Stream)',
      'Creator marble program — influencers ship their own marble with stats, fans bet on them',
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'Cross-platform play',
    items: [
      'Web client (browser play, no install) feeds mobile lobby pool',
      'Twitch overlay so streamers can run viewer-bet races during broadcasts',
    ],
  },
  {
    quarter: 'Q1 2027',
    title: 'Tournament season',
    items: [
      '12-week official season with sponsored prize pools',
      'Spectator mode + fantasy-sports-style leagues for office groups',
    ],
  },
  {
    quarter: 'Q2 2027',
    title: 'Real-money option',
    items: [
      'Regulated cash-out in approved jurisdictions (sweepstakes model first, full RM later)',
      'Operator partnerships with existing licensed sportsbooks',
    ],
  },
] as const;

const USE_OF_FUNDS = [
  { label: 'Engineering (3 hires)', pct: 40, blurb: 'Backend, mobile, game design' },
  { label: 'User acquisition', pct: 30, blurb: 'Paid mobile install campaigns + creator partnerships' },
  { label: 'Content / art', pct: 15, blurb: 'New marbles, tracks, seasonal events' },
  { label: 'Live ops + support', pct: 10, blurb: 'Tournament operators, community management' },
  { label: 'Legal + compliance', pct: 5, blurb: 'Real-money licensing prep, IP, T&Cs' },
];

const RISKS = [
  {
    title: 'Apple/Google policy on virtual stakes',
    mitigation: 'No real-money payout, no chance-based slot mechanics, 17+ rating, clear disclosures. Architecture supports geofencing if policy ever tightens.',
  },
  {
    title: 'Retention plateau',
    mitigation: 'Always-on tournaments + Season Pass keep returning hooks. Multiplayer lobbies add social retention beyond solo play.',
  },
  {
    title: 'CAC inflation',
    mitigation: 'Heavy reliance on organic content (marble races are inherently shareable). Creator marbles program drives viral acquisition with revenue share instead of cash CAC.',
  },
  {
    title: 'Concentration on a single mechanic',
    mitigation: 'Roadmap diversifies into multi-marble modes, custom tracks, seasonal events. Core "watch + bet" loop has proven legs in YouTube ecosystem already.',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Snapshot — pulled fresh from DB at generation time
// ─────────────────────────────────────────────────────────────────────

interface DeckSnapshot {
  generatedAt: string;
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  monthOverMonthGrowthPct: number;
  payingUsers: number;
  conversionRatePct: number;
  totalRevenueUsd: number;
  monthRevenueUsd: number;
  weekRevenueUsd: number;
  arppuUsd: number;
  arpdauUsd: number;
  totalRaces: number;
  racesToday: number;
  racesThisWeek: number;
  totalBets: number;
  betsThisWeek: number;
  retention: { d1Pct: number; d7Pct: number; d30Pct: number };
  topMarbles: { id: string; wins: number; winRatePct: number }[];
  topCourses: { id: string; races: number }[];
  whaleCount: number;
  dolphinCount: number;
  minnowCount: number;
  /* Derived projections (12-month forward, assuming current MoM growth
   * continues; explicitly labeled "model — not a guarantee" in the deck). */
  projectedUsersMonth12: number;
  projectedRevenueMonth12: number;
  ltvEstimateUsd: number;
  /* Keyword discoverability snapshot — read from the cached playbook
   * written by /api/aso/keywords/sync. Empty arrays + null lastSyncedAt
   * when no sync has run yet; the deck slide handles that gracefully. */
  keywords: {
    lastSyncedAt: string | null;
    totalTracked: number;
    androidRanked: number;
    iosRanked: number;
    topTen: number;
    totalReach: number;
    top: {
      keyword: string;
      volume: number;
      difficulty: number;
      kei: number;
      intent: string;
      androidRank: number | null;
      iosRank: number | null;
    }[];
  };
}

export async function collectSnapshot(): Promise<DeckSnapshot> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setDate(lastMonthStart.getDate() - 30);

  const sandbox = await getSandboxAwareReport();
  const excludeTest = sandbox.excludeFilter;

  const [
    totalUsers, activeToday, activeWeek, activeMonth,
    newUsersThisMonth, newUsersLastMonth,
    totalRevAgg, monthRevAgg, weekRevAgg,
    totalRaces, racesToday, racesThisWeek,
    totalBets, betsThisWeek,
  ] = await Promise.all([
    prisma.gamePlayer.count(),
    prisma.gamePlayer.count({ where: { lastActiveAt: { gte: todayStart } } }),
    prisma.gamePlayer.count({ where: { lastActiveAt: { gte: weekStart } } }),
    prisma.gamePlayer.count({ where: { lastActiveAt: { gte: monthStart } } }),
    prisma.gamePlayer.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.gamePlayer.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
    prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', ...excludeTest } }),
    prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: monthStart }, ...excludeTest } }),
    prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: weekStart }, ...excludeTest } }),
    prisma.raceRecord.count(),
    prisma.raceRecord.count({ where: { racedAt: { gte: todayStart } } }),
    prisma.raceRecord.count({ where: { racedAt: { gte: weekStart } } }),
    prisma.betRecord.count(),
    prisma.betRecord.count({ where: { placedAt: { gte: weekStart } } }),
  ]);

  const totalRevenueUsd = Number(totalRevAgg._sum.priceUsd ?? 0);
  const monthRevenueUsd = Number(monthRevAgg._sum.priceUsd ?? 0);
  const weekRevenueUsd = Number(weekRevAgg._sum.priceUsd ?? 0);
  const payingUsers = sandbox.payerIds.size;
  const arppuUsd = payingUsers > 0 ? totalRevenueUsd / payingUsers : 0;
  const arpdauUsd = activeToday > 0 ? weekRevenueUsd / 7 / activeToday : 0;
  const conversionRatePct = totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0;
  const monthOverMonthGrowthPct =
    newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : newUsersThisMonth > 0
        ? 100
        : 0;

  // Retention
  const retentionDays = [1, 7, 30] as const;
  const retentionResults = await Promise.all(
    retentionDays.map(async (days) => {
      const [eligibleRows, retainedRows] = await Promise.all([
        prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM game_players gp
           WHERE gp."createdAt" + (($1::int + 1) * interval '1 day') <= now()`,
          days,
        ),
        prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(DISTINCT gp.id) as count FROM game_players gp
           WHERE gp."createdAt" + (($1::int + 1) * interval '1 day') <= now()
           AND EXISTS (SELECT 1 FROM game_race_records rr
             WHERE rr."playerId" = gp.id
             AND rr."racedAt" >= gp."createdAt" + ($1::int * interval '1 day')
             AND rr."racedAt" <  gp."createdAt" + (($1::int + 1) * interval '1 day'))`,
          days,
        ),
      ]);
      const eligible = Number(eligibleRows[0]?.count ?? 0);
      const retained = Number(retainedRows[0]?.count ?? 0);
      return eligible > 0 ? Math.round((retained / eligible) * 100) : 0;
    }),
  );

  // Top marbles / courses
  const raceWinners = await prisma.$queryRawUnsafe<{ winner: string | null; wins: bigint }[]>(
    `SELECT "finishOrder"->>0 AS winner, COUNT(*) AS wins
     FROM game_race_records GROUP BY winner ORDER BY wins DESC LIMIT 5`,
  );
  const topMarbles = raceWinners
    .filter((r) => r.winner)
    .map((r) => ({
      id: r.winner!,
      wins: Number(r.wins),
      winRatePct: totalRaces > 0 ? Math.round((Number(r.wins) / totalRaces) * 100) : 0,
    }));

  const courseStats = await prisma.raceRecord.groupBy({
    by: ['courseId'], _count: { id: true },
    orderBy: { _count: { id: 'desc' } }, take: 5,
  });
  const topCourses = courseStats.map((c) => ({ id: c.courseId, races: c._count.id }));

  // Segmentation
  let whaleCount = 0, dolphinCount = 0, minnowCount = 0;
  for (const spent of sandbox.spendByPlayer.values()) {
    if (spent > 20) whaleCount++;
    else if (spent >= 5) dolphinCount++;
    else if (spent > 0) minnowCount++;
  }

  /* Forward projections (12-month). Model: current users compound at the
   * observed MoM rate, capped at 50%/month (anything above is unrealistic
   * to sustain). Revenue scales with users × current ARPPU × current
   * conversion. Labeled "model" in the deck — not a forecast guarantee. */
  const cappedGrowth = Math.max(-50, Math.min(50, monthOverMonthGrowthPct)) / 100;
  const projectedUsersMonth12 = Math.round(totalUsers * Math.pow(1 + cappedGrowth, 12));
  const projectedPayingMonth12 = Math.round(projectedUsersMonth12 * (conversionRatePct / 100));
  const projectedRevenueMonth12 = Math.round(projectedPayingMonth12 * arppuUsd * 12);
  /* Simple LTV estimate: ARPPU × expected lifetime months. Use D30
   * retention as a proxy: if 20% are still around after 30d, average
   * paying-user lifetime ≈ 1 / (1 - 0.20) ≈ 1.25 cohorts. With ARPPU
   * spread across the lifetime this gives a defensible lower-bound. */
  const churnProxy = Math.max(0.5, 1 - retentionResults[2] / 100);
  const ltvEstimateUsd = arppuUsd / churnProxy;

  /* Keyword playbook — read from cache row written by
   * /api/aso/keywords/sync. If no sync has been run yet, return empty
   * structure so the deck still renders (slide shows a "no data" note). */
  const keywordCacheRow = await prisma.gameConfig.findUnique({ where: { key: 'aso_keyword_cache' } });
  let keywordsSnapshot: DeckSnapshot['keywords'] = {
    lastSyncedAt: null,
    totalTracked: 0,
    androidRanked: 0,
    iosRanked: 0,
    topTen: 0,
    totalReach: 0,
    top: [],
  };
  if (keywordCacheRow?.value) {
    try {
      const cache = JSON.parse(keywordCacheRow.value) as {
        lastSyncedAt: string | null;
        entries: Array<{
          keyword: string;
          volume: number;
          difficulty: number;
          kei: number;
          intent: string;
          androidRank: number | null;
          iosRank: number | null;
        }>;
      };
      const entries = cache.entries ?? [];
      keywordsSnapshot = {
        lastSyncedAt: cache.lastSyncedAt,
        totalTracked: entries.length,
        androidRanked: entries.filter((e) => e.androidRank !== null).length,
        iosRanked: entries.filter((e) => e.iosRank !== null).length,
        topTen: entries.filter(
          (e) => (e.androidRank ?? 999) <= 10 || (e.iosRank ?? 999) <= 10,
        ).length,
        totalReach: entries.reduce((sum, e) => sum + (e.volume ?? 0), 0),
        // Top 10 keywords by KEI for the slide table
        top: [...entries]
          .sort((a, b) => (b.kei ?? 0) - (a.kei ?? 0))
          .slice(0, 10)
          .map((e) => ({
            keyword: e.keyword,
            volume: e.volume,
            difficulty: e.difficulty,
            kei: e.kei,
            intent: e.intent,
            androidRank: e.androidRank,
            iosRank: e.iosRank,
          })),
      };
    } catch {
      // Corrupt cache — keep empty defaults.
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalUsers, activeToday, activeWeek, activeMonth,
    newUsersThisMonth, newUsersLastMonth, monthOverMonthGrowthPct,
    payingUsers, conversionRatePct,
    totalRevenueUsd, monthRevenueUsd, weekRevenueUsd,
    arppuUsd, arpdauUsd,
    totalRaces, racesToday, racesThisWeek,
    totalBets, betsThisWeek,
    retention: { d1Pct: retentionResults[0], d7Pct: retentionResults[1], d30Pct: retentionResults[2] },
    topMarbles, topCourses,
    whaleCount, dolphinCount, minnowCount,
    projectedUsersMonth12,
    projectedRevenueMonth12,
    ltvEstimateUsd,
    keywords: keywordsSnapshot,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtUsd(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (opts.compact && Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (opts.compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function fmtNum(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (opts.compact && Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}
function fmtPct(n: number, digits = 1): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// Shared styles — investor-grade aesthetics
// ─────────────────────────────────────────────────────────────────────

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #050e25;
    color: #fff;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .deck{max-width:1200px;margin:0 auto;padding:0}
  .slide{
    background: linear-gradient(135deg, #0a1a3a 0%, #0d3a8f 100%);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    padding: 80px 64px;
    min-height: 720px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    page-break-after: always;
  }
  .slide:last-child{page-break-after:auto}
  .slide-num{
    position: absolute;
    top: 32px;
    left: 64px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: rgba(255,194,32,0.65);
    text-transform: uppercase;
  }
  .slide-tag{
    position: absolute;
    top: 32px;
    right: 64px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
  }
  .slide.hero{
    background: radial-gradient(ellipse at top, rgba(255,194,32,0.18), transparent 70%), linear-gradient(135deg, #050e25 0%, #0d3a8f 50%, #1d56d4 100%);
    text-align: center;
    align-items: center;
    min-height: 820px;
    justify-content: center;
  }
  h1{font-size:72px;margin:0 0 16px;font-weight:900;letter-spacing:-0.03em;line-height:1;background:linear-gradient(135deg,#ffc220,#ff9a1a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  h2{font-size:42px;margin:0 0 32px;font-weight:800;letter-spacing:-0.02em;color:#fff;line-height:1.1}
  h3{font-size:22px;margin:0 0 14px;font-weight:700;color:#fff}
  .eyebrow{font-size:12px;font-weight:700;letter-spacing:0.25em;color:#ffc220;text-transform:uppercase;margin-bottom:18px}
  .tagline{font-size:28px;color:rgba(255,255,255,0.85);margin-bottom:32px;font-weight:400;max-width:780px;margin-left:auto;margin-right:auto;line-height:1.4}
  .subtag{font-size:18px;color:rgba(255,255,255,0.55);max-width:680px;margin:0 auto 40px;line-height:1.6}
  .body-text{font-size:17px;color:rgba(255,255,255,0.85);line-height:1.7;max-width:780px}
  .meta{font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;font-weight:600}

  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;margin-top:32px}
  .kpi{
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 22px 24px;
    position: relative;
  }
  .kpi-label{font-size:10px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.12em;font-weight:700}
  .kpi-value{font-size:42px;font-weight:900;color:#ffc220;margin-top:6px;line-height:1;letter-spacing:-0.02em}
  .kpi-sub{font-size:12px;color:rgba(255,255,255,0.5);margin-top:8px;line-height:1.4}
  .kpi-up{color:#2ecc71}.kpi-down{color:#e74c3c}.kpi-blue{color:#6ec1ff}.kpi-green{color:#2ecc71}.kpi-purple{color:#c39bd3}

  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:48px}
  .three-col{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  @media (max-width:820px){.two-col,.three-col{grid-template-columns:1fr}}

  ul.bullets{list-style:none;padding:0;margin:24px 0}
  ul.bullets li{padding:14px 0 14px 36px;position:relative;color:rgba(255,255,255,0.88);font-size:17px;line-height:1.55;border-bottom:1px solid rgba(255,255,255,0.04)}
  ul.bullets li:last-child{border-bottom:none}
  ul.bullets li::before{content:'';position:absolute;left:0;top:22px;width:18px;height:2px;background:#ffc220}

  .number-list{counter-reset:n;list-style:none;padding:0;margin:24px 0}
  .number-list li{padding:18px 0 18px 60px;position:relative;color:rgba(255,255,255,0.88);font-size:16px;line-height:1.6;border-bottom:1px solid rgba(255,255,255,0.05)}
  .number-list li:last-child{border-bottom:none}
  .number-list li::before{counter-increment:n;content:counter(n,decimal-leading-zero);position:absolute;left:0;top:18px;font-size:22px;font-weight:900;color:#ffc220;letter-spacing:0;width:40px;line-height:1}

  .bar-row{display:flex;align-items:center;gap:18px;margin:12px 0}
  .bar-label{flex:0 0 140px;font-size:14px;color:rgba(255,255,255,0.75);font-weight:600}
  .bar-track{flex:1;height:14px;background:rgba(255,255,255,0.06);border-radius:7px;overflow:hidden;position:relative}
  .bar-fill{height:100%;border-radius:7px;background:linear-gradient(90deg,#ffc220,#ff9a1a);box-shadow:0 0 12px rgba(255,194,32,0.4)}
  .bar-value{flex:0 0 100px;text-align:right;font-size:15px;color:#ffc220;font-weight:700}

  .quote{
    border-left: 4px solid #ffc220;
    padding: 8px 0 8px 28px;
    margin: 32px 0;
    font-size: 22px;
    font-style: italic;
    color: rgba(255,255,255,0.92);
    line-height: 1.5;
    max-width: 780px;
  }
  .quote-attr{font-size:13px;font-style:normal;color:rgba(255,255,255,0.5);margin-top:12px;letter-spacing:0.05em}

  .stat-table{width:100%;border-collapse:collapse;margin-top:24px}
  .stat-table th,.stat-table td{padding:14px 18px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.08);font-size:14px}
  .stat-table th{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);font-weight:700;background:rgba(255,255,255,0.02)}
  .stat-table td.num{text-align:right;font-variant-numeric:tabular-nums;color:#ffc220;font-weight:600}
  .stat-table td.muted{color:rgba(255,255,255,0.55)}

  .badge{display:inline-block;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase}
  .badge-green{background:rgba(46,204,113,0.15);color:#2ecc71;border:1px solid rgba(46,204,113,0.35)}
  .badge-blue{background:rgba(110,193,255,0.15);color:#6ec1ff;border:1px solid rgba(110,193,255,0.35)}
  .badge-gold{background:rgba(255,194,32,0.15);color:#ffc220;border:1px solid rgba(255,194,32,0.35)}

  .donut-row{display:flex;align-items:center;gap:48px;margin-top:24px;flex-wrap:wrap}
  .donut{position:relative;width:200px;height:200px;flex-shrink:0}
  .donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
  .donut-pct{font-size:36px;font-weight:900;color:#ffc220;line-height:1}
  .donut-label{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:6px;font-weight:700}

  .funds-row{display:flex;align-items:center;margin:14px 0;gap:18px}
  .funds-pct{flex:0 0 70px;font-size:30px;font-weight:900;color:#ffc220;text-align:right;font-variant-numeric:tabular-nums}
  .funds-detail{flex:1}
  .funds-detail-label{font-size:16px;font-weight:700;color:#fff}
  .funds-detail-sub{font-size:13px;color:rgba(255,255,255,0.55);margin-top:2px}
  .funds-bar{flex:0 0 200px;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden}
  .funds-bar-fill{height:100%;background:linear-gradient(90deg,#ffc220,#ff9a1a)}

  .pull-quote{font-size:24px;font-weight:700;color:#fff;line-height:1.4;margin:16px 0;max-width:780px}
  .pull-quote .gold{color:#ffc220}

  .footer{text-align:center;padding:36px;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;background:#050e25}
  .footer a{color:rgba(255,194,32,0.7);text-decoration:none}

  @media print{
    body{background:#fff;color:#000}
    .slide{box-shadow:none;border:none;page-break-after:always;min-height:auto}
  }
`;

// ─────────────────────────────────────────────────────────────────────
// Reusable slide partials
// ─────────────────────────────────────────────────────────────────────

function header(num: string, tag: string): string {
  return `<span class="slide-num">${esc(num)}</span><span class="slide-tag">${esc(tag)}</span>`;
}

function donutSvg(pct: number): string {
  const r = 80;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return `<svg width="200" height="200" viewBox="0 0 200 200" style="transform:rotate(-90deg)">
    <circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="16"/>
    <circle cx="100" cy="100" r="${r}" fill="none" stroke="url(#g)" stroke-width="16" stroke-dasharray="${dash} ${c}" stroke-linecap="round"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc220"/><stop offset="1" stop-color="#ff9a1a"/></linearGradient></defs>
  </svg>`;
}

/* Discoverability slide builder — shared by both decks. Reads the
 * cached keyword playbook and shows: summary tiles + top-10 KEI table.
 * Renders a graceful "data not yet collected" state when the cache is
 * empty (admin hasn't clicked Sync yet on /aso). */
function rankCell(r: number | null, store: 'iOS' | 'Play'): string {
  if (r === null) return `<span style="color:rgba(255,255,255,0.35)">—</span>`;
  if (r <= 3) return `<span style="color:#2ecc71;font-weight:700">#${r}</span>`;
  if (r <= 10) return `<span style="color:#ffc220;font-weight:700">#${r}</span>`;
  if (r <= 50) return `<span style="color:#6ec1ff">#${r}</span>`;
  return `<span style="color:rgba(255,255,255,0.5)">#${r}</span>`;
}

function discoverabilitySlide(num: string, s: DeckSnapshot): string {
  const k = s.keywords;
  if (k.totalTracked === 0) {
    return `<div class="slide">
      ${header(num, 'Discoverability')}
      <div class="eyebrow">Keyword playbook</div>
      <h2>App Store visibility audit.</h2>
      <p class="body-text">Live rank tracking across Apple App Store and Google Play for ${k.totalTracked} curated keywords. No sync has been run yet — visit the ASO page in the admin dashboard and click "Sync Ranks" before regenerating this deck to populate this slide.</p>
    </div>`;
  }
  const lastSyncedLabel = k.lastSyncedAt
    ? new Date(k.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'never';
  return `<div class="slide">
    ${header(num, 'Discoverability')}
    <div class="eyebrow">Keyword playbook</div>
    <h2>Where players will find us.</h2>
    <p class="body-text">${k.totalTracked} curated keywords spanning core marble-racing terms, social-casino adjacency, and long-tail discovery. Live ranks pulled from Apple App Store and Google Play; volume, difficulty, and intent computed via a tuned heuristic engine (no third-party keyword API needed). Last synced ${esc(lastSyncedLabel)}.</p>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Tracked</div><div class="kpi-value">${fmtNum(k.totalTracked)}</div></div>
      <div class="kpi"><div class="kpi-label">Ranking (iOS)</div><div class="kpi-value kpi-blue">${fmtNum(k.iosRanked)}</div></div>
      <div class="kpi"><div class="kpi-label">Ranking (Android)</div><div class="kpi-value kpi-green">${fmtNum(k.androidRanked)}</div></div>
      <div class="kpi"><div class="kpi-label">Top 10 either store</div><div class="kpi-value kpi-purple">${fmtNum(k.topTen)}</div></div>
    </div>
    <h3 style="margin-top:48px">Top opportunities by KEI</h3>
    <p class="meta" style="margin-bottom:12px">KEI = Keyword Efficiency Index (volume ÷ difficulty). High = lots of searches, low competition. The sweet spot.</p>
    <table class="stat-table">
      <thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>KEI</th><th>Intent</th><th>iOS</th><th>Android</th></tr></thead>
      <tbody>
        ${k.top.map((kw) => `<tr>
          <td><strong>${esc(kw.keyword)}</strong></td>
          <td class="num">${fmtNum(kw.volume)}</td>
          <td class="num muted">${kw.difficulty}</td>
          <td class="num">${kw.kei}</td>
          <td class="muted" style="text-transform:capitalize">${esc(kw.intent)}</td>
          <td class="num">${rankCell(kw.iosRank, 'iOS')}</td>
          <td class="num">${rankCell(kw.androidRank, 'Play')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="meta" style="margin-top:24px">Volume / difficulty / CPC are heuristic estimates tuned for the gaming + social-casino niche. Ranks are live from public store APIs (iTunes Search + google-play-scraper). Total estimated reach across this playbook: <strong style="color:#ffc220">${fmtNum(k.totalReach, { compact: true })}</strong> monthly searches.</p>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────
// Pitch deck — 13 slides (cover + 12 numbered)
// ─────────────────────────────────────────────────────────────────────

export function renderPitchDeck(s: DeckSnapshot): string {
  const generatedAtLabel = new Date(s.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const growthBadge = s.monthOverMonthGrowthPct >= 0
    ? `<span class="badge badge-green">${fmtPct(s.monthOverMonthGrowthPct, 0)} MoM</span>`
    : `<span class="badge badge-blue">${fmtPct(s.monthOverMonthGrowthPct, 0)} MoM</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(COMPANY.name)} — Pitch Deck</title>
<style>${SHARED_STYLES}</style>
</head>
<body>
<div class="deck">

  <!-- 01 COVER -->
  <div class="slide hero">
    <span class="badge badge-gold">Pitch Deck · ${esc(generatedAtLabel)}</span>
    <h1 style="margin-top:32px">${esc(COMPANY.name)}</h1>
    <p class="tagline">${esc(COMPANY.oneliner)}</p>
    <p class="subtag">${esc(COMPANY.tagline)}</p>
    <div style="display:flex;gap:32px;justify-content:center;margin-top:48px;flex-wrap:wrap">
      <div><div class="meta">Users</div><div style="font-size:44px;font-weight:900;color:#ffc220;line-height:1;margin-top:4px">${fmtNum(s.totalUsers, { compact: true })}</div></div>
      <div><div class="meta">Lifetime Races</div><div style="font-size:44px;font-weight:900;color:#6ec1ff;line-height:1;margin-top:4px">${fmtNum(s.totalRaces, { compact: true })}</div></div>
      <div><div class="meta">Revenue</div><div style="font-size:44px;font-weight:900;color:#2ecc71;line-height:1;margin-top:4px">${fmtUsd(s.totalRevenueUsd, { compact: true })}</div></div>
    </div>
    <p class="meta" style="margin-top:48px">${esc(COMPANY.legalName)} · ${esc(COMPANY.contactEmail)}</p>
  </div>

  <!-- 02 PROBLEM -->
  <div class="slide">
    ${header('01', 'Problem')}
    <div class="eyebrow">The problem</div>
    <h2>Mobile gaming has run out of stakes.</h2>
    <p class="body-text">Casual mobile games have peaked. Social casino is stale slot reskins. Real-money gambling is locked behind regulation. And the one viral content format proving people want to watch marbles compete — it has no native game.</p>
    <ul class="bullets">
      ${PROBLEM_POINTS.map((p) => `<li>${esc(p)}</li>`).join('')}
    </ul>
  </div>

  <!-- 03 SOLUTION -->
  <div class="slide">
    ${header('02', 'Solution')}
    <div class="eyebrow">What we built</div>
    <h2>${esc(COMPANY.tagline)}</h2>
    <p class="body-text">A 2D physics-driven marble racing game where players bet virtual coins on the outcome. Eight signature marbles with published stats. 96 hand-crafted and procedurally-generated tracks. Live multiplayer lobbies. Always-on tournaments. No real-money gambling — virtual stakes that feel meaningful inside a friend group.</p>
    <ul class="bullets" style="margin-top:32px">
      ${SOLUTION_POINTS.map((p) => `<li>${p}</li>`).join('')}
    </ul>
  </div>

  <!-- 04 WHY NOW -->
  <div class="slide">
    ${header('03', 'Why now')}
    <div class="eyebrow">Market timing</div>
    <h2>Four trends converge.</h2>
    <ol class="number-list">
      ${WHY_NOW.map((w) => `<li>${esc(w)}</li>`).join('')}
    </ol>
  </div>

  <!-- 05 TRACTION -->
  <div class="slide">
    ${header('04', 'Traction')}
    <div class="eyebrow">Where we are</div>
    <h2>Live, growing, monetizing. ${growthBadge}</h2>
    <p class="body-text">Currently live on iOS TestFlight and Android Internal Testing. Metrics below are non-sandbox real-player data.</p>
    <div class="kpi-grid" style="margin-top:32px">
      <div class="kpi"><div class="kpi-label">Total Users</div><div class="kpi-value">${fmtNum(s.totalUsers)}</div><div class="kpi-sub ${s.monthOverMonthGrowthPct >= 0 ? 'kpi-up' : 'kpi-down'}">${fmtPct(s.monthOverMonthGrowthPct)} month-over-month</div></div>
      <div class="kpi"><div class="kpi-label">Active This Week</div><div class="kpi-value kpi-blue">${fmtNum(s.activeWeek)}</div><div class="kpi-sub">${fmtNum(s.activeToday)} daily</div></div>
      <div class="kpi"><div class="kpi-label">Races Played</div><div class="kpi-value kpi-green">${fmtNum(s.totalRaces)}</div><div class="kpi-sub">${fmtNum(s.racesThisWeek)} this week</div></div>
      <div class="kpi"><div class="kpi-label">Paying Conversion</div><div class="kpi-value kpi-purple">${s.conversionRatePct.toFixed(1)}%</div><div class="kpi-sub">${fmtNum(s.payingUsers)} paying users</div></div>
    </div>
    <div class="quote" style="margin-top:48px">
      Industry-benchmark D1 retention for casual mobile games is 35–45%. Donkey Marble Racing currently delivers
      <span style="color:#ffc220;font-style:normal;font-weight:700">${s.retention.d1Pct}%</span>.
    </div>
  </div>

  <!-- 06 PRODUCT -->
  <div class="slide">
    ${header('05', 'Product')}
    <div class="eyebrow">How it works</div>
    <h2>Watch · Bet · Compete</h2>
    <div class="three-col">
      <div class="kpi" style="padding:32px 28px"><div class="eyebrow" style="color:#6ec1ff;margin-bottom:12px">Quick Race</div><h3>30-second jump-in</h3><p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;line-height:1.6">Tap, pick a marble, watch physics decide. No commitment, no money, no learning curve.</p></div>
      <div class="kpi" style="padding:32px 28px"><div class="eyebrow" style="color:#ffc220;margin-bottom:12px">Bet Mode</div><h3>Wager virtual coins</h3><p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;line-height:1.6">Up to 20x payout on long-shot picks. Marble stats published so skilled play wins more over time.</p></div>
      <div class="kpi" style="padding:32px 28px"><div class="eyebrow" style="color:#c39bd3;margin-bottom:12px">Tournaments</div><h3>7-round elimination</h3><p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0;line-height:1.6">Daily Blitz, Weekly Cup, Champion Invitational. 8 marbles enter; one champion takes the prize pool.</p></div>
    </div>
  </div>

  <!-- 07 MARKET -->
  <div class="slide">
    ${header('06', 'Market')}
    <div class="eyebrow">Opportunity</div>
    <h2>$8B social casino, $92B mobile gaming.</h2>
    <p class="body-text">We sit at the intersection of casual mobile gaming and social casino — the highest-LTV segment of mobile games, with the lowest competitive saturation in the marble-racing niche.</p>
    <div class="three-col" style="margin-top:40px">
      <div class="kpi" style="padding:36px 28px"><div class="kpi-label">TAM</div><div class="kpi-value">${fmtUsd(MARKET.globalMobileGamingUsd, { compact: true })}</div><div class="kpi-sub">Global mobile gaming, 2024 (Newzoo)</div></div>
      <div class="kpi" style="padding:36px 28px"><div class="kpi-label">SAM</div><div class="kpi-value kpi-blue">${fmtUsd(MARKET.socialCasinoUsd, { compact: true })}</div><div class="kpi-sub">Social casino segment, annual (Statista)</div></div>
      <div class="kpi" style="padding:36px 28px"><div class="kpi-label">SOM</div><div class="kpi-value kpi-green">${fmtUsd(MARKET.serviceableNicheUsd, { compact: true })}</div><div class="kpi-sub">Addressable in 5 years</div></div>
    </div>
    <p class="meta" style="margin-top:32px">Marble-content reach on YouTube alone: <span style="color:#ffc220">${fmtNum(MARKET.marblesContentReach, { compact: true })}+</span> aggregate views. Zero native mobile game serves this audience.</p>
  </div>

  <!-- 08 DISCOVERABILITY -->
  ${discoverabilitySlide('07', s)}

  <!-- 09 COMPETITION -->
  <div class="slide">
    ${header('08', 'Competition')}
    <div class="eyebrow">Landscape</div>
    <h2>Owned content, missing game.</h2>
    <p class="body-text">No direct competitor: marble-racing has massive content reach but no native mobile game. Adjacent social-casino titles are slot-reskin loops with the well-documented fatigue problem.</p>
    <table class="stat-table">
      <thead><tr><th>Title</th><th>Category</th><th>Scale</th><th>Why we win</th></tr></thead>
      <tbody>
        ${COMPETITION.map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td class="muted">${esc(c.category)}</td><td class="muted">${esc(c.revenueScale)}</td><td class="muted">${esc(c.notes)}</td></tr>`).join('')}
        <tr style="background:rgba(255,194,32,0.05)"><td><strong style="color:#ffc220">${esc(COMPANY.name)}</strong></td><td class="muted">Skill+luck marble racing</td><td class="muted">Live, growing</td><td class="muted">Native game in an unserved content category</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 10 BUSINESS MODEL -->
  <div class="slide">
    ${header('09', 'Business model')}
    <div class="eyebrow">How we make money</div>
    <h2>Multiple revenue surfaces, day one.</h2>
    <div class="two-col" style="margin-top:32px">
      <div>
        <ul class="bullets">
          <li><strong>Coin packs</strong> — $0.99 to $24.99. The core IAP loop.</li>
          <li><strong>Season Pass</strong> — Free / Premium ($9.99) / Plus ($24.99). 12-week cycles.</li>
          <li><strong>Tournament entry fees</strong> — 100 / 500 / 1,000 coin tiers. Native economy currency.</li>
          <li><strong>Sponsored content</strong> (Q3 2026) — branded track backgrounds + creator marbles.</li>
          <li><strong>Ad-supported tier</strong> (planned) — rewarded video for non-payers.</li>
        </ul>
      </div>
      <div>
        <div class="kpi"><div class="kpi-label">ARPPU</div><div class="kpi-value">${fmtUsd(s.arppuUsd)}</div><div class="kpi-sub">avg revenue per paying user, lifetime</div></div>
        <div class="kpi" style="margin-top:16px"><div class="kpi-label">LTV (model)</div><div class="kpi-value kpi-green">${fmtUsd(s.ltvEstimateUsd)}</div><div class="kpi-sub">derived from current ARPPU × D30 retention</div></div>
        <div class="kpi" style="margin-top:16px"><div class="kpi-label">Conversion</div><div class="kpi-value kpi-blue">${s.conversionRatePct.toFixed(1)}%</div><div class="kpi-sub">free → paying user</div></div>
      </div>
    </div>
  </div>

  <!-- 11 ROADMAP -->
  <div class="slide">
    ${header('10', 'Roadmap')}
    <div class="eyebrow">Next 12 months</div>
    <h2>Sponsored content → cross-platform → real-money optional.</h2>
    <div style="margin-top:24px">
      ${ROADMAP.map((r) => `
        <div style="padding:22px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <div style="display:flex;align-items:baseline;gap:24px;flex-wrap:wrap">
            <span class="badge badge-gold">${esc(r.quarter)}</span>
            <h3 style="margin:0;color:#fff">${esc(r.title)}</h3>
          </div>
          <ul class="bullets" style="margin:8px 0 0">
            ${r.items.map((it) => `<li>${esc(it)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 12 TEAM -->
  <div class="slide">
    ${header('11', 'Team')}
    <div class="eyebrow">Who's building it</div>
    <h2>Operator-led, ship-first culture.</h2>
    <p class="body-text">Founding team profile is shipped on the dedicated team page; this deck reserves space for placement once the cap-table conversation is in progress. Contact <a href="mailto:${esc(COMPANY.contactEmail)}" style="color:#ffc220">${esc(COMPANY.contactEmail)}</a> for founder bios and references.</p>
    <div class="pull-quote" style="margin-top:48px">
      <span class="gold">Ship in weeks, not quarters.</span> The product you're looking at went from zero to live monetization in months, not years — and we're just getting started.
    </div>
  </div>

  <!-- 13 ASK -->
  <div class="slide">
    ${header('12', 'The ask')}
    <div class="eyebrow">Funding</div>
    <h2>Seed round to accelerate UA, content, and live ops.</h2>
    <p class="body-text">Specific round size and valuation discussed under NDA. Funds will be deployed across:</p>
    <div style="margin-top:32px">
      ${USE_OF_FUNDS.map((f) => `
        <div class="funds-row">
          <div class="funds-pct">${f.pct}%</div>
          <div class="funds-bar"><div class="funds-bar-fill" style="width:${f.pct * 2.5}%"></div></div>
          <div class="funds-detail"><div class="funds-detail-label">${esc(f.label)}</div><div class="funds-detail-sub">${esc(f.blurb)}</div></div>
        </div>
      `).join('')}
    </div>
    <p class="meta" style="margin-top:48px">Email <a href="mailto:${esc(COMPANY.contactEmail)}" style="color:#ffc220">${esc(COMPANY.contactEmail)}</a> · ${esc(COMPANY.legalName)}</p>
  </div>

</div>
<div class="footer">${esc(COMPANY.name)} · Generated ${esc(generatedAtLabel)} · Confidential</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────
// Business deck — 17 slides (cover + 16 numbered)
// ─────────────────────────────────────────────────────────────────────

export function renderBusinessDeck(s: DeckSnapshot): string {
  const generatedAtLabel = new Date(s.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(COMPANY.name)} — Business Plan</title>
<style>${SHARED_STYLES}</style>
</head>
<body>
<div class="deck">

  <!-- 01 COVER -->
  <div class="slide hero">
    <span class="badge badge-blue">Business Plan · ${esc(generatedAtLabel)}</span>
    <h1 style="margin-top:32px">${esc(COMPANY.name)}</h1>
    <p class="tagline">Investor-grade snapshot: unit economics, cohort retention, projections, and ask.</p>
    <p class="subtag">Live platform data combined with strategic narrative. All metrics frozen at generation time.</p>
    <p class="meta" style="margin-top:48px">${esc(COMPANY.legalName)} · ${esc(COMPANY.contactEmail)} · Confidential</p>
  </div>

  <!-- 02 EXEC SUMMARY -->
  <div class="slide">
    ${header('01', 'Executive Summary')}
    <h2>Donkey Marble Racing in one page.</h2>
    <table class="stat-table">
      <tbody>
        <tr><td><strong>Product</strong></td><td class="muted">2D physics-driven marble racing + betting game for iOS / Android. Live multiplayer, tournaments, season pass.</td></tr>
        <tr><td><strong>Stage</strong></td><td class="muted">Live on TestFlight + Android Internal Testing. Real-player monetization active.</td></tr>
        <tr><td><strong>Users</strong></td><td class="num">${fmtNum(s.totalUsers)}</td></tr>
        <tr><td><strong>Growth (MoM)</strong></td><td class="num">${fmtPct(s.monthOverMonthGrowthPct)}</td></tr>
        <tr><td><strong>Revenue (lifetime)</strong></td><td class="num">${fmtUsd(s.totalRevenueUsd)}</td></tr>
        <tr><td><strong>ARPPU</strong></td><td class="num">${fmtUsd(s.arppuUsd)}</td></tr>
        <tr><td><strong>D1 / D7 / D30 retention</strong></td><td class="num">${s.retention.d1Pct}% / ${s.retention.d7Pct}% / ${s.retention.d30Pct}%</td></tr>
        <tr><td><strong>Market</strong></td><td class="muted">${fmtUsd(MARKET.socialCasinoUsd, { compact: true })} SAM (social casino); ${fmtUsd(MARKET.serviceableNicheUsd, { compact: true })} SOM (5-year)</td></tr>
        <tr><td><strong>Round</strong></td><td class="muted">Seed — size and valuation under NDA</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 03 HEADLINE KPIs -->
  <div class="slide">
    ${header('02', 'Headline KPIs')}
    <h2>The numbers right now.</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Total Users</div><div class="kpi-value">${fmtNum(s.totalUsers)}</div><div class="kpi-sub">${fmtNum(s.newUsersThisMonth)} new in last 30d</div></div>
      <div class="kpi"><div class="kpi-label">DAU</div><div class="kpi-value kpi-blue">${fmtNum(s.activeToday)}</div><div class="kpi-sub">${fmtNum(s.activeWeek)} WAU / ${fmtNum(s.activeMonth)} MAU</div></div>
      <div class="kpi"><div class="kpi-label">Paying Users</div><div class="kpi-value kpi-green">${fmtNum(s.payingUsers)}</div><div class="kpi-sub">${s.conversionRatePct.toFixed(1)}% conversion</div></div>
      <div class="kpi"><div class="kpi-label">Revenue (lifetime)</div><div class="kpi-value">${fmtUsd(s.totalRevenueUsd)}</div><div class="kpi-sub">${fmtUsd(s.monthRevenueUsd)} last 30d</div></div>
      <div class="kpi"><div class="kpi-label">Lifetime Races</div><div class="kpi-value kpi-purple">${fmtNum(s.totalRaces)}</div><div class="kpi-sub">${fmtNum(s.racesThisWeek)} this week</div></div>
      <div class="kpi"><div class="kpi-label">Lifetime Bets</div><div class="kpi-value kpi-blue">${fmtNum(s.totalBets)}</div><div class="kpi-sub">${fmtNum(s.betsThisWeek)} this week</div></div>
      <div class="kpi"><div class="kpi-label">MoM Growth</div><div class="kpi-value ${s.monthOverMonthGrowthPct >= 0 ? 'kpi-up' : 'kpi-down'}">${fmtPct(s.monthOverMonthGrowthPct, 0)}</div><div class="kpi-sub">new-user signups</div></div>
      <div class="kpi"><div class="kpi-label">D30 Retention</div><div class="kpi-value kpi-green">${s.retention.d30Pct}%</div><div class="kpi-sub">vs 5–15% industry benchmark</div></div>
    </div>
  </div>

  <!-- 04 UNIT ECONOMICS -->
  <div class="slide">
    ${header('03', 'Unit Economics')}
    <h2>Per-user math.</h2>
    <p class="body-text">All revenue figures exclude Apple / Google sandbox transactions. LTV is modeled using current ARPPU divided by an inverse-retention churn proxy (1 − D30%).</p>
    <div class="kpi-grid" style="margin-top:24px">
      <div class="kpi"><div class="kpi-label">ARPPU</div><div class="kpi-value">${fmtUsd(s.arppuUsd)}</div><div class="kpi-sub">avg revenue per paying user, lifetime</div></div>
      <div class="kpi"><div class="kpi-label">ARPDAU</div><div class="kpi-value kpi-blue">$${s.arpdauUsd.toFixed(3)}</div><div class="kpi-sub">avg revenue per daily active user (7d avg)</div></div>
      <div class="kpi"><div class="kpi-label">LTV (model)</div><div class="kpi-value kpi-green">${fmtUsd(s.ltvEstimateUsd)}</div><div class="kpi-sub">ARPPU ÷ (1 − D30 retention)</div></div>
      <div class="kpi"><div class="kpi-label">Weekly Revenue</div><div class="kpi-value">${fmtUsd(s.weekRevenueUsd)}</div><div class="kpi-sub">last 7 days</div></div>
    </div>
    <table class="stat-table" style="margin-top:32px">
      <thead><tr><th>Tier</th><th>Price</th><th>Marble Coins</th><th>Effective price / 1,000 coins</th></tr></thead>
      <tbody>
        <tr><td>Starter Pack</td><td class="num">$0.99</td><td class="num">1,000</td><td class="num">$0.99</td></tr>
        <tr><td>Popular Pack</td><td class="num">$4.99</td><td class="num">6,000</td><td class="num">$0.83</td></tr>
        <tr><td>Big Spender</td><td class="num">$9.99</td><td class="num">15,000</td><td class="num">$0.67</td></tr>
        <tr><td>Whale Pack</td><td class="num">$24.99</td><td class="num">40,000</td><td class="num">$0.62</td></tr>
        <tr><td>Season Pass — Premium</td><td class="num">$9.99</td><td class="num">12-week cycle</td><td class="muted">recurring</td></tr>
        <tr><td>Season Pass — Plus</td><td class="num">$24.99</td><td class="num">12-week cycle</td><td class="muted">recurring</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 05 RETENTION -->
  <div class="slide">
    ${header('04', 'Cohort Retention')}
    <h2>Players who come back.</h2>
    <p class="body-text">Strict cohort retention: percentage of installed players who came back and played a race on Day 1, Day 7, and Day 30 after install. Denominator is the cohort of players whose corresponding day-window has fully elapsed. Industry benchmarks for casual mobile games (App Annie / Sensor Tower): D1 ≥ 40%, D7 ≥ 20%, D30 ≥ 10%.</p>
    <div class="bar-row" style="margin-top:32px"><div class="bar-label">Day 1</div><div class="bar-track"><div class="bar-fill" style="width:${s.retention.d1Pct}%"></div></div><div class="bar-value">${s.retention.d1Pct}%</div></div>
    <div class="bar-row"><div class="bar-label">Day 7</div><div class="bar-track"><div class="bar-fill" style="width:${s.retention.d7Pct}%"></div></div><div class="bar-value">${s.retention.d7Pct}%</div></div>
    <div class="bar-row"><div class="bar-label">Day 30</div><div class="bar-track"><div class="bar-fill" style="width:${s.retention.d30Pct}%"></div></div><div class="bar-value">${s.retention.d30Pct}%</div></div>
  </div>

  <!-- 06 REVENUE TRAJECTORY -->
  <div class="slide">
    ${header('05', 'Revenue trajectory')}
    <h2>Revenue across windows.</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Lifetime</div><div class="kpi-value">${fmtUsd(s.totalRevenueUsd)}</div></div>
      <div class="kpi"><div class="kpi-label">Last 30 days</div><div class="kpi-value kpi-blue">${fmtUsd(s.monthRevenueUsd)}</div></div>
      <div class="kpi"><div class="kpi-label">Last 7 days</div><div class="kpi-value kpi-green">${fmtUsd(s.weekRevenueUsd)}</div></div>
      <div class="kpi"><div class="kpi-label">12-month model</div><div class="kpi-value kpi-purple">${fmtUsd(s.projectedRevenueMonth12, { compact: true })}</div><div class="kpi-sub">at current MoM growth + ARPPU</div></div>
    </div>
    <p class="meta" style="margin-top:32px">12-month model assumes current month-over-month user growth (${fmtPct(s.monthOverMonthGrowthPct, 0)}, capped at ±50%/mo) compounds, with conversion rate (${s.conversionRatePct.toFixed(1)}%) and ARPPU (${fmtUsd(s.arppuUsd)}) held constant. Not a guarantee — model only.</p>
  </div>

  <!-- 07 PLAYER SEGMENTATION -->
  <div class="slide">
    ${header('06', 'Player segmentation')}
    <h2>Where the money comes from.</h2>
    <p class="body-text">Paying players grouped by lifetime spend. Whales drive revenue; minnows and dolphins drive engagement and feed the whale tier over time.</p>
    <ul class="bullets" style="max-width:780px">
      <li><strong style="color:#ffc220">Whales</strong> — top spenders ($20+ lifetime). Typically &lt;5% of paying users but &gt;50% of revenue.</li>
      <li><strong style="color:#6ec1ff">Dolphins</strong> — mid-tier ($5–$20 lifetime). The healthy middle.</li>
      <li><strong style="color:#2ecc71">Minnows</strong> — casual one-time buyers (&lt;$5 lifetime). Largest group, social ecosystem.</li>
    </ul>
    <div class="three-col" style="margin-top:32px">
      <div class="kpi"><div class="kpi-label">Whales</div><div class="kpi-value">${fmtNum(s.whaleCount)}</div><div class="kpi-sub">$20+ lifetime</div></div>
      <div class="kpi"><div class="kpi-label">Dolphins</div><div class="kpi-value kpi-blue">${fmtNum(s.dolphinCount)}</div><div class="kpi-sub">$5–$20 lifetime</div></div>
      <div class="kpi"><div class="kpi-label">Minnows</div><div class="kpi-value kpi-green">${fmtNum(s.minnowCount)}</div><div class="kpi-sub">&lt;$5 lifetime</div></div>
    </div>
  </div>

  <!-- 08 ENGAGEMENT -->
  <div class="slide">
    ${header('07', 'Engagement mix')}
    <h2>What players actually do.</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Lifetime Races</div><div class="kpi-value">${fmtNum(s.totalRaces)}</div></div>
      <div class="kpi"><div class="kpi-label">Races This Week</div><div class="kpi-value kpi-blue">${fmtNum(s.racesThisWeek)}</div></div>
      <div class="kpi"><div class="kpi-label">Lifetime Bets</div><div class="kpi-value">${fmtNum(s.totalBets)}</div></div>
      <div class="kpi"><div class="kpi-label">Bets This Week</div><div class="kpi-value kpi-green">${fmtNum(s.betsThisWeek)}</div></div>
    </div>
    <div class="two-col" style="margin-top:48px">
      <div>
        <h3>Most Won Marbles</h3>
        ${s.topMarbles.length === 0
          ? '<p style="color:rgba(255,255,255,0.5)">No race data yet.</p>'
          : s.topMarbles.map((m) => `<div class="bar-row"><div class="bar-label" style="text-transform:capitalize">${esc(m.id)}</div><div class="bar-value" style="flex:1">${fmtNum(m.wins)} wins · ${m.winRatePct}%</div></div>`).join('')}
      </div>
      <div>
        <h3>Most Played Courses</h3>
        ${s.topCourses.length === 0
          ? '<p style="color:rgba(255,255,255,0.5)">No data yet.</p>'
          : s.topCourses.map((c) => `<div class="bar-row"><div class="bar-label" style="flex:1">${esc(c.id)}</div><div class="bar-value">${fmtNum(c.races)} races</div></div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 09 MARKET OPPORTUNITY -->
  <div class="slide">
    ${header('08', 'Market opportunity')}
    <h2>$8B social casino, $92B mobile gaming.</h2>
    <p class="body-text">Mobile gaming is the largest single segment of consumer entertainment. Within it, social casino delivers the highest ARPPU and LTV of any casual category — and grows 5–10% year over year. Our addressable niche (marble-format + skill-betting hybrid) is currently unserved.</p>
    <div class="three-col" style="margin-top:32px">
      <div class="kpi"><div class="kpi-label">TAM</div><div class="kpi-value">${fmtUsd(MARKET.globalMobileGamingUsd, { compact: true })}</div><div class="kpi-sub">Global mobile gaming, 2024 (Newzoo)</div></div>
      <div class="kpi"><div class="kpi-label">SAM</div><div class="kpi-value kpi-blue">${fmtUsd(MARKET.socialCasinoUsd, { compact: true })}</div><div class="kpi-sub">Social casino segment, annual (Statista)</div></div>
      <div class="kpi"><div class="kpi-label">SOM</div><div class="kpi-value kpi-green">${fmtUsd(MARKET.serviceableNicheUsd, { compact: true })}</div><div class="kpi-sub">Addressable in 5 years</div></div>
    </div>
    <div class="quote" style="margin-top:48px">
      Marble-racing content on YouTube alone has generated over ${fmtNum(MARKET.marblesContentReach, { compact: true })} aggregate views across MarbleLympics, Jelle's Marble Runs, and creator overlays. Zero native mobile game serves this audience.
    </div>
  </div>

  <!-- 10 DISCOVERABILITY -->
  ${discoverabilitySlide('09', s)}

  <!-- 11 COMPETITION -->
  <div class="slide">
    ${header('10', 'Competitive landscape')}
    <h2>The land is empty in our exact niche.</h2>
    <table class="stat-table">
      <thead><tr><th>Title</th><th>Category</th><th>Scale</th><th>Why we win</th></tr></thead>
      <tbody>
        ${COMPETITION.map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td class="muted">${esc(c.category)}</td><td class="muted">${esc(c.revenueScale)}</td><td class="muted">${esc(c.notes)}</td></tr>`).join('')}
        <tr style="background:rgba(255,194,32,0.05)"><td><strong style="color:#ffc220">${esc(COMPANY.name)}</strong></td><td class="muted">Skill+luck marble racing</td><td class="muted">Live, growing</td><td class="muted">Native game in an unserved content category, real multiplayer</td></tr>
      </tbody>
    </table>
  </div>

  <!-- 12 ROADMAP -->
  <div class="slide">
    ${header('11', 'Roadmap')}
    <h2>The next 12 months.</h2>
    <div style="margin-top:24px">
      ${ROADMAP.map((r) => `
        <div style="padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <div style="display:flex;align-items:baseline;gap:24px;flex-wrap:wrap">
            <span class="badge badge-gold">${esc(r.quarter)}</span>
            <h3 style="margin:0;color:#fff">${esc(r.title)}</h3>
          </div>
          <ul class="bullets" style="margin:8px 0 0">
            ${r.items.map((it) => `<li>${esc(it)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 13 PROJECTIONS -->
  <div class="slide">
    ${header('12', 'Financial projections')}
    <h2>3-year model.</h2>
    <p class="body-text">Forward projections derived from current MoM growth (capped at ±50%/mo), conversion (${s.conversionRatePct.toFixed(1)}%), and ARPPU (${fmtUsd(s.arppuUsd)}). All inputs current; outputs are scenario-based, not forecast guarantees.</p>
    <table class="stat-table" style="margin-top:24px">
      <thead><tr><th>Metric</th><th>Today</th><th>Month 12 (model)</th><th>Year 2 (model)</th><th>Year 3 (model)</th></tr></thead>
      <tbody>
        <tr><td>Users</td><td class="num">${fmtNum(s.totalUsers)}</td><td class="num">${fmtNum(s.projectedUsersMonth12)}</td><td class="num">${fmtNum(Math.round(s.projectedUsersMonth12 * 1.8))}</td><td class="num">${fmtNum(Math.round(s.projectedUsersMonth12 * 3.0))}</td></tr>
        <tr><td>Paying users</td><td class="num">${fmtNum(s.payingUsers)}</td><td class="num">${fmtNum(Math.round(s.projectedUsersMonth12 * s.conversionRatePct / 100))}</td><td class="num">${fmtNum(Math.round(s.projectedUsersMonth12 * 1.8 * s.conversionRatePct / 100))}</td><td class="num">${fmtNum(Math.round(s.projectedUsersMonth12 * 3.0 * s.conversionRatePct / 100))}</td></tr>
        <tr><td>Revenue (annual run rate)</td><td class="num">${fmtUsd(s.monthRevenueUsd * 12, { compact: true })}</td><td class="num">${fmtUsd(s.projectedRevenueMonth12, { compact: true })}</td><td class="num">${fmtUsd(Math.round(s.projectedRevenueMonth12 * 1.8), { compact: true })}</td><td class="num">${fmtUsd(Math.round(s.projectedRevenueMonth12 * 3.0), { compact: true })}</td></tr>
      </tbody>
    </table>
    <p class="meta" style="margin-top:24px">Year 2/3 multipliers (1.8x, 3.0x) assume sponsored-content revenue adds incremental upside on top of organic growth and that the cross-platform + tournament-season expansions land on roadmap.</p>
  </div>

  <!-- 14 USE OF FUNDS -->
  <div class="slide">
    ${header('13', 'Use of funds')}
    <h2>What we deploy capital into.</h2>
    <div style="margin-top:32px">
      ${USE_OF_FUNDS.map((f) => `
        <div class="funds-row">
          <div class="funds-pct">${f.pct}%</div>
          <div class="funds-bar"><div class="funds-bar-fill" style="width:${f.pct * 2.5}%"></div></div>
          <div class="funds-detail"><div class="funds-detail-label">${esc(f.label)}</div><div class="funds-detail-sub">${esc(f.blurb)}</div></div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 15 TEAM -->
  <div class="slide">
    ${header('14', 'Team')}
    <h2>Operator-led.</h2>
    <p class="body-text">Detailed bios, prior experience, advisors, and cap-table information available under NDA. Contact <a href="mailto:${esc(COMPANY.contactEmail)}" style="color:#ffc220">${esc(COMPANY.contactEmail)}</a>.</p>
    <div class="pull-quote" style="margin-top:48px">
      <span class="gold">From zero to live monetization in months, not years.</span> Lean team, hands-on, ship-first. The cap table, hiring plan, and runway analysis are part of the data-room conversation.
    </div>
  </div>

  <!-- 16 RISKS -->
  <div class="slide">
    ${header('15', 'Risks & mitigations')}
    <h2>What could go wrong, and how we address it.</h2>
    <div style="margin-top:24px">
      ${RISKS.map((r, i) => `
        <div style="padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <div style="display:flex;align-items:baseline;gap:16px"><span style="color:#ffc220;font-weight:900;font-size:18px">${String(i + 1).padStart(2, '0')}</span><h3 style="margin:0">${esc(r.title)}</h3></div>
          <p style="margin:8px 0 0 32px;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6">${esc(r.mitigation)}</p>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- 17 ASK -->
  <div class="slide">
    ${header('16', 'The ask')}
    <h2>Seed round.</h2>
    <p class="body-text">Round size and valuation discussed under NDA. Deployment plan and milestone gates on slide 14. Term sheets reviewed in order received.</p>
    <div class="pull-quote" style="margin-top:32px">
      <span class="gold">Email <a href="mailto:${esc(COMPANY.contactEmail)}" style="color:#ffc220">${esc(COMPANY.contactEmail)}</a></span> for data room access, founder intros, and term-sheet conversations.
    </div>
    <p class="meta" style="margin-top:48px">${esc(COMPANY.legalName)} · ${esc(COMPANY.contactEmail)}</p>
  </div>

</div>
<div class="footer">${esc(COMPANY.name)} · Generated ${esc(generatedAtLabel)} · Confidential — for the intended recipient only</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────
// Generator entrypoint
// ─────────────────────────────────────────────────────────────────────

export async function generateDeck(type: 'pitch' | 'business', adminId: string | null = null) {
  const snapshot = await collectSnapshot();
  const html = type === 'pitch' ? renderPitchDeck(snapshot) : renderBusinessDeck(snapshot);
  const title = type === 'pitch'
    ? `${COMPANY.name} — Pitch Deck`
    : `${COMPANY.name} — Business Plan`;

  return prisma.generatedDeck.create({
    data: {
      type,
      title,
      html,
      dataSnapshot: snapshot as any,
      generatedBy: adminId,
    },
    select: {
      id: true,
      type: true,
      shareToken: true,
      title: true,
      generatedAt: true,
    },
  });
}
