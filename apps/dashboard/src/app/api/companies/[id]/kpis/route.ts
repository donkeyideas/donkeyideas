import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const kpiSchema = z.object({
  period: z.string().transform((str) => new Date(str)),
  mrr: z.number().min(0).optional().nullable(),
  cac: z.number().min(0).optional().nullable(),
  ltv: z.number().min(0).optional().nullable(),
  churnRate: z.number().min(0).max(100).optional().nullable(),
  nps: z.number().min(-100).max(100).optional().nullable(),
  activeUsers: z.number().int().min(0).optional().nullable(),
  growthRate: z.number().optional().nullable(),
});

// POST /api/companies/:id/kpis
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
    const validated = kpiSchema.parse(body);
    
    const kpi = await prisma.kPI.upsert({
      where: {
        companyId_period: {
          companyId: params.id,
          period: validated.period,
        },
      },
      create: {
        companyId: params.id,
        period: validated.period,
        mrr: validated.mrr ? new Decimal(validated.mrr) : null,
        cac: validated.cac ? new Decimal(validated.cac) : null,
        ltv: validated.ltv ? new Decimal(validated.ltv) : null,
        churnRate: validated.churnRate ? new Decimal(validated.churnRate) : null,
        nps: validated.nps ?? null,
        activeUsers: validated.activeUsers ?? null,
        growthRate: validated.growthRate ? new Decimal(validated.growthRate) : null,
      },
      update: {
        mrr: validated.mrr ? new Decimal(validated.mrr) : null,
        cac: validated.cac ? new Decimal(validated.cac) : null,
        ltv: validated.ltv ? new Decimal(validated.ltv) : null,
        churnRate: validated.churnRate ? new Decimal(validated.churnRate) : null,
        nps: validated.nps ?? null,
        activeUsers: validated.activeUsers ?? null,
        growthRate: validated.growthRate ? new Decimal(validated.growthRate) : null,
      },
    });
    
    return NextResponse.json({
      kpi: {
        ...kpi,
        mrr: kpi.mrr?.toNumber() ?? null,
        cac: kpi.cac?.toNumber() ?? null,
        ltv: kpi.ltv?.toNumber() ?? null,
        churnRate: kpi.churnRate?.toNumber() ?? null,
        growthRate: kpi.growthRate?.toNumber() ?? null,
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
      { error: { message: error.message || 'Failed to save KPI' } },
      { status: 500 }
    );
  }
}

// GET /api/companies/:id/kpis
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
    
    const kpis = await prisma.kPI.findMany({
      where: { companyId: params.id },
      orderBy: { period: 'desc' },
    });
    
    // Convert Decimal to number
    const kpiList = kpis.map((kpi: any) => ({
      ...kpi,
      mrr: kpi.mrr?.toNumber() ?? null,
      cac: kpi.cac?.toNumber() ?? null,
      ltv: kpi.ltv?.toNumber() ?? null,
      churnRate: kpi.churnRate?.toNumber() ?? null,
      growthRate: kpi.growthRate?.toNumber() ?? null,
    }));
    
    return NextResponse.json({ kpis: kpiList });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch KPIs' } },
      { status: 500 }
    );
  }
}


