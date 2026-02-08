'use client';

import { Card, CardContent } from '@donkey-ideas/ui';
import Link from 'next/link';

interface CompanyCardData {
  companyId: string;
  companyName: string;
  periodName: string;
  dateRange: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

interface ConsolidatedCompanyCardsProps {
  companies: CompanyCardData[];
}

export function ConsolidatedCompanyCards({ companies }: ConsolidatedCompanyCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No company data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((company) => (
        <Link key={company.companyId} href="/app/budget" className="block">
          <Card className="hover:border-blue-500/30 transition-colors cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white [.light_&]:text-slate-900 font-semibold">{company.companyName}</h3>
                  <p className="text-xs text-white/40 [.light_&]:text-slate-500 mt-0.5">{company.periodName}</p>
                  <p className="text-xs text-white/30 [.light_&]:text-slate-400">{company.dateRange}</p>
                </div>
                <span className={`w-3 h-3 rounded-full mt-1 ${company.net >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <div className="text-[10px] uppercase text-white/40 [.light_&]:text-slate-500">Income</div>
                  <div className="text-sm font-medium text-green-400 [.light_&]:text-green-600">{formatCurrency(company.income)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-white/40 [.light_&]:text-slate-500">Expenses</div>
                  <div className="text-sm font-medium text-red-400 [.light_&]:text-red-600">{formatCurrency(company.expenses)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-white/40 [.light_&]:text-slate-500">Net</div>
                  <div className={`text-sm font-medium ${company.net >= 0 ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'}`}>
                    {formatCurrency(company.net)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 [.light_&]:border-slate-200">
                <div className="text-[10px] uppercase text-white/40 [.light_&]:text-slate-500">Balance</div>
                <div className="text-lg font-bold text-blue-400 [.light_&]:text-blue-600">{formatCurrency(company.balance)}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
