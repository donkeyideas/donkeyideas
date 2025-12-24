import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/companies/consolidated/rebuild-cashflow
// Rebuilds cash flow statements for all companies
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
      include: {
        transactions: {
          where: {
            OR: [
              { affectsCashFlow: true },
              { type: 'revenue' },
              { type: 'expense' },
            ],
          },
          orderBy: { date: 'asc' },
        },
      },
    });
    
    let totalPeriodsProcessed = 0;
    const companyResults: Array<{ companyId: string; companyName: string; periodsProcessed: number }> = [];
    
    // Rebuild cash flow for each company
    for (const company of companies) {
      // Group transactions by period
      const transactionsByPeriod = new Map<string, typeof company.transactions>();
      
      for (const transaction of company.transactions) {
        const transactionDate = new Date(transaction.date);
        const period = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
        const periodKey = period.toISOString();
        
        if (!transactionsByPeriod.has(periodKey)) {
          transactionsByPeriod.set(periodKey, []);
        }
        transactionsByPeriod.get(periodKey)!.push(transaction);
      }
      
      // Process each period in chronological order
      const periods = Array.from(transactionsByPeriod.keys()).sort();
      let previousEndingCash = 0;
      
      for (const periodKey of periods) {
        const period = new Date(periodKey);
        const transactions = transactionsByPeriod.get(periodKey) || [];
        
        // Calculate cash flows for this period
        let operatingCashFlow = 0;
        let investingCashFlow = 0;
        let financingCashFlow = 0;
        
        for (const transaction of transactions) {
          const amount = Number(transaction.amount || 0);
          const affectsCashFlow = transaction.affectsCashFlow || transaction.type === 'revenue' || transaction.type === 'expense';
          
          if (!affectsCashFlow) continue;
          
          if (transaction.type === 'revenue') {
            operatingCashFlow += amount;
          } else if (transaction.type === 'expense') {
            operatingCashFlow -= amount;
          } else if (transaction.type === 'asset' && transaction.category === 'cash') {
            operatingCashFlow += amount;
          } else if (transaction.type === 'asset' && (transaction.category === 'equipment' || transaction.category === 'inventory')) {
            investingCashFlow -= amount;
          } else if (transaction.type === 'equity') {
            financingCashFlow += amount;
          } else if (transaction.type === 'liability') {
            if (transaction.category === 'short_term_debt' || transaction.category === 'long_term_debt') {
              financingCashFlow += amount;
            } else if (transaction.category === 'accounts_payable') {
              operatingCashFlow -= amount;
            }
          }
        }
        
        const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
        const endingCash = previousEndingCash + netCashFlow;
        
        // Create or update cash flow statement
        await prisma.cashFlow.upsert({
          where: {
            companyId_period: {
              companyId: company.id,
              period,
            },
          },
          update: {
            beginningCash: new Decimal(previousEndingCash),
            operatingCashFlow: new Decimal(operatingCashFlow),
            investingCashFlow: new Decimal(investingCashFlow),
            financingCashFlow: new Decimal(financingCashFlow),
            netCashFlow: new Decimal(netCashFlow),
            endingCash: new Decimal(endingCash),
          },
          create: {
            companyId: company.id,
            period,
            beginningCash: new Decimal(previousEndingCash),
            operatingCashFlow: new Decimal(operatingCashFlow),
            investingCashFlow: new Decimal(investingCashFlow),
            financingCashFlow: new Decimal(financingCashFlow),
            netCashFlow: new Decimal(netCashFlow),
            endingCash: new Decimal(endingCash),
          },
        });
        
        // Update balance sheet cash for this period
        await prisma.balanceSheet.upsert({
          where: {
            companyId_period: {
              companyId: company.id,
              period,
            },
          },
          update: {
            cashEquivalents: new Decimal(endingCash),
          },
          create: {
            companyId: company.id,
            period,
            cashEquivalents: new Decimal(endingCash),
          },
        });
        
        previousEndingCash = endingCash;
        totalPeriodsProcessed++;
      }
      
      companyResults.push({
        companyId: company.id,
        companyName: company.name,
        periodsProcessed: periods.length,
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Rebuilt cash flow statements for ${companies.length} companies`,
      totalPeriodsProcessed,
      companies: companyResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to rebuild cash flow' } },
      { status: 500 }
    );
  }
}

