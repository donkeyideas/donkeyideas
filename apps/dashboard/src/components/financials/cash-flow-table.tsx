'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface CashFlowTableProps {
  cashFlows: any[];
}

export function CashFlowTable({ cashFlows }: CashFlowTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Statement</CardTitle>
      </CardHeader>
      <CardContent>
        {cashFlows.length === 0 ? (
          <div className="p-8 text-center text-white/60 [.light_&]:text-slate-600">
            No cash flow data yet. Add transactions to see cash flow updates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Period</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Operating</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Investing</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Financing</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Net Cash Flow</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Ending Cash</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((flow) => (
                  <tr key={flow.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">{new Date(flow.period).toLocaleDateString()}</td>
                    <td className={`p-4 text-right ${Number(flow.operatingCashFlow) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(Number(flow.operatingCashFlow))}
                    </td>
                    <td className={`p-4 text-right ${Number(flow.investingCashFlow) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(Number(flow.investingCashFlow))}
                    </td>
                    <td className={`p-4 text-right ${Number(flow.financingCashFlow) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(Number(flow.financingCashFlow))}
                    </td>
                    <td className={`p-4 text-right font-semibold ${Number(flow.netCashFlow) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(Number(flow.netCashFlow))}
                    </td>
                    <td className="p-4 text-right text-blue-400 font-semibold">
                      {formatCurrency(Number(flow.endingCash))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

