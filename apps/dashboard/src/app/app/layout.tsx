'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopBar } from '@/components/dashboard/top-bar';
import { AIAssistant } from '@/components/ai/ai-assistant';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { theme } = useTheme();

  // Theme classes
  const themeClasses = {
    dark: 'bg-[#0A0A0A] text-white',
    light: 'bg-[#F5F5DC] text-slate-900',
    blue: 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white',
  };

  return (
    <div className={`${theme} flex min-h-screen ${themeClasses[theme]}`}>
      <Sidebar />
      <div className="flex-1 ml-70">
        <TopBar />
        <main className="p-8 max-w-[1600px]">{children}</main>
      </div>
      
      {/* Floating AI Assistant Button */}
      {!showAIAssistant && (
        <button
          onClick={() => setShowAIAssistant(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-40"
          aria-label="Open AI Assistant"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
      
      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ThemeProvider>
  );
}


