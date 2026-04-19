'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@donkey-ideas/ui';
import { StatsGridSkeleton, CardSkeleton } from '@/components/ui/loading-skeleton';
import { UserKPICards } from '@/components/users/user-kpi-cards';
import { UserGrowthChart } from '@/components/users/user-growth-chart';
import { UserDistributionChart } from '@/components/users/user-distribution-chart';
import { UserSignupChart } from '@/components/users/user-signup-chart';
import { UserTable } from '@/components/users/user-table';
import api from '@/lib/api-client';

interface ProjectOverview {
  slug: string;
  displayName: string;
  color: string;
  logo?: string | null;
  total: number;
  new30d: number;
  new7d: number;
  error?: string;
}

interface OverviewData {
  kpis: {
    totalUsers: number;
    newUsers30d: number;
    newUsers7d: number;
    growthRate: number;
  };
  byProject: ProjectOverview[];
  byProjectFiltered: ProjectOverview[];
  growthTimeSeries: Record<string, any>[];
  errors: string[];
}

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateRange, setDateRange] = useState('90');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ dateRange });
      if (projectFilter !== 'all') params.set('project', projectFilter);
      const res = await api.get(`/users/overview?${params.toString()}`);
      setOverviewData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch overview:', err);
      setError(err.response?.data?.error?.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, projectFilter]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const allProjects = overviewData?.byProject || [];
  const filteredProjects = overviewData?.byProjectFiltered || allProjects;
  const chartProjects = (projectFilter === 'all' ? allProjects : filteredProjects).map(p => ({
    slug: p.slug,
    displayName: p.displayName,
    color: p.color,
    logo: p.logo,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white [.light_&]:text-gray-900">
            User Management
          </h1>
          <p className="text-gray-400 [.light_&]:text-gray-500 text-sm">
            Monitor users across all projects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-56 px-3 py-2 pl-9 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [.light_&]:bg-white [.light_&]:border-gray-300 [.light_&]:text-gray-900 [.light_&]:placeholder-gray-400"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [.light_&]:bg-white [.light_&]:border-gray-300 [.light_&]:text-gray-900"
          >
            <option value="all">All Projects</option>
            {allProjects.map(p => (
              <option key={p.slug} value={p.slug}>
                {p.displayName} ({p.total})
              </option>
            ))}
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [.light_&]:bg-white [.light_&]:border-gray-300 [.light_&]:text-gray-900"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All Time</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="bg-red-900/30 border-red-700">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={fetchOverview}
              className="text-sm text-red-300 hover:text-red-200 underline"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      )}

      {/* Offline Projects Warning */}
      {overviewData?.errors && overviewData.errors.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-700/50">
          <CardContent className="p-3">
            <p className="text-yellow-400 text-sm">
              Could not connect to: {overviewData.errors.join(', ')}. Data shown for available projects only.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {loading ? (
        <StatsGridSkeleton />
      ) : overviewData ? (
        <UserKPICards
          data={overviewData.kpis}
          projectCount={projectFilter === 'all'
            ? allProjects.filter(p => !p.error).length
            : 1
          }
        />
      ) : null}

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : overviewData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UserGrowthChart
            data={overviewData.growthTimeSeries}
            projects={chartProjects}
          />
          <UserDistributionChart
            projects={filteredProjects}
          />
        </div>
      ) : null}

      {/* Signups Trend */}
      {loading ? (
        <CardSkeleton />
      ) : overviewData ? (
        <UserSignupChart
          data={overviewData.growthTimeSeries}
          projects={chartProjects}
        />
      ) : null}

      {/* User Table */}
      <UserTable
        projectFilter={projectFilter}
        searchQuery={searchQuery}
        dateFrom={dateRange !== 'all' ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString() : undefined}
        dateTo={undefined}
      />
    </div>
  );
}
