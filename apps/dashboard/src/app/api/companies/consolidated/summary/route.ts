import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/consolidated/summary - Get consolidated summary for dashboard
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }
    
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }
    
    // Get all companies for the user
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      include: {
        plStatements: {
          orderBy: { period: 'desc' },
          take: 1,
        },
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        teamMembers: true,
      },
    });
    
    // Calculate totals
    let totalRevenue = 0;
    let totalValuation = 0;
    let totalTeamMembers = 0;
    
    companies.forEach((company: any) => {
      const latestPL = company.plStatements[0];
      const latestValuation = company.valuations[0];
      
      if (latestPL) {
        totalRevenue +=
          Number(latestPL.productRevenue) +
          Number(latestPL.serviceRevenue) +
          Number(latestPL.otherRevenue);
      }
      totalValuation += latestValuation ? Number(latestValuation.amount) : 0;
      totalTeamMembers += company.teamMembers.length;
    });
    
    return NextResponse.json({
      totalRevenue,
      totalValuation,
      activeCompanies: companies.length,
      totalTeamMembers,
    });
  } catch (error: any) {
    console.error('Failed to get consolidated summary:', error);
    return NextResponse.json(
      { error: { message: 'Failed to retrieve consolidated summary' } },
      { status: 500 }
    );
  }
}

