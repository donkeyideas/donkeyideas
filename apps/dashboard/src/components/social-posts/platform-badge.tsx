'use client';

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  TWITTER: { label: 'Twitter / X', color: 'bg-sky-500/20 text-sky-400', icon: '𝕏' },
  LINKEDIN: { label: 'LinkedIn', color: 'bg-blue-600/20 text-blue-400', icon: 'in' },
  FACEBOOK: { label: 'Facebook', color: 'bg-blue-500/20 text-blue-300', icon: 'f' },
  INSTAGRAM: { label: 'Instagram', color: 'bg-pink-500/20 text-pink-400', icon: '📷' },
  TIKTOK: { label: 'TikTok', color: 'bg-white/10 text-white [.light_&]:bg-slate-200 [.light_&]:text-slate-800', icon: '♪' },
};

export function PlatformBadge({ platform, size = 'sm' }: { platform: string; size?: 'sm' | 'md' }) {
  const config = PLATFORM_CONFIG[platform] || { label: platform, color: 'bg-white/10 text-white/60', icon: '?' };
  const sizeClasses = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses}`}>
      <span className="font-bold">{config.icon}</span>
      {config.label}
    </span>
  );
}

export function getPlatformLabel(platform: string): string {
  return PLATFORM_CONFIG[platform]?.label || platform;
}

export const PLATFORMS = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'] as const;
