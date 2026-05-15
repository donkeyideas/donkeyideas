import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      courseId,
      courseTheme,
      gameMode,
      finishOrder,
      playerPickId,
      betAmount,
      payout,
      playerPlacement,
      won,
      winnerTime,
      modeContext,
      currentCoins,
    } = body;

    if (!courseId || !gameMode || !finishOrder) {
      return NextResponse.json(
        { error: { message: 'courseId, gameMode, and finishOrder are required' } },
        { status: 400 },
      );
    }

    // Create race record
    const race = await prisma.raceRecord.create({
      data: {
        playerId: player.id,
        courseId,
        courseTheme: courseTheme || 'unknown',
        gameMode,
        finishOrder,
        playerPickId: playerPickId || null,
        betAmount: betAmount || 0,
        payout: payout || 0,
        playerPlacement: playerPlacement || 0,
        won: won || false,
        winnerTime: winnerTime || null,
        modeContext: modeContext || null,
      },
    });

    // Create bet record if a bet was placed
    if (betAmount > 0 && playerPickId) {
      await prisma.betRecord.create({
        data: {
          playerId: player.id,
          marbleId: playerPickId,
          betAmount,
          odds: body.odds || 0,
          payout: payout || 0,
          won: won || false,
          placement: playerPlacement || 0,
        },
      });

      // Log coin transactions
      await prisma.gameCoinTransaction.create({
        data: {
          playerId: player.id,
          type: 'bet',
          amount: -betAmount,
          balance: (currentCoins ?? player.coins) + betAmount - (payout || 0),
          description: `Bet on ${playerPickId} - ${courseId}`,
        },
      });

      if (payout > 0) {
        await prisma.gameCoinTransaction.create({
          data: {
            playerId: player.id,
            type: 'payout',
            amount: payout,
            balance: currentCoins ?? player.coins,
            description: `Won bet on ${playerPickId} - ${courseId}`,
          },
        });
      }
    }

    // Update player stats
    const updateData: Record<string, any> = {
      totalRaces: { increment: 1 },
      lastActiveAt: new Date(),
    };

    if (won) {
      updateData.totalWins = { increment: 1 };
    }

    if (currentCoins !== undefined) {
      updateData.coins = currentCoins;
    }

    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      raceId: race.id,
      banned: false,
    });
  } catch (error: any) {
    console.error('Sync race error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to sync race' } },
      { status: 500 },
    );
  }
}
