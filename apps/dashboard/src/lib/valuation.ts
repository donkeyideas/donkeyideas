/**
 * Valuation Engine - Calculates company valuation using multiple methods
 * Updated to work with transaction-based financial data
 */

interface Transaction {
  date: Date;
  type: string;
  category: string;
  amount: number;
  affectsPL: boolean;
  affectsCashFlow: boolean;
}

interface CompanyData {
  transactions: Transaction[];
  companyName: string;
}

interface ValuationResult {
  method: string;
  amount: number;
  multiple?: number;
  arr?: number;
  score?: number;
  parameters?: Record<string, any>;
}

interface MonthlyMetrics {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashFlow: number;
}

/**
 * Calculate monthly metrics from transactions
 */
function calculateMonthlyMetrics(transactions: Transaction[]): MonthlyMetrics[] {
  const monthlyData = new Map<string, MonthlyMetrics>();

  transactions.forEach(tx => {
    if (!tx.affectsPL) return;

    const monthKey = tx.date.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        period: monthKey,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        cashFlow: 0,
      });
    }

    const monthly = monthlyData.get(monthKey)!;
    const amount = Math.abs(tx.amount);

    if (tx.type === 'revenue') {
      monthly.revenue += amount;
    } else if (tx.type === 'expense') {
      monthly.expenses += amount;
    }

    if (tx.affectsCashFlow) {
      if (tx.type === 'revenue') {
        monthly.cashFlow += amount;
      } else if (tx.type === 'expense') {
        monthly.cashFlow -= amount;
      }
    }
  });

  // Calculate net profit for each month
  monthlyData.forEach(monthly => {
    monthly.netProfit = monthly.revenue - monthly.expenses;
  });

  // Return sorted by period (most recent first)
  return Array.from(monthlyData.values()).sort((a, b) => b.period.localeCompare(a.period));
}

/**
 * Calculate growth rate from monthly data
 */
function calculateGrowthRate(monthlyMetrics: MonthlyMetrics[]): number {
  if (monthlyMetrics.length < 2) return 0;

  const currentMonth = monthlyMetrics[0];
  const previousMonth = monthlyMetrics[1];

  if (previousMonth.revenue === 0) return 0;

  return ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
}

/**
 * Estimate ARR from revenue data
 */
function estimateARR(monthlyMetrics: MonthlyMetrics[]): number {
  if (monthlyMetrics.length === 0) return 0;

  // Use average of last 3 months if available, otherwise last month
  const recentMonths = monthlyMetrics.slice(0, Math.min(3, monthlyMetrics.length));
  const avgMonthlyRevenue = recentMonths.reduce((sum, m) => sum + m.revenue, 0) / recentMonths.length;
  
  return avgMonthlyRevenue * 12; // Annualize
}

/**
 * Calculate revenue multiple valuation
 */
export function calculateRevenueMultiple(companyData: CompanyData): ValuationResult {
  const monthlyMetrics = calculateMonthlyMetrics(companyData.transactions);
  const arr = estimateARR(monthlyMetrics);
  const growthRate = calculateGrowthRate(monthlyMetrics);

  // Base multiple
  let multiple = 3;

  // Adjust for growth rate
  if (growthRate >= 40) {
    multiple = 8;
  } else if (growthRate >= 30) {
    multiple = 6;
  } else if (growthRate >= 20) {
    multiple = 5;
  } else if (growthRate >= 10) {
    multiple = 4;
  } else if (growthRate >= 0) {
    multiple = 3;
  } else {
    multiple = 2; // Negative growth
  }

  // Adjust for profitability
  if (monthlyMetrics.length > 0) {
    const latestMonth = monthlyMetrics[0];
    const profitMargin = latestMonth.revenue > 0 ? (latestMonth.netProfit / latestMonth.revenue) * 100 : 0;

    if (profitMargin > 30) {
      multiple += 1;
    } else if (profitMargin > 15) {
      multiple += 0.5;
    } else if (profitMargin < -10) {
      multiple -= 0.5;
    }
  }

  // Adjust for revenue scale
  if (arr > 1000000) { // $1M+ ARR
    multiple += 0.5;
  } else if (arr > 500000) { // $500K+ ARR
    multiple += 0.25;
  }

  return {
    method: 'revenue_multiple',
    amount: arr * multiple,
    multiple,
    arr,
    parameters: {
      growthRate,
      monthlyRevenue: arr / 12,
      profitMargin: monthlyMetrics.length > 0 ? 
        (monthlyMetrics[0].revenue > 0 ? (monthlyMetrics[0].netProfit / monthlyMetrics[0].revenue) * 100 : 0) : 0,
    },
  };
}

/**
 * Calculate DCF (Discounted Cash Flow) valuation
 */
