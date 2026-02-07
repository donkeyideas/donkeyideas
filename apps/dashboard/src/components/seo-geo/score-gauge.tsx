'use client';

import { Card, CardContent } from '@donkey-ideas/ui';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface ScoreGaugeProps {
  label: string;
  score: number;
  maxScore?: number;
  subtitle?: string;
}

function getColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function ScoreGauge({ label, score, maxScore = 100, subtitle }: ScoreGaugeProps) {
  const color = getColor(score);
  const percentage = Math.round((score / maxScore) * 100);

  const data = [
    { name: label, value: percentage, fill: color },
  ];

  return (
    <Card className="hover:border-white/20 transition-colors">
      <CardContent className="p-4 flex flex-col items-center">
        <div className="w-32 h-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={10}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: 'rgba(255,255,255,0.05)' }}
                dataKey="value"
                cornerRadius={5}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{score}</span>
            <span className="text-xs text-white/40 [.light_&]:text-slate-400">{getGrade(score)}</span>
          </div>
        </div>
        <p className="text-sm font-medium text-white/80 [.light_&]:text-slate-700 mt-2">{label}</p>
        {subtitle && <p className="text-xs text-white/40 [.light_&]:text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
