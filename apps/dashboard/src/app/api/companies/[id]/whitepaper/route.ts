import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Whitepaper schema - flexible validation for JSON fields
const whitepaperSchema = z.object({
  version: z.string().optional(),
  publishedDate: z.string().datetime().optional().nullable(),
  classification: z.enum(['Public', 'Private', 'Confidential']).optional(),
  
  // Executive Summary
  executiveSummary: z.string().optional().nullable(),
  
  // Company Overview
  companyOverview: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
  coreValues: z.any().optional().nullable(), // JSON array
  legalName: z.string().optional().nullable(),
  founded: z.string().optional().nullable(),
  headquarters: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  
  // Problem & Solution
  problemStatement: z.string().optional().nullable(),
  marketOpportunity: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  productDescription: z.string().optional().nullable(),
  
  // Technology
  technologyStack: z.any().optional().nullable(), // JSON
  architecture: z.string().optional().nullable(),
  technicalDetails: z.string().optional().nullable(),
  
  // Business Model
  businessModel: z.string().optional().nullable(),
  revenueStreams: z.any().optional().nullable(), // JSON
  pricingStrategy: z.string().optional().nullable(),
  goToMarket: z.string().optional().nullable(),
  
  // Market Analysis
  targetMarket: z.string().optional().nullable(),
  marketSize: z.string().optional().nullable(),
  marketTrends: z.string().optional().nullable(),
  customerSegments: z.any().optional().nullable(), // JSON
  
  // Competitive Landscape
  competitiveAnalysis: z.string().optional().nullable(),
  competitors: z.any().optional().nullable(), // JSON
  competitiveAdvantage: z.string().optional().nullable(),
  
  // Team & Advisors
  teamDescription: z.string().optional().nullable(),
  keyTeamMembers: z.any().optional().nullable(), // JSON
  advisors: z.any().optional().nullable(), // JSON
  partners: z.any().optional().nullable(), // JSON
  
  // Roadmap & Milestones
  roadmap: z.any().optional().nullable(), // JSON
  milestones: z.any().optional().nullable(), // JSON
  
  // Financials
  financialProjections: z.string().optional().nullable(),
  fundingHistory: z.any().optional().nullable(), // JSON
  useOfFunds: z.string().optional().nullable(),
  financialHighlights: z.any().optional().nullable(), // JSON
  
  // Tokenomics / Economics
  tokenomics: z.string().optional().nullable(),
  tokenDistribution: z.any().optional().nullable(), // JSON
  economics: z.string().optional().nullable(),
  
  // Use Cases
  useCases: z.any().optional().nullable(), // JSON
  caseStudies: z.any().optional().nullable(), // JSON
  
  // Legal & Regulatory
  legalConsiderations: z.string().optional().nullable(),
  regulatoryCompliance: z.string().optional().nullable(),
  riskFactors: z.string().optional().nullable(),
  disclaimers: z.string().optional().nullable(),
  
  // Additional Content
  appendices: z.any().optional().nullable(), // JSON
  references: z.any().optional().nullable(), // JSON
  
  // Metadata
  published: z.boolean().optional(),
  lastReviewed: z.string().datetime().optional().nullable(),
  reviewedBy: z.string().optional().nullable(),
});

// GET /api/companies/:id/whitepaper
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
    
    let whitepaper = await prisma.whitepaper.findUnique({
      where: { companyId: params.id },
    });
    
    // Create if doesn't exist
    if (!whitepaper) {
      whitepaper = await prisma.whitepaper.create({
        data: { companyId: params.id },
      });
    }
    
    return NextResponse.json({ whitepaper });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch whitepaper' } },
      { status: 500 }
    );
  }
}

