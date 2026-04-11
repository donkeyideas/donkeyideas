'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface ErrorIssue {
  name: string;
  type: string;
  errorMessage: string;
  location: string;
  distinctUsers: number;
  distinctUsersPercent: number;
}

interface GPErrorsTableProps {
  data: ErrorIssue[];
  title?: string;
}

export function GPErrorsTable({ data, title = 'Top Error Issues' }: GPErrorsTableProps) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/40 [.light_&]:text-slate-400 py-8 text-sm">
            No error issues found — great job!
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 [.light_&]:border-slate-200">
                <th className="text-left py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Type</th>
                <th className="text-left py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Error</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Users</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">% Users</th>
              </tr>
            </thead>
            <tbody>
              {data.map((issue, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/5 [.light_&]:hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2 px-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      issue.type === 'CRASH'
                        ? 'bg-red-500/10 text-red-400'
                        : issue.type === 'ANR'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {issue.type}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <p className="text-white/70 [.light_&]:text-slate-700 font-mono text-xs truncate max-w-[300px]">
                      {issue.errorMessage}
                    </p>
                    {issue.location && (
                      <p className="text-[10px] text-white/30 [.light_&]:text-slate-400 truncate max-w-[300px]">
                        {issue.location}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-white/70 [.light_&]:text-slate-700 font-medium">
                      {issue.distinctUsers.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-white/50 [.light_&]:text-slate-500">
                      {issue.distinctUsersPercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
