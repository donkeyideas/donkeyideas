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
  Legend,
} from 'recharts';

interface ProjectInfo {
  slug: string;
  displayName: string;
  color: string;
}

interface UserSignupChartProps {
  data: Record<string, any>[];
  projects: ProjectInfo[];
}

export function UserSignupChart({ data, projects }: UserSignupChartProps) {
  const activeProjects = projects.filter(p => !p.slug.startsWith('error'));

  // Aggregate by week for cleaner chart when lots of days
  const weeklyData = data.length > 30 ? aggregateByWeek(data, activeProjects) : data;

  return (
    <Card className="bg-gray-800/50 border-gray-700 [.light_&]:bg-white [.light_&]:border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-white [.light_&]:text-gray-900">New Signups Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {weeklyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No signup data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
                labelFormatter={(val: string) => {
                  const d = new Date(val);
                  return data.length > 30
                    ? `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }}
              />
              <Legend />
              {activeProjects.map((project) => (
                <Bar
                  key={project.slug}
                  dataKey={project.slug}
                  name={project.displayName}
                  stackId="signups"
                  fill={project.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function aggregateByWeek(data: Record<string, any>[], projects: ProjectInfo[]): Record<string, any>[] {
  const weeks: Record<string, Record<string, any>> = {};

  for (const point of data) {
    const d = new Date(point.date);
    // Get start of week (Monday)
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    const key = weekStart.toISOString().split('T')[0];

    if (!weeks[key]) {
      weeks[key] = { date: key };
      for (const p of projects) weeks[key][p.slug] = 0;
    }
    for (const p of projects) {
      weeks[key][p.slug] = (weeks[key][p.slug] || 0) + (Number(point[p.slug]) || 0);
    }
  }

  return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date));
}
