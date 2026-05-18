import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const ALL_MARBLES = ['dash', 'spike', 'rocky', 'lucky', 'frosty', 'nova', 'shadow', 'aqua'];

const MARBLE_STATS: Record<string, { speed: number; power: number; bounce: number; luck: number }> = {
  rocky:  { speed: 3, power: 4, bounce: 2, luck: 3 },
  dash:   { speed: 5, power: 2, bounce: 3, luck: 2 },
  lucky:  { speed: 3, power: 3, bounce: 2, luck: 5 },
  spike:  { speed: 2, power: 5, bounce: 4, luck: 2 },
  nova:   { speed: 4, power: 2, bounce: 3, luck: 4 },
  frosty: { speed: 3, power: 3, bounce: 4, luck: 3 },
  aqua:   { speed: 4, power: 2, bounce: 2, luck: 4 },
  shadow: { speed: 3, power: 4, bounce: 3, luck: 3 },
};

const MARBLE_COLORS: Record<string, string> = {
  dash: '#228be6', spike: '#ffc220', rocky: '#e74c3c', lucky: '#2ecc71',
  frosty: '#e67e22', nova: '#9b59b6', shadow: '#495057', aqua: '#17a2b8',
};

const MARBLE_GRADIENTS: Record<string, string> = {
  dash: 'radial-gradient(circle at 35% 30%, #74c0fc, #228be6)',
  spike: 'radial-gradient(circle at 35% 30%, #ffd43b, #ffc220)',
  rocky: 'radial-gradient(circle at 35% 30%, #ff6b6b, #e74c3c)',
  lucky: 'radial-gradient(circle at 35% 30%, #69db7c, #2ecc71)',
  frosty: 'radial-gradient(circle at 35% 30%, #ff922b, #e67e22)',
  nova: 'radial-gradient(circle at 35% 30%, #da77f2, #9b59b6)',
  shadow: 'radial-gradient(circle at 35% 30%, #868e96, #495057)',
  aqua: 'radial-gradient(circle at 35% 30%, #66d9e8, #17a2b8)',
};

function computePhysics(stats: { speed: number; power: number; bounce: number }) {
  return {
    frictionAir: +(0.008 - stats.speed * 0.0005).toFixed(6),
    density: +(0.001 + stats.power * 0.00005).toFixed(6),
    restitution: +(0.48 + stats.bounce * 0.01).toFixed(4),
    friction: 0.00001,
    frictionStatic: 0.1,
  };
}

const THEME_DISPLAY: Record<string, string> = {
  meadow: 'grass', volcano: 'lava', frozen: 'ice', cyber: 'cyber',
};
function normalizeTheme(raw: string): string {
  return THEME_DISPLAY[raw] || raw;
}

function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return +h.toFixed(4);
}

