'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Variant {
  id: string;
  name: string;
  weight: number;
  count?: number;
}

interface Assignment {
  playerId: string;
  playerName: string;
  variant: string;
  assignedAt: string;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  targetMetric: string;
  trafficPercent: number;
  variants: Variant[];
  enrolledCount: number;
  startDate: string | null;
  endDate: string | null;
  results?: Record<string, unknown>;
  assignments?: Assignment[];
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ABTest['status'] }) {
  const styles: Record<ABTest['status'], string> = {
    draft: 'bg-white/10 text-white/50',
    running: 'bg-marble-green/20 text-marble-green',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-marble-blue/20 text-marble-blue',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${styles[status]}`}>
      {status === 'running' && (
        <span className="w-2 h-2 rounded-full bg-marble-green animate-pulse" />
      )}
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Form                                                        */
/* ------------------------------------------------------------------ */

const METRICS = ['conversion', 'retention', 'revenue', 'engagement', 'session_length'] as const;
const VARIANT_IDS = ['A', 'B', 'C', 'D'];

function CreateTestForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMetric, setTargetMetric] = useState<string>('conversion');
  const [trafficPercent, setTrafficPercent] = useState(100);
  const [variants, setVariants] = useState<{ id: string; name: string; weight: number }[]>([
    { id: 'A', name: 'Control', weight: 50 },
    { id: 'B', name: 'Variant B', weight: 50 },
  ]);

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/ab-tests', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      onClose();
    },
  });

  const addVariant = () => {
    if (variants.length >= 4) return;
    const nextId = VARIANT_IDS[variants.length];
    setVariants([...variants, { id: nextId, name: `Variant ${nextId}`, weight: 50 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 2) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: 'name' | 'weight', value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      targetMetric,
      trafficPercent,
      variants,
    });
  };

  return (
    <Card title="Create A/B Test">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. New onboarding flow"
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you testing?"
            rows={2}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50 resize-none"
          />
        </div>

        {/* Target Metric + Traffic */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5">
              Target Metric
            </label>
            <select
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            >
              {METRICS.map((m) => (
                <option key={m} value={m} className="bg-[#0a1a3a]">
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5">
              Traffic %
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={trafficPercent}
              onChange={(e) => setTrafficPercent(Number(e.target.value))}
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Variants */}
        <div>
          <label className="block text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-1.5">
            Variants
          </label>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gold w-5">{v.id}</span>
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => updateVariant(i, 'name', e.target.value)}
                  className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={v.weight}
                  onChange={(e) => updateVariant(i, 'weight', Number(e.target.value))}
                  className="w-20 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
                />
                <span className="text-[11px] text-white/30">wt</span>
                {variants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="text-marble-red/70 hover:text-marble-red text-sm px-1"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
          {variants.length < 4 && (
            <button
              type="button"
              onClick={addVariant}
              className="mt-2 text-xs text-marble-blue hover:text-marble-blue/80 font-semibold"
            >
              + Add Variant
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="px-4 py-2 bg-gold/90 hover:bg-gold text-[#0a1a3a] font-bold text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Test'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/[0.06] hover:bg-white/10 text-white/60 font-semibold text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Test Detail (expandable)                                           */
/* ------------------------------------------------------------------ */

function TestDetail({ test }: { test: ABTest }) {
  const totalEnrolled = test.variants.reduce((s, v) => s + (v.count ?? 0), 0) || 1;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
      {/* Variant Breakdown */}
      <div>
        <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
          Variant Breakdown
        </div>
        <div className="space-y-2">
          {test.variants.map((v) => {
            const pct = totalEnrolled > 0 ? Math.round(((v.count ?? 0) / totalEnrolled) * 100) : 0;
            return (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gold w-5">{v.id}</span>
                <span className="text-xs text-white/60 w-24 truncate">{v.name}</span>
                <div className="flex-1 h-2.5 bg-white/[0.06] rounded">
                  <div
                    className="h-full rounded bg-marble-blue transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-white/50 w-16 text-right">
                  {(v.count ?? 0).toLocaleString()} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results (if completed) */}
      {test.status === 'completed' && test.results && (
        <div>
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Results
          </div>
          <pre className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-xs text-white/70 overflow-x-auto max-h-48">
            {JSON.stringify(test.results, null, 2)}
          </pre>
        </div>
      )}

      {/* Recent Assignments */}
      {test.assignments && test.assignments.length > 0 && (
        <div>
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Recent Assignments
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-white/40 font-semibold">Player</th>
                  <th className="text-left py-2 px-3 text-white/40 font-semibold">Variant</th>
                  <th className="text-right py-2 px-3 text-white/40 font-semibold">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {test.assignments.slice(0, 10).map((a, i) => (
                  <tr key={i} className="border-b border-white/[0.03] last:border-b-0">
                    <td className="py-2 px-3 text-white/70">{a.playerName}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 bg-gold/10 text-gold rounded text-[10px] font-bold">
                        {a.variant}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-white/40">
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ABTestsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: tests, isLoading, isError } = useQuery<ABTest[]>({
    queryKey: ['ab-tests'],
    queryFn: () => api.get('/ab-tests').then((res: any) => res.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put('/ab-tests', { id, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ab-tests'] }),
  });

  const deleteTest = useMutation({
    mutationFn: (id: string) => api.delete(`/ab-tests?id=${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ab-tests'] }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !tests)
    return (
      <div className="text-center py-20 text-white/40">Failed to load A/B tests</div>
    );

  /* -- KPI calculations -- */
  const totalTests = tests.length;
  const runningTests = tests.filter((t) => t.status === 'running').length;
  const completedTests = tests.filter((t) => t.status === 'completed').length;
  const totalEnrolled = tests.reduce((s, t) => s + t.enrolledCount, 0);

  return (
    <div className="space-y-6">
      {/* -- KPI Row -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tests */}
        <div className="bg-white/5 border-2 border-marble-blue/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-blue opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Total Tests
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-blue">
            {totalTests}
          </div>
        </div>

        {/* Running */}
        <div className="bg-white/5 border-2 border-marble-green/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-marble-green opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Running
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-marble-green flex items-center gap-2">
            {runningTests}
            {runningTests > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-marble-green animate-pulse" />
            )}
          </div>
        </div>

        {/* Enrolled Players */}
        <div className="bg-white/5 border-2 border-gold/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-gold opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Enrolled Players
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-gold">
            {totalEnrolled.toLocaleString()}
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white/5 border-2 border-[#9b59b6]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full bg-[#c39bd3] opacity-[0.08]" />
          <div className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">
            Completed
          </div>
          <div className="font-heading text-[32px] tracking-wide leading-none text-[#c39bd3]">
            {completedTests}
          </div>
        </div>
      </div>

      {/* -- Create Test Toggle -- */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-gold/90 hover:bg-gold text-[#0a1a3a] font-bold text-sm rounded-lg transition-colors"
        >
          + New A/B Test
        </button>
      ) : (
        <CreateTestForm onClose={() => setShowCreate(false)} />
      )}

      {/* -- Tests List -- */}
      <Card title="All Tests">
        {tests.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">
            No A/B tests yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-colors hover:border-white/[0.12]"
              >
                {/* Row */}
                <div
                  className="flex flex-col lg:flex-row lg:items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}
                >
                  {/* Left: Name + Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-white truncate">{test.name}</span>
                      <StatusBadge status={test.status} />
                    </div>
                    {test.description && (
                      <p className="text-xs text-white/40 truncate">{test.description}</p>
                    )}
                  </div>

                  {/* Middle: Metadata */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Target Metric */}
                    <span className="px-2 py-0.5 bg-marble-blue/10 text-marble-blue rounded text-[10px] font-semibold uppercase">
                      {test.targetMetric.replace('_', ' ')}
                    </span>

                    {/* Traffic */}
                    <span className="text-xs text-white/50">
                      {test.trafficPercent}% traffic
                    </span>

                    {/* Enrolled */}
                    <span className="text-xs text-white/50">
                      {test.enrolledCount.toLocaleString()} enrolled
                    </span>

                    {/* Dates */}
                    <span className="text-[10px] text-white/30">
                      {test.startDate
                        ? new Date(test.startDate).toLocaleDateString()
                        : 'Not started'}
                      {test.endDate && ` - ${new Date(test.endDate).toLocaleDateString()}`}
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {(test.status === 'draft' || test.status === 'paused') && (
                      <button
                        onClick={() => updateStatus.mutate({ id: test.id, status: 'running' })}
                        disabled={updateStatus.isPending}
                        className="px-2.5 py-1 bg-marble-green/20 text-marble-green text-[11px] font-semibold rounded-lg hover:bg-marble-green/30 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    {test.status === 'running' && (
                      <>
                        <button
                          onClick={() => updateStatus.mutate({ id: test.id, status: 'paused' })}
                          disabled={updateStatus.isPending}
                          className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-[11px] font-semibold rounded-lg hover:bg-yellow-500/30 transition-colors"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: test.id, status: 'completed' })}
                          disabled={updateStatus.isPending}
                          className="px-2.5 py-1 bg-marble-blue/20 text-marble-blue text-[11px] font-semibold rounded-lg hover:bg-marble-blue/30 transition-colors"
                        >
                          Complete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Delete test "${test.name}"?`)) {
                          deleteTest.mutate(test.id);
                        }
                      }}
                      disabled={deleteTest.isPending}
                      className="px-2.5 py-1 bg-marble-red/20 text-marble-red text-[11px] font-semibold rounded-lg hover:bg-marble-red/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedId === test.id && <TestDetail test={test} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
