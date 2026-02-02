'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface DeviceData {
  device: string;
  sessions: number;
  percentage: number;
  [key: string]: string | number; // Required for Recharts compatibility
}

interface GADeviceChartProps {
  data: DeviceData[];
  title?: string;
}

const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#3b82f6',
  Mobile: '#10b981',
  Tablet: '#f59e0b',
};

const DEVICE_ICONS: Record<string, JSX.Element> = {
  Desktop: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Mobile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Tablet: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

export function GADeviceChart({ data, title = 'Device Breakdown' }: GADeviceChartProps) {
  const { theme } = useTheme();

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
        <div className="flex items-start gap-6">
          {/* Bar Chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={axisColor} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="device"
                  stroke={axisColor}
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px',
                    color: textColor,
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toLocaleString()} sessions (${props.payload.percentage}%)`,
                    'Sessions',
                  ]}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.device}
                      fill={DEVICE_COLORS[entry.device] || '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="w-48 space-y-4">
            {data.map((device) => (
              <div key={device.device} className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: `${DEVICE_COLORS[device.device] || '#6b7280'}20`,
                    color: DEVICE_COLORS[device.device] || '#6b7280',
                  }}
                >
                  {DEVICE_ICONS[device.device] || DEVICE_ICONS.Desktop}
                </div>
                <div>
                  <p className="text-sm font-medium text-white [.light_&]:text-slate-900">
                    {device.device}
                  </p>
                  <p className="text-xs text-white/50 [.light_&]:text-slate-500">
                    {device.percentage}% of traffic
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
