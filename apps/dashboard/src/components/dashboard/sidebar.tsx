'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useCompanies } from '@/lib/hooks/use-companies';
import { useTheme } from '@/contexts/theme-context';

// Donkey Ideas - Global/Consolidated features
const donkeyIdeasNavigation = [
  {
    section: 'Donkey Ideas',
    items: [
      { name: 'Dashboard', href: '/app/dashboard', icon: '' },
      { name: 'Financials', href: '/app/consolidated', icon: '' },
      { name: 'Budget & Forecast', href: '/app/budget/consolidated', icon: '' },
      { name: 'Analytics', href: '/app/consolidated-analytics', icon: '' },
      { name: 'Play Store', href: '/app/consolidated-play-store', icon: '' },
      { name: 'Analytics & Reports', href: '/app/analytics', icon: '' },
      { name: 'Project Board', href: '/app/consolidated-projects', icon: '' },
    ],
  },
  {
    section: 'Content & Systems',
    items: [
      { name: 'Website Manager', href: '/app/website', icon: '' },
      { name: 'Blog Manager', href: '/app/blog', icon: '' },
      { name: 'SEO & GEO Analytics', href: '/app/seo-geo', icon: '' },
      { name: 'Contact Messages', href: '/app/messages', icon: '', showBadge: true },
      { name: 'Social Posts', href: '/app/social-posts', icon: '' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { name: 'AI Assistant', href: '/app/ai-assistant', icon: '' },
      { name: 'API Usage & Costs', href: '/app/api-usage', icon: '' },
      { name: 'Settings', href: '/app/settings', icon: '' },
    ],
  },
];

// Active Company - Company-specific features
const activeCompanyNavigation = [
  {
    section: 'Financial',
    items: [
      { name: 'Financial Hub', href: '/app/financials', icon: '' },
      { name: 'Budget & Forecast', href: '/app/budget', icon: '' },
      { name: 'Valuation Engine', href: '/app/valuation', icon: '' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { name: 'Business Profile', href: '/app/business-profile', icon: '' },
      { name: 'Google Analytics', href: '/app/google-analytics', icon: '' },
      { name: 'Play Store', href: '/app/play-store', icon: '' },
      { name: 'Whitepaper', href: '/app/whitepaper', icon: '' },
      { name: 'Project Board', href: '/app/projects', icon: '' },
      { name: 'Document Library', href: '/app/documents', icon: '' },
      { name: 'AI Deck Builder', href: '/app/deck-builder', icon: '' },
    ],
  },
  {
    section: 'Team & Access',
    items: [
      { name: 'Team Management', href: '/app/team', icon: '' },
      { name: 'Investor Portal', href: '/app/investor-portal', icon: '' },
      { name: 'Activity Logs', href: '/app/activity', icon: '' },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { companies: companiesFromStore, currentCompany, setCurrentCompany, setCompanies } = useAppStore();
  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  const { theme } = useTheme();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Use companies from React Query if available, fallback to store
  // Ensure companies is always an array
  const companies = Array.isArray(companiesData)
    ? companiesData
    : (Array.isArray(companiesFromStore) ? companiesFromStore : []);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/admin/messages/unread-count');
        if (response.ok) {
          const data = await response.json();
          setUnreadMessageCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update Zustand store when companies load
  useEffect(() => {
    if (companiesData) {
      setCompanies(companiesData);
      
      // Set first company as current if none selected
      if (companiesData.length > 0 && !currentCompany) {
        setCurrentCompany(companiesData[0]);
      }
    }
  }, [companiesData, setCompanies, setCurrentCompany, currentCompany]);

  // Theme-specific styles
  const bgClass = theme === 'dark'
    ? 'bg-[#0F0F0F]'
    : theme === 'light'
    ? 'bg-[#F5F5DC]'
    : 'bg-slate-900/95';
  
  const borderClass = theme === 'light' ? 'border-slate-300' : 'border-white/10';
  const textClass = theme === 'light' ? 'text-slate-900' : 'text-white';
  const mutedTextClass = theme === 'light' ? 'text-slate-600' : 'text-white/60';
  const sectionTextClass = theme === 'light' ? 'text-slate-500' : 'text-white/40';
  const activeClasses = theme === 'light'
    ? 'bg-blue-500/20 text-blue-600 border-l-2 border-blue-600'
    : 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500';
  const hoverClasses = theme === 'light'
    ? 'hover:bg-slate-200 hover:text-slate-900'
    : 'hover:bg-white/5 hover:text-white';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={`w-70 fixed left-0 top-0 h-screen ${bgClass} border-r ${borderClass} p-6 overflow-y-auto z-50 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      {/* Mobile close button */}
      <div className="flex items-center justify-between mb-6">
        <div className={`text-xl font-light tracking-wider ${textClass}`}>
          DONKEY <span className="font-bold">IDEAS</span>
        </div>
        <button
          onClick={onClose}
          className={`lg:hidden p-1.5 rounded-lg ${hoverClasses} ${mutedTextClass}`}
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Donkey Ideas Navigation - Global/Consolidated */}
      <nav className="mb-8">
        {donkeyIdeasNavigation.map((section) => (
          <div key={section.section} className="mb-6">
            <div className={`text-xs ${sectionTextClass} uppercase tracking-wider px-4 mb-2`}>
              {section.section}
            </div>
            {section.items.map((item: any) => {
              const isActive = pathname === item.href;
              const showBadge = item.showBadge && unreadMessageCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-4 py-2 mb-1 rounded transition-colors ${
                    isActive
                      ? activeClasses
                      : `${mutedTextClass} ${hoverClasses}`
                  }`}
                >
                  <span className="text-sm">{item.name}</span>
                  {showBadge && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full min-w-[20px] text-center">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Active Company Selector */}
      <div className={`mb-6 p-3 ${theme === 'light' ? 'bg-blue-100 border-blue-300' : 'bg-blue-500/10 border-blue-500/30'} border rounded-lg`}>
        <label className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-white/50'} uppercase tracking-wider block mb-2`}>
          Active Company
        </label>
        <select
          value={currentCompany?.id || ''}
          onChange={(e) => {
            const company = companies.find((c) => c.id === e.target.value);
            setCurrentCompany(company || null);
          }}
          className={`w-full p-2 ${
            theme === 'light' 
              ? 'bg-white border-slate-300 text-slate-900 [&>option]:bg-white [&>option]:text-slate-900' 
              : 'bg-black/30 border-white/20 text-white [&>option]:bg-[#0F0F0F] [&>option]:text-white'
          } border rounded text-sm font-semibold`}
        >
          {companies.length === 0 ? (
            <option value="">No companies</option>
          ) : (
            companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Active Company Navigation - Company-specific */}
      {currentCompany && (
        <nav>
          {activeCompanyNavigation.map((section) => (
            <div key={section.section} className="mb-6">
              <div className={`text-xs ${sectionTextClass} uppercase tracking-wider px-4 mb-2`}>
                {section.section}
              </div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-4 py-2 mb-1 rounded transition-colors ${
                      isActive
                        ? activeClasses
                        : `${mutedTextClass} ${hoverClasses}`
                    }`}
                  >
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      )}

      {/* Show message if no company selected */}
      {!currentCompany && companies.length > 0 && (
        <div className={`text-xs px-4 py-2 italic ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
          Select a company to view company-specific features
        </div>
      )}

      {/* Logout Button */}
      <div className={`mt-8 pt-4 border-t ${theme === 'light' ? 'border-slate-300' : 'border-white/10'}`}>
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className={`flex items-center gap-2 px-4 py-3 rounded transition-colors w-full ${
            theme === 'light'
              ? 'text-red-600 hover:bg-red-50'
              : 'text-red-400 hover:bg-red-500/10'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
    </>
  );
}

