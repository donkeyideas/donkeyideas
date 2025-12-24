import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const plStatementSchema = z.object({
  period: z.string().transform((str) => new Date(str)),
  productRevenue: z.number().min(0).default(0),
  serviceRevenue: z.number().min(0).default(0),
  otherRevenue: z.number().min(0).default(0),
  directCosts: z.number().min(0).default(0),
  infrastructureCosts: z.number().min(0).default(0),
  salesMarketing: z.number().min(0).default(0),
  rdExpenses: z.number().min(0).default(0),
  adminExpenses: z.number().min(0).default(0),
});

// POST /api/companies/:id/financials/pl
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
    const validated = plStatementSchema.parse(body);
    
    // Convert to Decimal for Prisma
    const plStatement = await prisma.pLStatement.upsert({
      where: {
        companyId_period: {
          companyId: params.id,
          period: validated.period,
        },
      },
      create: {
        companyId: params.id,
        period: validated.period,
        productRevenue: new Decimal(validated.productRevenue),
        serviceRevenue: new Decimal(validated.serviceRevenue),
        otherRevenue: new Decimal(validated.otherRevenue),
        directCosts: new Decimal(validated.directCosts),
        infrastructureCosts: new Decimal(validated.infrastructureCosts),
        salesMarketing: new Decimal(validated.salesMarketing),
        rdExpenses: new Decimal(validated.rdExpenses),
        adminExpenses: new Decimal(validated.adminExpenses),
      },
      update: {
        productRevenue: new Decimal(validated.productRevenue),
        serviceRevenue: new Decimal(validated.serviceRevenue),
        otherRevenue: new Decimal(validated.otherRevenue),
        directCosts: new Decimal(validated.directCosts),
        infrastructureCosts: new Decimal(validated.infrastructureCosts),
        salesMarketing: new Decimal(validated.salesMarketing),
        rdExpenses: new Decimal(validated.rdExpenses),
        adminExpenses: new Decimal(validated.adminExpenses),
      },
    });
    
    return NextResponse.json({ plStatement: {
      ...plStatement,
      productRevenue: plStatement.productRevenue.toNumber(),
      serviceRevenue: plStatement.serviceRevenue.toNumber(),
      otherRevenue: plStatement.otherRevenue.toNumber(),
      directCosts: plStatement.directCosts.toNumber(),
      infrastructureCosts: plStatement.infrastructureCosts.toNumber(),
      salesMarketing: plStatement.salesMarketing.toNumber(),
      rdExpenses: plStatement.rdExpenses.toNumber(),
      adminExpenses: plStatement.adminExpenses.toNumber(),
    } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to save P&L statement' } },
      { status: 500 }
    );
  }
}

// GET /api/companies/:id/financials/pl
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
    
    const plStatements = await prisma.pLStatement.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    // Convert Decimal to number for JSON
    const statements = plStatements.map((stmt) => ({
      ...stmt,
      productRevenue: stmt.productRevenue.toNumber(),
      serviceRevenue: stmt.serviceRevenue.toNumber(),
      otherRevenue: stmt.otherRevenue.toNumber(),
      directCosts: stmt.directCosts.toNumber(),
      infrastructureCosts: stmt.infrastructureCosts.toNumber(),
      salesMarketing: stmt.salesMarketing.toNumber(),
      rdExpenses: stmt.rdExpenses.toNumber(),
      adminExpenses: stmt.adminExpenses.toNumber(),
    }));
    
    return NextResponse.json({ plStatements: statements });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch P&L statements' } },
      { status: 500 }
    );
  }
}


