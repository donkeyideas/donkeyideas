'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ProjectInfo {
  slug: string;
  displayName: string;
  color: string;
}

interface UserGrowthChartProps {
  data: Record<string, any>[];
  projects: ProjectInfo[];
}

export function UserGrowthChart({ data, projects }: UserGrowthChartProps) {
  const activeProjects = projects.filter(p => !p.slug.startsWith('error'));

  return (
    <Card className="bg-gray-800/50 border-gray-700 [.light_&]:bg-white [.light_&]:border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-white [.light_&]:text-gray-900">User Growth Over Time</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No growth data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
                labelFormatter={(val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              />
              <Legend />
              {activeProjects.map((project) => (
                <Area
                  key={project.slug}
                  type="monotone"
                  dataKey={project.slug}
                  name={project.displayName}
                  stackId="1"
                  stroke={project.color}
                  fill={project.color}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
