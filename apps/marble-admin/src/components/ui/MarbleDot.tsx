const marbleColors: Record<string, { from: string; to: string }> = {
  dash: { from: '#ff6b35', to: '#cc4400' },
  spike: { from: '#4ecdc4', to: '#2a9d8f' },
  rocky: { from: '#8b4513', to: '#5c2d0e' },
  lucky: { from: '#ffd700', to: '#daa520' },
  frosty: { from: '#87ceeb', to: '#4169e1' },
  nova: { from: '#ff69b4', to: '#c71585' },
  shadow: { from: '#6a0dad', to: '#2d0050' },
  aqua: { from: '#00ced1', to: '#008b8b' },
};

interface MarbleDotProps {
  marbleId: string;
  size?: number;
}

export function MarbleDot({ marbleId, size = 28 }: MarbleDotProps) {
  const id = marbleId.toLowerCase();
  const colors = marbleColors[id] || { from: '#999', to: '#666' };

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${colors.from}, ${colors.to})`,
        boxShadow: '0 2px 0 rgba(0,0,0,0.25), inset 0 -3px 5px rgba(0,0,0,0.2)',
      }}
    />
  );
}
