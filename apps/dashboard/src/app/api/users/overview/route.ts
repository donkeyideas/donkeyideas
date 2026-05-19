import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, getTokenFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { fetchAllProjectOverview, fetchAllGrowthData, getProjectConfigs } from '@/lib/external-users';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = getTokenFromRequest(request, cookieStore.get('auth-token')?.value);

  if (!token) {
    return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
  }

  const user = await getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '90';
    const days = dateRange === 'all' ? 365 : parseInt(dateRange);
    const projectFilter = searchParams.get('project') || 'all';

    // Fetch overview data, growth data, and company logos in parallel
    const [overview, growthData, companies] = await Promise.all([
      fetchAllProjectOverview(),
      fetchAllGrowthData(days),
      prisma.company.findMany({
        where: { userId: user.id },
        select: { name: true, logo: true },
      }),
    ]);

    // Match company logos to projects by name
    const configs = getProjectConfigs();
    const logoMap: Record<string, string | null> = {};
    for (const config of configs) {
      const company = companies.find(c =>
        c.name.toLowerCase() === config.companyNameMatch.toLowerCase()
      );
      logoMap[config.slug] = company?.logo || null;
    }

    // Attach logos to project overview data
    const projectsWithLogos = overview.projects.map(p => ({
      ...p,
      logo: logoMap[p.slug] || null,
    }));

    // Filter by project if specified
    let filteredProjects = projectsWithLogos;
    let filteredGrowth = growthData;
    if (projectFilter !== 'all') {
      filteredProjects = projectsWithLogos.filter(p => p.slug === projectFilter);
      filteredGrowth = growthData.map(point => ({
        date: point.date,
        [projectFilter]: point[projectFilter] || 0,
      }));
    }

    // Calculate totals from filtered projects
    const totals = filteredProjects.reduce(
      (acc, p) => ({
        total: acc.total + (p.error ? 0 : p.total),
        new30d: acc.new30d + (p.error ? 0 : p.new30d),
        new7d: acc.new7d + (p.error ? 0 : p.new7d),
      }),
      { total: 0, new30d: 0, new7d: 0 }
    );

    const prevBase = totals.total - totals.new30d;
    const growthRate = prevBase > 0 ? (totals.new30d / prevBase) * 100 : 0;

    return NextResponse.json({
      kpis: {
        totalUsers: totals.total,
        newUsers30d: totals.new30d,
        newUsers7d: totals.new7d,
        growthRate: Math.round(growthRate * 10) / 10,
      },
      byProject: projectFilter === 'all' ? projectsWithLogos : projectsWithLogos, // always send all for the dropdown
      byProjectFiltered: filteredProjects, // filtered for charts
      growthTimeSeries: filteredGrowth,
      errors: overview.projects.filter(p => p.error).map(p => p.slug),
    });
  } catch (error: any) {
    console.error('Users overview error:', error);
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}
