'use client';

interface FilterPillsProps {
  options: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
            active === opt.value
              ? 'bg-gold/[0.12] border-gold text-gold'
              : 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
