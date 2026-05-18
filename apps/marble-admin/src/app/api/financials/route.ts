import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { getNonSandboxPurchaseFilter } from '@/lib/sandboxFilter';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  Static product catalog (always shown in pricing matrix)            */
/*                                                                     */
/*  Each entry carries `matchIds` (every known stored productId for    */
/*  this product across code paths and platforms) and `matchKeywords`  */
/*  (lowercased substrings that must all appear in productName for the */
/*  fallback match). Purchases written through the sync/purchase route */
/*  use the canonical short IDs, but older or test-path rows may carry */
/*  the raw store SKU (com.donkeymarble.racing.pass.premium.v1) or a   */
/*  shorter display name like "Premium Pass". Without flexible         */
/*  matching, Units Sold (Month) renders 0 even when a sale exists.    */
/* ------------------------------------------------------------------ */
interface CatalogEntry {
  productId: string;
  productName: string;
  unitPrice: number;
  coins: number;
  matchIds: string[];
  matchKeywords: string[];
}

const PRODUCT_CATALOG: CatalogEntry[] = [
  {
    productId: 'starter', productName: 'Starter Pack (1,000 coins)', unitPrice: 0.99, coins: 1000,
    matchIds: ['starter', 'com.donkeymarble.racing.coins.starter'],
    matchKeywords: ['starter'],
  },
  {
    productId: 'popular', productName: 'Popular Pack (6,000 coins)', unitPrice: 4.99, coins: 6000,
    matchIds: ['popular', 'com.donkeymarble.racing.coins.popular'],
    matchKeywords: ['popular'],
  },
  {
    productId: 'big', productName: 'Big Spender (15,000 coins)', unitPrice: 9.99, coins: 15000,
    matchIds: ['big', 'com.donkeymarble.racing.coins.big'],
    matchKeywords: ['big', 'spender'],
  },
  {
    productId: 'whale', productName: 'Whale Pack (40,000 coins)', unitPrice: 24.99, coins: 40000,
    matchIds: ['whale', 'com.donkeymarble.racing.coins.whale'],
    matchKeywords: ['whale'],
  },
  {
    productId: 'season_pass_premium', productName: 'Season Pass — Premium', unitPrice: 9.99, coins: 0,
    matchIds: ['season_pass_premium', 'season_pass1', 'com.donkeymarble.racing.pass.premium.v1'],
    matchKeywords: ['premium', 'pass'],
  },
  {
    productId: 'season_pass_plus', productName: 'Season Pass — Plus', unitPrice: 24.99, coins: 0,
    matchIds: ['season_pass_plus', 'season_pass_premium1', 'com.donkeymarble.racing.pass.plus.v1'],
    matchKeywords: ['plus', 'pass'],
  },
];

