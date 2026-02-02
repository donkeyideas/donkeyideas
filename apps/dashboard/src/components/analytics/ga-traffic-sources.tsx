'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface TrafficSource {
  source: string;
  sessions: number;
  percentage: number;
  [key: string]: string | number; // Required for Recharts compatibility
}

interface GATrafficSourcesProps {
  data: TrafficSource[];
  title?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function GATrafficSources({ data, title = 'Traffic Sources' }: GATrafficSourcesProps) {
  const { theme } = useTheme();

  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            padding: '12px',
            color: textColor,
          }}
        >
          <p className="font-medium">{data.source}</p>
          <p className="text-sm text-white/60 [.light_&]:text-slate-500">
            {data.sessions.toLocaleString()} sessions ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="sessions"
                  nameKey="source"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-3">
            {data.map((source, index) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-white/80 [.light_&]:text-slate-700">
                    {source.source}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white [.light_&]:text-slate-900">
                    {source.percentage}%
                  </span>
                  <span className="text-xs text-white/50 [.light_&]:text-slate-500 ml-2">
                    ({source.sessions.toLocaleString()})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