// PUT /api/companies/:id/whitepaper
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
    const validated = whitepaperSchema.parse(body);
    
    // Convert date strings to Date objects
    const publishedDate = validated.publishedDate 
      ? new Date(validated.publishedDate) 
      : null;
    const lastReviewed = validated.lastReviewed 
      ? new Date(validated.lastReviewed) 
      : null;
    
    const whitepaper = await prisma.whitepaper.upsert({
      where: { companyId: params.id },
      create: {
        companyId: params.id,
        version: validated.version || '1.0',
        publishedDate,
        classification: validated.classification || 'Public',
        executiveSummary: validated.executiveSummary,
        companyOverview: validated.companyOverview,
        mission: validated.mission,
        vision: validated.vision,
        coreValues: validated.coreValues,
        legalName: validated.legalName,
        founded: validated.founded,
        headquarters: validated.headquarters,
        website: validated.website,
        problemStatement: validated.problemStatement,
        marketOpportunity: validated.marketOpportunity,
        solution: validated.solution,
        productDescription: validated.productDescription,
        technologyStack: validated.technologyStack,
        architecture: validated.architecture,
        technicalDetails: validated.technicalDetails,
        businessModel: validated.businessModel,
        revenueStreams: validated.revenueStreams,
        pricingStrategy: validated.pricingStrategy,
        goToMarket: validated.goToMarket,
        targetMarket: validated.targetMarket,
        marketSize: validated.marketSize,
        marketTrends: validated.marketTrends,
        customerSegments: validated.customerSegments,
        competitiveAnalysis: validated.competitiveAnalysis,
        competitors: validated.competitors,
        competitiveAdvantage: validated.competitiveAdvantage,
        teamDescription: validated.teamDescription,
        keyTeamMembers: validated.keyTeamMembers,
        advisors: validated.advisors,
        partners: validated.partners,
        roadmap: validated.roadmap,
        milestones: validated.milestones,
        financialProjections: validated.financialProjections,
        fundingHistory: validated.fundingHistory,
        useOfFunds: validated.useOfFunds,
        financialHighlights: validated.financialHighlights,
        tokenomics: validated.tokenomics,
        tokenDistribution: validated.tokenDistribution,
        economics: validated.economics,
        useCases: validated.useCases,
        caseStudies: validated.caseStudies,
        legalConsiderations: validated.legalConsiderations,
        regulatoryCompliance: validated.regulatoryCompliance,
        riskFactors: validated.riskFactors,
        disclaimers: validated.disclaimers,
        appendices: validated.appendices,
        references: validated.references,
        published: validated.published || false,
        lastReviewed,
        reviewedBy: validated.reviewedBy,
      },
      update: {
        version: validated.version,
        publishedDate,
        classification: validated.classification,
        executiveSummary: validated.executiveSummary,
        companyOverview: validated.companyOverview,
        mission: validated.mission,
        vision: validated.vision,
        coreValues: validated.coreValues,
        legalName: validated.legalName,
        founded: validated.founded,
        headquarters: validated.headquarters,
        website: validated.website,
        problemStatement: validated.problemStatement,
        marketOpportunity: validated.marketOpportunity,
        solution: validated.solution,
        productDescription: validated.productDescription,
        technologyStack: validated.technologyStack,
        architecture: validated.architecture,
        technicalDetails: validated.technicalDetails,
        businessModel: validated.businessModel,
        revenueStreams: validated.revenueStreams,
        pricingStrategy: validated.pricingStrategy,
        goToMarket: validated.goToMarket,
        targetMarket: validated.targetMarket,
        marketSize: validated.marketSize,
        marketTrends: validated.marketTrends,
        customerSegments: validated.customerSegments,
        competitiveAnalysis: validated.competitiveAnalysis,
        competitors: validated.competitors,
        competitiveAdvantage: validated.competitiveAdvantage,
        teamDescription: validated.teamDescription,
        keyTeamMembers: validated.keyTeamMembers,
        advisors: validated.advisors,
        partners: validated.partners,
        roadmap: validated.roadmap,
        milestones: validated.milestones,
        financialProjections: validated.financialProjections,
        fundingHistory: validated.fundingHistory,
        useOfFunds: validated.useOfFunds,
        financialHighlights: validated.financialHighlights,
        tokenomics: validated.tokenomics,
        tokenDistribution: validated.tokenDistribution,
        economics: validated.economics,
        useCases: validated.useCases,
        caseStudies: validated.caseStudies,
        legalConsiderations: validated.legalConsiderations,
        regulatoryCompliance: validated.regulatoryCompliance,
        riskFactors: validated.riskFactors,
        disclaimers: validated.disclaimers,
        appendices: validated.appendices,
        references: validated.references,
        published: validated.published,
        lastReviewed,
        reviewedBy: validated.reviewedBy,
      },
    });
    
    return NextResponse.json({ whitepaper });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update whitepaper' } },
      { status: 500 }
    );
  }
}

