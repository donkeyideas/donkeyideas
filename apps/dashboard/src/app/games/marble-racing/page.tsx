import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Donkey Marble Racing — Race, Bet, Compete',
  description: 'A thrilling 2D marble racing game with physics-based action, virtual coin betting, and seasonal competitions. Available on iOS and Android.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing',
  },
  openGraph: {
    title: 'Donkey Marble Racing — Race, Bet, Compete',
    description: 'A thrilling 2D marble racing game with physics-based action, virtual coin betting, and seasonal competitions.',
    url: 'https://www.donkeyideas.com/games/marble-racing',
  },
};

const marbles = [
  { name: 'Dash', color: 'from-[#ff6b6b] to-[#e74c3c]' },
  { name: 'Spike', color: 'from-[#4dabf7] to-[#1d56d4]' },
  { name: 'Rocky', color: 'from-[#69db7c] to-[#2ecc71]' },
  { name: 'Lucky', color: 'from-[#ffd43b] to-[#ffc220]' },
  { name: 'Frosty', color: 'from-[#74c0fc] to-[#6ec1ff]' },
  { name: 'Nova', color: 'from-[#da77f2] to-[#9b59b6]' },
  { name: 'Shadow', color: 'from-[#868e96] to-[#495057]' },
  { name: 'Aqua', color: 'from-[#66d9e8] to-[#17a2b8]' },
];

const features = [
  {
    title: 'Physics-Based Racing',
    description: '8 marbles with unique stats race across hand-crafted and procedurally generated courses powered by real physics.',
  },
  {
    title: 'Virtual Coin Betting',
    description: 'Place bets with virtual coins on your favorite marble. Analyze odds, track form, and build your bankroll.',
  },
  {
    title: 'Seasonal Competitions',
    description: '10-week seasons with standings, playoffs, and championships. Climb the ranks and earn rewards.',
  },
  {
    title: '112 Unique Courses',
    description: '4 themes — Grass, Lava, Ice, and Cyber — with speed bursts, bumpers, ramps, and dynamic obstacles.',
  },
  {
    title: 'Season Pass',
    description: 'Free, Premium, and Plus tiers with exclusive skins, trails, and bonus rewards across 30 levels.',
  },
  {
    title: 'Deep Analytics',
    description: 'Trading cards, head-to-head comparisons, heatmaps, and MIT-tier stats for every marble.',
  },
];

export default function MarbleRacingLandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1d56d4]/20 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10">
          <div className="flex justify-center gap-3 mb-8">
            {marbles.map((m) => (
              <div
                key={m.name}
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${m.color} shadow-[0_3px_0_rgba(0,0,0,0.25),inset_0_-4px_6px_rgba(0,0,0,0.2)] relative`}
              >
                <div className="absolute top-[5px] left-[7px] w-[14px] h-[10px] bg-white/45 rounded-full -rotate-[20deg]" />
              </div>
            ))}
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            DONKEY <span className="text-[#ffc220]">MARBLE</span> RACING
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Pick your marble. Place your bet. Watch the chaos unfold. A physics-based racing game with virtual coin betting and seasonal competitions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-white/40 text-sm">
              <span className="text-white font-semibold">App Store</span>
              <span>Coming Soon</span>
            </div>
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-white/40 text-sm">
              <span className="text-white font-semibold">Google Play</span>
              <span>Coming Soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">
          WHY YOU&apos;LL <span className="text-[#ffc220]">LOVE IT</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-[#ffc220]/30 transition-colors"
            >
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Meet the Marbles */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">
          MEET THE <span className="text-[#ffc220]">MARBLES</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {marbles.map((m) => (
            <div
              key={m.name}
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center hover:border-[#ffc220]/30 transition-colors"
            >
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${m.color} shadow-[0_3px_0_rgba(0,0,0,0.25),inset_0_-4px_6px_rgba(0,0,0,0.2)] relative mx-auto mb-3`}
              >
                <div className="absolute top-[7px] left-[9px] w-[16px] h-[11px] bg-white/45 rounded-full -rotate-[20deg]" />
              </div>
              <h3 className="font-bold text-sm">{m.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-[#ffc220]/[0.06] border border-[#ffc220]/20 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-sm leading-relaxed">
            <strong className="text-[#ffc220]">Important:</strong> Donkey Marble Racing uses virtual coins only. No real money is wagered, won, or lost. This is a simulated betting experience for entertainment purposes. The game is rated 17+ due to simulated gambling mechanics. Please play responsibly.
          </p>
          <Link
            href="/games/marble-racing/responsible-gaming"
            className="inline-block mt-4 text-[#6ec1ff] text-sm font-semibold hover:underline"
          >
            Learn about Responsible Gaming
          </Link>
        </div>
      </section>
    </div>
  );
}
