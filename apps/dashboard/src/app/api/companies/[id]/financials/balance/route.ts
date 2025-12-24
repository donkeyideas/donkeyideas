import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/:id/financials/balance
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
    
    const balanceSheets = await prisma.balanceSheet.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    const sheets = balanceSheets.map((sheet) => ({
      ...sheet,
      cashEquivalents: sheet.cashEquivalents.toNumber(),
      accountsReceivable: sheet.accountsReceivable.toNumber(),
      fixedAssets: sheet.fixedAssets.toNumber(),
      accountsPayable: sheet.accountsPayable.toNumber(),
      shortTermDebt: sheet.shortTermDebt.toNumber(),
      longTermDebt: sheet.longTermDebt.toNumber(),
    }));
    
    return NextResponse.json({ balanceSheets: sheets });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch balance sheets' } },
      { status: 500 }
    );
  }
}

