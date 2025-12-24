'use client';

import { Button } from '@donkey-ideas/ui';

interface DeleteTransactionModalProps {
  transaction: any;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteTransactionModal({ transaction, onClose, onDelete }: DeleteTransactionModalProps) {
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

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold mb-4">Delete Transaction</h2>
        <div className="mb-6">
          <p className="text-white/80 mb-4">
            Are you sure you want to delete this transaction? This will automatically update the books.
          </p>
          <div className="p-4 bg-white/5 border border-white/10 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60">Date:</span>
              <span>{new Date(transaction.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Type:</span>
              <span className="capitalize">{formatTypeForDisplay(transaction.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Category:</span>
              <span className="capitalize">{transaction.category.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Amount:</span>
              <span className="font-semibold">{formatCurrency(Number(transaction.amount))}</span>
            </div>
            {transaction.description && (
              <div className="flex justify-between">
                <span className="text-white/60">Description:</span>
                <span className="text-right max-w-xs truncate">{transaction.description}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onDelete) {
                onDelete();
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors cursor-pointer"
          >
            Delete Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

