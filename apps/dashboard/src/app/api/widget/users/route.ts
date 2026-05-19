import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { fetchAllProjectOverview } from '@/lib/external-users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const expected = process.env.WIDGET_API_TOKEN;

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ownerEmail = process.env.WIDGET_OWNER_EMAIL || 'info@donkeyideas.com';
    const owner = await prisma.user.findFirst({ where: { email: ownerEmail } });
    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    const overview = await fetchAllProjectOverview();

    const totals = overview.projects.reduce(
      (acc, p) => ({
        total: acc.total + (p.error ? 0 : p.total),
        new30d: acc.new30d + (p.error ? 0 : p.new30d),
        new7d: acc.new7d + (p.error ? 0 : p.new7d),
      }),
      { total: 0, new30d: 0, new7d: 0 }
    );

    const prevBase = totals.total - totals.new30d;
    const growthRate = prevBase > 0 ? (totals.new30d / prevBase) * 100 : 0;

    const byProject = overview.projects
      .filter((p) => !p.error)
      .map((p) => ({
        slug: p.slug,
        name: p.displayName,
        total: p.total,
        new7d: p.new7d,
        new30d: p.new30d,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      totalUsers: totals.total,
      newUsers7d: totals.new7d,
      newUsers30d: totals.new30d,
      growthRate: Math.round(growthRate * 10) / 10,
      byProject,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Widget users API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch widget data' },
      { status: 500 }
    );
  }
}
