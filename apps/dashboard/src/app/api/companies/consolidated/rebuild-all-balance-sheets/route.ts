import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/consolidated/rebuild-all-balance-sheets
// Rebuild balance sheets for ALL companies owned by the user
export async function POST(request: NextRequest) {
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
    });
    
    if (companies.length === 0) {
      return NextResponse.json(
        { error: { message: 'No companies found' } },
        { status: 404 }
      );
    }
    
    let totalProcessed = 0;
    const results = [];
    
    // Process each company using the NEW clean recalculation endpoint
    for (const company of companies) {
      try {
        console.log(`🔄 Recalculating ${company.name}...`);
        
        // Call the NEW clean recalculation endpoint
        // This properly calculates AND stores P&L, Balance Sheet, Cash Flow
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/companies/${company.id}/financials/recalculate-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to recalculate: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        totalProcessed++;
        results.push({
          companyId: company.id,
          companyName: company.name,
          transactionsProcessed: data.transactionsProcessed,
          success: true,
        });
      } catch (error: any) {
        console.error(`Failed to rebuild for ${company.name}:`, error);
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: false,
          error: error.message,
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Rebuilt balance sheets for ${totalProcessed} of ${companies.length} companies`,
      companiesProcessed: totalProcessed,
      totalCompanies: companies.length,
      results,
    });
  } catch (error: any) {
    console.error('Failed to rebuild all balance sheets:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to rebuild all balance sheets' } },
      { status: 500 }
    );
  }
}

// Helper function to update cash flow (same as in single company rebuild)
async function updateCashFlow(
  companyId: string,
  period: Date,
  type: string,
  category: string,
  amount: number
) {
  const { Decimal } = await import('@prisma/client/runtime/library');
  
  // Get the most recent period's ending cash before the current period for beginning cash
  const mostRecentCashFlow = await prisma.cashFlow.findFirst({
    where: {
      companyId,
      period: {
        lt: period,
      },
    },
    orderBy: { period: 'desc' },
  });
  
  let beginningCash = 0;
  if (mostRecentCashFlow) {
    beginningCash = Number(mostRecentCashFlow.endingCash || 0);
  }
  
  // Check if cash flow already exists
  const existingCashFlow = await prisma.cashFlow.findUnique({
    where: {
      companyId_period: {
        companyId,
        period,
      },
    },
  });
  
  const cashFlow = existingCashFlow || await prisma.cashFlow.create({
    data: {
      companyId,
      period,
      beginningCash: new Decimal(beginningCash),
      endingCash: new Decimal(beginningCash),
      operatingCashFlow: new Decimal(0),
      investingCashFlow: new Decimal(0),
      financingCashFlow: new Decimal(0),
      netCashFlow: new Decimal(0),
    },
  });
  
  const updateData: any = {};
  
  // Categorize cash flows
  if (type === 'revenue') {
    updateData.operatingCashFlow = { increment: new Decimal(amount) };
  } else if (type === 'expense') {
    updateData.operatingCashFlow = { increment: new Decimal(-amount) };
  } else if (type === 'asset') {
    if (category === 'cash') {
      updateData.operatingCashFlow = { increment: new Decimal(amount) };
    } else if (category === 'equipment' || category === 'inventory') {
      updateData.investingCashFlow = { increment: new Decimal(-amount) };
    }
  } else if (type === 'equity') {
    updateData.financingCashFlow = { increment: new Decimal(amount) };
  } else if (type === 'liability') {
    if (category === 'short_term_debt' || category === 'long_term_debt') {
      updateData.financingCashFlow = { increment: new Decimal(amount) };
    } else if (category === 'accounts_payable') {
      updateData.operatingCashFlow = { increment: new Decimal(-amount) };
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.cashFlow.update({
      where: { id: cashFlow.id },
      data: updateData,
    });
    
    // Recalculate net cash flow and ending cash
    const updated = await prisma.cashFlow.findUnique({
      where: { id: cashFlow.id },
    });
    
    if (updated) {
      const operating = Number(updated.operatingCashFlow || 0);
      const investing = Number(updated.investingCashFlow || 0);
      const financing = Number(updated.financingCashFlow || 0);
      const netCashFlow = operating + investing + financing;
      const endingCash = Number(updated.beginningCash || 0) + netCashFlow;
      
      await prisma.cashFlow.update({
        where: { id: cashFlow.id },
        data: {
          netCashFlow: new Decimal(netCashFlow),
          endingCash: new Decimal(endingCash),
        },
      });
      
      // Sync ending cash with balance sheet
      await prisma.balanceSheet.upsert({
        where: {
          companyId_period: {
            companyId,
            period,
          },
        },
        update: {
          cashEquivalents: new Decimal(endingCash),
        },
        create: {
          companyId,
          period,
          cashEquivalents: new Decimal(endingCash),
        },
      });
    }
  }
}

// Helper function to update balance sheet (same as in single company rebuild)
async function updateBalanceSheet(
  companyId: string,
  period: Date,
  type: string,
  category: string,
  amount: number,
  isCashTransaction: boolean = false
) {
  const { Decimal } = await import('@prisma/client/runtime/library');
  
  // If this is a cash flow transaction, the cash flow update already synced the balance sheet
  if (isCashTransaction && (type === 'revenue' || type === 'expense')) {
    return;
  }
  
  const balanceSheet = await prisma.balanceSheet.upsert({
    where: {
      companyId_period: {
        companyId,
        period,
      },
    },
    update: {},
    create: {
      companyId,
      period,
    },
  });
  
  const updateData: any = {};
  
  if (type === 'asset') {
    const categoryLower = category.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    if (categoryLower === 'cash') {
      updateData.cashEquivalents = { increment: new Decimal(amount) };
    } else if (categoryLower === 'accounts_receivable' || categoryLower === 'intercompany_receivable') {
      // Intercompany receivables are treated as accounts receivable on individual balance sheets
      updateData.accountsReceivable = { increment: new Decimal(amount) };
    } else if (categoryLower === 'equipment' || categoryLower === 'inventory') {
      updateData.fixedAssets = { increment: new Decimal(amount) };
    }
  } else if (type === 'liability') {
    const categoryLower = category.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    if (categoryLower === 'accounts_payable' || categoryLower === 'intercompany_payable') {
      // Intercompany payables are treated as accounts payable on individual balance sheets
      updateData.accountsPayable = { increment: new Decimal(amount) };
    } else if (categoryLower === 'short_term_debt') {
      updateData.shortTermDebt = { increment: new Decimal(amount) };
    } else if (categoryLower === 'long_term_debt') {
      updateData.longTermDebt = { increment: new Decimal(amount) };
    }
  }
  
  // Handle revenue/expense effects on balance sheet (only if not cash flow transaction)
  if (!isCashTransaction) {
    if (type === 'revenue') {
      updateData.accountsReceivable = { increment: new Decimal(amount) };
    } else if (type === 'expense') {
      updateData.accountsPayable = { increment: new Decimal(amount) };
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await prisma.balanceSheet.update({
      where: { id: balanceSheet.id },
      data: updateData,
    });
  }
}
