import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/fix-intercompany-transactions
// Scans for unmatched intercompany receivables and creates matching payables on target companies
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
    
    // Get all user's companies for matching
    const allCompanies = await prisma.company.findMany({
      where: { userId: user.id },
    });
    
    // Create a map for quick lookup
    const companyMap = new Map(allCompanies.map(c => [c.name.toLowerCase(), c]));
    
    // Find all intercompany receivable transactions for this company
    const intercompanyReceivables = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        type: 'asset',
        category: {
          contains: 'intercompany',
          mode: 'insensitive',
        },
      },
    });
    
    if (intercompanyReceivables.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No intercompany receivables found',
        created: 0,
      });
    }
    
    const { Decimal } = await import('@prisma/client/runtime/library');
    const created = [];
    const errors = [];
    
    // Process each receivable
    for (const receivable of intercompanyReceivables) {
      try {
        // Try to extract target company name from description
        // Expected format: "... Julyu..." or "... to/from CompanyName..."
        const description = receivable.description || '';
        let targetCompanyName: string | null = null;
        
        // Try to find company name in description
        for (const [name, targetCompany] of companyMap) {
          if (targetCompany.id === params.id) continue; // Skip self
          
          const namePattern = new RegExp(targetCompany.name, 'i');
          if (namePattern.test(description)) {
            targetCompanyName = targetCompany.name;
            break;
          }
        }
        
        if (!targetCompanyName) {
          errors.push({
            transaction: receivable.id,
            error: 'Could not identify target company from description',
            description: receivable.description,
          });
          continue;
        }
        
        const targetCompany = companyMap.get(targetCompanyName.toLowerCase());
        if (!targetCompany) {
          errors.push({
            transaction: receivable.id,
            error: `Target company "${targetCompanyName}" not found`,
          });
          continue;
        }
        
        // Check if matching payable already exists
        const existingPayable = await prisma.transaction.findFirst({
          where: {
            companyId: targetCompany.id,
            type: 'liability',
            category: {
              contains: 'intercompany',
              mode: 'insensitive',
            },
            amount: receivable.amount,
            date: receivable.date,
          },
        });
        
        if (existingPayable) {
          errors.push({
            transaction: receivable.id,
            error: 'Matching payable already exists',
            targetCompany: targetCompany.name,
          });
          continue;
        }
        
        // Create matching payable
        const period = new Date(receivable.date.getFullYear(), receivable.date.getMonth(), 1);
        
        const payable = await prisma.$transaction(async (tx) => {
          // Create payable transaction
          const newPayable = await tx.transaction.create({
            data: {
              companyId: targetCompany.id,
              date: receivable.date,
              type: 'liability',
              category: 'Intercompany Payable',
              amount: receivable.amount,
              description: `${receivable.description || 'Intercompany transfer'} [AUTO-MATCHED PAYABLE to ${company.name}]`,
              affectsPL: false,
              affectsCashFlow: receivable.affectsCashFlow,
              affectsBalance: true,
            },
          });
          
          // Update balance sheet
          await tx.balanceSheet.upsert({
            where: {
              companyId_period: {
                companyId: targetCompany.id,
                period,
              },
            },
            update: {
              accountsPayable: { increment: receivable.amount },
            },
            create: {
              companyId: targetCompany.id,
              period,
              accountsPayable: receivable.amount,
            },
          });
          
          return newPayable;
        });
        
        created.push({
          receivableId: receivable.id,
          payableId: payable.id,
          amount: Number(receivable.amount),
          sourceCompany: company.name,
          targetCompany: targetCompany.name,
        });
      } catch (error: any) {
        errors.push({
          transaction: receivable.id,
          error: error.message,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${intercompanyReceivables.length} receivables, created ${created.length} matching payables`,
      processed: intercompanyReceivables.length,
      created: created.length,
      createdTransactions: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Failed to fix intercompany transactions:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fix intercompany transactions' } },
      { status: 500 }
    );
  }
}
