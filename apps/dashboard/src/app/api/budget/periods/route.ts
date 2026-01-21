import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

// GET /api/budget/periods - List budget periods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type'); // BUDGET, FORECAST, ACTUALS

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const where: any = { companyId };
    if (type) {
      where.type = type;
    }

    const periods = await prisma.budgetPeriod.findMany({
      where,
      include: {
        _count: {
          select: {
            lines: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error fetching budget periods:', error);
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
  }
}

// POST /api/budget/periods - Create new budget period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, startDate, endDate, type, status } = body;

    if (!companyId || !name || !startDate || !endDate || !type) {
      return NextResponse.json(
        { error: 'companyId, name, startDate, endDate, and type are required' },
        { status: 400 }
      );
    }

    if (!['BUDGET', 'FORECAST', 'ACTUALS'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be BUDGET, FORECAST, or ACTUALS' },
        { status: 400 }
      );
    }

    const period = await prisma.budgetPeriod.create({
      data: {
        companyId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        status: status || 'DRAFT',
      },
    });

    // Auto-generate daily entries for the period
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dailyEntries = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dailyEntries.push({
        periodId: period.id,
        companyId,
        date: new Date(date),
      });
    }

    // Note: We'll create budget lines when categories are selected by the user
    // This just creates the period structure

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error('Error creating budget period:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}
