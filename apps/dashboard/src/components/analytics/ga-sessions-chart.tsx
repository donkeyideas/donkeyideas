'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface SessionData {
  date: string;
  sessions: number;
  users: number;
  pageviews?: number;
  [key: string]: string | number | undefined; // Required for Recharts compatibility
}

interface GASessionsChartProps {
  data: SessionData[];
  title?: string;
  showUsers?: boolean;
  showPageviews?: boolean;
  chartType?: 'line' | 'area';
}

export function GASessionsChart({
  data,
  title = 'Sessions Over Time',
  showUsers = true,
  showPageviews = false,
  chartType = 'area',
}: GASessionsChartProps) {
  const { theme } = useTheme();

  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  // Theme-aware colors
  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={formattedData}>
            <defs>
              <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="displayDate"
              stroke={axisColor}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke={axisColor}
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: textColor,
              }}
              labelStyle={{ color: textColor, marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {chartType === 'area' ? (
              <>
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  fill="url(#sessionGradient)"
                  strokeWidth={2}
                  name="Sessions"
                />
                {showUsers && (
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    fill="url(#userGradient)"
                    strokeWidth={2}
                    name="Users"
                  />
                )}
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Sessions"
                />
                {showUsers && (
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Users"
                  />
                )}
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
