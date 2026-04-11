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

interface InstallData {
  date: string;
  installs: number;
  uninstalls: number;
  updates: number;
  activeDevices?: number;
}

interface GPInstallChartProps {
  data: InstallData[];
  title?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function GPInstallChart({ data, title = 'Install Trends' }: GPInstallChartProps) {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-white/40 [.light_&]:text-slate-400 text-sm">
            No install data available. Configure GCS bucket to enable install tracking.
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <linearGradient id="gpInstallGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gpUninstallGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gpUpdateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: textColor,
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  installs: 'Installs',
                  uninstalls: 'Uninstalls',
                  updates: 'Updates',
                };
                return [formatNumber(value), labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  installs: 'Installs',
                  uninstalls: 'Uninstalls',
                  updates: 'Updates',
                };
                return labels[value] || value;
              }}
            />
            <Area
              type="monotone"
              dataKey="installs"
              stroke="#22c55e"
              fill="url(#gpInstallGradient)"
              strokeWidth={2}
              name="installs"
            />
            <Area
              type="monotone"
              dataKey="uninstalls"
              stroke="#ef4444"
              fill="url(#gpUninstallGradient)"
              strokeWidth={2}
              name="uninstalls"
            />
            <Area
              type="monotone"
              dataKey="updates"
              stroke="#3b82f6"
              fill="url(#gpUpdateGradient)"
              strokeWidth={1.5}
              name="updates"
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
