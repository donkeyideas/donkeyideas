import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/budget/approve - Approve actuals and create transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodId, lineIds, userId } = body;

    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      );
    }

    // Get the period to verify it's an ACTUALS period
    const period = await prisma.budgetPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: 'Period not found' },
        { status: 404 }
      );
    }

    if (period.type !== 'ACTUALS') {
      return NextResponse.json(
        { error: 'Only ACTUALS periods can be approved' },
        { status: 400 }
      );
    }

    // Get lines to approve
    const where: any = {
      periodId,
      isApproved: false, // Only approve unapproved lines
    };

    if (lineIds && Array.isArray(lineIds) && lineIds.length > 0) {
      where.id = { in: lineIds };
    }

    const linesToApprove = await prisma.budgetLine.findMany({
      where,
      include: {
        category: true,
      },
    });

    if (linesToApprove.length === 0) {
      return NextResponse.json(
        { error: 'No lines to approve' },
        { status: 400 }
      );
    }

    // Create transactions and update lines in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdTransactions = [];
      const updatedLines = [];

      for (const line of linesToApprove) {
        // Skip lines with zero amount
        if (line.amount.equals(0)) continue;

        // Create transaction
        const transaction = await tx.transaction.create({
          data: {
            companyId: line.companyId,
            date: line.date,
            type: line.category.type === 'INCOME' ? 'revenue' : 'expense',
            category: line.category.accountCode || line.category.name.toLowerCase().replace(/\s+/g, '_'),
            amount: line.amount,
            description: `${line.category.name}${line.notes ? ` - ${line.notes}` : ''} [Auto-posted from budget actuals]`,
            affectsPL: true,
            affectsBalance: true,
            affectsCashFlow: true,
          },
        });

        createdTransactions.push(transaction);

        // Update budget line to mark as approved
        const updatedLine = await tx.budgetLine.update({
          where: { id: line.id },
          data: {
            isApproved: true,
            approvedAt: new Date(),
            approvedBy: userId || 'system',
            transactionId: transaction.id,
          },
        });

        updatedLines.push(updatedLine);
      }

      return { transactions: createdTransactions, lines: updatedLines };
    });

    // Trigger financial recalculation for the affected company and periods
    // This will update P&L, Balance Sheet, and Cash Flow
    if (results.transactions.length > 0) {
      const companyId = results.transactions[0].companyId;
      
      // Trigger recalculation (you may want to call your existing financial calculation endpoint)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/companies/${companyId}/financials/calculate`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error triggering financial recalculation:', error);
        // Don't fail the approval if recalc fails - it can be done manually
      }
    }

    return NextResponse.json({
      success: true,
      approved: results.lines.length,
      transactions: results.transactions.length,
      summary: {
        totalIncome: results.transactions
          .filter(t => t.type === 'revenue')
          .reduce((sum, t) => sum.add(t.amount), new Decimal(0))
          .toString(),
        totalExpense: results.transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum.add(t.amount.abs()), new Decimal(0))
          .toString(),
      },
    });
  } catch (error) {
    console.error('Error approving budget actuals:', error);
    return NextResponse.json(
      { error: 'Failed to approve actuals', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/budget/approve - Get approval summary for a period
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      );
    }

    // Get unapproved lines
    const unapprovedLines = await prisma.budgetLine.findMany({
      where: {
        periodId,
        isApproved: false,
      },
      include: {
        category: true,
      },
    });

    // Group by category
    const summary: any = {};
    let totalIncome = new Decimal(0);
    let totalExpense = new Decimal(0);

    for (const line of unapprovedLines) {
      const categoryName = line.category.name;
      
      if (!summary[categoryName]) {
        summary[categoryName] = {
          category: categoryName,
          type: line.category.type,
          accountCode: line.category.accountCode,
          count: 0,
          amount: new Decimal(0),
        };
      }

      summary[categoryName].count++;
      summary[categoryName].amount = summary[categoryName].amount.add(line.amount);

      if (line.category.type === 'INCOME') {
        totalIncome = totalIncome.add(line.amount);
      } else {
        totalExpense = totalExpense.add(line.amount.abs());
      }
    }

    return NextResponse.json({
      periodId,
      unapprovedCount: unapprovedLines.length,
      categories: Object.values(summary).map((s: any) => ({
        ...s,
        amount: s.amount.toString(),
      })),
      totals: {
        income: totalIncome.toString(),
        expense: totalExpense.toString(),
        net: totalIncome.minus(totalExpense).toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching approval summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
