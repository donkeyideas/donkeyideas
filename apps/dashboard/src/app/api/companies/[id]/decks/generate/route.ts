import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/companies/:id/decks/generate
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
      include: {
        businessProfile: true,
      },
    });
    
    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    // Get recent transactions for financial data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const transactions = await prisma.transaction.findMany({
      where: { 
        companyId: params.id,
        date: { gte: threeMonthsAgo }
      },
      orderBy: { date: 'desc' },
    });
    
    // Generate deck content using AI (simplified - would use OpenAI in production)
    const slides = generateDeckSlides(company, transactions);
    
    const deck = await prisma.deck.create({
      data: {
        companyId: params.id,
        title: `${company.name} - Investor Deck`,
        deckType: 'investor',
        content: slides,
      },
    });
    
    return NextResponse.json({ deck }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate deck' } },
      { status: 500 }
    );
  }
}

// Simplified deck generation (would use OpenAI in production)
function generateDeckSlides(company: any, transactions: any[]) {
  // Calculate financial metrics from transactions
  const revenueTransactions = transactions.filter(tx => tx.type === 'revenue' && tx.affectsPL);
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense' && tx.affectsPL);
  
  const totalRevenue = revenueTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()), 0);
  const totalExpenses = expenseTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()), 0);
  const netProfit = totalRevenue - totalExpenses;
  
  // Calculate monthly growth (simplified)
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth - 1;
  
  const currentMonthRevenue = revenueTransactions
    .filter(tx => new Date(tx.date).getMonth() === currentMonth)
    .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()), 0);
  
  const lastMonthRevenue = revenueTransactions
    .filter(tx => new Date(tx.date).getMonth() === lastMonth)
    .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()), 0);
  
  const growthRate = lastMonthRevenue > 0 
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;
  
  return [
    {
      number: 1,
      title: 'Cover',
      content: [company.name, company.tagline || ''],
    },
    {
      number: 2,
      title: 'Problem',
      content: ['Problem statement based on company data'],
    },
    {
      number: 3,
      title: 'Solution',
      content: [company.businessProfile?.about || company.description || 'Our solution'],
    },
    {
      number: 4,
      title: 'Market',
      content: [company.businessProfile?.targetMarket || 'Target market'],
    },
    {
      number: 5,
      title: 'Traction',
      content: [
        `Revenue (Last 3 Months): $${totalRevenue.toLocaleString()}`,
        `Growth Rate: ${growthRate.toFixed(1)}% MoM`,
        `Net Profit: $${netProfit.toLocaleString()}`,
        `Total Transactions: ${transactions.length}`,
      ],
    },
    {
      number: 6,
      title: 'Business Model',
      content: ['Revenue streams and pricing'],
    },
    {
      number: 7,
      title: 'Competition',
      content: [company.businessProfile?.keyCompetitors || 'Competitive landscape'],
    },
    {
      number: 8,
      title: 'Team',
      content: [`Team size: ${company.businessProfile?.teamSize || 0}`],
    },
    {
      number: 9,
      title: 'Financials',
      content: [
        `Current Revenue Run Rate: $${(totalRevenue * 4).toLocaleString()}/year`,
        `Profit Margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
        `Monthly Burn: $${(totalExpenses / 3).toLocaleString()}`,
        'Seeking investment for growth and expansion',
      ],
    },
    {
      number: 10,
      title: 'The Ask',
      content: ['Funding request and use of funds'],
    },
  ];
}

