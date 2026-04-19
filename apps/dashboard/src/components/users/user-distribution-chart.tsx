'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ProjectData {
  slug: string;
  displayName: string;
  color: string;
  logo?: string | null;
  total: number;
  new30d: number;
  error?: string;
}

interface UserDistributionChartProps {
  projects: ProjectData[];
}

export function UserDistributionChart({ projects }: UserDistributionChartProps) {
  const sortedProjects = [...projects]
    .filter(p => !p.error)
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="bg-gray-800/50 border-gray-700 [.light_&]:bg-white [.light_&]:border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-white [.light_&]:text-gray-900">Users by Project</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {sortedProjects.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No project data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sortedProjects} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat('en-US').format(value),
                  name === 'total' ? 'Total Users' : 'New (30d)',
                ]}
              />
              <Bar dataKey="total" name="Total Users" radius={[0, 4, 4, 0]}>
                {sortedProjects.map((entry) => (
                  <Cell key={entry.slug} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
