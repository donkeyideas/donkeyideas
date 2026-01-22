'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ApprovalSummary {
  periodId: string;
  unapprovedCount: number;
  categories: {
    category: string;
    type: string;
    accountCode: string;
    count: number;
    amount: string;
  }[];
  totals: {
    income: string;
    expense: string;
    net: string;
  };
}

export default function ApproveActualsPage({ params }: { params: { id: string } }) {
  const periodId = params.id;
  const router = useRouter();

  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [period, setPeriod] = useState<any>(null);

  useEffect(() => {
    loadPeriod();
    loadSummary();
  }, [periodId]);

  const loadPeriod = async () => {
    try {
      const response = await fetch(`/api/budget/periods/${periodId}`);
      const data = await response.json();
      setPeriod(data);
    } catch (error) {
      console.error('Error loading period:', error);
    }
  };

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/approve?periodId=${periodId}`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm(
      `This will create ${summary?.unapprovedCount} transactions in your financial system.\n\n` +
      `Total Income: $${summary?.totals.income}\n` +
      `Total Expense: $${summary?.totals.expense}\n` +
      `Net: $${summary?.totals.net}\n\n` +
      `These entries will be locked and cannot be edited. Continue?`
    )) {
      return;
    }

    try {
      setApproving(true);
      const response = await fetch('/api/budget/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `✅ Success!\n\n` +
          `Approved: ${result.approved} entries\n` +
          `Transactions Created: ${result.transactions}\n` +
          `Total Income: $${result.summary.totalIncome}\n` +
          `Total Expense: $${result.summary.totalExpense}\n\n` +
          `These transactions are now in your Financial Hub.`
        );
        router.push(`/app/budget/${periodId}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to approve actuals'}`);
      }
    } catch (error) {
      console.error('Error approving actuals:', error);
      alert('Failed to approve actuals');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-400">Loading approval summary...</div>
      </div>
    );
  }

  if (!summary || summary.unapprovedCount === 0) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Link href={`/app/budget/${periodId}`} className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Period
          </Link>
          <h1 className="text-3xl font-semibold text-white">Approve Actuals</h1>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-slate-400 mb-4">No entries to approve</div>
            <Link href={`/app/budget/${periodId}`}>
              <Button>Back to Period</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href={`/app/budget/${periodId}`} className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
          ← Back to Period
        </Link>
        <h1 className="text-3xl font-semibold text-white">Review & Approve Actuals</h1>
        <p className="text-slate-400 mt-1">
          {period?.name} • {summary.unapprovedCount} entries pending approval
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">
              ${parseFloat(summary?.totals?.income || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Total Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">
              ${parseFloat(summary?.totals?.expense || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className={parseFloat(summary?.totals?.net || '0') >= 0 ? 'text-green-400' : 'text-red-400'}>
              Net Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">
              ${parseFloat(summary?.totals?.net || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summary?.categories?.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-3 h-3 rounded-full ${
                    cat.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-white font-medium">{cat.category}</div>
                    <div className="text-sm text-slate-400">
                      {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                      {cat.accountCode && ` • GL Account: ${cat.accountCode}`}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-medium ${
                  cat.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {cat.type === 'INCOME' ? '+' : '-'}$
                  {Math.abs(parseFloat(cat.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <svg
              className="w-6 h-6 text-yellow-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <div className="text-yellow-400 font-medium mb-2">⚠️ Important - Approval will:</div>
              <ul className="text-sm text-yellow-300 space-y-1">
                <li>• Create <strong>{summary?.unapprovedCount || 0}</strong> transaction records in your financial system</li>
                <li>• Update your P&L, Balance Sheet, and Cash Flow statements</li>
                <li>• Lock these entries (they cannot be edited after approval)</li>
                <li>• Link each budget line to its corresponding transaction</li>
                <li>• Trigger financial recalculations for the affected periods</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href={`/app/budget/${periodId}`} className="flex-1">
          <Button variant="secondary" className="w-full" disabled={approving}>
            Cancel
          </Button>
        </Link>
        <Button
          onClick={handleApprove}
          className="flex-1 bg-green-600 hover:bg-green-700"
          disabled={approving}
        >
          {approving ? 'Approving...' : `Approve & Post ${summary?.unapprovedCount || 0} Transactions`}
        </Button>
      </div>

      <div className="text-center text-sm text-slate-400">
        After approval, these transactions will appear in your Financial Hub under the company's financials.
      </div>
    </div>
  );
}