function matchCatalogEntry(saleProductId: string, saleProductName: string): CatalogEntry | null {
  // Exact id match across any known SKU
  for (const entry of PRODUCT_CATALOG) {
    if (entry.matchIds.includes(saleProductId)) return entry;
  }
  // Fallback: every keyword must appear in the product name
  const lower = saleProductName.toLowerCase();
  for (const entry of PRODUCT_CATALOG) {
    if (entry.matchKeywords.every((k) => lower.includes(k))) return entry;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Fee impact revenue tiers (always shown)                            */
/* ------------------------------------------------------------------ */
const FEE_TIERS = [25_000, 100_000, 500_000, 1_000_000];

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // See lib/sandboxFilter.ts for the exclusion strategy (status='sandbox'
    // + iOS legacy-heuristic). Computed once per request and spread into
    // every gamePurchase query below.
    const excludeTest = await getNonSandboxPurchaseFilter();

    // Revenue by product — both monthly (for the pricing matrix, whose
    // columns are labelled "Units Sold (Month)" / "Monthly Revenue") and
    // lifetime (for the byProduct payload that callers may use elsewhere).
    const [byProductMonth, byProduct] = await Promise.all([
      prisma.gamePurchase.groupBy({
        by: ['productId', 'productName'],
        where: { status: 'completed', purchasedAt: { gte: monthStart }, ...excludeTest },
        _sum: { priceUsd: true, coinsGranted: true },
        _count: { id: true },
      }),
      prisma.gamePurchase.groupBy({
        by: ['productId', 'productName'],
        where: { status: 'completed', ...excludeTest },
        _sum: { priceUsd: true, coinsGranted: true },
        _count: { id: true },
      }),
    ]);

    // Revenue by platform
    const byPlatform = await prisma.gamePurchase.groupBy({
      by: ['platform'],
      where: { status: 'completed', ...excludeTest },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Monthly revenue
    const monthlyRevenue = await prisma.gamePurchase.aggregate({
      where: { status: 'completed', purchasedAt: { gte: monthStart }, ...excludeTest },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Total revenue
    const totalRevenue = await prisma.gamePurchase.aggregate({
      where: { status: 'completed', ...excludeTest },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Refunds
    const refunds = await prisma.gamePurchase.aggregate({
      where: { status: 'refunded', ...excludeTest },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Recent transactions — also hide test-user rows from the operator view
    const recentTransactions = await prisma.gamePurchase.findMany({
      where: excludeTest,
      orderBy: { purchasedAt: 'desc' },
      take: 10,
      select: { id: true, productName: true, priceUsd: true, platform: true, status: true, purchasedAt: true, player: { select: { playerName: true } } },
    });

    const gross = Number(monthlyRevenue._sum.priceUsd ?? 0);
    const feeRate = 0.15; // Small Business Program
    const fees = gross * feeRate;
    const net = gross - fees;

    // ── Pricing matrix: merge static catalog with month-scoped sales,
    // matching on productId OR productName-keyword fallback so we count
    // rows recorded by older code paths or with raw store SKUs. ──
    const aggregatedByCatalog = new Map<string, { units: number; revenue: number }>();
    for (const sale of byProductMonth) {
      const entry = matchCatalogEntry(sale.productId, sale.productName);
      if (!entry) continue;
      const existing = aggregatedByCatalog.get(entry.productId) ?? { units: 0, revenue: 0 };
      existing.units += sale._count.id;
      existing.revenue += Number(sale._sum.priceUsd ?? 0);
      aggregatedByCatalog.set(entry.productId, existing);
    }

    const pricingMatrix = PRODUCT_CATALOG.map((cat) => {
      const sales = aggregatedByCatalog.get(cat.productId);
      const unitsSold = sales?.units ?? 0;
      const grossRevenue = sales?.revenue ?? 0;
      const appStoreFeeRate = 0.15;
      const appStoreFee = cat.unitPrice * appStoreFeeRate;
      const netPerUnit = cat.unitPrice - appStoreFee;
      const fee30 = cat.unitPrice * 0.30;
      const netAt30 = cat.unitPrice - fee30;

      return {
        productId: cat.productId,
        productName: cat.productName,
        unitPrice: cat.unitPrice,
        unitsSold,
        grossRevenue,
        appStoreFeeRate,
        appStoreFee,       // fee per unit at 15%
        netPerUnit,        // you receive per unit at 15%
        netAt30PerUnit: netAt30, // you receive per unit at 30%
        savingsPerUnit: fee30 - appStoreFee, // savings per unit
        monthlyRevenue: grossRevenue,
        coinsPerDollar: cat.unitPrice > 0 ? cat.coins / cat.unitPrice : 0,
      };
    });

    // ── Platform split: always show iOS + Android ──
    const platformMap = new Map(
      byPlatform.map((p) => [p.platform, { revenue: Number(p._sum.priceUsd ?? 0), transactions: p._count.id }]),
    );
    const platforms = [
      { platform: 'iOS', revenue: platformMap.get('ios')?.revenue ?? platformMap.get('iOS')?.revenue ?? 0, transactions: platformMap.get('ios')?.transactions ?? platformMap.get('iOS')?.transactions ?? 0 },
      { platform: 'Android', revenue: platformMap.get('android')?.revenue ?? platformMap.get('Android')?.revenue ?? 0, transactions: platformMap.get('android')?.transactions ?? platformMap.get('Android')?.transactions ?? 0 },
    ];

    // ── Fee impact tiers ──
    const feeTiers = FEE_TIERS.map((annual) => ({
      annualRevenue: annual,
      at30pct: annual * 0.30,
      at15pct: annual * 0.15,
      keep30: annual * 0.70,
      keep15: annual * 0.85,
      savings: annual * 0.15, // difference between 30% and 15%
    }));

    // ── Actual fee comparison (current revenue) ──
    const totalGross = Number(totalRevenue._sum.priceUsd ?? 0);
    const feeComparison = {
      totalRevenue: totalGross,
      at15pct: totalGross * 0.15,
      at30pct: totalGross * 0.30,
      savings: totalGross * 0.15,
    };

    return NextResponse.json({
      monthly: { gross, net, fees, feeRate, transactions: monthlyRevenue._count.id },
      total: { gross: totalGross, transactions: totalRevenue._count.id },
      refunds: { amount: Number(refunds._sum.priceUsd ?? 0), count: refunds._count.id },
      byProduct: byProduct.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        revenue: Number(p._sum.priceUsd ?? 0),
        units: p._count.id,
        coinsGranted: p._sum.coinsGranted ?? 0,
      })),
      byPlatform: platforms,
      pricingMatrix,
      feeComparison,
      feeTiers,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        productName: t.productName,
        priceUsd: Number(t.priceUsd),
        platform: t.platform,
        status: t.status,
        purchasedAt: t.purchasedAt,
        playerName: t.player?.playerName || 'Unknown',
      })),
    });
  } catch (error: any) {
    console.error('Financials error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}
