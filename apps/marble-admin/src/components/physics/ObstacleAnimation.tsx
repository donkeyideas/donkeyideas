'use client';

export function ObstacleAnimation({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'pendulum':
      return (
        <div className="relative w-full h-full flex items-start justify-center pt-1">
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="absolute top-1" style={{ animation: 'pendulumSwing 2s ease-in-out infinite', transformOrigin: 'top center' }}>
            <div className="w-px h-12 bg-white/20 mx-auto" />
            <div className="w-6 h-6 rounded-full mx-auto -mt-1" style={{ background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color})`, boxShadow: `0 0 12px ${color}40` }} />
          </div>
          <style>{`@keyframes pendulumSwing { 0%,100% { transform: rotate(-25deg); } 50% { transform: rotate(25deg); } }`}</style>
        </div>
      );
    case 'trampoline':
      return (
        <div className="relative w-full h-full flex flex-col items-center justify-end pb-2">
          <div className="w-4 h-4 rounded-full mb-1" style={{ background: '#ffc220', animation: 'trampBounce 1s ease-in-out infinite', boxShadow: '0 0 8px #ffc22060' }} />
          <div className="w-14 h-3 rounded-lg" style={{ background: `linear-gradient(to right, ${color}, ${color}cc)`, boxShadow: `0 2px 8px ${color}40` }} />
          <style>{`@keyframes trampBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-28px); } }`}</style>
        </div>
      );
    case 'speedBurst':
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="flex gap-1" style={{ animation: 'speedPulse 1.5s ease-in-out infinite' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="text-lg" style={{ color, animationDelay: `${i * 0.15}s`, opacity: 0.5 + i * 0.25 }}>&#9654;</div>
            ))}
          </div>
          <div className="absolute inset-0 rounded-lg" style={{ background: `radial-gradient(circle, ${color}15, transparent)`, animation: 'speedPulse 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes speedPulse { 0%,100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }`}</style>
        </div>
      );
    case 'ballPit':
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{
                background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color})`,
                animation: `ballDrift0 ${1.5 + (i % 3) * 0.3}s ease-in-out ${(i * 0.12)}s infinite`,
              }} />
            ))}
          </div>
          <style>{`@keyframes ballDrift0 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(2px, 3px); } }
@keyframes ballDrift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-2px, 3px); } }`}</style>
        </div>
      );
    case 'cradle':
      return (
        <div className="relative w-full h-full flex items-start justify-center pt-2">
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center" style={{
                animation: i === 0 ? 'cradleLeft 1.2s ease-in-out infinite' : i === 4 ? 'cradleRight 1.2s ease-in-out infinite' : 'none',
                transformOrigin: 'top center',
              }}>
                <div className="w-px h-10 bg-white/20" />
                <div className="w-4 h-4 rounded-full -mt-0.5" style={{ background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}88)` }} />
              </div>
            ))}
          </div>
          <style>{`
            @keyframes cradleLeft { 0%,50% { transform: rotate(0); } 25% { transform: rotate(-20deg); } }
            @keyframes cradleRight { 50%,100% { transform: rotate(0); } 75% { transform: rotate(20deg); } }
          `}</style>
        </div>
      );
    case 'windmill':
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-16 h-2 rounded-full" style={{
            background: `linear-gradient(to right, ${color}, ${color}88)`,
            animation: 'windSpin 3s linear infinite',
            boxShadow: `0 0 10px ${color}30`,
          }} />
          <div className="absolute w-3 h-3 rounded-full bg-white/20 border border-white/10" />
          <style>{`@keyframes windSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    case 'bumper':
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full" style={{
            background: `radial-gradient(circle at 35% 30%, ${color}cc, ${color})`,
            animation: 'bumperPulse 1.5s ease-in-out infinite',
            boxShadow: `0 0 12px ${color}40`,
          }} />
          <style>{`@keyframes bumperPulse { 0%,100% { transform: scale(1); box-shadow: 0 0 8px transparent; } 50% { transform: scale(1.15); box-shadow: 0 0 20px currentColor; } }`}</style>
        </div>
      );
    case 'peg':
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{
                background: `radial-gradient(circle at 35% 30%, ${color}aa, ${color}66)`,
                animation: `pegShine 2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`@keyframes pegShine { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
        </div>
      );
    case 'spring':
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div style={{ animation: 'springCompress 1s ease-in-out infinite' }}>
            <div className="w-10 h-4 rounded-md" style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)`, boxShadow: `0 2px 8px ${color}30` }} />
            <div className="flex justify-center gap-0.5 -mt-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-sm" style={{ background: `${color}66` }} />
              ))}
            </div>
          </div>
          <style>{`@keyframes springCompress { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.7); } }`}</style>
        </div>
      );
    default:
      return <div className="w-8 h-8 rounded-full bg-white/10" />;
  }
}
