import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/budget/lines - Get budget lines with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const companyId = searchParams.get('companyId');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (periodId) where.periodId = periodId;
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const lines = await prisma.budgetLine.findMany({
      where,
      include: {
        category: true,
        period: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(lines);
  } catch (error) {
    console.error('Error fetching budget lines:', error);
    return NextResponse.json({ error: 'Failed to fetch lines' }, { status: 500 });
  }
}

// POST /api/budget/lines - Create or update budget lines (bulk operation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lines } = body; // Array of line objects

    if (!Array.isArray(lines)) {
      return NextResponse.json({ error: 'Lines must be an array' }, { status: 400 });
    }

    // Use transaction to create/update multiple lines atomically
    const results = await prisma.$transaction(
      lines.map((line: any) => {
        const { id, periodId, companyId, categoryId, date, amount, notes } = line;

        if (id) {
          // Update existing line
          return prisma.budgetLine.update({
            where: { id },
            data: {
              amount: new Decimal(amount || 0),
              notes,
            },
          });
        } else {
          // Create new line
          return prisma.budgetLine.create({
            data: {
              periodId,
              companyId,
              categoryId,
              date: new Date(date),
              amount: new Decimal(amount || 0),
              notes,
            },
          });
        }
      })
    );

    // Calculate running balances for the affected period
    if (lines.length > 0 && lines[0].periodId) {
      await calculateRunningBalances(lines[0].periodId);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Error saving budget lines:', error);
    return NextResponse.json({ error: 'Failed to save lines' }, { status: 500 });
  }
}

// Helper function to calculate running balances
async function calculateRunningBalances(periodId: string) {
  try {
    // Get all lines for this period, ordered by date
    const lines = await prisma.budgetLine.findMany({
      where: { periodId },
      orderBy: {
        date: 'asc',
      },
    });

    // Group by date and calculate daily net
    const dailyTotals = new Map<string, Decimal>();
    
    for (const line of lines) {
      const dateKey = line.date.toISOString().split('T')[0];
      const currentTotal = dailyTotals.get(dateKey) || new Decimal(0);
      dailyTotals.set(dateKey, currentTotal.add(line.amount));
    }

    // Calculate running balance
    let runningBalance = new Decimal(0);
    const updates = [];

    for (const [date, netAmount] of Array.from(dailyTotals.entries()).sort()) {
      runningBalance = runningBalance.add(netAmount);
      
      // Update all lines for this date with the running balance
      const linesForDate = lines.filter(
        l => l.date.toISOString().split('T')[0] === date
      );

      for (const line of linesForDate) {
        updates.push(
          prisma.budgetLine.update({
            where: { id: line.id },
            data: { balance: runningBalance },
          })
        );
      }
    }

    // Execute all updates
    await prisma.$transaction(updates);
  } catch (error) {
    console.error('Error calculating running balances:', error);
  }
}
