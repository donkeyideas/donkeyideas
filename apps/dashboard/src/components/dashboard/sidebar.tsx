'use client';

import { useEffect } from 'react';
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
      { name: 'Consolidated View', href: '/app/consolidated', icon: '' },
      { name: 'Analytics & Reports', href: '/app/analytics', icon: '' },
      { name: 'Project Board', href: '/app/consolidated-projects', icon: '' },
    ],
  },
  {
    section: 'Content & Systems',
    items: [
      { name: 'Website Manager', href: '/app/website', icon: '' },
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
      { name: 'Valuation Engine', href: '/app/valuation', icon: '' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { name: 'Business Profile', href: '/app/business-profile', icon: '' },
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

export function Sidebar() {
  const pathname = usePathname();
  const { companies: companiesFromStore, currentCompany, setCurrentCompany, setCompanies } = useAppStore();
  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  const { theme } = useTheme();
  
  // Use companies from React Query if available, fallback to store
  // Ensure companies is always an array
  const companies = Array.isArray(companiesData) 
    ? companiesData 
    : (Array.isArray(companiesFromStore) ? companiesFromStore : []);

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
    ? 'bg-[#FAF8F3]' 
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
    <div className={`w-70 fixed left-0 top-0 h-screen ${bgClass} border-r ${borderClass} p-6 overflow-y-auto`}>
      <div className="mb-6">
        <div className={`text-xl font-light tracking-wider ${textClass}`}>
          DONKEY <span className="font-bold">IDEAS</span>
        </div>
      </div>

      {/* Donkey Ideas Navigation - Global/Consolidated */}
      <nav className="mb-8">
        {donkeyIdeasNavigation.map((section) => (
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
        <div className="text-xs text-white/40 px-4 py-2 italic">
          Select a company to view company-specific features
        </div>
      )}
    </div>
  );
}

