'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface Transaction {
  id: string;
  date: string | Date;
  type: string;
  category: string;
  amount: number | string;
  description?: string | null;
  affectsPL?: boolean;
  affectsBalance?: boolean;
  affectsCashFlow?: boolean;
}

interface TransactionsTableNewProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onDuplicate?: (transaction: Transaction) => void;
  onRefresh?: () => void;
}

export function TransactionsTableNew({ transactions, onEdit, onDelete, onDuplicate, onRefresh }: TransactionsTableNewProps) {
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);

  useEffect(() => {
    // Sort by date descending to ensure newest first
    const sorted = [...transactions].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date).getTime() : new Date(a.date).getTime();
      const dateB = typeof b.date === 'string' ? new Date(b.date).getTime() : new Date(b.date).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    setLocalTransactions(sorted);
  }, [transactions]);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date) => {
    try {
      let dateObj: Date;
      if (typeof date === 'string') {
        // If it's in YYYY-MM-DD format, parse as local date to avoid timezone shift
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [year, month, day] = date.split('-').map(Number);
          dateObj = new Date(year, month - 1, day); // Use local date constructor
        } else if (date.includes('T')) {
          // Handle ISO format dates (e.g., "2025-06-25T00:00:00.000Z")
          // Extract just the date part before 'T' and parse as local date
          const datePart = date.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [year, month, day] = datePart.split('-').map(Number);
            dateObj = new Date(year, month - 1, day); // Use local date constructor
          } else {
            // Fallback: parse the full ISO string
            dateObj = new Date(date);
          }
        } else {
          // Other formats - parse with noon to avoid timezone issues
          dateObj = new Date(date + 'T12:00:00');
        }
      } else {
        dateObj = date;
      }
      
      // Validate date
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      // Format using local date components to avoid timezone conversion
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'date:', date);
      return 'Invalid Date';
    }
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

  const handleEditClick = (e: React.MouseEvent, transaction: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(transaction);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, transaction: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(transaction);
    }
  };

  const handleDuplicateClick = (e: React.MouseEvent, transaction: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(transaction);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>All Transactions</CardTitle>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {localTransactions.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            No transactions yet. Add a transaction to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-2 text-xs text-white/40">
              Showing {localTransactions.length} transaction{localTransactions.length !== 1 ? 's' : ''}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xs text-white/60 uppercase font-medium">Date</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase font-medium">Type</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase font-medium">Category</th>
                  <th className="text-right p-4 text-xs text-white/60 uppercase font-medium">Amount</th>
                  <th className="text-left p-4 text-xs text-white/60 uppercase font-medium">Description</th>
                  <th className="text-center p-4 text-xs text-white/60 uppercase font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localTransactions.map((transaction, index) => {
                  const amount = typeof transaction.amount === 'string' 
                    ? parseFloat(transaction.amount) 
                    : transaction.amount;
                  
                  const dateStr = formatDate(transaction.date);
                  
                  return (
                    <tr 
                      key={transaction.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 text-white/90">{dateStr}</td>
                      <td className={`p-4 font-semibold capitalize ${getTypeColor(transaction.type)}`}>
                        {formatTypeForDisplay(transaction.type)}
                      </td>
                      <td className="p-4 text-white/80 capitalize">
                        {transaction.category?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className={`p-4 text-right font-semibold ${getTypeColor(transaction.type)}`}>
                        {formatCurrency(amount || 0)}
                      </td>
                      <td className="p-4 text-white/60">
                        <div 
                          className="max-w-md truncate" 
                          title={transaction.description || ''}
                        >
                          {transaction.description || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center items-center">
                          <button
                            type="button"
                            onClick={(e) => handleEditClick(e, transaction)}
                            className="px-4 py-2 text-xs font-medium text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 rounded transition-all cursor-pointer active:scale-95"
                            aria-label={`Edit transaction ${transaction.id}`}
                          >
                            Edit
                          </button>
                          {onDuplicate && (
                            <button
                              type="button"
                              onClick={(e) => handleDuplicateClick(e, transaction)}
                              className="px-4 py-2 text-xs font-medium text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 rounded transition-all cursor-pointer active:scale-95"
                              aria-label={`Duplicate transaction ${transaction.id}`}
                            >
                              Duplicate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, transaction)}
                            className="px-4 py-2 text-xs font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded transition-all cursor-pointer active:scale-95"
                            aria-label={`Delete transaction ${transaction.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
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

