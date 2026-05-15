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
    const { productId, productName, priceUsd, coinsGranted, storeTransactionId, currentCoins } = body;

    if (!productId || !productName || priceUsd === undefined) {
      return NextResponse.json(
        { error: { message: 'productId, productName, and priceUsd are required' } },
        { status: 400 },
      );
    }

    // Record the purchase
    await prisma.gamePurchase.create({
      data: {
        playerId: player.id,
        productId,
        productName,
        priceUsd,
        coinsGranted: coinsGranted || 0,
        platform: player.platform,
        storeTransactionId: storeTransactionId || null,
      },
    });

    // Log coin transaction for the purchase
    if (coinsGranted > 0) {
      await prisma.gameCoinTransaction.create({
        data: {
          playerId: player.id,
          type: 'purchase',
          amount: coinsGranted,
          balance: currentCoins ?? player.coins + coinsGranted,
          description: `Purchased ${productName}`,
        },
      });
    }

    // Update player totalSpent and coins
    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        totalSpent: { increment: priceUsd },
        coins: currentCoins ?? { increment: coinsGranted || 0 },
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sync purchase error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to sync purchase' } },
      { status: 500 },
    );
  }
}
