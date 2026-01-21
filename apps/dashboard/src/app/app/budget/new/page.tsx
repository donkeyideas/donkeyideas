'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewPeriodPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    startDate: '',
    endDate: '',
    type: 'ACTUALS' as 'BUDGET' | 'FORECAST' | 'ACTUALS',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'CLOSED',
  });

  useEffect(() => {
    loadCompanies();
    // Set default dates (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFormData(prev => ({
      ...prev,
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      name: `${startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Actuals`,
    }));
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      setCompanies(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, companyId: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyId || !formData.name || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/budget/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const period = await response.json();
        // Redirect to the period entry page
        router.push(`/app/budget/${period.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create period'}`);
      }
    } catch (error) {
      console.error('Error creating period:', error);
      alert('Failed to create budget period');
    } finally {
      setLoading(false);
    }
  };

  const updateNameFromDates = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      // If same month, use "Month YYYY"
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setFormData(prev => ({
          ...prev,
          name: `${monthName} ${prev.type.charAt(0) + prev.type.slice(1).toLowerCase()}`,
        }));
      } else {
        // Otherwise use "Q1 YYYY" or "YYYY" or custom
        const yearStart = start.getFullYear();
        const yearEnd = end.getFullYear();
        if (yearStart === yearEnd) {
          setFormData(prev => ({
            ...prev,
            name: `${yearStart} ${prev.type.charAt(0) + prev.type.slice(1).toLowerCase()}`,
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            name: `${start.toLocaleDateString()} - ${end.toLocaleDateString()} ${prev.type}`,
          }));
        }
      }
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/app/budget" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
          ← Back to Budget & Forecast
        </Link>
        <h1 className="text-3xl font-semibold text-white">Create New Period</h1>
        <p className="text-slate-400 mt-1">
          Create a new budget, forecast, or actuals period for tracking
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Period Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Company *
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                required
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Period Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, type: 'BUDGET' });
                    setTimeout(updateNameFromDates, 10);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'BUDGET'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg font-medium">Budget</div>
                  <div className="text-xs mt-1">Planning baseline</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, type: 'FORECAST' });
                    setTimeout(updateNameFromDates, 10);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'FORECAST'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg font-medium">Forecast</div>
                  <div className="text-xs mt-1">Updated expectations</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, type: 'ACTUALS' });
                    setTimeout(updateNameFromDates, 10);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'ACTUALS'
                      ? 'border-green-500 bg-green-500/10 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg font-medium">Actuals</div>
                  <div className="text-xs mt-1">What happened</div>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    setTimeout(updateNameFromDates, 10);
                  }}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    setTimeout(updateNameFromDates, 10);
                  }}
                  className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Period Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
                placeholder="e.g., January 2026 Actuals"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Auto-generated from dates, but you can customize it
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
              >
                <option value="DRAFT">Draft - Work in progress</option>
                <option value="ACTIVE">Active - Ready to use</option>
                <option value="CLOSED">Closed - Locked/archived</option>
              </select>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-blue-300">
                  <div className="font-medium mb-1">Daily entries will be ready</div>
                  <div>
                    After creating this period, you'll be able to enter daily amounts for each
                    category. The system will automatically create daily rows from{' '}
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'start'}{' '}
                    to {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'end'}.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Period'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setFormData(prev => ({
                  ...prev,
                  startDate: start.toISOString().split('T')[0],
                  endDate: end.toISOString().split('T')[0],
                  name: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ${prev.type}`,
                }));
              }}
              className="p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 text-left transition-colors"
            >
              <div className="text-white font-medium">This Month</div>
              <div className="text-xs text-slate-400 mt-1">Current calendar month</div>
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                setFormData(prev => ({
                  ...prev,
                  startDate: start.toISOString().split('T')[0],
                  endDate: end.toISOString().split('T')[0],
                  name: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ${prev.type}`,
                }));
              }}
              className="p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 text-left transition-colors"
            >
              <div className="text-white font-medium">Next Month</div>
              <div className="text-xs text-slate-400 mt-1">Upcoming calendar month</div>
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const quarter = Math.floor(now.getMonth() / 3);
                const start = new Date(now.getFullYear(), quarter * 3, 1);
                const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                setFormData(prev => ({
                  ...prev,
                  startDate: start.toISOString().split('T')[0],
                  endDate: end.toISOString().split('T')[0],
                  name: `Q${quarter + 1} ${now.getFullYear()} ${prev.type}`,
                }));
              }}
              className="p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 text-left transition-colors"
            >
              <div className="text-white font-medium">This Quarter</div>
              <div className="text-xs text-slate-400 mt-1">Current 3-month period</div>
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear(), 11, 31);
                setFormData(prev => ({
                  ...prev,
                  startDate: start.toISOString().split('T')[0],
                  endDate: end.toISOString().split('T')[0],
                  name: `${now.getFullYear()} ${prev.type}`,
                }));
              }}
              className="p-3 bg-black/20 border border-white/10 rounded hover:bg-black/30 text-left transition-colors"
            >
              <div className="text-white font-medium">This Year</div>
              <div className="text-xs text-slate-400 mt-1">Full calendar year</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
