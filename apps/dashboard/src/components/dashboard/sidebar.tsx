'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useCompanies } from '@/lib/hooks/use-companies';

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

  return (
    <div className="w-70 fixed left-0 top-0 h-screen bg-[#0F0F0F] border-r border-white/10 p-6 overflow-y-auto">
      <div className="mb-6">
        <div className="text-xl font-light tracking-wider">
          DONKEY <span className="font-bold">IDEAS</span>
        </div>
      </div>

      {/* Donkey Ideas Navigation - Global/Consolidated */}
      <nav className="mb-8">
        {donkeyIdeasNavigation.map((section) => (
          <div key={section.section} className="mb-6">
            <div className="text-xs text-white/40 uppercase tracking-wider px-4 mb-2">
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
                      ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
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
      <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">
          Active Company
        </label>
        <select
          value={currentCompany?.id || ''}
          onChange={(e) => {
            const company = companies.find((c) => c.id === e.target.value);
            setCurrentCompany(company || null);
          }}
          className="w-full p-2 bg-black/30 border border-white/20 rounded text-sm font-semibold text-white [&>option]:bg-[#0F0F0F] [&>option]:text-white"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'white',
          }}
        >
          {companies.length === 0 ? (
            <option value="" style={{ backgroundColor: '#0F0F0F', color: 'white' }}>No companies</option>
          ) : (
            companies.map((company) => (
              <option key={company.id} value={company.id} style={{ backgroundColor: '#0F0F0F', color: 'white' }}>
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
              <div className="text-xs text-white/40 uppercase tracking-wider px-4 mb-2">
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
                        ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
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

