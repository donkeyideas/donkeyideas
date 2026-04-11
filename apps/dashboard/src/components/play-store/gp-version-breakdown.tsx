'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface VersionData {
  versionCode: string;
  crashRate: number;
  users: number;
}

interface GPVersionBreakdownProps {
  data: VersionData[];
  title?: string;
}

export function GPVersionBreakdown({ data, title = 'Crash Rate by Version' }: GPVersionBreakdownProps) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/40 [.light_&]:text-slate-400 py-8 text-sm">
            No version data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCrashRate = Math.max(...data.map((d) => d.crashRate), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium pb-2 border-b border-white/5 [.light_&]:border-slate-200">
            <div className="col-span-2">Version</div>
            <div className="col-span-6">Crash Rate</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Users</div>
          </div>

          {data.map((version, index) => {
            const barWidth = (version.crashRate / maxCrashRate) * 100;
            const isHigh = version.crashRate > 1.09;
            const color = isHigh ? '#ef4444' : version.crashRate > 0.5 ? '#f59e0b' : '#22c55e';

            return (
              <div key={version.versionCode} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  <span className="text-sm font-mono text-white/70 [.light_&]:text-slate-700">
                    v{version.versionCode}
                  </span>
                </div>
                <div className="col-span-6">
                  <div className="bg-white/5 [.light_&]:bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-medium" style={{ color }}>
                    {version.crashRate.toFixed(3)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-xs text-white/50 [.light_&]:text-slate-500">
                    {version.users.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
