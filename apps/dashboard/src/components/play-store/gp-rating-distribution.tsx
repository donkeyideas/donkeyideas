'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/contexts/theme-context';

interface RatingData {
  star: number;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface GPRatingDistributionProps {
  data: RatingData[];
  averageRating: number;
  title?: string;
}

const STAR_COLORS: Record<number, string> = {
  5: '#22c55e',
  4: '#84cc16',
  3: '#f59e0b',
  2: '#f97316',
  1: '#ef4444',
};

export function GPRatingDistribution({
  data,
  averageRating,
  title = 'Rating Distribution',
}: GPRatingDistributionProps) {
  const { theme } = useTheme();

  const axisColor = theme === 'light' ? '#64748b' : '#ffffff60';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Average Rating Display */}
          <div className="text-center min-w-[120px]">
            <div className={`text-5xl font-bold ${
              averageRating >= 4 ? 'text-green-400' :
              averageRating >= 3 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-white/20 [.light_&]:text-slate-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="text-xs text-white/50 [.light_&]:text-slate-500 mt-1">
              Average Rating
            </p>
          </div>

          {/* Bar Chart */}
          <div className="flex-1">
            <div className="space-y-2">
              {data.map((item) => (
                <div key={item.star} className="flex items-center gap-3">
                  <span className="text-sm text-white/70 [.light_&]:text-slate-600 w-4 text-right">
                    {item.star}
                  </span>
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <div className="flex-1 bg-white/5 [.light_&]:bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: STAR_COLORS[item.star],
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/50 [.light_&]:text-slate-500 w-16 text-right">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
