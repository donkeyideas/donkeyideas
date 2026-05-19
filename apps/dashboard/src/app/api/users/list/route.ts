import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, getTokenFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { fetchProjectUsers, fetchAllUsers, getProjectConfigs } from '@/lib/external-users';

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
    const project = searchParams.get('project') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const options = { page, limit, sortBy, sortDir, search, dateFrom, dateTo };

    // Fetch users and company logos in parallel
    const [result, companies] = await Promise.all([
      project === 'all' ? fetchAllUsers(options) : fetchProjectUsers(project, options),
      prisma.company.findMany({
        where: { userId: user.id },
        select: { name: true, logo: true },
      }),
    ]);

    // Build logo map from company names to project slugs
    const configs = getProjectConfigs();
    const logoMap: Record<string, string | null> = {};
    for (const config of configs) {
      const company = companies.find(c =>
        c.name.toLowerCase() === config.companyNameMatch.toLowerCase()
      );
      logoMap[config.slug] = company?.logo || null;
    }

    // Attach logos to users
    const usersWithLogos = result.users.map(u => ({
      ...u,
      projectLogo: logoMap[u.project] || null,
    }));

    return NextResponse.json({
      users: usersWithLogos,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error: any) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}