export function calculateDCF(companyData: CompanyData): ValuationResult {
  const monthlyMetrics = calculateMonthlyMetrics(companyData.transactions);
  
  if (monthlyMetrics.length === 0) {
    return {
      method: 'dcf',
      amount: 0,
      parameters: { error: 'No financial data' },
    };
  }

  // Calculate average monthly cash flow
  const avgMonthlyCashFlow = monthlyMetrics.reduce((sum, m) => sum + m.cashFlow, 0) / monthlyMetrics.length;
  const annualCashFlow = avgMonthlyCashFlow * 12;
  
  const growthRate = calculateGrowthRate(monthlyMetrics);
  
  // Simple DCF with 12% discount rate and 5-year projection
  const discountRate = 0.12;
  const projectedGrowthRate = Math.max(0.05, Math.min(0.25, growthRate / 100)); // Cap between 5% and 25%
  const years = 5;

  let presentValue = 0;
  for (let i = 1; i <= years; i++) {
    const futureCashFlow = annualCashFlow * Math.pow(1 + projectedGrowthRate, i);
    const discounted = futureCashFlow / Math.pow(1 + discountRate, i);
    presentValue += discounted;
  }

  // Add terminal value (simplified)
  const terminalValue = (annualCashFlow * Math.pow(1 + projectedGrowthRate, years)) / (discountRate - 0.03);
  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, years);
  presentValue += discountedTerminalValue;

  return {
    method: 'dcf',
    amount: Math.max(0, presentValue), // Don't allow negative valuations
    parameters: {
      discountRate: 12,
      growthRate: projectedGrowthRate * 100,
      years,
      annualCashFlow,
      terminalValue: discountedTerminalValue,
    },
  };
}

/**
 * Calculate market comparables valuation
 */
export function calculateMarketComps(companyData: CompanyData): ValuationResult {
  const monthlyMetrics = calculateMonthlyMetrics(companyData.transactions);
  const arr = estimateARR(monthlyMetrics);
  const growthRate = calculateGrowthRate(monthlyMetrics);

  // Base multiple from market comps (industry averages)
  let multiple = 4;

  // Adjust based on growth and profitability
  if (growthRate >= 30) {
    multiple = 7;
  } else if (growthRate >= 20) {
    multiple = 5.5;
  } else if (growthRate >= 10) {
    multiple = 4.5;
  } else if (growthRate < 0) {
    multiple = 2.5;
  }

  // Adjust for company size
  if (arr > 5000000) { // $5M+ ARR
    multiple += 1;
  } else if (arr > 1000000) { // $1M+ ARR
    multiple += 0.5;
  } else if (arr < 100000) { // <$100K ARR
    multiple -= 0.5;
  }

  return {
    method: 'market_comps',
    amount: arr * multiple,
    multiple,
    arr,
    parameters: {
      growthRate,
      industryMultiple: 4,
      sizeAdjustment: arr > 1000000 ? 'Large' : arr > 100000 ? 'Medium' : 'Small',
    },
  };
}

/**
 * Calculate AI Valuation Score (0-100)
 */
export function calculateAIScore(companyData: CompanyData): number {
  const monthlyMetrics = calculateMonthlyMetrics(companyData.transactions);
  
  if (monthlyMetrics.length === 0) return 0;

  const latestMonth = monthlyMetrics[0];
  const growthRate = calculateGrowthRate(monthlyMetrics);
  const arr = estimateARR(monthlyMetrics);

  // Calculate profit margin
  const profitMargin = latestMonth.revenue > 0 ? (latestMonth.netProfit / latestMonth.revenue) * 100 : 0;

  // Score components (0-100 each)
  const growthScore = Math.min(100, Math.max(0, (growthRate + 20) * 2)); // -20% to 40% maps to 0-100
  const profitScore = Math.min(100, Math.max(0, (profitMargin + 20) * 2.5)); // -20% to 20% maps to 0-100
  const scaleScore = Math.min(100, Math.max(0, (arr / 50000) * 10)); // $0 to $500K maps to 0-100
  const consistencyScore = calculateConsistencyScore(monthlyMetrics);

  // Weighted average
  const totalScore = (growthScore * 0.3) + (profitScore * 0.25) + (scaleScore * 0.25) + (consistencyScore * 0.2);

  return Math.round(Math.min(100, Math.max(0, totalScore)));
}

/**
 * Calculate consistency score based on revenue stability
 */
function calculateConsistencyScore(monthlyMetrics: MonthlyMetrics[]): number {
  if (monthlyMetrics.length < 3) return 50; // Default for insufficient data

  const revenues = monthlyMetrics.slice(0, 6).map(m => m.revenue); // Last 6 months
  const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  
  if (avgRevenue === 0) return 0;

  // Calculate coefficient of variation (lower is better)
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgRevenue;

  // Convert to score (lower variation = higher score)
  return Math.min(100, Math.max(0, (1 - coefficientOfVariation) * 100));
}

/**
 * Calculate all valuation methods and return recommendation
 */
export function calculateValuation(companyData: CompanyData): {
  revenueMultiple: ValuationResult;
  dcf: ValuationResult;
  marketComps: ValuationResult;
  aiScore: number;
  recommendation: ValuationResult;
} {
  const revenueMultiple = calculateRevenueMultiple(companyData);
  const dcf = calculateDCF(companyData);
  const marketComps = calculateMarketComps(companyData);
  const aiScore = calculateAIScore(companyData);

  // Add AI score to each method
  revenueMultiple.score = aiScore;
  dcf.score = aiScore;
  marketComps.score = aiScore;

  // Recommendation: Use the median of the three methods for more balanced valuation
  const valuations = [revenueMultiple.amount, dcf.amount, marketComps.amount].sort((a, b) => a - b);
  const medianValuation = valuations[1];

  // Choose the method closest to median as recommendation
  let recommendation = revenueMultiple;
  let closestDiff = Math.abs(revenueMultiple.amount - medianValuation);

  if (Math.abs(dcf.amount - medianValuation) < closestDiff) {
    recommendation = dcf;
    closestDiff = Math.abs(dcf.amount - medianValuation);
  }

  if (Math.abs(marketComps.amount - medianValuation) < closestDiff) {
    recommendation = marketComps;
  }

  return {
    revenueMultiple,
    dcf,
    marketComps,
    aiScore,
    recommendation,
  };
}