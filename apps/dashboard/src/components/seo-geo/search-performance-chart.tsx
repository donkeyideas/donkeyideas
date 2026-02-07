'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface PerformanceData {
  date: string;
  clicks: number;
  impressions: number;
  ctr?: number;
  position?: number;
}

interface SearchPerformanceChartProps {
  data: PerformanceData[];
  title?: string;
}

export function SearchPerformanceChart({ data, title = 'Search Performance' }: SearchPerformanceChartProps) {
  const { theme } = useTheme();

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="displayDate" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: theme === 'light' ? '#0f172a' : '#ffffff',
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                fill="url(#clicksGradient)"
                strokeWidth={2}
                name="Clicks"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                stroke="#22c55e"
                fill="url(#impressionsGradient)"
                strokeWidth={2}
                name="Impressions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
