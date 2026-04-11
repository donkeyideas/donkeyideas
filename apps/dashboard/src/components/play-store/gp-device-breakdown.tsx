'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface DeviceData {
  device: string;
  crashRate: number;
  users: number;
  [key: string]: string | number;
}

interface GPDeviceBreakdownProps {
  data: DeviceData[];
  title?: string;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'];

export function GPDeviceBreakdown({ data, title = 'Crash Rate by Device' }: GPDeviceBreakdownProps) {
  const { theme } = useTheme();

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#ffffff10';
  const tooltipBg = theme === 'light' ? '#ffffff' : '#0F0F0F';
  const tooltipBorder = theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
  const textColor = theme === 'light' ? '#0f172a' : '#ffffff';

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/40 [.light_&]:text-slate-400 py-8 text-sm">
            No device data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis
              type="number"
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
            />
            <YAxis
              type="category"
              dataKey="device"
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: textColor,
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value.toFixed(3)}% (${props.payload.users.toLocaleString()} users)`,
                'Crash Rate',
              ]}
            />
            <Bar dataKey="crashRate" radius={[0, 4, 4, 0]}>
              {data.map((_entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
