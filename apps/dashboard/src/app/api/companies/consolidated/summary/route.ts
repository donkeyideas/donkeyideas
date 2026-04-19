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

    // Get all companies for the user with financial data
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      include: {
        plStatements: {
          orderBy: { period: 'desc' },
          take: 1,
        },
        balanceSheets: {
          orderBy: { period: 'desc' },
          take: 1,
        },
        valuations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        teamMembers: true,
        boards: {
          include: {
            columns: {
              include: { cards: true },
            },
          },
        },
      },
    });

    // Calculate totals
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalValuation = 0;
    let totalTeamMembers = 0;
    let activeProjects = 0;

    companies.forEach((company: any) => {
      const latestPL = company.plStatements[0];
      const latestBS = company.balanceSheets[0];
      const latestValuation = company.valuations[0];

      if (latestPL) {
        totalRevenue +=
          Number(latestPL.productRevenue) +
          Number(latestPL.serviceRevenue) +
          Number(latestPL.otherRevenue);
        totalExpenses +=
          Number(latestPL.directCosts) +
          Number(latestPL.infrastructureCosts) +
          Number(latestPL.salesMarketing) +
          Number(latestPL.rdExpenses) +
          Number(latestPL.adminExpenses);
      }

      if (latestBS) {
        totalAssets +=
          Number(latestBS.cashEquivalents) +
          Number(latestBS.accountsReceivable) +
          Number(latestBS.fixedAssets);
        totalLiabilities +=
          Number(latestBS.accountsPayable) +
          Number(latestBS.shortTermDebt) +
          Number(latestBS.longTermDebt);
      }

      totalValuation += latestValuation ? Number(latestValuation.amount) : 0;
      totalTeamMembers += company.teamMembers.length;

      // Count cards across all boards as active projects
      company.boards.forEach((board: any) => {
        board.columns.forEach((col: any) => {
          activeProjects += col.cards.length;
        });
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const totalEquity = totalAssets - totalLiabilities;
    const cashBalance = companies.reduce((sum: number, co: any) => {
      const bs = co.balanceSheets[0];
      return sum + (bs ? Number(bs.cashEquivalents) : 0);
    }, 0);

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cashBalance,
      companyCount: companies.length,
      activeProjects,
      // Legacy fields
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

