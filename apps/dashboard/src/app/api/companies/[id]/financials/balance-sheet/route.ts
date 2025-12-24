import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const balanceSheetSchema = z.object({
  period: z.string().transform((str) => new Date(str)),
  cashEquivalents: z.number().min(0).default(0),
  accountsReceivable: z.number().min(0).default(0),
  fixedAssets: z.number().min(0).default(0),
  accountsPayable: z.number().min(0).default(0),
  shortTermDebt: z.number().min(0).default(0),
  longTermDebt: z.number().min(0).default(0),
});

// POST /api/companies/:id/financials/balance-sheet
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
    
    const body = await request.json();
    const validated = balanceSheetSchema.parse(body);
    
    const balanceSheet = await prisma.balanceSheet.upsert({
      where: {
        companyId_period: {
          companyId: params.id,
          period: validated.period,
        },
      },
      create: {
        companyId: params.id,
        period: validated.period,
        cashEquivalents: new Decimal(validated.cashEquivalents),
        accountsReceivable: new Decimal(validated.accountsReceivable),
        fixedAssets: new Decimal(validated.fixedAssets),
        accountsPayable: new Decimal(validated.accountsPayable),
        shortTermDebt: new Decimal(validated.shortTermDebt),
        longTermDebt: new Decimal(validated.longTermDebt),
      },
      update: {
        cashEquivalents: new Decimal(validated.cashEquivalents),
        accountsReceivable: new Decimal(validated.accountsReceivable),
        fixedAssets: new Decimal(validated.fixedAssets),
        accountsPayable: new Decimal(validated.accountsPayable),
        shortTermDebt: new Decimal(validated.shortTermDebt),
        longTermDebt: new Decimal(validated.longTermDebt),
      },
    });
    
    return NextResponse.json({
      balanceSheet: {
        ...balanceSheet,
        cashEquivalents: balanceSheet.cashEquivalents.toNumber(),
        accountsReceivable: balanceSheet.accountsReceivable.toNumber(),
        fixedAssets: balanceSheet.fixedAssets.toNumber(),
        accountsPayable: balanceSheet.accountsPayable.toNumber(),
        shortTermDebt: balanceSheet.shortTermDebt.toNumber(),
        longTermDebt: balanceSheet.longTermDebt.toNumber(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to save balance sheet' } },
      { status: 500 }
    );
  }
}

// GET /api/companies/:id/financials/balance-sheet
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
    
    const balanceSheets = await prisma.balanceSheet.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    // Convert Decimal to number
    const sheets = balanceSheets.map((sheet: any) => ({
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


