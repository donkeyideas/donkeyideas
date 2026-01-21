'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';

interface BudgetCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  accountCode: string | null;
  color: string | null;
  isActive: boolean;
  companyId: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    accountCode: '',
    color: '#ef4444',
    companyId: null as string | null,
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadCategories();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/categories?companyId=${selectedCompany}`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCategory
        ? `/api/budget/categories/${editingCategory.id}`
        : '/api/budget/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyId: formData.companyId || selectedCompany,
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingCategory(null);
        resetForm();
        loadCategories();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (category: BudgetCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      accountCode: category.accountCode || '',
      color: category.color || '#ef4444',
      companyId: category.companyId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await fetch(`/api/budget/categories/${id}`, { method: 'DELETE' });
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'EXPENSE',
      accountCode: '',
      color: '#ef4444',
      companyId: null,
    });
  };

  const openAddModal = () => {
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/budget" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Budget & Forecast
          </Link>
          <h1 className="text-3xl font-semibold text-white">Budget Categories</h1>
          <p className="text-slate-400 mt-1">
            Manage your income and expense categories with optional GL account mapping
          </p>
        </div>
        <Button onClick={openAddModal}>+ Add Category</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Company</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-400 mt-2">
            Note: Categories without a company are available globally across all companies
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Income Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-slate-400">Loading...</div>
            ) : (
              <div className="space-y-2">
                {categories
                  .filter((c) => c.type === 'INCOME')
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color || '#10b981' }}
                        />
                        <div>
                          <div className="text-white font-medium">{category.name}</div>
                          {category.accountCode && (
                            <div className="text-xs text-slate-400">
                              GL: {category.accountCode}
                            </div>
                          )}
                          {category.companyId === null && (
                            <div className="text-xs text-blue-400">Global</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                {categories.filter((c) => c.type === 'INCOME').length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No income categories yet
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-slate-400">Loading...</div>
            ) : (
              <div className="space-y-2">
                {categories
                  .filter((c) => c.type === 'EXPENSE')
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color || '#ef4444' }}
                        />
                        <div>
                          <div className="text-white font-medium">{category.name}</div>
                          {category.accountCode && (
                            <div className="text-xs text-slate-400">
                              GL: {category.accountCode}
                            </div>
                          )}
                          {category.companyId === null && (
                            <div className="text-xs text-blue-400">Global</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                {categories.filter((c) => c.type === 'EXPENSE').length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No expense categories yet
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="e.g., Rent, Kamioi, Upwork, Incoming"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="radio"
                        value="INCOME"
                        checked={formData.type === 'INCOME'}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE', color: '#10b981' })
                        }
                      />
                      Income
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="radio"
                        value="EXPENSE"
                        checked={formData.type === 'EXPENSE'}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE', color: '#ef4444' })
                        }
                      />
                      Expense
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    GL Account Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={(e) =>
                      setFormData({ ...formData, accountCode: e.target.value })
                    }
                    className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                    placeholder="e.g., 5100, 4000"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Link to your Chart of Accounts for automatic posting
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 p-3 bg-black/30 border border-white/20 rounded text-white"
                      placeholder="#ef4444"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={formData.companyId === null}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyId: e.target.checked ? null : selectedCompany,
                        })
                      }
                    />
                    <span className="text-sm">
                      Make this category available to all companies (Global)
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCategory(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
