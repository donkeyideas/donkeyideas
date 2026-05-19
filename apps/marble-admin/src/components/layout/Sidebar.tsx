'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badgeKey?: 'users' | 'support';
}

const navItems: NavItem[] = [
  { name: 'Overview', href: '/overview', icon: '◆' },
  { name: 'Users', href: '/users', icon: '■', badgeKey: 'users' },
  { name: 'Forecast', href: '/forecast', icon: '▲' },
  { name: 'Financials', href: '/financials', icon: '▲' },
  { name: 'Economy', href: '/economy', icon: '◈' },
  { name: 'Seasons', href: '/seasons', icon: '●' },
  { name: 'Analytics', href: '/analytics', icon: '☰' },
  { name: 'Live Ops', href: '/live-ops', icon: '◇' },
  { name: 'Track Backgrounds', href: '/track-backgrounds', icon: '▦' },
  { name: 'Cohorts', href: '/cohorts', icon: '◫' },
  { name: 'A/B Tests', href: '/ab-tests', icon: '⇄' },
  { name: 'KPIs', href: '/kpis', icon: '◉' },
  { name: 'Physics', href: '/physics', icon: '⊕' },
  { name: 'ASO', href: '/aso', icon: '◎' },
  { name: 'Decks', href: '/decks', icon: '◨' },
  { name: 'Support', href: '/support', icon: '►', badgeKey: 'support' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { data } = useQuery<any>({
    queryKey: ['overview'],
    queryFn: () => api.get('/overview').then((res: any) => res.data),
    staleTime: 60_000,
  });

  const isActive = (href: string) => {
    if (href === '/overview') return pathname === '/overview';
    return pathname.startsWith(href);
  };

  // Compute badge values from real data
  const getBadge = (item: NavItem): string | null => {
    if (!data || !item.badgeKey) return null;

    if (item.badgeKey === 'users') {
      const banned = data.players?.banned ?? 0;
      return banned > 0 ? String(banned) : null;
    }

    if (item.badgeKey === 'support') {
      // No ticket system yet — no badge to show
      return null;
    }

    return null;
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-[260px] bg-gradient-to-b from-navy-800 to-navy-950 border-r border-white/[0.08] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/[0.08] flex items-center gap-3">
          <Image src="/logo-small.png" alt="Donkey Marble Racing" width={42} height={42} className="rounded-xl flex-shrink-0" />
          <div>
            <div className="font-heading text-base tracking-wide leading-tight">
              DONKEY <span className="text-gold">MARBLE</span>
            </div>
            <div className="text-[10px] text-white/40 tracking-[2px] uppercase font-semibold">
              Admin Dashboard
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item: NavItem) => {
            const badge = getBadge(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                  isActive(item.href)
                    ? 'bg-gold/[0.12] border-gold/30 text-gold font-semibold'
                    : 'border-transparent text-white/55 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.name}</span>
                {badge && (
                  <span className="ml-auto bg-marble-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center font-heading text-navy-900 text-base border-2 border-white">
              A
            </div>
            <div className="text-xs">
              <div className="font-semibold">Admin</div>
              <div className="text-white/40 text-[10px]">SUPER ADMIN</div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              } catch {
                window.location.href = '/login';
              }
            }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
          >
            <span className="text-sm">↪</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
