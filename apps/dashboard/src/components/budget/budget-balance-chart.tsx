'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface BudgetBalanceChartProps {
  data: BalanceDataPoint[];
  title?: string;
}

export function BudgetBalanceChart({ data, title = 'Cash Balance Trend' }: BudgetBalanceChartProps) {
  const { theme } = useTheme();

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            No balance data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="displayDate"
                stroke={axisColor}
                tick={{ fontSize: 12 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={axisColor}
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: textColor,
                }}
                labelStyle={{ color: textColor, marginBottom: '4px' }}
                formatter={(value: number) => [
                  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
                  'Balance',
                ]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                fill="url(#balanceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
