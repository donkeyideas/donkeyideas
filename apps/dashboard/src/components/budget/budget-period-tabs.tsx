'use client';

import { useTheme } from '@/contexts/theme-context';

interface BudgetPeriod {
  id: string;
  name: string;
  type: 'BUDGET' | 'FORECAST' | 'ACTUALS';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}

interface BudgetPeriodTabsProps {
  periods: BudgetPeriod[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showManage?: boolean;
  onManageClick?: () => void;
  manageActive?: boolean;
}

export function BudgetPeriodTabs({ periods, selectedId, onSelect, showManage, onManageClick, manageActive }: BudgetPeriodTabsProps) {
  const { theme } = useTheme();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BUDGET': return 'bg-blue-500/20 text-blue-400';
      case 'FORECAST': return 'bg-purple-500/20 text-purple-400';
      case 'ACTUALS': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const activeTabClass = theme === 'light'
    ? 'bg-blue-500/20 text-blue-700 border-blue-500'
    : 'bg-blue-500/10 text-blue-400 border-blue-500';

  const inactiveTabClass = theme === 'light'
    ? 'bg-transparent text-slate-600 border-transparent hover:bg-slate-200 hover:text-slate-900'
    : 'bg-transparent text-white/50 border-transparent hover:bg-white/5 hover:text-white/80';

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max pb-1">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => onSelect(period.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-b-2 transition-all ${
              selectedId === period.id && !manageActive ? activeTabClass : inactiveTabClass
            }`}
          >
            <span>{period.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${getTypeBadge(period.type)}`}>
              {period.type}
            </span>
          </button>
        ))}
        {showManage && (
          <button
            onClick={onManageClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-b-2 transition-all ${
              manageActive ? activeTabClass : inactiveTabClass
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Periods
          </button>
        )}
      </div>
    </div>
  );
}
