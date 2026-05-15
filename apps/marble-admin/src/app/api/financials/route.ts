import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue by product
    const byProduct = await prisma.gamePurchase.groupBy({
      by: ['productId', 'productName'],
      where: { status: 'completed' },
      _sum: { priceUsd: true, coinsGranted: true },
      _count: { id: true },
    });

    // Revenue by platform
    const byPlatform = await prisma.gamePurchase.groupBy({
      by: ['platform'],
      where: { status: 'completed' },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Monthly revenue
    const monthlyRevenue = await prisma.gamePurchase.aggregate({
      where: { status: 'completed', purchasedAt: { gte: monthStart } },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Total revenue
    const totalRevenue = await prisma.gamePurchase.aggregate({
      where: { status: 'completed' },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Refunds
    const refunds = await prisma.gamePurchase.aggregate({
      where: { status: 'refunded' },
      _sum: { priceUsd: true },
      _count: { id: true },
    });

    // Recent transactions
    const recentTransactions = await prisma.gamePurchase.findMany({
      orderBy: { purchasedAt: 'desc' },
      take: 10,
      select: { id: true, productName: true, priceUsd: true, platform: true, status: true, purchasedAt: true, player: { select: { playerName: true } } },
    });

    const gross = Number(monthlyRevenue._sum.priceUsd ?? 0);
    const feeRate = 0.15; // Small Business Program
    const fees = gross * feeRate;
    const net = gross - fees;

    // Pricing matrix: per-product breakdown with fee analysis
    const pricingMatrix = byProduct.map(p => {
      const unitsSold = p._count.id;
      const grossRevenue = Number(p._sum.priceUsd ?? 0);
      const unitPrice = unitsSold > 0 ? grossRevenue / unitsSold : 0;
      const appStoreFeeRate = grossRevenue > 1_000_000 ? 0.30 : 0.15;
      const appStoreFee = grossRevenue * appStoreFeeRate;
      const netRevenue = grossRevenue - appStoreFee;
      const avgCoinsGranted = unitsSold > 0 ? (p._sum.coinsGranted ?? 0) / unitsSold : 0;
      const coinsPerDollar = unitPrice > 0 ? avgCoinsGranted / unitPrice : 0;

      return {
        productId: p.productId,
        productName: p.productName,
        unitPrice,
        unitsSold,
        grossRevenue,
        appStoreFeeRate,
        appStoreFee,
        netRevenue,
        coinsPerDollar,
      };
    });

    // Fee comparison: actual total revenue at 15% vs 30%
    const totalGross = Number(totalRevenue._sum.priceUsd ?? 0);
    const feeComparison = {
      totalRevenue: totalGross,
      at15pct: totalGross * 0.15,
      at30pct: totalGross * 0.30,
      savings: totalGross * 0.30 - totalGross * 0.15,
    };

    return NextResponse.json({
      monthly: { gross, net, fees, feeRate, transactions: monthlyRevenue._count.id },
      total: { gross: totalGross, transactions: totalRevenue._count.id },
      refunds: { amount: Number(refunds._sum.priceUsd ?? 0), count: refunds._count.id },
      byProduct: byProduct.map(p => ({
        productId: p.productId,
        productName: p.productName,
        revenue: Number(p._sum.priceUsd ?? 0),
        units: p._count.id,
        coinsGranted: p._sum.coinsGranted ?? 0,
      })),
      byPlatform: byPlatform.map(p => ({
        platform: p.platform,
        revenue: Number(p._sum.priceUsd ?? 0),
        transactions: p._count.id,
      })),
      pricingMatrix,
      feeComparison,
      recentTransactions: recentTransactions.map(t => ({
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
