'use client';

import { useState, useEffect } from 'react';
import { Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface TransactionEntryModalProps {
  companyId: string;
  transaction?: any;
  onClose: () => void;
  onSave: () => void;
}

export function TransactionEntryModal({ companyId, transaction, onClose, onSave }: TransactionEntryModalProps) {
  // Only consider it editing if transaction has an ID (duplication passes transaction without ID)
  const isEditing = !!(transaction && transaction.id);
  const { companies, currentCompany } = useAppStore();
  
  // Helper to safely parse date - avoid timezone issues by treating as local date
  const getDateValue = (tx: any) => {
    if (!tx || !tx.date) {
      // Return today's date in local timezone (YYYY-MM-DD format)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    try {
      if (typeof tx.date === 'string') {
        // If it's already in YYYY-MM-DD format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
          return tx.date;
        }
        
        // Handle ISO format dates (e.g., "2025-06-25T00:00:00.000Z" or "2025-06-25T12:00:00")
        // Extract just the date part before 'T' to avoid timezone issues
        if (tx.date.includes('T')) {
          const datePart = tx.date.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            // Parse as local date to avoid timezone shift
            const [year, month, day] = datePart.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            const localYear = localDate.getFullYear();
            const localMonth = String(localDate.getMonth() + 1).padStart(2, '0');
            const localDay = String(localDate.getDate()).padStart(2, '0');
            return `${localYear}-${localMonth}-${localDay}`;
          }
        }
        
        // Fallback: try parsing as Date and extract local components
        const date = new Date(tx.date);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else if (tx.date instanceof Date) {
        // Date object - extract local date components
        const year = tx.date.getFullYear();
        const month = String(tx.date.getMonth() + 1).padStart(2, '0');
        const day = String(tx.date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      // Fallback
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error parsing date in getDateValue:', error, 'tx.date:', tx.date);
      // Fallback to today
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };
  
  // Helper to safely parse amount
  const getAmountValue = (tx: any) => {
    if (!tx) return 0;
    if (typeof tx.amount === 'number') return tx.amount;
    if (typeof tx.amount === 'string') {
      const parsed = parseFloat(tx.amount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };
  
  const [formData, setFormData] = useState({
    date: getDateValue(transaction),
    type: transaction?.type || 'expense',
    category: transaction?.category || '',
    amount: getAmountValue(transaction),
    description: transaction?.description || '',
    affectsPL: transaction?.affectsPL ?? true,
    affectsBalance: transaction?.affectsBalance ?? true,
    affectsCashFlow: transaction?.affectsCashFlow ?? true,
    // Intercompany transfer fields
    destinationCompanyId: transaction?.destinationCompanyId || '',
    intercompanyTransferId: transaction?.intercompanyTransferId || null,
  });
  
  // Update form when transaction prop changes
  useEffect(() => {
    if (transaction) {
      // If date is already in YYYY-MM-DD format, use it directly (faster)
      let parsedDate: string;
      if (typeof transaction.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        parsedDate = transaction.date;
      } else {
        parsedDate = getDateValue(transaction);
      }
      
      setFormData({
        date: parsedDate,
        type: transaction.type || 'expense',
        category: transaction.category || '',
        amount: getAmountValue(transaction),
        description: transaction.description || '',
        affectsPL: transaction.affectsPL ?? true,
        affectsBalance: transaction.affectsBalance ?? true,
        affectsCashFlow: transaction.affectsCashFlow ?? true,
        destinationCompanyId: transaction.destinationCompanyId || '',
        intercompanyTransferId: transaction.intercompanyTransferId || null,
      });
    } else {
      // Reset form when transaction is cleared
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setFormData({
        date: `${year}-${month}-${day}`,
        type: 'expense',
        category: '',
        amount: 0,
        description: '',
        affectsPL: true,
        affectsBalance: true,
        affectsCashFlow: true,
        destinationCompanyId: '',
        intercompanyTransferId: null,
      });
    }
  }, [transaction]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const transactionTypes = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' },
    { value: 'asset', label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity', label: 'Equity' },
    { value: 'intercompany_transfer', label: 'Intercompany Transfer' },
  ];

  const categories = {
    revenue: [
      { value: 'product_revenue', label: 'Product Revenue' },
      { value: 'service_revenue', label: 'Service Revenue' },
      { value: 'other_revenue', label: 'Other Revenue' },
    ],
    expense: [
      { value: 'direct_costs', label: 'Direct Costs' },
      { value: 'infrastructure', label: 'Infrastructure Costs' },
      { value: 'sales_marketing', label: 'Sales & Marketing' },
      { value: 'rd', label: 'R&D Expenses' },
      { value: 'admin', label: 'Admin Expenses' },
      { value: 'salaries', label: 'Salaries' },
      { value: 'rent', label: 'Rent' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'legal', label: 'Legal' },
      { value: 'travel', label: 'Travel' },
    ],
    asset: [
      { value: 'cash', label: 'Cash' },
      { value: 'accounts_receivable', label: 'Accounts Receivable' },
      { value: 'intercompany_receivable', label: 'Intercompany Receivable' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'inventory', label: 'Inventory' },
    ],
    liability: [
      { value: 'accounts_payable', label: 'Accounts Payable' },
      { value: 'intercompany_payable', label: 'Intercompany Payable' },
      { value: 'short_term_debt', label: 'Short Term Debt' },
      { value: 'long_term_debt', label: 'Long Term Debt' },
    ],
    intercompany_transfer: [
      { value: 'transfer_out', label: 'Transfer Out (Source Company)' },
      { value: 'transfer_in', label: 'Transfer In (Destination Company)' },
    ],
    equity: [
      { value: 'capital', label: 'Capital' },
      { value: 'retained_earnings', label: 'Retained Earnings' },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate intercompany transfer
    if (formData.type === 'intercompany_transfer') {
      if (!formData.destinationCompanyId) {
        setError('Please select a destination company for the intercompany transfer');
        return;
      }
      if (formData.destinationCompanyId === companyId) {
        setError('Source and destination companies must be different');
        return;
      }
      if (formData.amount <= 0) {
        setError('Transfer amount must be greater than 0');
        return;
      }
    } else {
      if (!formData.category) {
        setError('Please select a category');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing && transaction) {
        // For editing, just update the single transaction
        await api.put(`/companies/${companyId}/transactions/${transaction.id}`, formData);
        onSave();
      } else if (formData.type === 'intercompany_transfer') {
        // Use the dedicated intercompany transfer API endpoint
        // This correctly creates receivable/payable pairs without affecting P&L
        const destinationCompany = companies.find(c => c.id === formData.destinationCompanyId);
        if (!destinationCompany) {
          setError('Destination company not found');
          setLoading(false);
          return;
        }

        try {
          console.log('Creating intercompany transfer via API...', {
            sourceCompanyId: companyId,
            destinationCompanyId: formData.destinationCompanyId,
            amount: formData.amount
          });
          
          // Call the dedicated intercompany transfer endpoint
          // This creates all 4 transactions correctly:
          // - Source: Intercompany Receivable (asset) + Cash out
          // - Destination: Cash in + Intercompany Payable (liability)
          await api.post(`/companies/${companyId}/intercompany-transfer`, {
            targetCompanyId: formData.destinationCompanyId,
            amount: Math.abs(formData.amount),
            date: formData.date,
            description: formData.description || `Intercompany transfer with ${destinationCompany.name}`,
            affectsCashFlow: true, // Set to false if no actual cash movement
          });
          
          console.log('✅ Intercompany transfer created successfully via API');
          onSave();
        } catch (err: any) {
          console.error('Failed to create intercompany transfer:', err);
          throw err;
        }
      } else {
        // Regular transaction
        await api.post(`/companies/${companyId}/transactions`, formData);
        onSave();
      }
    } catch (err: any) {
      console.error('Transaction save error:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message ||
                          err.message ||
                          `Failed to ${isEditing ? 'update' : 'save'} transaction`;
      setError(errorMessage);
      
      // If it's a validation error from backend, show more details
      if (err.response?.data?.errors) {
        const validationErrors = Object.entries(err.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        setError(`${errorMessage}: ${validationErrors}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type *</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value;
                // Auto-set affects for intercompany transfers
                if (newType === 'intercompany_transfer') {
                  setFormData({ 
                    ...formData, 
                    type: newType, 
                    category: '',
                    affectsPL: false, // Intercompany transfers don't affect P&L
                    affectsBalance: true,
                    affectsCashFlow: true,
                  });
                } else {
                  setFormData({ ...formData, type: newType, category: '' });
                }
              }}
              required
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white"
            >
              {transactionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'intercompany_transfer' ? (
            <div className="space-y-3">
              {/* Transfer Direction Indicator */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/80">Transferring from:</span>
                  <span className="font-semibold text-blue-300">{currentCompany?.name || 'Current Company'}</span>
                  <span className="text-white/60">→</span>
                  <span className="text-white/60">to:</span>
                  <span className="font-semibold text-green-300">
                    {formData.destinationCompanyId 
                      ? companies.find(c => c.id === formData.destinationCompanyId)?.name || 'Select company'
                      : 'Select company'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-yellow-300">
                  💸 Money will flow OUT from {currentCompany?.name || 'this company'} (cash decrease)
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Destination Company *</label>
                <select
                  value={formData.destinationCompanyId}
                  onChange={(e) => setFormData({ ...formData, destinationCompanyId: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white"
                >
                  <option value="">Select destination company</option>
                  {companies
                    .filter(c => c.id !== companyId)
                    .map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-white/60">
                  This will create matching transactions in both companies automatically
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  // Auto-set affectsCashFlow for cash transactions
                  const isCashTransaction = formData.type === 'asset' && newCategory === 'cash';
                  setFormData({ 
                    ...formData, 
                    category: newCategory,
                    affectsCashFlow: isCashTransaction ? true : formData.affectsCashFlow
                  });
                }}
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white"
              >
                <option value="">Select category</option>
                {categories[formData.type as keyof typeof categories]?.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              min="0"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500"
              placeholder="Transaction description..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">Affects:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.affectsPL}
                  onChange={(e) => setFormData({ ...formData, affectsPL: e.target.checked })}
                  disabled={formData.type === 'intercompany_transfer'}
                  className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm">P&L Statement</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.affectsBalance}
                  onChange={(e) => setFormData({ ...formData, affectsBalance: e.target.checked })}
                  disabled={formData.type === 'intercompany_transfer'}
                  className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm">Balance Sheet</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.affectsCashFlow}
                  onChange={(e) => setFormData({ ...formData, affectsCashFlow: e.target.checked })}
                  disabled={formData.type === 'intercompany_transfer'}
                  className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm">Cash Flow</span>
              </label>
            </div>
          </div>

          {formData.type === 'intercompany_transfer' ? (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-300">
              <strong>Note:</strong> Intercompany transfers will automatically create matching transactions in both companies. 
              This will update Balance Sheets and Cash Flow statements, but will NOT affect P&L (no profit/loss from transfers). 
              The transactions will be linked for reconciliation and consolidation purposes.
            </div>
          ) : (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-md text-sm text-blue-300">
              <strong>Note:</strong> This transaction will automatically update the P&L Statement, Balance Sheet, and Cash Flow for the period.
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Transaction' : 'Save Transaction')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

