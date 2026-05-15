import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'Donkey Marble Racing',
    template: '%s | Donkey Marble Racing',
  },
  description: 'A thrilling marble racing and betting game with virtual coins. Race marbles, place bets, and climb the season standings.',
  openGraph: {
    siteName: 'Donkey Marble Racing',
    type: 'website',
  },
};

export default function MarbleRacingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a1a3a] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Nav */}
      <header className="border-b border-white/10 bg-[#0d2350]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/games/marble-racing" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ffd84d] to-[#ffc220] shadow-[0_3px_0_rgba(0,0,0,0.25),inset_0_-3px_5px_rgba(0,0,0,0.2)] relative flex-shrink-0">
              <div className="absolute top-[6px] left-[7px] w-[13px] h-[9px] bg-white/45 rounded-full -rotate-[20deg]" />
            </div>
            <span className="font-bold text-lg tracking-wide">
              DONKEY <span className="text-[#ffc220]">MARBLE</span> RACING
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/50 font-medium">
            <Link href="/games/marble-racing/privacy" className="hover:text-white/80 transition-colors">Privacy</Link>
            <Link href="/games/marble-racing/terms" className="hover:text-white/80 transition-colors">Terms</Link>
            <Link href="/games/marble-racing/support" className="hover:text-white/80 transition-colors">Support</Link>
            <Link href="/games/marble-racing/responsible-gaming" className="hover:text-white/80 transition-colors">Responsible Gaming</Link>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/8 bg-[#081833] mt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffd84d] to-[#ffc220] shadow-[0_2px_0_rgba(0,0,0,0.25)] relative">
                  <div className="absolute top-[5px] left-[6px] w-[11px] h-[8px] bg-white/45 rounded-full -rotate-[20deg]" />
                </div>
                <span className="font-bold text-sm tracking-wide">
                  DONKEY <span className="text-[#ffc220]">MARBLE</span>
                </span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                A virtual marble racing game with simulated betting using virtual coins only. No real money is wagered or won.
              </p>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-white/40">
                <li><Link href="/games/marble-racing/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/games/marble-racing/terms" className="hover:text-white/70 transition-colors">Terms of Service</Link></li>
                <li><Link href="/games/marble-racing/responsible-gaming" className="hover:text-white/70 transition-colors">Responsible Gaming</Link></li>
                <li><Link href="/games/marble-racing/delete-account" className="hover:text-white/70 transition-colors">Delete Account</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-white/40">
                <li><Link href="/games/marble-racing/support" className="hover:text-white/70 transition-colors">Contact Support</Link></li>
                <li><a href="mailto:support@donkeyideas.com" className="hover:text-white/70 transition-colors">support@donkeyideas.com</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">
              &copy; {new Date().getFullYear()} Donkey Ideas LLC. All rights reserved.
            </p>
            <p className="text-white/20 text-xs">
              Virtual coins only. Not real-money gambling. Ages 17+.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
