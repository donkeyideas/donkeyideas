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
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface VitalsData {
  date: string;
  crashRate: number;
  anrRate: number;
  [key: string]: string | number;
}

interface GPVitalsChartProps {
  data: VitalsData[];
  title?: string;
}

const THRESHOLDS = {
  crashRate: 1.09,
  anrRate: 0.47,
};

export function GPVitalsChart({ data, title = 'App Vitals Over Time' }: GPVitalsChartProps) {
  const { theme } = useTheme();

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="gpCrashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gpAnrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
              tickFormatter={(value) => `${value.toFixed(2)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: textColor,
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(3)}%`,
                name === 'crashRate' ? 'Crash Rate' : 'ANR Rate',
              ]}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) =>
                value === 'crashRate' ? 'Crash Rate' : 'ANR Rate'
              }
            />
            {/* Threshold reference lines */}
            <ReferenceLine
              y={THRESHOLDS.crashRate}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: `Crash Threshold (${THRESHOLDS.crashRate}%)`,
                fill: '#ef4444',
                fontSize: 10,
                position: 'right',
              }}
            />
            <ReferenceLine
              y={THRESHOLDS.anrRate}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              label={{
                value: `ANR Threshold (${THRESHOLDS.anrRate}%)`,
                fill: '#f59e0b',
                fontSize: 10,
                position: 'right',
              }}
            />
            <Area
              type="monotone"
              dataKey="crashRate"
              stroke="#ef4444"
              fill="url(#gpCrashGradient)"
              strokeWidth={2}
              name="crashRate"
            />
            <Area
              type="monotone"
              dataKey="anrRate"
              stroke="#f59e0b"
              fill="url(#gpAnrGradient)"
              strokeWidth={2}
              name="anrRate"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
