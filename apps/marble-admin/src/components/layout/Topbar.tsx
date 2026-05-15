'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';

const titleMap: Record<string, string> = {
  '/overview': 'OVERVIEW',
  '/users': 'USER MANAGEMENT',
  '/financials': 'FINANCIALS',
  '/economy': 'ECONOMY CONTROLS',
  '/seasons': 'SEASON MANAGEMENT',
  '/analytics': 'ANALYTICS',
  '/support': 'SUPPORT & TICKETS',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const [time, setTime] = useState('');

  const { data: overviewData } = useQuery<any>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview').then((res: any) => res.data),
    staleTime: 60_000,
  });

  const { data: seasonsData } = useQuery<any>({
    queryKey: ['seasons'],
    queryFn: () => api.get('/seasons').then((res: any) => res.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const basePath = '/' + (pathname.split('/')[1] || 'overview');
  const title = pathname.startsWith('/users/') && pathname !== '/users' ? 'USER DETAIL' : (titleMap[basePath] || 'OVERVIEW');

  // Real data with fallbacks
  const activeToday = overviewData?.players?.activeToday ?? null;
  const currentSeason = seasonsData?.currentSeason ?? null;
  const currentWeek = seasonsData?.seasonMeta?.week ?? null;
  const totalWeeks = seasonsData?.seasonMeta?.totalWeeks ?? 10;

  return (
    <header className="h-16 bg-navy-900/95 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-8 sticky top-0 z-30">
      <button onClick={onMenuClick} className="lg:hidden mr-4 text-white/60 hover:text-white">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="font-heading text-xl tracking-wide">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-marble-red/20 text-marble-red">
          <span className="w-1.5 h-1.5 bg-marble-red rounded-full animate-[pulse-dot_1.5s_infinite]" />
          {activeToday !== null ? `${activeToday} Active Today` : '...'}
        </div>

        <div className="hidden sm:flex items-center text-xs font-semibold px-3.5 py-1.5 rounded-full bg-marble-green/15 text-marble-green border border-marble-green/30">
          PRODUCTION
        </div>

        <span className="hidden sm:block text-white/40 text-xs">
          {currentSeason !== null && currentWeek !== null
            ? `Season ${currentSeason} \u2022 Week ${currentWeek} of ${totalWeeks}`
            : '...'
          }
        </span>
      </div>
    </header>
  );
}
