import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const profileSchema = z.object({
  mission: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  projectStatus: z.string().refine(
    (val) => !val || ['Production', 'Beta', 'Alpha', 'Development', 'Idea'].includes(val),
    { message: 'Invalid project status' }
  ).optional().nullable(),
  targetMarket: z.string().optional().nullable(),
  competitiveAdvantage: z.string().optional().nullable(),
  keyCompetitors: z.string().optional().nullable(),
  totalCustomers: z.number().int().min(0).optional().nullable(),
  monthlyRevenue: z.number().min(0).optional().nullable(),
  momGrowth: z.number().optional().nullable(),
  retentionRate: z.number().min(0).max(100).optional().nullable(),
  teamSize: z.number().int().min(0).optional().nullable(),
  totalFunding: z.number().min(0).optional().nullable(),
  keyAchievements: z.string().optional().nullable(),
});

// GET /api/companies/:id/profile
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
    
    let profile = await prisma.businessProfile.findUnique({
      where: { companyId: params.id },
    });
    
    // Create if doesn't exist
    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: { companyId: params.id },
      });
    }
    
    return NextResponse.json({
      profile: {
        ...profile,
        monthlyRevenue: profile.monthlyRevenue?.toNumber() ?? null,
        momGrowth: profile.momGrowth?.toNumber() ?? null,
        retentionRate: profile.retentionRate?.toNumber() ?? null,
        totalFunding: profile.totalFunding?.toNumber() ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch profile' } },
      { status: 500 }
    );
  }
}

// PUT /api/companies/:id/profile
export async function PUT(
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
    const validated = profileSchema.parse(body);
    
    // Convert empty string to null for projectStatus
    const projectStatus = validated.projectStatus === '' ? null : validated.projectStatus;
    
    const profile = await prisma.businessProfile.upsert({
      where: { companyId: params.id },
      create: {
        companyId: params.id,
        mission: validated.mission,
        about: validated.about,
        projectStatus: projectStatus,
        targetMarket: validated.targetMarket,
        competitiveAdvantage: validated.competitiveAdvantage,
        keyCompetitors: validated.keyCompetitors,
        totalCustomers: validated.totalCustomers,
        monthlyRevenue: validated.monthlyRevenue
          ? new Decimal(validated.monthlyRevenue)
          : null,
        momGrowth: validated.momGrowth ? new Decimal(validated.momGrowth) : null,
        retentionRate: validated.retentionRate
          ? new Decimal(validated.retentionRate)
          : null,
        teamSize: validated.teamSize,
        totalFunding: validated.totalFunding
          ? new Decimal(validated.totalFunding)
          : null,
        keyAchievements: validated.keyAchievements,
      },
      update: {
        mission: validated.mission,
        about: validated.about,
        projectStatus: projectStatus,
        targetMarket: validated.targetMarket,
        competitiveAdvantage: validated.competitiveAdvantage,
        keyCompetitors: validated.keyCompetitors,
        totalCustomers: validated.totalCustomers,
        monthlyRevenue: validated.monthlyRevenue
          ? new Decimal(validated.monthlyRevenue)
          : null,
        momGrowth: validated.momGrowth ? new Decimal(validated.momGrowth) : null,
        retentionRate: validated.retentionRate
          ? new Decimal(validated.retentionRate)
          : null,
        teamSize: validated.teamSize,
        totalFunding: validated.totalFunding
          ? new Decimal(validated.totalFunding)
          : null,
        keyAchievements: validated.keyAchievements,
      },
    });
    
    return NextResponse.json({
      profile: {
        ...profile,
        monthlyRevenue: profile.monthlyRevenue?.toNumber() ?? null,
        momGrowth: profile.momGrowth?.toNumber() ?? null,
        retentionRate: profile.retentionRate?.toNumber() ?? null,
        totalFunding: profile.totalFunding?.toNumber() ?? null,
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
      { error: { message: error.message || 'Failed to update profile' } },
      { status: 500 }
    );
  }
}


