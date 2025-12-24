'use client';

import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';

interface TransactionsTableProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  onDelete: (transaction: any) => void;
}

export function TransactionsTable({ transactions, onEdit, onDelete }: TransactionsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTypeForDisplay = (type: string) => {
    if (!type) return '-';
    // Convert intercompany_transfer to intercompany for display
    if (type.toLowerCase() === 'intercompany_transfer') {
      return 'intercompany';
    }
    return type;
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'revenue':
        return 'text-green-500';
      case 'expense':
        return 'text-red-500';
      case 'asset':
        return 'text-blue-500';
      case 'liability':
        return 'text-orange-500';
      case 'equity':
        return 'text-purple-500';
      case 'intercompany_transfer':
      case 'intercompany':
        return 'text-cyan-500';
      default:
        return 'text-white';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            No transactions yet. Add a transaction to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-white/60 uppercase">Date</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase">Type</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase">Category</th>
                  <th className="text-right p-4 text-xs text-white/60 uppercase">Amount</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase">Description</th>
                  <th className="text-center p-4 text-xs text-white/60 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className={`p-4 font-semibold capitalize ${getTypeColor(transaction.type)}`}>
                      {formatTypeForDisplay(transaction.type)}
                    </td>
                    <td className="p-4 text-white/80 capitalize">
                      {transaction.category.replace(/_/g, ' ')}
                    </td>
                    <td className={`p-4 text-right font-semibold ${getTypeColor(transaction.type)}`}>
                      {formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="p-4 text-white/60">
                      <div className="max-w-md truncate" title={transaction.description || ''}>
                        {transaction.description || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center items-center z-10 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Edit clicked for transaction:', transaction);
                            if (onEdit) {
                              onEdit(transaction);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 rounded transition-colors cursor-pointer z-10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Delete clicked for transaction:', transaction);
                            if (onDelete) {
                              onDelete(transaction);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded transition-colors cursor-pointer z-10"
                        >
                          Delete
                        </button>
                      </div>
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

