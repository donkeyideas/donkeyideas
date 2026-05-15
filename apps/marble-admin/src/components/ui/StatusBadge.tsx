type Status = 'active' | 'banned' | 'flagged' | 'inactive' | 'suspended' | 'premium' | 'plus' | 'free';

const statusStyles: Record<Status, string> = {
  active: 'bg-marble-green/15 text-marble-green border-marble-green/30',
  banned: 'bg-marble-red/15 text-marble-red border-marble-red/30',
  flagged: 'bg-gold/15 text-gold border-gold/30',
  inactive: 'bg-white/10 text-white/40 border-white/20',
  suspended: 'bg-yellow-500/15 text-yellow-400 border-yellow-400/30',
  premium: 'bg-marble-purple/15 text-marble-purple border-marble-purple/30',
  plus: 'bg-marble-blue/15 text-marble-blue border-marble-blue/30',
  free: 'bg-white/10 text-white/50 border-white/20',
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[status]}`}>
      {label || status}
    </span>
  );
}
