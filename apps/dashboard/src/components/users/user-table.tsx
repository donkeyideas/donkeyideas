'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const ProviderBadge = ({ provider }: { provider: string }) => {
  switch (provider) {
    case 'google':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 border border-blue-500/20" title="Google">
          <GoogleIcon />
        </span>
      );
    case 'apple':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-300 [.light_&]:text-gray-700 bg-gray-500/10 border border-gray-500/20" title="Apple">
          <AppleIcon />
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-400 [.light_&]:text-gray-500 bg-gray-500/10 border border-gray-500/20" title="Email">
          <EmailIcon />
        </span>
      );
  }
};

const PlanBadge = ({ plan }: { plan: string }) => {
  const normalized = plan.toLowerCase();
  if (normalized === 'free' || normalized === 'starter' || !plan) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 [.light_&]:text-gray-500 border border-gray-500/30">
        {plan || 'Free'}
      </span>
    );
  }
  // Paid plans get a gold/premium style
  const isPremium = ['pro', 'premium', 'professional', 'business', 'enterprise'].includes(normalized);
  if (isPremium) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
        {plan}
      </span>
    );
  }
  // Other non-free plans
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
      {plan}
    </span>
  );
};

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastActive: string | null;
  status: string;
  role: string;
  avatarUrl: string | null;
  provider: 'google' | 'apple' | 'email';
  plan: string;
  project: string;
  projectName: string;
  projectColor: string;
  projectLogo?: string | null;
}

interface UserTableProps {
  projectFilter: string;
  searchQuery: string;
  dateFrom?: string;
  dateTo?: string;
}

export function UserTable({ projectFilter, searchQuery, dateFrom, dateTo }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        project: projectFilter,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortDir,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/users/list?${params.toString()}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, searchQuery, dateFrom, dateTo, page, sortBy, sortDir]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [projectFilter, searchQuery, dateFrom, dateTo]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      banned: 'bg-red-500/20 text-red-400 border-red-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return styles[status] || styles.active;
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <Card className="bg-gray-800/50 border-gray-700 [.light_&]:bg-white [.light_&]:border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-semibold text-white [.light_&]:text-gray-900">All Users</CardTitle>
        <span className="text-sm text-gray-400">
          {total > 0 ? `Showing ${startItem}–${endItem} of ${total.toLocaleString()}` : 'No users'}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 [.light_&]:border-gray-200">
                {[
                  { key: 'project', label: 'Project' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'provider', label: 'Auth' },
                  { key: 'plan', label: 'Plan' },
                  { key: 'createdAt', label: 'Joined' },
                  { key: 'lastActive', label: 'Last Active' },
                  { key: 'status', label: 'Status' },
                  { key: 'role', label: 'Role' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 [.light_&]:text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-200 [.light_&]:hover:text-gray-700 select-none"
                  >
                    {col.label}
                    <SortIcon field={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-700/50 [.light_&]:border-gray-100">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-700 [.light_&]:bg-gray-200 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={`${user.project}-${user.id}`}
                    className="border-b border-gray-700/50 [.light_&]:border-gray-100 hover:bg-gray-700/30 [.light_&]:hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.projectLogo ? (
                          <img
                            src={user.projectLogo}
                            alt={user.projectName}
                            className="w-6 h-6 rounded-md object-contain bg-white/5 p-0.5"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-6 h-6 rounded-md items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            backgroundColor: user.projectColor,
                            display: user.projectLogo ? 'none' : 'flex',
                          }}
                        >
                          {user.projectName.charAt(0)}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: user.projectColor }}
                        >
                          {user.projectName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-7 h-7 rounded-full items-center justify-center text-xs font-medium text-white"
                          style={{
                            backgroundColor: user.projectColor,
                            display: user.avatarUrl ? 'none' : 'flex',
                          }}
                        >
                          {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm text-white [.light_&]:text-gray-900 truncate max-w-[150px]">
                          {user.name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 [.light_&]:text-gray-600 truncate max-w-[200px]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <ProviderBadge provider={user.provider} />
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.plan} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 [.light_&]:text-gray-500 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 [.light_&]:text-gray-500 whitespace-nowrap">
                      {formatDate(user.lastActive)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 [.light_&]:text-gray-500 capitalize">
                      {user.role}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 [.light_&]:border-gray-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed [.light_&]:bg-gray-100 [.light_&]:text-gray-700 [.light_&]:hover:bg-gray-200"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed [.light_&]:bg-gray-100 [.light_&]:text-gray-700 [.light_&]:hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
