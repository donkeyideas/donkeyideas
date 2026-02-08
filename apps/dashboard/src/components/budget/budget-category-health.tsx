'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface CategoryData {
  name: string;
  type: string;
  color: string;
  total: number;
  percentage: number;
}

interface BudgetCategoryHealthProps {
  categories: CategoryData[];
}

export function BudgetCategoryHealth({ categories }: BudgetCategoryHealthProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getBarColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No category data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <Card key={category.name}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <CardTitle className="text-sm text-white [.light_&]:text-slate-900">{category.name}</CardTitle>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                category.type === 'INCOME'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {category.type}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white [.light_&]:text-slate-900 mb-2">
              {formatCurrency(Math.abs(category.total))}
            </div>
            <div className="w-full bg-white/10 [.light_&]:bg-slate-200 rounded-full h-2 mb-1">
              <div
                className={`h-2 rounded-full transition-all ${getBarColor(category.percentage)}`}
                style={{ width: `${Math.min(category.percentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-white/50 [.light_&]:text-slate-500">
              {category.percentage.toFixed(1)}% of total {category.type === 'INCOME' ? 'income' : 'expenses'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
