import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/:id/financials/cashflow
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
    
    const cashFlows = await prisma.cashFlow.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    const flows = cashFlows.map((flow) => ({
      ...flow,
      operatingCashFlow: flow.operatingCashFlow.toNumber(),
      investingCashFlow: flow.investingCashFlow.toNumber(),
      financingCashFlow: flow.financingCashFlow.toNumber(),
      netCashFlow: flow.netCashFlow.toNumber(),
      beginningCash: flow.beginningCash.toNumber(),
      endingCash: flow.endingCash.toNumber(),
    }));
    
    return NextResponse.json({ cashFlows: flows });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch cash flows' } },
      { status: 500 }
    );
  }
}

