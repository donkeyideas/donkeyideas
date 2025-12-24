import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { calculateValuation } from '@/lib/valuation';

// POST /api/companies/:id/valuations/calculate
export async function POST(
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
    
    // Verify company ownership
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
    
    // Fetch transaction data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const transactions = await prisma.transaction.findMany({
      where: { 
        companyId: params.id,
        date: { gte: twelveMonthsAgo }
      },
      orderBy: { date: 'desc' },
    });
    
    // Convert transactions to financial data
    const transactionData = transactions.map((tx: any) => ({
      date: tx.date,
      type: tx.type,
      category: tx.category,
      amount: tx.amount.toNumber(),
      affectsPL: tx.affectsPL,
      affectsCashFlow: tx.affectsCashFlow,
    }));
    
    // Calculate valuation from transactions
    const valuation = calculateValuation({
      transactions: transactionData,
      companyName: company.name,
    });
    
    // Save recommendation to database
    const savedValuation = await prisma.valuation.create({
      data: {
        companyId: params.id,
        method: valuation.recommendation.method,
        amount: valuation.recommendation.amount,
        score: valuation.aiScore,
        parameters: valuation.recommendation.parameters || {},
      },
    });
    
    return NextResponse.json({
      valuation: {
        ...valuation,
        saved: {
          id: savedValuation.id,
          createdAt: savedValuation.createdAt,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to calculate valuation' } },
      { status: 500 }
    );
  }
}

// GET /api/companies/:id/valuations/latest
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
    
    // Verify company ownership
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
    
    const latestValuation = await prisma.valuation.findFirst({
      where: { companyId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!latestValuation) {
      return NextResponse.json(
        { error: { message: 'No valuation found' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      valuation: {
        ...latestValuation,
        amount: latestValuation.amount.toNumber(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch valuation' } },
      { status: 500 }
    );
  }
}

