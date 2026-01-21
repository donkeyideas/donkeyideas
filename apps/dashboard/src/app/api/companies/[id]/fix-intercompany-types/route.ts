import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * POST /api/companies/:id/fix-intercompany-types
 * 
 * Fixes miscategorized intercompany transactions:
 * - Sets type='asset' for Intercompany Receivables
 * - Sets type='liability' for Intercompany Payables
 * - Sets affectsPL=false for all intercompany transactions
 */
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
    
    // Find all intercompany transactions (by category or description)
    const intercompanyTransactions = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        OR: [
          {
            category: {
              contains: 'Intercompany',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'INTERCOMPANY',
              mode: 'insensitive',
            },
          },
        ],
      },
    });
    
    if (intercompanyTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No intercompany transactions found',
        fixed: 0,
        checked: 0,
      });
    }
    
    const fixed = [];
    const alreadyCorrect = [];
    
    // Process each transaction
    for (const tx of intercompanyTransactions) {
      const category = tx.category?.toLowerCase() || '';
      const isReceivable = category.includes('receivable');
      const isPayable = category.includes('payable');
      
      let needsUpdate = false;
      const updates: any = {};
      
      // Determine correct type
      let correctType: string | null = null;
      if (isReceivable) {
        correctType = 'asset';
      } else if (isPayable) {
        correctType = 'liability';
      }
      
      // Check if type needs fixing
      if (correctType && tx.type !== correctType) {
        updates.type = correctType;
        needsUpdate = true;
      }
      
      // Check if affectsPL needs fixing
      if (tx.affectsPL !== false) {
        updates.affectsPL = false;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: updates,
        });
        
        fixed.push({
          id: tx.id,
          category: tx.category,
          description: tx.description,
          oldType: tx.type,
          newType: updates.type || tx.type,
          affectsPL: updates.affectsPL !== undefined ? updates.affectsPL : tx.affectsPL,
        });
      } else {
        alreadyCorrect.push({
          id: tx.id,
          category: tx.category,
          type: tx.type,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} intercompany transactions, ${alreadyCorrect.length} were already correct`,
      checked: intercompanyTransactions.length,
      fixed: fixed.length,
      alreadyCorrect: alreadyCorrect.length,
      details: {
        fixed,
        alreadyCorrect,
      },
    });
  } catch (error: any) {
    console.error('Failed to fix intercompany transactions:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fix intercompany transactions' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/:id/fix-intercompany-types
 * 
 * Check intercompany transactions without fixing
 */
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
    
    // Find all intercompany transactions
    const intercompanyTransactions = await prisma.transaction.findMany({
      where: {
        companyId: params.id,
        OR: [
          {
            category: {
              contains: 'Intercompany',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'INTERCOMPANY',
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        date: true,
        type: true,
        category: true,
        amount: true,
        description: true,
        affectsPL: true,
        affectsBalance: true,
        affectsCashFlow: true,
      },
    });
    
    if (intercompanyTransactions.length === 0) {
      return NextResponse.json({
        total: 0,
        transactions: [],
        issues: [],
      });
    }
    
    const issues = [];
    
    // Check each transaction for issues
    for (const tx of intercompanyTransactions) {
      const category = tx.category?.toLowerCase() || '';
      const isReceivable = category.includes('receivable');
      const isPayable = category.includes('payable');
      
      const txIssues = [];
      
      // Check type
      if (isReceivable && tx.type !== 'asset') {
        txIssues.push(`Type should be 'asset' but is '${tx.type}'`);
      } else if (isPayable && tx.type !== 'liability') {
        txIssues.push(`Type should be 'liability' but is '${tx.type}'`);
      }
      
      // Check affectsPL
      if (tx.affectsPL !== false) {
        txIssues.push('Should have affectsPL=false');
      }
      
      if (txIssues.length > 0) {
        issues.push({
          id: tx.id,
          date: tx.date,
          category: tx.category,
          description: tx.description,
          currentType: tx.type,
          affectsPL: tx.affectsPL,
          issues: txIssues,
        });
      }
    }
    
    return NextResponse.json({
      total: intercompanyTransactions.length,
      transactions: intercompanyTransactions,
      issuesFound: issues.length,
      issues,
    });
  } catch (error: any) {
    console.error('Failed to check intercompany transactions:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to check intercompany transactions' } },
      { status: 500 }
    );
  }
}
