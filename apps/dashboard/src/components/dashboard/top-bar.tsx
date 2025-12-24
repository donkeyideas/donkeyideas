'use client';

export function TopBar() {
  return (
    <div className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-b border-white/10 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <span>Home</span>
        <span>/</span>
        <span className="text-white font-semibold">Dashboard</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>All changes saved</span>
        </div>
      </div>
    </div>
  );
}


