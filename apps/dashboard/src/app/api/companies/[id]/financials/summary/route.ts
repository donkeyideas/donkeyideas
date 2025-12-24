import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/:id/financials/summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }
    
    // Get query params for month filter
    const { searchParams } = new URL(request.url);
    const monthFilter = searchParams.get('month'); // Format: YYYY-MM
    
    // Build date filter if month is provided
    let dateFilter: any = {};
    if (monthFilter) {
      const [year, month] = monthFilter.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        period: {
          gte: startDate,
          lte: endDate,
        },
      };
    }
    
    // Get latest Balance Sheet, Cash Flow, and P&L aggregation in parallel
    const [latestBalance, latestCashFlow, plAggregation] = await Promise.all([
      prisma.balanceSheet.findFirst({
        where: { companyId: params.id },
        orderBy: { period: 'desc' },
      }),
      prisma.cashFlow.findFirst({
        where: { companyId: params.id },
        orderBy: { period: 'desc' },
      }),
      // Use database aggregation for P&L statements (much faster than loading all records)
      prisma.pLStatement.aggregate({
        where: {
          companyId: params.id,
          ...dateFilter,
        },
        _sum: {
          productRevenue: true,
          serviceRevenue: true,
          otherRevenue: true,
          directCosts: true,
          infrastructureCosts: true,
          salesMarketing: true,
          rdExpenses: true,
          adminExpenses: true,
        },
      }),
    ]);
    
    const totalRevenue = Number(plAggregation._sum.productRevenue || 0) + 
                         Number(plAggregation._sum.serviceRevenue || 0) + 
                         Number(plAggregation._sum.otherRevenue || 0);
    const totalDirectCosts = Number(plAggregation._sum.directCosts || 0);
    const totalInfrastructureCosts = Number(plAggregation._sum.infrastructureCosts || 0);
    const totalSalesMarketing = Number(plAggregation._sum.salesMarketing || 0);
    const totalRdExpenses = Number(plAggregation._sum.rdExpenses || 0);
    const totalAdminExpenses = Number(plAggregation._sum.adminExpenses || 0);
    
    // COGS = Direct Costs + Infrastructure Costs
    const cogs = totalDirectCosts + totalInfrastructureCosts;
    
    // Operating Expenses (OpEx) = Sales & Marketing + R&D + Admin
    const operatingExpenses = totalSalesMarketing + totalRdExpenses + totalAdminExpenses;
    
    // Total Expenses = COGS + Operating Expenses
    const totalExpenses = cogs + operatingExpenses;
    
    // Net Profit = Revenue - Total Expenses
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const totalAssets = latestBalance
      ? Number(latestBalance.cashEquivalents || 0) +
        Number(latestBalance.accountsReceivable || 0) +
        Number(latestBalance.fixedAssets || 0)
      : 0;
    
    const totalLiabilities = latestBalance
      ? Number(latestBalance.accountsPayable || 0) +
        Number(latestBalance.shortTermDebt || 0) +
        Number(latestBalance.longTermDebt || 0)
      : 0;
    
    const totalEquity = totalAssets - totalLiabilities;
    
    // Use cash flow statement for cash balance (much faster than loading all transactions)
    let cashBalance = 0;
    
    if (monthFilter) {
      // Get cash flow for the specific month
      const [year, month] = monthFilter.split('-').map(Number);
      const periodStart = new Date(year, month - 1, 1);
      
      const monthCashFlow = await prisma.cashFlow.findFirst({
        where: {
          companyId: params.id,
          period: periodStart,
        },
      });
      
      if (monthCashFlow) {
        cashBalance = Number(monthCashFlow.endingCash || 0);
      } else {
        // Fallback: get latest cash flow before this month
        const previousCashFlow = await prisma.cashFlow.findFirst({
          where: {
            companyId: params.id,
            period: {
              lt: periodStart,
            },
          },
          orderBy: { period: 'desc' },
        });
        cashBalance = previousCashFlow ? Number(previousCashFlow.endingCash || 0) : 0;
      }
    } else {
      // Use latest cash flow ending cash for "All Time"
      if (latestCashFlow) {
        cashBalance = Number(latestCashFlow.endingCash || 0);
      } else if (latestBalance) {
        // Fallback to balance sheet
        cashBalance = Number(latestBalance.cashEquivalents || 0);
      }
    }
    
    return NextResponse.json({
      totalRevenue,
      cogs,
      totalExpenses,
      netProfit,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cashBalance,
      profitMargin,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch summary' } },
      { status: 500 }
    );
  }
}

