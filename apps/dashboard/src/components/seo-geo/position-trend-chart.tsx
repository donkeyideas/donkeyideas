'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface PositionData {
  date: string;
  position: number;
}

export function PositionTrendChart({ data, title = 'Average Position Trend' }: { data: PositionData[]; title?: string }) {
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
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="displayDate" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis reversed tick={{ fill: axisColor, fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: theme === 'light' ? '#0f172a' : '#ffffff',
                }}
                formatter={(value: number) => [`Position ${value.toFixed(1)}`, 'Avg. Position']}
              />
              <Line type="monotone" dataKey="position" stroke="#eab308" strokeWidth={2} dot={false} name="Position" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-white/40 [.light_&]:text-slate-400 mt-2 text-center">Lower position = better ranking</p>
      </CardContent>
    </Card>
  );
}
