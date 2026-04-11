'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface AppData {
  name: string;
  totalInstalls: number;
  activeDevices: number;
  dailyInstalls: number;
  storeVisitors: number;
  conversionRate: number;
}

interface GPAppBreakdownChartProps {
  data: AppData[];
}

function shortenName(name: string): string {
  if (name.length <= 14) return name;
  return name.slice(0, 12) + '...';
}

export function GPAppBreakdownChart({ data }: GPAppBreakdownChartProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installs by App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-white/40 [.light_&]:text-slate-400 text-sm">
            No app data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .filter((app) => app.totalInstalls > 0 || app.activeDevices > 0)
    .sort((a, b) => b.totalInstalls - a.totalInstalls)
    .map((app) => ({
      name: shortenName(app.name),
      fullName: app.name,
      'Total Installs': app.totalInstalls,
      'Active Devices': app.activeDevices,
      'Daily Installs': app.dailyInstalls,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installs by App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-white/40 [.light_&]:text-slate-400 text-sm">
            No install data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Installs by App</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis
              type="number"
              stroke={axisColor}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              tickLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: textColor,
              }}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullName || label;
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="Total Installs" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
            <Bar dataKey="Active Devices" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
