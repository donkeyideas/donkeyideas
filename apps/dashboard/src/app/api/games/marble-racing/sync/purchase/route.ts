import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';
import { verifyPurchase } from '@/lib/iap-verify';

// Allowed product IDs and their canonical USD price + coin grants.
// Server-trusted prices — we ignore whatever the client sends and use
// these values, so a tampered client cannot inflate priceUsd.
const PRODUCTS: Record<string, { name: string; priceUsd: number; coinsGranted: number }> = {
  coins_small:        { name: 'Coin Pack (Small)',  priceUsd: 1.99,  coinsGranted: 2000 },
  coins_medium:       { name: 'Coin Pack (Medium)', priceUsd: 4.99,  coinsGranted: 6000 },
  coins_large:        { name: 'Coin Pack (Large)',  priceUsd: 9.99,  coinsGranted: 15000 },
  coins_xl:           { name: 'Coin Pack (XL)',     priceUsd: 19.99, coinsGranted: 35000 },
  season_pass:        { name: 'Season Pass',        priceUsd: 4.99,  coinsGranted: 0 },
  season_pass_premium:{ name: 'Season Pass Plus',   priceUsd: 9.99,  coinsGranted: 0 },
};

export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json();
    const { productId, purchaseToken, currentCoins } = body;

    if (!productId || !purchaseToken) {
      return NextResponse.json(
        { error: { message: 'productId and purchaseToken are required' } },
        { status: 400 },
      );
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return NextResponse.json(
        { error: { message: `Unknown productId: ${productId}` } },
        { status: 400 },
      );
    }

    // Verify against Google Play / Apple before recording anything.
    const verify = await verifyPurchase({
      platform: player.platform,
      productId,
      purchaseToken,
    });

    if (!verify.ok) {
      console.warn(
        `[sync/purchase] REJECTED player=${player.id} productId=${productId} platform=${player.platform} reason="${verify.reason}"`,
      );
      return NextResponse.json(
        { error: { message: `Purchase verification failed: ${verify.reason}` } },
        { status: 402 },
      );
    }

    // Idempotency — if this orderId is already recorded, return success without
    // double-granting coins.
    const existing = await prisma.gamePurchase.findFirst({
      where: { storeTransactionId: verify.orderId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Record the verified purchase using server-trusted values.
    await prisma.gamePurchase.create({
      data: {
        playerId: player.id,
        productId,
        productName: product.name,
        priceUsd: product.priceUsd,
        coinsGranted: product.coinsGranted,
        platform: player.platform,
        storeTransactionId: verify.orderId,
        status: 'completed',
      },
    });

    if (product.coinsGranted > 0) {
      await prisma.gameCoinTransaction.create({
        data: {
          playerId: player.id,
          type: 'purchase',
          amount: product.coinsGranted,
          balance: currentCoins ?? player.coins + product.coinsGranted,
          description: `Purchased ${product.name}`,
        },
      });
    }

    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        totalSpent: { increment: product.priceUsd },
        coins: currentCoins ?? { increment: product.coinsGranted },
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
