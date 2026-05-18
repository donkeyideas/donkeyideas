import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';
import { verifyPurchase } from '@/lib/iap-verify';

/**
 * Canonical product catalog — what gets recorded in the database.
 * Server-trusted values. The client cannot influence priceUsd or coinsGranted.
 */
type CanonicalProduct = {
  id: string;
  name: string;
  priceUsd: number;
  coinsGranted: number;
};

const CANONICAL: Record<string, CanonicalProduct> = {
  starter:             { id: 'starter',             name: 'Starter Pack (1,000 coins)', priceUsd: 0.99,  coinsGranted: 1000 },
  popular:             { id: 'popular',             name: 'Popular Pack (6,000 coins)', priceUsd: 4.99,  coinsGranted: 6000 },
  big:                 { id: 'big',                 name: 'Big Spender (15,000 coins)', priceUsd: 9.99,  coinsGranted: 15000 },
  whale:               { id: 'whale',               name: 'Whale Pack (40,000 coins)',  priceUsd: 24.99, coinsGranted: 40000 },
  season_pass_premium: { id: 'season_pass_premium', name: 'Season Pass — Premium',      priceUsd: 9.99,  coinsGranted: 0 },
  season_pass_plus:    { id: 'season_pass_plus',    name: 'Season Pass — Plus',         priceUsd: 24.99, coinsGranted: 0 },
};

/**
 * Platform-specific store product ID → canonical key.
 *
 * Apple uses reverse-DNS bundle prefixes (and IDs cannot be changed after
 * submission). Google's season pass IDs were created with mismatched names
 * (season_pass1 = Premium Pass, season_pass_premium1 = Plus Pass) and Google
 * permanently reserves IDs after first use, so we map them here.
 *
 * When adding a new product on either store, add the entry here too.
 */
const STORE_ID_MAP: Record<'android' | 'ios', Record<string, string>> = {
  android: {
    starter: 'starter',
    popular: 'popular',
    big: 'big',
    whale: 'whale',
    season_pass1: 'season_pass_premium',         // Display name "Premium Pass"
    season_pass_premium1: 'season_pass_plus',    // Display name "Plus Pass" (Google ID is misleading)
  },
  ios: {
    'com.donkeymarble.racing.coins.starter':  'starter',
    'com.donkeymarble.racing.coins.popular':  'popular',
    'com.donkeymarble.racing.coins.big':      'big',
    'com.donkeymarble.racing.coins.whale':    'whale',
    'com.donkeymarble.racing.pass.premium.v1':'season_pass_premium',
    'com.donkeymarble.racing.pass.plus.v1':   'season_pass_plus',
  },
};

function resolveCanonical(platform: string, storeProductId: string): CanonicalProduct | null {
  if (platform !== 'android' && platform !== 'ios') return null;
  const key = STORE_ID_MAP[platform][storeProductId];
  if (!key) return null;
  return CANONICAL[key] ?? null;
}

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
    const { productId: storeProductId, purchaseToken, currentCoins } = body;

    if (!storeProductId || !purchaseToken) {
      return NextResponse.json(
        { error: { message: 'productId and purchaseToken are required' } },
        { status: 400 },
      );
    }

    const product = resolveCanonical(player.platform, storeProductId);
    if (!product) {
      console.warn(
        `[sync/purchase] unknown product platform=${player.platform} storeProductId=${storeProductId}`,
      );
      return NextResponse.json(
        { error: { message: `Unknown product ${storeProductId} for platform ${player.platform}` } },
        { status: 400 },
      );
    }

    // Verify against the platform store using its native productId.
    const verify = await verifyPurchase({
      platform: player.platform,
      productId: storeProductId,
      purchaseToken,
    });

    if (!verify.ok) {
      console.warn(
        `[sync/purchase] REJECTED player=${player.id} storeProductId=${storeProductId} platform=${player.platform} reason="${verify.reason}"`,
      );
      return NextResponse.json(
        { error: { message: `Purchase verification failed: ${verify.reason}` } },
        { status: 402 },
      );
    }

    // Idempotency — if this orderId is already recorded, return success without
    // double-granting coins. Protects against duplicate sync calls on retry.
    const existing = await prisma.gamePurchase.findFirst({
      where: { storeTransactionId: verify.orderId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Record using canonical values, not whatever the client claimed.
    // Sandbox/TestFlight transactions are tagged with status='sandbox' so
    // Financials can exclude them from revenue and refund metrics without
    // breaking the player's in-app experience (they still get the coins).
    const purchaseStatus = verify.isTest ? 'sandbox' : 'completed';
    await prisma.gamePurchase.create({
      data: {
        playerId: player.id,
        productId: product.id,
        productName: product.name,
        priceUsd: product.priceUsd,
        coinsGranted: product.coinsGranted,
        platform: player.platform,
        storeTransactionId: verify.orderId,
        status: purchaseStatus,
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

    // For sandbox purchases, DO NOT increment totalSpent — that field
    // feeds every "paying user / conversion / segments" calculation on
    // the admin dashboard and we don't want TestFlight test buys to
    // inflate it. Coins still get granted so the in-app UX works.
    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        ...(verify.isTest ? {} : { totalSpent: { increment: product.priceUsd } }),
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
