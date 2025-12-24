import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/consolidated/financials/export - Export consolidated financials as CSV
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
      },
    });
    
    // Generate CSV
    const csvRows = [
      ['Company', 'Revenue', 'Expenses', 'Profit', 'Valuation'].join(','),
    ];
    
    companies.forEach((company) => {
      const latestPL = company.plStatements[0];
      const latestValuation = company.valuations[0];
      
      const revenue = latestPL
        ? Number(latestPL.productRevenue) + Number(latestPL.serviceRevenue) + Number(latestPL.otherRevenue)
        : 0;
      const expenses = latestPL
        ? Number(latestPL.directCosts) +
          Number(latestPL.infrastructureCosts) +
          Number(latestPL.salesMarketing) +
          Number(latestPL.rdExpenses) +
          Number(latestPL.adminExpenses)
        : 0;
      const profit = revenue - expenses;
      const valuation = latestValuation ? Number(latestValuation.amount) : 0;
      
      csvRows.push([
        company.name,
        revenue.toString(),
        expenses.toString(),
        profit.toString(),
        valuation.toString(),
      ].join(','));
    });
    
    // Add totals row
    const totalRevenue = companies.reduce((sum, c) => {
      const pl = c.plStatements[0];
      return pl
        ? sum + Number(pl.productRevenue) + Number(pl.serviceRevenue) + Number(pl.otherRevenue)
        : sum;
    }, 0);
    const totalExpenses = companies.reduce((sum, c) => {
      const pl = c.plStatements[0];
      return pl
        ? sum +
            Number(pl.directCosts) +
            Number(pl.infrastructureCosts) +
            Number(pl.salesMarketing) +
            Number(pl.rdExpenses) +
            Number(pl.adminExpenses)
        : sum;
    }, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const totalValuation = companies.reduce(
      (sum, c) => sum + (c.valuations[0] ? Number(c.valuations[0].amount) : 0),
      0
    );
    
    csvRows.push([
      'TOTAL',
      totalRevenue.toString(),
      totalExpenses.toString(),
      totalProfit.toString(),
      totalValuation.toString(),
    ].join(','));
    
    const csvContent = csvRows.join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="consolidated-financials-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Failed to export consolidated financials:', error);
    return NextResponse.json(
      { error: { message: 'Failed to export consolidated financials' } },
      { status: 500 }
    );
  }
}

