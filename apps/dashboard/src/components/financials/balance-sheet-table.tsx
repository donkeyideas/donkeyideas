'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface BalanceSheetTableProps {
  balanceSheets: any[];
}

export function BalanceSheetTable({ balanceSheets }: BalanceSheetTableProps) {
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
        <CardTitle>Balance Sheet</CardTitle>
      </CardHeader>
      <CardContent>
        {balanceSheets.length === 0 ? (
          <div className="p-8 text-center text-white/60 [.light_&]:text-slate-600">
            No balance sheet data yet. Add transactions to see balance sheet updates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Period</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Cash</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">A/R</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Fixed Assets</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">A/P</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Short Term Debt</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Long Term Debt</th>
                  <th className="text-right p-4 text-xs text-white/60 [.light_&]:text-slate-600 uppercase">Total Equity</th>
                </tr>
              </thead>
              <tbody>
                {balanceSheets.map((sheet) => {
                  const totalAssets = Number(sheet.cashEquivalents) + Number(sheet.accountsReceivable) + Number(sheet.fixedAssets);
                  const totalLiabilities = Number(sheet.accountsPayable) + Number(sheet.shortTermDebt) + Number(sheet.longTermDebt);
                  const totalEquity = totalAssets - totalLiabilities;
                  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
                  const balances = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
                  
                  return (
                    <>
                      <tr key={sheet.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">{new Date(sheet.period).toLocaleDateString()}</td>
                        <td className="p-4 text-right">{formatCurrency(Number(sheet.cashEquivalents))}</td>
                        <td className="p-4 text-right">{formatCurrency(Number(sheet.accountsReceivable))}</td>
                        <td className="p-4 text-right">{formatCurrency(Number(sheet.fixedAssets))}</td>
                        <td className="p-4 text-right text-red-400">{formatCurrency(Number(sheet.accountsPayable))}</td>
                        <td className="p-4 text-right text-red-400">{formatCurrency(Number(sheet.shortTermDebt))}</td>
                        <td className="p-4 text-right text-red-400">{formatCurrency(Number(sheet.longTermDebt))}</td>
                        <td className="p-4 text-right text-green-500">{formatCurrency(totalEquity)}</td>
                      </tr>
                      {/* Total Assets Row */}
                      <tr key={`${sheet.id}-total-assets`} className="bg-blue-500/10 border-b border-white/10">
                        <td className="p-4 font-semibold text-blue-400">Total Assets</td>
                        <td className="p-4 text-right font-semibold text-blue-400" colSpan={3}>
                          {formatCurrency(totalAssets)}
                        </td>
                        <td className="p-4" colSpan={4}></td>
                      </tr>
                      {/* Total Liabilities + Equity Row */}
                      <tr key={`${sheet.id}-total-liab-equity`} className={`${balances ? 'bg-green-500/10' : 'bg-red-500/10'} border-b border-white/20`}>
                        <td className="p-4 font-semibold text-green-400">Total Liabilities + Equity</td>
                        <td className="p-4" colSpan={3}></td>
                        <td className="p-4 text-right font-semibold text-green-400" colSpan={4}>
                          {formatCurrency(totalLiabilitiesAndEquity)}
                        </td>
                      </tr>
                      {/* Balance Check Row */}
                      {!balances && (
                        <tr key={`${sheet.id}-warning`} className="bg-yellow-500/10">
                          <td className="p-4 text-yellow-400 text-sm" colSpan={8}>
                            ⚠️ Balance sheet does not balance! Assets ({formatCurrency(totalAssets)}) ≠ Liabilities + Equity ({formatCurrency(totalLiabilitiesAndEquity)})
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

