'use client';

type KpiColor = 'gold' | 'blue' | 'green' | 'red';

interface KpiCardProps {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down';
  color: KpiColor;
  subtitle?: string;
}

const colorClasses: Record<KpiColor, { border: string; value: string; glow: string }> = {
  gold: { border: 'border-gold/20', value: 'text-gold', glow: 'bg-gold' },
  blue: { border: 'border-marble-blue/20', value: 'text-marble-blue', glow: 'bg-marble-blue' },
  green: { border: 'border-marble-green/20', value: 'text-marble-green', glow: 'bg-marble-green' },
  red: { border: 'border-marble-red/20', value: 'text-marble-red', glow: 'bg-marble-red' },
};

export function KpiCard({ label, value, change, changeDirection, color, subtitle }: KpiCardProps) {
  const classes = colorClasses[color];

  return (
    <div className={`bg-white/5 border-2 ${classes.border} rounded-2xl p-5 relative overflow-hidden`}>
      <div className={`absolute -top-4 -right-4 w-[60px] h-[60px] rounded-full ${classes.glow} opacity-[0.08]`} />
      <p className="text-[11px] text-white/45 font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-heading text-[32px] leading-none ${classes.value}`}>{value}</p>
      {change && (
        <p className={`text-xs mt-2 ${changeDirection === 'up' ? 'text-marble-green' : 'text-marble-red'}`}>
          {changeDirection === 'up' ? '↑' : '↓'} {change}
        </p>
      )}
      {subtitle && <p className="text-[11px] text-white/30 mt-1">{subtitle}</p>}
    </div>
  );
}
