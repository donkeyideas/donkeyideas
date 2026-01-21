import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

// GET /api/budget/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get company-specific categories and global categories (companyId = null)
    const categories = await prisma.budgetCategory.findMany({
      where: {
        OR: [
          { companyId },
          { companyId: null }, // Global categories
        ],
        isActive: true,
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/budget/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, type, accountCode, color } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be INCOME or EXPENSE' },
        { status: 400 }
      );
    }

    const category = await prisma.budgetCategory.create({
      data: {
        companyId: companyId || null,
        name,
        type,
        accountCode: accountCode || null,
        color: color || (type === 'INCOME' ? '#10b981' : '#ef4444'),
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating budget category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
