'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import api from '@/lib/api-client';

interface ApiUsageStats {
  totalCalls: number;
  totalCost: number;
  totalTokens: number;
  byProvider: {
    provider: string;
    calls: number;
    cost: number;
    tokens: number;
  }[];
  recentCalls: Array<{
    id: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    createdAt: string;
  }>;
  dailyStats: Array<{
    date: string;
    calls: number;
    cost: number;
    tokens: number;
  }>;
}

// Deep Seek pricing (as of 2024)
const PRICING = {
  deepseek: {
    'deepseek-chat': {
      input: 0.00014, // $0.14 per 1M tokens
      output: 0.00028, // $0.28 per 1M tokens
    },
  },
  openai: {
    'gpt-4': {
      input: 0.03, // $30 per 1M tokens
      output: 0.06, // $60 per 1M tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005, // $0.50 per 1M tokens
      output: 0.0015, // $1.50 per 1M tokens
    },
  },
  anthropic: {
    'claude-3-opus': {
      input: 0.015, // $15 per 1M tokens
      output: 0.075, // $75 per 1M tokens
    },
    'claude-3-sonnet': {
      input: 0.003, // $3 per 1M tokens
      output: 0.015, // $15 per 1M tokens
    },
  },
};

function calculateCost(
  provider: string,
  model: string | null,
  promptTokens: number,
  completionTokens: number
): number {
  if (!model) return 0;

  const providerPricing = PRICING[provider as keyof typeof PRICING];
  if (!providerPricing) return 0;

  const modelPricing = providerPricing[model as keyof typeof providerPricing] as { input: number; output: number } | undefined;
  if (!modelPricing || typeof modelPricing !== 'object' || !('input' in modelPricing) || !('output' in modelPricing)) return 0;

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

export default function ApiUsagePage() {
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    loadUsageStats();
  }, [timeRange]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api-usage/stats?range=${timeRange}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load API usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading API usage statistics...</div>;
  }

  if (!stats) {
    return (
      <div className="text-white/60 [.light_&]:text-slate-600">
        No API usage data available. Start using the AI Assistant to see usage statistics.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">API Usage & Costs</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Track API calls and costs across all services
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
            }}
          >
            <option value="7d" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Last 7 days</option>
            <option value="30d" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Last 30 days</option>
            <option value="90d" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>Last 90 days</option>
            <option value="all" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>All time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
              Total API Calls
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(stats.totalCalls)}</div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">Across all providers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
              Total Cost
            </div>
            <div className="text-3xl font-bold mb-1 text-green-500">
              {formatCurrency(stats.totalCost)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">Cumulative spending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
              Total Tokens
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(stats.totalTokens)}</div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">Input + Output</div>
          </CardContent>
        </Card>
      </div>

      {/* By Provider */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.byProvider.map((provider) => (
              <div
                key={provider.provider}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
              >
                <div>
                  <div className="font-semibold capitalize">{provider.provider}</div>
                  <div className="text-sm text-white/60 [.light_&]:text-slate-600">
                    {formatNumber(provider.calls)} calls • {formatNumber(provider.tokens)} tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-500">
                    {formatCurrency(provider.cost)}
                  </div>
                  <div className="text-xs text-white/60 [.light_&]:text-slate-600">
                    {provider.calls > 0
                      ? formatCurrency(provider.cost / provider.calls)
                      : '$0.0000'}{' '}
                    per call
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Provider</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Model</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60">Tokens</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60">Cost</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-sm">
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm capitalize">{call.provider}</td>
                    <td className="py-3 px-4 text-sm text-white/80">{call.model || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      {formatNumber(call.totalTokens)} ({formatNumber(call.promptTokens)} +{' '}
                      {formatNumber(call.completionTokens)})
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-500">
                      {formatCurrency(call.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Daily Stats Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.dailyStats.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-white/60">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-white/5 rounded h-6 relative overflow-hidden">
                    <div
                      className="h-full bg-blue-500/50 rounded"
                      style={{
                        width: `${Math.min((day.calls / Math.max(...stats.dailyStats.map((d) => d.calls), 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-32 text-sm text-right">
                  {formatNumber(day.calls)} calls
                </div>
                <div className="w-32 text-sm text-right text-green-500">
                  {formatCurrency(day.cost)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

