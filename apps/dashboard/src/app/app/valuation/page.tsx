'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';

export default function ValuationPage() {
  const { currentCompany } = useAppStore();
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const calculateValuation = async () => {
    if (!currentCompany) return;

    setCalculating(true);
    try {
      const response = await api.post(
        `/companies/${currentCompany.id}/valuations/calculate`
      );
      setValuation(response.data.valuation);
    } catch (error: any) {
      console.error('Failed to calculate valuation:', error);
      alert(error.response?.data?.error?.message || 'Failed to calculate valuation');
    } finally {
      setCalculating(false);
    }
  };

  const loadLatestValuation = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const response = await api.get(
        `/companies/${currentCompany.id}/valuations/latest`
      );
      setValuation(response.data.valuation);
    } catch (error: any) {
      // No valuation found is OK
      if (error.response?.status !== 404) {
        console.error('Failed to load valuation:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCompany) {
      loadLatestValuation();
    }
  }, [currentCompany]);

  if (!currentCompany) {
    return (
      <EmptyState
        icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        title="No company selected"
        description="Select a company from the sidebar to view valuation"
      />
    );
  }

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Valuation Engine</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — AI-powered company valuation analysis
          </p>
        </div>
        <Button
          variant="primary"
          onClick={calculateValuation}
          disabled={calculating}
        >
          {calculating ? 'Calculating...' : 'Calculate Valuation'}
        </Button>
      </div>

      {!valuation ? (
        <EmptyState
          icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          title="No valuation calculated yet"
          description="Calculate your company valuation using multiple methods and AI scoring"
          action={
            <Button variant="primary" onClick={calculateValuation} disabled={calculating}>
              Calculate Valuation
            </Button>
          }
        />
      ) : (
        <>
          {/* Valuation Header */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <h2 className="text-2xl font-bold mb-2 text-white [.light_&]:text-slate-900">{currentCompany.name}</h2>
            <p className="text-white/90">{currentCompany.tagline || 'Company description'}</p>
          </div>

          {/* Valuation Methods */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  Revenue Multiple
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  ${valuation.revenueMultiple?.amount?.toLocaleString() || '$0'}
                </div>
                {valuation.revenueMultiple?.multiple && (
                  <div className="text-sm text-white/60 [.light_&]:text-slate-600">
                    {valuation.revenueMultiple.multiple.toFixed(1)}x ARR
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  DCF Valuation
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  ${valuation.dcf?.amount?.toLocaleString() || '$0'}
                </div>
                {valuation.dcf?.parameters?.discountRate && (
                  <div className="text-sm text-white/60 [.light_&]:text-slate-600">
                    {valuation.dcf.parameters.discountRate}% discount rate
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  Market Comparables
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  ${valuation.marketComps?.amount?.toLocaleString() || '$0'}
                </div>
                {valuation.marketComps?.multiple && (
                  <div className="text-sm text-white/60 [.light_&]:text-slate-600">
                    {valuation.marketComps.multiple.toFixed(1)}x multiple
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Score */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>AI Valuation Score</CardTitle>
                <div className="text-3xl font-bold text-green-500">
                  {valuation.aiScore || 0}/100
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                  style={{ width: `${valuation.aiScore || 0}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-white/50 mb-1">GROWTH</div>
                  <div className="text-xl font-bold text-green-500">
                    {valuation.revenueMultiple?.parameters?.growthRate !== undefined 
                      ? `${valuation.revenueMultiple.parameters.growthRate.toFixed(1)}%`
                      : '0.0%'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/50 mb-1">PROFITABILITY</div>
                  <div className="text-xl font-bold text-green-500">
                    {valuation.revenueMultiple?.parameters?.profitMargin !== undefined 
                      ? `${valuation.revenueMultiple.parameters.profitMargin.toFixed(1)}%`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/50 mb-1">RETENTION</div>
                  <div className="text-xl font-bold text-green-500">N/A%</div>
                </div>
                <div>
                  <div className="text-xs text-white/50 mb-1">MARKET</div>
                  <div className="text-xl font-bold text-yellow-500">75</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-400">AI Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-white/80">
                <p>
                  Based on current metrics, this company is valued at{' '}
                  <strong className="text-white">
                    ${valuation.recommendation?.amount?.toLocaleString() || '$0'}
                  </strong>{' '}
                  ({valuation.recommendation?.method?.replace('_', ' ') || 'revenue multiple'} method
                  recommended).
                </p>
                {valuation.revenueMultiple?.parameters?.growthRate !== undefined && (
                  <p>
                    <strong>Growth Rate:</strong>{' '}
                    {valuation.revenueMultiple.parameters.growthRate.toFixed(1)}% MoM
                  </p>
                )}
                {valuation.revenueMultiple?.parameters?.monthlyRevenue && (
                  <p>
                    <strong>Monthly Revenue:</strong>{' '}
                    ${valuation.revenueMultiple.parameters.monthlyRevenue.toLocaleString()}
                  </p>
                )}
                <p>
                  <strong>Sale Recommendation:</strong> List at{' '}
                  {valuation.recommendation?.amount
                    ? `$${Math.round(valuation.recommendation.amount * 1.12).toLocaleString()} - $${Math.round(valuation.recommendation.amount * 1.33).toLocaleString()}`
                    : 'N/A'}{' '}
                  (1.12x - 1.33x valuation).
                </p>
                <p>
                  <strong>Expected time to sale:</strong> 4-6 months at optimal pricing.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


