'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import * as XLSX from 'xlsx';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
}

interface TransactionRow {
  date: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  affectsPL?: boolean;
  affectsBalance?: boolean;
  affectsCashFlow?: boolean;
  isIntercompany?: boolean;
  targetCompanyId?: string;
}

export function ExcelUploadModal({ isOpen, onClose, onSuccess, companyId }: ExcelUploadModalProps) {
  const { companies } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<TransactionRow[]>([]);
  const [error, setError] = useState<string>('');
  const [showCompanyIds, setShowCompanyIds] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setPreview([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Validate and transform data
      const transformedData: TransactionRow[] = [];
      const errors: string[] = [];

      // Helper function to normalize type values
      const normalizeType = (type: string): string | null => {
        if (!type) return null;
        const normalized = type.toLowerCase().trim();
        
        // Direct matches
        const validTypes = ['revenue', 'expense', 'asset', 'liability', 'equity', 'intercompany_transfer'];
        if (validTypes.includes(normalized)) {
          return normalized;
        }
        
        // Handle common variations
        const typeMapping: Record<string, string> = {
          'intercompany transfer': 'intercompany_transfer',
          'intercompany': 'intercompany_transfer',
          'inter-company transfer': 'intercompany_transfer',
          'inter-company': 'intercompany_transfer',
          'revenues': 'revenue',
          'expenses': 'expense',
          'assets': 'asset',
          'liabilities': 'liability',
          'equities': 'equity',
        };
        
        return typeMapping[normalized] || null;
      };

      // Helper function to get target company ID from row, handling various column name variations
      const getTargetCompanyId = (row: any): string | undefined => {
        // Try various possible column names (case-insensitive, with/without spaces)
        const possibleKeys = [
          'TargetCompanyId',
          'Target Company Id',
          'Target Company ID',
          'TargetCompany ID',
          'Destination Company',
          'DestinationCompany',
          'Destination Company Id',
          'Destination Company ID',
          'DestinationCompanyId',
          'To Company',
          'ToCompany',
          'To Company Id',
          'To Company ID',
          'ToCompanyId',
        ];

        // First, try exact matches (case-sensitive)
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return String(row[key]).trim();
          }
        }

        // Then try case-insensitive matches
        const rowKeys = Object.keys(row);
        for (const rowKey of rowKeys) {
          const normalizedKey = rowKey.toLowerCase().replace(/\s+/g, ' ').trim();
          for (const possibleKey of possibleKeys) {
            const normalizedPossible = possibleKey.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalizedKey === normalizedPossible) {
              const value = row[rowKey];
              if (value !== undefined && value !== null && value !== '') {
                return String(value).trim();
              }
            }
          }
        }

        return undefined;
      };

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        
        // Required fields validation
        if (!row.Date) errors.push(`Row ${rowNum}: Date is required`);
        if (!row.Type) errors.push(`Row ${rowNum}: Type is required`);
        if (!row.Category) errors.push(`Row ${rowNum}: Category is required`);
        if (!row.Amount && row.Amount !== 0) errors.push(`Row ${rowNum}: Amount is required`);

        // Type validation with normalization
        const validTypes = ['revenue', 'expense', 'asset', 'liability', 'equity', 'intercompany_transfer'];
        const normalizedType = normalizeType(row.Type);
        if (row.Type && !normalizedType) {
          errors.push(`Row ${rowNum}: Type must be one of: ${validTypes.join(', ')}`);
        }

        // Intercompany validation
        const targetCompanyId = getTargetCompanyId(row);
        if (normalizedType && normalizedType === 'intercompany_transfer') {
          if (!targetCompanyId) {
            errors.push(`Row ${rowNum}: TargetCompanyId (or Destination Company) is required for intercompany transfers`);
          }
        }

        // Amount validation
          const amount = parseFloat(row.Amount);
        if (isNaN(amount)) {
          errors.push(`Row ${rowNum}: Amount must be a valid number`);
        }

        // Date validation
        let date: Date;
        try {
          if (typeof row.Date === 'number') {
            // Excel date serial number
            date = new Date((row.Date - 25569) * 86400 * 1000);
          } else {
            date = new Date(row.Date);
          }
          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNum}: Invalid date format`);
          }
        } catch {
          errors.push(`Row ${rowNum}: Invalid date format`);
        }

        if (normalizedType && (errors.length === 0 || errors.filter(e => e.includes(`Row ${rowNum}`)).length === 0)) {
          const isIntercompany = normalizedType === 'intercompany_transfer';
          transformedData.push({
            date: date!.toISOString().split('T')[0],
            type: normalizedType,
            category: row.Category,
            amount: isIntercompany ? amount : Math.abs(amount),
            description: row.Description || '',
            affectsPL: row.AffectsPL !== undefined ? Boolean(row.AffectsPL) : !isIntercompany, // Default false for intercompany
            affectsBalance: row.AffectsBalance !== undefined ? Boolean(row.AffectsBalance) : true,
            affectsCashFlow: row.AffectsCashFlow !== undefined ? Boolean(row.AffectsCashFlow) : true,
            isIntercompany,
            targetCompanyId: targetCompanyId,
          });
        }
      });

      if (errors.length > 0) {
        setError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''));
        return;
      }

      setPreview(transformedData); // Show all rows in preview
    } catch (err) {
      setError('Failed to read Excel file. Please ensure it\'s a valid .xlsx file.');
    }
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) return;

    setUploading(true);
    setError('');

    try {
      // Helper function to normalize type values (same as in handleFileChange)
      const normalizeType = (type: string): string | null => {
        if (!type) return null;
        const normalized = type.toLowerCase().trim();
        
        // Direct matches
        const validTypes = ['revenue', 'expense', 'asset', 'liability', 'equity', 'intercompany_transfer'];
        if (validTypes.includes(normalized)) {
          return normalized;
        }
        
        // Handle common variations
        const typeMapping: Record<string, string> = {
          'intercompany transfer': 'intercompany_transfer',
          'intercompany': 'intercompany_transfer',
          'inter-company transfer': 'intercompany_transfer',
          'inter-company': 'intercompany_transfer',
          'revenues': 'revenue',
          'expenses': 'expense',
          'assets': 'asset',
          'liabilities': 'liability',
          'equities': 'equity',
        };
        
        return typeMapping[normalized] || null;
      };

      // Helper function to get target company ID from row, handling various column name variations
      const getTargetCompanyId = (row: any): string | undefined => {
        // Try various possible column names (case-insensitive, with/without spaces)
        const possibleKeys = [
          'TargetCompanyId',
          'Target Company Id',
          'Target Company ID',
          'TargetCompany ID',
          'Destination Company',
          'DestinationCompany',
          'Destination Company Id',
          'Destination Company ID',
          'DestinationCompanyId',
          'To Company',
          'ToCompany',
          'To Company Id',
          'To Company ID',
          'ToCompanyId',
        ];

        // First, try exact matches (case-sensitive)
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return String(row[key]).trim();
          }
        }

        // Then try case-insensitive matches
        const rowKeys = Object.keys(row);
        for (const rowKey of rowKeys) {
          const normalizedKey = rowKey.toLowerCase().replace(/\s+/g, ' ').trim();
          for (const possibleKey of possibleKeys) {
            const normalizedPossible = possibleKey.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalizedKey === normalizedPossible) {
              const value = row[rowKey];
              if (value !== undefined && value !== null && value !== '') {
                return String(value).trim();
              }
            }
          }
        }

        return undefined;
      };

      // Read the full file again for upload
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Transform all data
      const transactions: any[] = [];
      jsonData.forEach((row) => {
        let date: Date;
        if (typeof row.Date === 'number') {
          date = new Date((row.Date - 25569) * 86400 * 1000);
        } else {
          date = new Date(row.Date);
        }

        const normalizedType = normalizeType(row.Type) || row.Type.toLowerCase();
        const isIntercompany = normalizedType === 'intercompany_transfer';
        const targetCompanyId = getTargetCompanyId(row);
        transactions.push({
          date: date.toISOString().split('T')[0],
          type: normalizedType,
          category: row.Category,
          amount: isIntercompany ? parseFloat(row.Amount) : Math.abs(parseFloat(row.Amount)),
          description: row.Description || '',
          affectsPL: row.AffectsPL !== undefined ? Boolean(row.AffectsPL) : !isIntercompany,
          affectsBalance: row.AffectsBalance !== undefined ? Boolean(row.AffectsBalance) : true,
          affectsCashFlow: row.AffectsCashFlow !== undefined ? Boolean(row.AffectsCashFlow) : true,
          isIntercompany,
          targetCompanyId: targetCompanyId,
        });
      });

      // Upload transactions in smaller batches to avoid timeout
      const batchSize = 25; // Smaller batch size to prevent timeout
      const totalBatches = Math.ceil(transactions.length / batchSize);
      
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        setUploadProgress(Math.round((currentBatch / totalBatches) * 100));
        
        await api.post(`/companies/${companyId}/transactions/bulk`, { transactions: batch });
        
        // Small delay between batches to prevent overwhelming the server
        if (i + batchSize < transactions.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload transactions');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        Date: '2025-01-01',
        Type: 'revenue',
        Category: 'product_sales',
        Amount: 1000,
        Description: 'Product sales revenue',
        AffectsPL: true,
        AffectsBalance: true,
        AffectsCashFlow: true,
        TargetCompanyId: ''
      },
      {
        Date: '2025-01-02',
        Type: 'expense',
        Category: 'direct_costs',
        Amount: 500,
        Description: 'Cost of goods sold',
        AffectsPL: true,
        AffectsBalance: true,
        AffectsCashFlow: true,
        TargetCompanyId: ''
      },
      {
        Date: '2025-01-03',
        Type: 'intercompany_transfer',
        Category: 'cash',
        Amount: 2000,
        Description: 'Transfer to subsidiary',
        AffectsPL: false,
        AffectsBalance: true,
        AffectsCashFlow: true,
        TargetCompanyId: 'target-company-id-here'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transaction_template.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Upload Transactions from Excel</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Excel Format Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Required Columns:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Date</strong> - Transaction date (YYYY-MM-DD or Excel date format)</li>
                    <li><strong>Type</strong> - Transaction type: revenue, expense, asset, liability, equity, intercompany_transfer (or &quot;Intercompany Transfer&quot;, &quot;Intercompany&quot;, etc.)</li>
                    <li><strong>Category</strong> - Transaction category (see categories below)</li>
                    <li><strong>Amount</strong> - Transaction amount (use negative for intercompany outflows)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Optional Columns:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Description</strong> - Transaction description</li>
                    <li><strong>AffectsPL</strong> - Affects P&L Statement (true/false, default: true)</li>
                    <li><strong>AffectsBalance</strong> - Affects Balance Sheet (true/false, default: true)</li>
                    <li><strong>AffectsCashFlow</strong> - Affects Cash Flow (true/false, default: true)</li>
                    <li><strong>TargetCompanyId</strong> (or &quot;Destination Company&quot;, &quot;Target Company Id&quot;, etc.) - Required for intercompany_transfer type</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Valid Categories by Type:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Revenue:</strong> product_sales, service_revenue, other_revenue
                    </div>
                    <div>
                      <strong>Expense:</strong> direct_costs, infrastructure, sales_marketing, rd, admin, legal, travel
                    </div>
                    <div>
                      <strong>Asset:</strong> cash, accounts_receivable, equipment, inventory, fixed_assets
                    </div>
                    <div>
                      <strong>Liability:</strong> accounts_payable, short_term_debt, long_term_debt
                    </div>
                    <div>
                      <strong>Equity:</strong> capital_contribution, retained_earnings
                    </div>
                    <div>
                      <strong>Intercompany:</strong> cash (requires TargetCompanyId)
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button variant="secondary" onClick={downloadTemplate}>
                    📥 Download Template
                  </Button>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <h5 className="font-semibold text-blue-400 mb-2">💡 Intercompany Transfers:</h5>
                    <p className="text-sm text-blue-300 mb-3">
                      To create intercompany transfers, use Type: <code className="bg-blue-500/20 px-1 rounded">intercompany_transfer</code> and provide the target company ID in the TargetCompanyId column.
                    </p>
                    
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setShowCompanyIds(!showCompanyIds)}
                      className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      {showCompanyIds ? '🔼 Hide' : '🔽 Show'} Company IDs
                    </Button>
                    
                    {showCompanyIds && (
                      <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded">
                        <h6 className="font-semibold text-blue-300 mb-2">Available Company IDs:</h6>
                        <div className="space-y-2">
                          {companies.map((company) => (
                            <div key={company.id} className="flex justify-between items-center text-sm">
                              <span className="text-blue-200">{company.name}</span>
                              <code 
                                className="bg-blue-500/20 px-2 py-1 rounded text-blue-100 cursor-pointer hover:bg-blue-500/30 transition-colors"
                                onClick={() => navigator.clipboard.writeText(company.id)}
                                title="Click to copy"
                              >
                                {company.id}
                              </code>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-blue-400 mt-2">💡 Click any ID to copy to clipboard</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Excel File (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-md">
                <h4 className="font-semibold text-red-400 mb-2">Validation Errors:</h4>
                <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview ({preview.length} transactions)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#1a1a1a]">
                        <tr className="border-b border-white/10">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Category</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, index) => (
                          <tr key={index} className="border-b border-white/5">
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">{row.type}</td>
                            <td className="p-2">{row.category}</td>
                            <td className="p-2">${row.amount}</td>
                            <td className="p-2">{row.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || preview.length === 0 || uploading || !!error}
              >
                {uploading 
                  ? `Uploading... ${uploadProgress}%` 
                  : `Upload ${preview.length} Transaction${preview.length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}