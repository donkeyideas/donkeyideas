'use client';

interface ToggleSwitchProps {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  danger?: boolean;
}

export function ToggleSwitch({ label, on, onChange, danger }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-white/70">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`w-11 h-6 rounded-full relative transition-colors ${
          on
            ? danger
              ? 'bg-marble-red'
              : 'bg-marble-green'
            : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-[22px]' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