function chiSquared(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const expected = total / counts.length;
  let chi2 = 0;
  for (const c of counts) {
    chi2 += (c - expected) ** 2 / expected;
  }
  return +chi2.toFixed(2);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const admin = await getUserByToken(token);
    if (!admin) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    // --- A. Engine Config (static) ---
    const engineConfig = {
      engine: 'Matter.js 0.20.0',
      substeps: 3,
      fixedDt: 5.56,
      frameDt: 16.67,
      maxSpeed: 15,
      positionIterations: 10,
      velocityIterations: 8,
      gravity: { handCrafted: 1.0, proceduralRange: '0.95–1.05' },
      doomsday: { triggerMs: 45000, deadlineMs: 60000 },
      collisionCategories: { wall: '0x0001', marble: '0x0002', obstacle: '0x0004', doomsday: '0x0008' },
      surfaceFriction: {
        walls: { friction: 0.01, restitution: 0.2 },
        ramps: { friction: 0.005, restitution: 0.3 },
        bumpers: { friction: 0.001, restitution: 1.2 },
        pegs: { friction: 0.001, restitution: 0.3 },
        windmills: { friction: 0.01, restitution: 0.5 },
        trampolines: { friction: 0.005, restitution: 0.5 },
      },
    };

    // --- Parallel DB queries ---
    const [
      totalRaces,
      overallTimeStats,
      courseTimeStats,
      themeTimeStats,
      modeTimeStats,
      betStats,
      betWins,
      recentRaces,
    ] = await Promise.all([
      prisma.raceRecord.count(),
      prisma.raceRecord.aggregate({
        _avg: { winnerTime: true },
        _min: { winnerTime: true },
        _max: { winnerTime: true },
      }),
      prisma.raceRecord.groupBy({
        by: ['courseId', 'courseTheme'],
        _avg: { winnerTime: true },
        _min: { winnerTime: true },
        _max: { winnerTime: true },
        _count: { id: true },
        orderBy: { _avg: { winnerTime: 'desc' } },
      }),
      prisma.raceRecord.groupBy({
        by: ['courseTheme'],
        _avg: { winnerTime: true },
        _count: { id: true },
      }),
      prisma.raceRecord.groupBy({
        by: ['gameMode'],
        _avg: { winnerTime: true },
        _count: { id: true },
      }),
      prisma.betRecord.groupBy({
        by: ['marbleId'],
        _count: { id: true },
        _sum: { betAmount: true, payout: true },
        _avg: { odds: true },
      }),
      prisma.betRecord.groupBy({
        by: ['marbleId'],
        _count: { id: true },
        where: { won: true },
      }),
      prisma.raceRecord.findMany({
        select: { finishOrder: true, winnerTime: true, courseId: true, courseTheme: true },
        orderBy: { racedAt: 'desc' },
        take: 500,
      }),
    ]);

    // Lifetime doomsday count per course. Previously doomsdayPct mixed
    // recent-500 numerator with the full courseTimeStats denominator, which
    // understated the rate on popular courses. Now both numerator and
    // denominator are lifetime so the percentage is honest.
    const doomsdayThresholdMs = 45000;
    const lifetimeDoomsday = await prisma.raceRecord.groupBy({
      by: ['courseId'],
      where: { winnerTime: { gte: doomsdayThresholdMs } },
      _count: { id: true },
    });
    const lifetimeDoomsdayMap: Record<string, number> = {};
    for (const row of lifetimeDoomsday) {
      lifetimeDoomsdayMap[row.courseId] = row._count.id;
    }

    // --- B. Marble Dynamics ---
    const winMap: Record<string, number> = {};
    betWins.forEach((b: any) => { winMap[b.marbleId] = b._count.id; });

    const betMap: Record<string, { bets: number; wagered: number; paidOut: number; avgOdds: number }> = {};
    betStats.forEach((b: any) => {
      betMap[b.marbleId] = {
        bets: b._count.id,
        wagered: Number(b._sum.betAmount ?? 0),
        paidOut: Number(b._sum.payout ?? 0),
        avgOdds: Number(b._avg.odds ?? 0),
      };
    });

    // Parse finishOrder to compute per-marble avg finish position
    const marblePosAccum: Record<string, { totalPos: number; count: number }> = {};
    ALL_MARBLES.forEach((id) => { marblePosAccum[id] = { totalPos: 0, count: 0 }; });

    // Also build 8x8 fairness matrix
    const fairnessMatrix: Record<string, number[]> = {};
    ALL_MARBLES.forEach((id) => { fairnessMatrix[id] = [0, 0, 0, 0, 0, 0, 0, 0]; });

    // Race time buckets for distribution
    const timeBuckets = [0, 15, 20, 25, 30, 35, 40, 45, Infinity];
    const timeBucketLabels = ['0-15s', '15-20s', '20-25s', '25-30s', '30-35s', '35-40s', '40-45s', '45s+'];
    const timeBucketCounts = new Array(timeBucketLabels.length).fill(0);

    // Doomsday tracking
    let doomsdayCount = 0;
    let safeCount = 0;
    let normalCount = 0;
    const courseDoomsdayMap: Record<string, { total: number; doomsday: number }> = {};

    for (const race of recentRaces) {
      // Parse finish order
      const order = race.finishOrder as string[];
      if (Array.isArray(order)) {
        for (let pos = 0; pos < order.length; pos++) {
          const marbleId = order[pos];
          if (marblePosAccum[marbleId]) {
            marblePosAccum[marbleId].totalPos += pos + 1;
            marblePosAccum[marbleId].count += 1;
          }
          if (fairnessMatrix[marbleId]) {
            fairnessMatrix[marbleId][pos] = (fairnessMatrix[marbleId][pos] || 0) + 1;
          }
        }
      }

      // Race time distribution & doomsday
      const timeMs = Number(race.winnerTime ?? 0);
      const timeSec = timeMs / 1000;

      for (let i = 0; i < timeBuckets.length - 1; i++) {
        if (timeSec >= timeBuckets[i] && timeSec < timeBuckets[i + 1]) {
          timeBucketCounts[i]++;
          break;
        }
      }

      if (timeSec < 30) safeCount++;
      else if (timeSec < 45) normalCount++;
      else doomsdayCount++;

      // Per-course doomsday
      const cid = race.courseId;
      if (!courseDoomsdayMap[cid]) courseDoomsdayMap[cid] = { total: 0, doomsday: 0 };
      courseDoomsdayMap[cid].total++;
      if (timeSec >= 45) courseDoomsdayMap[cid].doomsday++;
    }

    const marbleDynamics = ALL_MARBLES.map((id) => {
      const stats = MARBLE_STATS[id];
      const physics = computePhysics(stats);
      const posData = marblePosAccum[id];
      const bet = betMap[id] || { bets: 0, wagered: 0, paidOut: 0, avgOdds: 0 };
      const raceWins = fairnessMatrix[id][0] ?? 0; // 1st place finishes from race data
      const avgFinish = posData.count > 0 ? +(posData.totalPos / posData.count).toFixed(2) : 0;

      return {
        marbleId: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        color: MARBLE_COLORS[id],
        grad: MARBLE_GRADIENTS[id],
        stats,
        physics,
        avgFinish,
        totalRaces: posData.count,
        wins: raceWins,
        winRate: posData.count > 0 ? Math.round((raceWins / posData.count) * 100) : 0,
        totalBets: bet.bets,
      };
    }).sort((a, b) => (a.avgFinish || 99) - (b.avgFinish || 99));

    // --- C. Race Time Analytics ---
    const avgTimeMs = Number(overallTimeStats._avg.winnerTime ?? 0);
    const minTimeMs = Number(overallTimeStats._min.winnerTime ?? 0);
    const maxTimeMs = Number(overallTimeStats._max.winnerTime ?? 0);
    const fmtTime = (ms: number) => +(ms / 1000).toFixed(1);

    const raceTimeOverall = {
      avg: fmtTime(avgTimeMs),
      min: fmtTime(minTimeMs),
      max: fmtTime(maxTimeMs),
    };

    const raceTimeDistribution = timeBucketLabels.map((label, i) => ({
      label,
      count: timeBucketCounts[i],
    }));

    // Per-course difficulty: use the lifetime doomsday count divided by the
    // lifetime race count (c._count.id) so both sides match.
    const courseDifficulty = courseTimeStats.map((c: any) => {
      const doomsday = lifetimeDoomsdayMap[c.courseId] ?? 0;
      const total = c._count.id;
      return {
        courseId: c.courseId,
        theme: normalizeTheme(c.courseTheme || 'unknown'),
        avgTime: fmtTime(Number(c._avg.winnerTime ?? 0)),
        minTime: fmtTime(Number(c._min.winnerTime ?? 0)),
        maxTime: fmtTime(Number(c._max.winnerTime ?? 0)),
        races: total,
        doomsdayPct: total > 0 ? Math.round((doomsday / total) * 100) : 0,
      };
    });

    // Per-theme performance
    const themePerformance = themeTimeStats.map((t: any) => ({
      theme: normalizeTheme(t.courseTheme || 'unknown'),
      avgTime: fmtTime(Number(t._avg.winnerTime ?? 0)),
      races: t._count.id,
    }));

    // Per-mode performance
    const modePerformance = modeTimeStats.map((m: any) => ({
      mode: m.gameMode,
      avgTime: fmtTime(Number(m._avg.winnerTime ?? 0)),
      races: m._count.id,
    }));

    // --- D. Fairness ---
    const racesAnalyzed = recentRaces.length;
    const fairness = ALL_MARBLES.map((id) => {
      const counts = fairnessMatrix[id];
      const entropy = shannonEntropy(counts);
      const chi2 = chiSquared(counts);
      return {
        marbleId: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        color: MARBLE_COLORS[id],
        positionCounts: counts,
        entropy,
        chiSquared: chi2,
        isFair: entropy >= 2.8,
      };
    });
    const avgEntropy = fairness.length > 0
      ? +(fairness.reduce((s, f) => s + f.entropy, 0) / fairness.length).toFixed(4)
      : 0;
    const fairnessScore = Math.round((avgEntropy / 3.0) * 100);

    // --- E. Doomsday & Safety ---
    const totalAnalyzed = safeCount + normalCount + doomsdayCount;
    const worstCourses = Object.entries(courseDoomsdayMap)
      .map(([courseId, v]) => ({
        courseId,
        doomsdayRate: v.total > 0 ? Math.round((v.doomsday / v.total) * 100) : 0,
        total: v.total,
        doomsdayCount: v.doomsday,
      }))
      .filter((c) => c.doomsdayCount > 0)
      .sort((a, b) => b.doomsdayRate - a.doomsdayRate)
      .slice(0, 5);

    const doomsdayStats = {
      triggerRate: totalAnalyzed > 0 ? Math.round((doomsdayCount / totalAnalyzed) * 100) : 0,
      totalTriggers: doomsdayCount,
      zones: {
        safe: { count: safeCount, pct: totalAnalyzed > 0 ? Math.round((safeCount / totalAnalyzed) * 100) : 0 },
        normal: { count: normalCount, pct: totalAnalyzed > 0 ? Math.round((normalCount / totalAnalyzed) * 100) : 0 },
        doomsday: { count: doomsdayCount, pct: totalAnalyzed > 0 ? Math.round((doomsdayCount / totalAnalyzed) * 100) : 0 },
      },
      worstCourses,
    };

    // --- F. Betting vs Physics Parity ---
    const totalWagered = Object.values(betMap).reduce((s, b) => s + b.wagered, 0);
    const totalPaidOut = Object.values(betMap).reduce((s, b) => s + b.paidOut, 0);
    const realizedHouseEdge = totalWagered > 0
      ? +((1 - totalPaidOut / totalWagered) * 100).toFixed(2)
      : 0;

    const bettingParity = ALL_MARBLES.map((id) => {
      const bet = betMap[id] || { bets: 0, wagered: 0, paidOut: 0, avgOdds: 0 };
      const wins = winMap[id] ?? 0;
      const actualWinRate = bet.bets > 0 ? +((wins / bet.bets) * 100).toFixed(1) : 0;
      const impliedProb = bet.avgOdds > 0 ? +((1 / bet.avgOdds) * 100).toFixed(1) : 0;
      const delta = +(actualWinRate - impliedProb).toFixed(1);

      return {
        marbleId: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        color: MARBLE_COLORS[id],
        avgOdds: +bet.avgOdds.toFixed(2),
        impliedProb,
        actualWinRate,
        delta,
        accuracy: Math.abs(delta) < 3 ? 'excellent' : Math.abs(delta) < 7 ? 'good' : 'poor',
        totalBets: bet.bets,
        totalWagered: bet.wagered,
        totalPaidOut: bet.paidOut,
        marbleHouseEdge: bet.wagered > 0 ? +((1 - bet.paidOut / bet.wagered) * 100).toFixed(1) : 0,
      };
    });

    // --- G. Obstacle Tools (static catalog) ---
    const obstacleTools = [
      {
        id: 'pendulum', name: 'Pendulum', category: 'dynamic',
        description: 'Swinging wrecking ball on rigid constraint. Deflects marbles on impact via momentum transfer.',
        physics: { density: 0.008, restitution: 0.8, frictionAir: 0.005, size: '14-20px bob', range: '80-130px rope' },
        collisionLayer: 'CAT_OBSTACLE (0x0004)',
        tracks: ['Pendulum Alley (4)', 'The Gauntlet (2)', '~30% procedural'],
        instances: 6, behavior: 'Swings via Matter.js constraint with startVelocityX. Natural decay via frictionAir.',
        color: '#e74c3c', icon: 'pendulum',
      },
      {
        id: 'trampoline', name: 'Trampoline', category: 'sensor',
        description: 'Bouncing pad that kicks marbles upward. Max 5 bounces per marble, then restitution drops to 0.1.',
        physics: { restitution: 0.5, friction: 0.005, strength: '3-6', maxBounces: 5 },
        collisionLayer: 'CAT_WALL (0x0001)',
        tracks: ['Trampoline Park (5)', 'The Gauntlet (1)', '~25% procedural'],
        instances: 6, behavior: 'applyForce upward: -strength * 0.0008 * mass. Bounce count tracked per marble.',
        color: '#ff922b', icon: 'trampoline',
      },
      {
        id: 'speedBurst', name: 'Speed Burst', category: 'sensor',
        description: 'Directional boost pad. ~60% activation chance per marble. Applies impulse in configured direction.',
        physics: { force: 0.003, activation: '50-65%', duration: '300ms glow', directions: 'left / right / down' },
        collisionLayer: 'Sensor (isSensor)',
        tracks: ['Classic Zigzag (2)', 'Pendulum Alley (2)', 'Peg Storm (2)', 'The Gauntlet (2)', '30% procedural'],
        instances: 8, behavior: 'Sensor body detects marble overlap. Random < activationChance triggers directional force.',
        color: '#ffc220', icon: 'speedBurst',
      },
      {
        id: 'ballPit', name: 'Ball Pit', category: 'dynamic',
        description: 'Avalanche of small balls that cascade when marbles plow through. Creates chaotic deflection zone.',
        physics: { density: 0.001, restitution: 0.5, friction: 0.005, frictionAir: 0.01, ballRadius: '7-10px' },
        collisionLayer: 'CAT_OBSTACLE (0x0004)',
        tracks: ['Ball Pit Run (3 zones)', 'The Gauntlet (1)', '~20% procedural'],
        instances: 4, behavior: 'Grid of circles with hexagonal offset. Balls are dynamic bodies that cascade on impact.',
        color: '#9b59b6', icon: 'ballPit',
      },
      {
        id: 'cradle', name: "Newton's Cradle", category: 'dynamic',
        description: 'Perfect elastic collision chain. Infinite inertia prevents rotation. Transfers momentum through chain.',
        physics: { restitution: 1.0, friction: 0, frictionAir: 0, inertia: 'Infinity', bobs: '3-5' },
        collisionLayer: 'CAT_OBSTACLE + Cradle-Cradle',
        tracks: ['Cradle Drop (3)', 'The Gauntlet (1)', '~20% procedural'],
        instances: 4, behavior: 'First bob pre-pulled to initiate swing. Perfect elastic collisions transfer momentum through chain.',
        color: '#95a5a6', icon: 'cradle',
      },
      {
        id: 'windmill', name: 'Windmill', category: 'static-dynamic',
        description: 'Rotating blade that sweeps marbles. Angle set directly each frame — no physics constraint.',
        physics: { restitution: 0.5, friction: 0.01, speed: '0.005-0.03 rad/frame', width: '200-340px' },
        collisionLayer: 'CAT_WALL (0x0001)',
        tracks: ['All tracks (1-6 per track)'],
        instances: 30, behavior: 'Body.setAngle() each physics step. Speed can be CW or CCW. Faster near peg zones.',
        color: '#e74c3c', icon: 'windmill',
      },
      {
        id: 'bumper', name: 'Bumper', category: 'static',
        description: 'High-restitution circle that bounces marbles back hard. Primary deflection obstacle.',
        physics: { restitution: 1.2, friction: 0.001, radius: '12-16px' },
        collisionLayer: 'CAT_WALL (0x0001)',
        tracks: ['All tracks (2-8 per track)'],
        instances: 40, behavior: 'Static circle. Restitution > 1.0 means marbles bounce back harder than they hit.',
        color: '#e74c3c', icon: 'bumper',
      },
      {
        id: 'peg', name: 'Peg', category: 'static',
        description: 'Small energy-absorbing pin. Dense peg zones create Pachinko-like chaos fields.',
        physics: { restitution: 0.3, friction: 0.001, radius: '5-10px' },
        collisionLayer: 'CAT_WALL (0x0001)',
        tracks: ['All tracks (15-48 per track)'],
        instances: 200, behavior: 'Static circles in grid patterns (3x4 or 4x5). Low restitution absorbs energy.',
        color: '#7f8c8d', icon: 'peg',
      },
      {
        id: 'spring', name: 'Spring Pad', category: 'sensor',
        description: 'Redirect pad at ramp exits. Applies gentle center-seeking force to guide marble flow.',
        physics: { force: '0.002 * mass', direction: 'toward center + down' },
        collisionLayer: 'Sensor (isSensor)',
        tracks: ['All tracks (1 per ramp exit)'],
        instances: 50, behavior: 'Sensor body at ramp exits. Applies soft redirect force — NOT a bounce.',
        color: '#2ecc71', icon: 'spring',
      },
    ];

    return NextResponse.json({
      engineConfig,
      marbleDynamics,
      raceTimeOverall,
      raceTimeDistribution,
      courseDifficulty,
      themePerformance,
      modePerformance,
      fairness,
      fairnessScore,
      avgEntropy,
      doomsdayStats,
      bettingParity,
      realizedHouseEdge,
      totalRaces,
      racesAnalyzed,
      obstacleTools,
    });
  } catch (error: any) {
    console.error('Physics API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch physics data' } },
      { status: 500 },
    );
  }
}
