'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface PLChartsProps {
  plStatements: any[];
}

export function PLCharts({ plStatements }: PLChartsProps) {
  const { theme } = useTheme();
  const chartData = plStatements
    .map((stmt) => {
      const revenue = Number(stmt.productRevenue) + Number(stmt.serviceRevenue) + Number(stmt.otherRevenue);
      const cogs = Number(stmt.directCosts) + Number(stmt.infrastructureCosts);
      const opex = Number(stmt.salesMarketing) + Number(stmt.rdExpenses) + Number(stmt.adminExpenses);
      const netProfit = revenue - cogs - opex;
      
      return {
        period: new Date(stmt.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        cogs,
        opex,
        netProfit,
      };
    })
    .reverse();

  // Theme-aware colors
  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Expenses Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="period" stroke={axisColor} />
              <YAxis 
                stroke={axisColor}
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1000) {
                    const sign = value < 0 ? '-' : '';
                    return `${sign}$${(absValue / 1000).toFixed(0)}k`;
                  }
                  return `$${value}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F0F0F',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="cogs" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="COGS" />
              <Line type="monotone" dataKey="opex" stroke="#ef4444" strokeWidth={2} name="OpEx" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="period" stroke={axisColor} />
              <YAxis 
                stroke={axisColor}
                tickFormatter={(value) => {
                  const absValue = Math.abs(value);
                  if (absValue >= 1000) {
                    const sign = value < 0 ? '-' : '';
                    return `${sign}$${(absValue / 1000).toFixed(0)}k`;
                  }
                  return `$${value}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: theme === 'light' ? '#0f172a' : '#ffffff',
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Bar dataKey="netProfit" fill="#10b981" name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

