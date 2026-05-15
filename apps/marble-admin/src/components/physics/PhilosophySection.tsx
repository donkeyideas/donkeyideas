'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { avalancheScene } from './scenes/avalancheScene';

const MatterCanvas = dynamic(
  () => import('./MatterCanvas').then((m) => ({ default: m.MatterCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-white/[0.03] rounded-xl animate-pulse" />
    ),
  },
);

const COMPARISON = [
  { property: 'Marble Friction', standard: '0.1 (default)', avalanche: '0.00001', effect: 'Gravity dominates; marbles glide naturally' },
  { property: 'Surface Friction', standard: '0.1-0.3', avalanche: '0.005', effect: 'Near-zero rolling resistance on ramps/pegs' },
  { property: 'Friction Air', standard: '0.01 (default)', avalanche: '0.0055-0.0075', effect: 'Stat-based differentiation; low drag overall' },
  { property: 'Restitution', standard: '0.0 (default)', avalanche: '0.50-0.54', effect: 'Lively bounces; natural randomness injection' },
  { property: 'Friction Static', standard: '0.5 (default)', avalanche: '0.1', effect: 'Marbles settle naturally but start moving easily' },
];

export function PhilosophySection() {
  const scene = useCallback(avalancheScene, []);

  return (
    <div className="bg-white/5 border-2 border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-heading text-lg tracking-wide">
          <span className="text-gold">CORE PHYSICS</span> PHILOSOPHY
        </h2>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold/20 text-gold uppercase tracking-wider font-semibold">
          Avalanche Pattern
        </span>
      </div>
      <p className="text-xs text-white/40 mb-5">
        All simulation physics are modeled after the{' '}
        <span className="text-marble-blue font-semibold">Matter.js Avalanche Demo</span> —
        near-zero friction lets gravity dominate, producing natural, unpredictable marble flow.
      </p>

      {/* Hero Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#060e24] mb-5">
        <div className="flex justify-center">
          <MatterCanvas
            width={700}
            height={400}
            sceneBuilder={scene}
            fps={60}
            background="transparent"
            className="block max-w-full"
          />
        </div>
        <div className="absolute top-3 left-3 text-[10px] bg-black/40 px-2 py-1 rounded text-white/50 backdrop-blur-sm">
          LIVE SIMULATION — Avalanche Demo Pattern
        </div>
      </div>

      {/* Key Values Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Marble Friction', value: '0.00001', color: 'text-gold' },
          { label: 'Surface Friction', value: '0.005', color: 'text-marble-blue' },
          { label: 'Friction Air', value: '0.0055-0.0075', color: 'text-marble-green' },
          { label: 'Restitution', value: '0.50-0.54', color: 'text-marble-red' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/[0.06]"
          >
            <div className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</div>
            <div className={`text-lg font-heading mt-1 ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">
        Standard Defaults vs Avalanche Tuning
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-[11px] uppercase tracking-wider border-b border-white/[0.08]">
              <th className="text-left py-3 px-2">Property</th>
              <th className="text-center py-3 px-2">Standard</th>
              <th className="text-center py-3 px-2">Avalanche</th>
              <th className="text-left py-3 px-2">Why It Matters</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.property} className="border-b border-white/[0.04]">
                <td className="py-2.5 px-2 font-semibold text-xs">{row.property}</td>
                <td className="text-center py-2.5 px-2 text-white/40 text-xs">{row.standard}</td>
                <td className="text-center py-2.5 px-2 text-gold font-semibold text-xs">
                  {row.avalanche}
                </td>
                <td className="py-2.5 px-2 text-white/50 text-[11px]">{row.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Why This Matters */}
      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Why This Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-white/50 leading-relaxed">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <div className="text-gold font-semibold text-xs mb-1">Gravity-Dominated Flow</div>
            With friction near zero, gravity is the primary force. Marbles accelerate naturally down
            ramps and through obstacles without artificial resistance.
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <div className="text-marble-blue font-semibold text-xs mb-1">Natural Randomness</div>
            High restitution (0.5+) means every collision introduces real energy redistribution.
            Tiny differences in entry angle cascade into completely different paths.
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <div className="text-marble-green font-semibold text-xs mb-1">
              Stat Differentiation via Air Drag
            </div>
            The only friction that varies by marble is frictionAir (0.0055-0.0075). Faster marbles
            have lower air drag, creating meaningful but subtle performance differences.
          </div>
        </div>
      </div>
    </div>
  );
}
