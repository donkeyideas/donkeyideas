'use client';

import { useTheme } from '@/contexts/theme-context';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'dark' as const, label: 'Dark' },
    { id: 'light' as const, label: 'Light' },
    { id: 'blue' as const, label: 'Blue' },
  ];

  // Theme-specific styles
  const bgClass = theme === 'dark'
    ? 'bg-[#0A0A0A]/95'
    : theme === 'light'
    ? 'bg-[#F5F5DC]/95'
    : 'bg-slate-900/95';

  const borderClass = theme === 'light' ? 'border-slate-300/50' : 'border-white/10';
  const textClass = theme === 'light' ? 'text-slate-600' : 'text-white/60';
  const activeTextClass = theme === 'light' ? 'text-slate-900' : 'text-white';

  return (
    <div className={`sticky top-0 z-30 ${bgClass} backdrop-blur-lg border-b ${borderClass} px-3 sm:px-4 lg:px-6 py-3 flex justify-between items-center`}>
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className={`lg:hidden p-1.5 -ml-1.5 rounded-lg ${textClass} hover:${activeTextClass}`}
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className={`flex items-center gap-2 text-sm ${textClass}`}>
          <span className="hidden sm:inline">Home</span>
          <span className="hidden sm:inline">/</span>
          <span className={`${activeTextClass} font-semibold`}>Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Theme Toggle */}
        <div className={`flex items-center gap-1 rounded-lg p-1 ${
          theme === 'light' ? 'bg-slate-200/50' : 'bg-black/10 dark:bg-white/5'
        }`}>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === t.id
                  ? theme === 'light'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'bg-white/10 text-white'
                  : theme === 'light'
                  ? 'text-slate-600 hover:bg-white/50'
                  : 'text-white/60 hover:bg-white/5'
              }`}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Save Status */}
        <div className={`hidden sm:flex items-center gap-2 text-sm ${textClass}`}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>All changes saved</span>
        </div>
      </div>
    </div>
  );
}
