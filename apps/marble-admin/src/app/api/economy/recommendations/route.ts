import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  Recommendation rules based on player activity                      */
/* ------------------------------------------------------------------ */

interface Recommendation {
  recommended: number;
  reason: string;
  direction: 'increase' | 'decrease' | 'keep';
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Gather player activity metrics
    const [avgCoins, playerCount, mintedToday, burnedToday, lowBalancePlayers, configs] =
      await Promise.all([
        prisma.gamePlayer.aggregate({ _avg: { coins: true } }),
        prisma.gamePlayer.count(),
        prisma.gameCoinTransaction.aggregate({
          _sum: { amount: true },
          where: { amount: { gt: 0 }, createdAt: { gte: todayStart } },
        }),
        prisma.gameCoinTransaction.aggregate({
          _sum: { amount: true },
          where: { amount: { lt: 0 }, type: 'bet', createdAt: { gte: todayStart } },
        }),
        prisma.gamePlayer.count({ where: { coins: { lt: 100 } } }),
        prisma.gameConfig.findMany(),
      ]);

    const avgBalance = Number(avgCoins._avg.coins ?? 0);
    const dailyMinted = Number(mintedToday._sum.amount ?? 0);
    const dailyBurned = Math.abs(Number(burnedToday._sum.amount ?? 0));
    const lowBalancePct = playerCount > 0 ? (lowBalancePlayers / playerCount) * 100 : 0;
    const burnToEarnRatio = dailyMinted > 0 ? dailyBurned / dailyMinted : 0;

    // Get current config values
    const configMap: Record<string, number> = {};
    for (const c of configs) {
      configMap[c.key] = parseFloat(c.value) || 0;
    }

    const recommendations: Record<string, Recommendation> = {};

    // --- Daily Rewards ---
    for (let i = 1; i <= 7; i++) {
      const key = `daily_reward_${i}`;
      const current = configMap[key] || [200, 250, 300, 350, 400, 500, 750][i - 1];

      if (avgBalance < 300) {
        const rec = Math.round(current * 1.5);
        recommendations[key] = { recommended: rec, reason: 'Low avg balance — boost to retain players', direction: 'increase' };
      } else if (avgBalance > 5000) {
        const rec = Math.round(current * 0.8);
        recommendations[key] = { recommended: rec, reason: 'High avg balance — reduce to control inflation', direction: 'decrease' };
      } else if (lowBalancePct > 40) {
        const rec = Math.round(current * 1.3);
        recommendations[key] = { recommended: rec, reason: '40%+ players broke — increase to prevent churn', direction: 'increase' };
      } else {
        recommendations[key] = { recommended: current, reason: 'Economy balanced', direction: 'keep' };
      }
    }

    // --- Bet Amounts ---
    const betDefaults = [25, 100, 250, 500];
    for (let i = 1; i <= 4; i++) {
      const key = `bet_amount_${i}`;
      const current = configMap[key] || betDefaults[i - 1];

      if (avgBalance < 200 && i === 1) {
        recommendations[key] = { recommended: 10, reason: 'Very low balances — lower min bet to keep players active', direction: 'decrease' };
      } else if (avgBalance < 500 && i === 1) {
        recommendations[key] = { recommended: 25, reason: 'Low balances — keep min bet accessible', direction: 'keep' };
      } else if (avgBalance > 3000 && i === 1) {
        recommendations[key] = { recommended: 50, reason: 'High balances — raise min bet for engagement', direction: 'increase' };
      } else {
        recommendations[key] = { recommended: current, reason: 'Tier appropriate for balance range', direction: 'keep' };
      }
    }

    // --- House Edge ---
    const currentEdge = configMap['house_edge'] || 0.10;
    if (burnToEarnRatio > 1.5) {
      recommendations['house_edge'] = { recommended: 0.08, reason: 'Players burning too fast — lower edge to improve experience', direction: 'decrease' };
    } else if (burnToEarnRatio < 0.5 && avgBalance > 3000) {
      recommendations['house_edge'] = { recommended: 0.12, reason: 'Players accumulating too fast — raise edge slightly', direction: 'increase' };
    } else {
      recommendations['house_edge'] = { recommended: currentEdge, reason: 'Burn/earn ratio healthy', direction: 'keep' };
    }

    // --- Max Daily Purchases ---
    const currentMaxPurch = configMap['max_daily_purchases'] || 3;
    recommendations['max_daily_purchases'] = { recommended: currentMaxPurch, reason: 'Standard limit', direction: 'keep' };

    // --- Max Daily Coins ---
    const currentMaxCoins = configMap['max_daily_coins'] || 25000;
    if (avgBalance > 10000) {
      recommendations['max_daily_coins'] = { recommended: 15000, reason: 'High balances — lower cap to slow inflation', direction: 'decrease' };
    } else {
      recommendations['max_daily_coins'] = { recommended: currentMaxCoins, reason: 'Cap appropriate', direction: 'keep' };
    }

    // --- Tournament Prizes ---
    const tournamentKeys = ['tournament_daily_prize', 'tournament_weekly_prize', 'tournament_champ_prize'];
    const tournamentDefaults = [4600, 23000, 46000];
    for (let i = 0; i < tournamentKeys.length; i++) {
      const key = tournamentKeys[i];
      const current = configMap[key] || tournamentDefaults[i];
      if (avgBalance < 500) {
        const rec = Math.round(current * 1.2);
        recommendations[key] = { recommended: rec, reason: 'Low economy — boost prizes for excitement', direction: 'increase' };
      } else {
        recommendations[key] = { recommended: current, reason: 'Prize pool balanced', direction: 'keep' };
      }
    }

    // --- XP Per Level ---
    const currentXP = configMap['xp_per_level'] || 1000;
    recommendations['xp_per_level'] = { recommended: currentXP, reason: 'Standard progression pace', direction: 'keep' };

    return NextResponse.json({
      recommendations,
      metrics: { avgBalance, dailyMinted, dailyBurned, burnToEarnRatio, lowBalancePct, playerCount },
    });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate recommendations' } },
      { status: 500 },
    );
  }
}
