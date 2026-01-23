import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * NUCLEAR RESET - Delete ALL financial + budget data
 * POST /api/companies/consolidated/nuke-data
 *
 * This endpoint:
 * 1) Deletes ALL budget lines/periods/categories for user's companies
 * 2) Deletes ALL transactions for user's companies
 * 3) Deletes ALL financial statements (P&L, BS, CF)
 * 4) Deletes ALL KPIs and valuations
 *
 * Companies and users are preserved. UI remains unchanged.
 */
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const companyIds = companies.map((company) => company.id);

    if (companyIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No companies found. Nothing to delete.',
        summary: {
          companiesProcessed: 0,
          budgetLinesDeleted: 0,
          budgetPeriodsDeleted: 0,
          budgetCategoriesDeleted: 0,
          transactionsDeleted: 0,
          statementsDeleted: 0,
          kpisDeleted: 0,
          valuationsDeleted: 0,
        },
      });
    }

    const [
      budgetLinesDeleted,
      budgetPeriodsDeleted,
      budgetCategoriesDeleted,
      transactionsDeleted,
      plDeleted,
      bsDeleted,
      cfDeleted,
      kpisDeleted,
      valuationsDeleted,
    ] = await prisma.$transaction([
      prisma.budgetLine.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.budgetPeriod.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.budgetCategory.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.transaction.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.pLStatement.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.balanceSheet.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.cashFlow.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.kPI.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
      prisma.valuation.deleteMany({
        where: { companyId: { in: companyIds } },
      }),
    ]);

    const statementsDeleted = plDeleted.count + bsDeleted.count + cfDeleted.count;

    return NextResponse.json({
      success: true,
      message: 'NUCLEAR RESET COMPLETE - All financial data deleted',
      summary: {
        companiesProcessed: companyIds.length,
        budgetLinesDeleted: budgetLinesDeleted.count,
        budgetPeriodsDeleted: budgetPeriodsDeleted.count,
        budgetCategoriesDeleted: budgetCategoriesDeleted.count,
        transactionsDeleted: transactionsDeleted.count,
        statementsDeleted,
        kpisDeleted: kpisDeleted.count,
        valuationsDeleted: valuationsDeleted.count,
      },
    });
  } catch (error: any) {
    console.error('❌ NUCLEAR RESET FAILED:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete financial data' },
      { status: 500 }
    );
  }
}
