'use client';

const CHAR_LIMITS: Record<string, number> = {
  TWITTER: 280,
  TIKTOK: 300,
  FACEBOOK: 2000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

export function CharacterCount({ current, platform }: { current: number; platform: string }) {
  const limit = CHAR_LIMITS[platform] || 280;
  const pct = (current / limit) * 100;

  let colorClass = 'text-green-400';
  let barColor = 'bg-green-400';
  if (pct > 100) {
    colorClass = 'text-red-400';
    barColor = 'bg-red-400';
  } else if (pct > 85) {
    colorClass = 'text-amber-400';
    barColor = 'bg-amber-400';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 [.light_&]:bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${colorClass}`}>
        {current}/{limit}
      </span>
    </div>
  );
}

export function getCharLimit(platform: string): number {
  return CHAR_LIMITS[platform] || 280;
}
