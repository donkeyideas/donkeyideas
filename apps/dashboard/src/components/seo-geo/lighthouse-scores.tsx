'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface LighthouseScoresProps {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="text-xs text-white/50 [.light_&]:text-slate-500 mt-2 text-center">{label}</p>
    </div>
  );
}

export function LighthouseScores({ performanceScore, seoScore, accessibilityScore, bestPracticesScore }: LighthouseScoresProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Lighthouse Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ScoreCircle score={performanceScore} label="Performance" />
          <ScoreCircle score={seoScore} label="SEO" />
          <ScoreCircle score={accessibilityScore} label="Accessibility" />
          <ScoreCircle score={bestPracticesScore} label="Best Practices" />
        </div>
      </CardContent>
    </Card>
  );
}
