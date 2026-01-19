'use client';

import { useTheme } from '@/contexts/theme-context';

export function TopBar() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'dark' as const, label: 'Dark' },
    { id: 'blue' as const, label: 'Blue' },
  ];

  // Theme-specific styles
  const bgClass = theme === 'dark' 
    ? 'bg-[#0A0A0A]/95' 
    : 'bg-slate-900/95';
  
  const borderClass = 'border-white/10';
  const textClass = 'text-white/60';
  const activeTextClass = 'text-white';

  return (
    <div className={`sticky top-0 z-50 ${bgClass} backdrop-blur-lg border-b ${borderClass} px-8 py-4 flex justify-between items-center`}>
      <div className={`flex items-center gap-2 text-sm ${textClass}`}>
        <span>Home</span>
        <span>/</span>
        <span className={`${activeTextClass} font-semibold`}>Dashboard</span>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Theme Toggle */}
        <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 rounded-lg p-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
              title={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Save Status */}
        <div className={`flex items-center gap-2 text-sm ${textClass}`}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>All changes saved</span>
        </div>
      </div>
    </div>
  );
}


