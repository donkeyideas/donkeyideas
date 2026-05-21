import type { Metadata } from 'next';
import { Lilita_One, Fredoka } from 'next/font/google';
import Link from 'next/link';
import './marble-racing.css';
import MarbleRacingNav from './nav';
import MarbleRacingReveal from './reveal';

const lilitaOne = Lilita_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-lilita-one',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
});

export const metadata: Metadata = {
  title: {
    default: 'Donkey Marble Racing — Pick your marble. Place your bet. Let physics decide.',
    template: '%s | Donkey Marble Racing',
  },
  description:
    'Donkey Marble Racing — a physics-driven marble racing & virtual-coin betting game. 8 glossy marbles, real Matter.js physics, live odds, tournaments & seasons. Download free.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing',
  },
  icons: {
    icon: '/games/marble-racing/app-icon.png',
    shortcut: '/games/marble-racing/app-icon.png',
    apple: '/games/marble-racing/app-icon.png',
  },
  openGraph: {
    siteName: 'Donkey Marble Racing',
    type: 'website',
    url: 'https://www.donkeyideas.com/games/marble-racing',
  },
};

export default function MarbleRacingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`mr-root ${lilitaOne.variable} ${fredoka.variable}`}>
      {/* ================= NAV ================= */}
      <MarbleRacingNav />

      <main id="top">{children}</main>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <Link className="brand" href="/games/marble-racing#top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="app-icon" src="/games/marble-racing/app-icon.png" alt="Donkey Marble Racing app icon" />
                <span className="wordmark">
                  Donkey<br />Marble <em>Racing</em>
                </span>
              </Link>
              <p>
                A 2D physics marble racing game by Donkey Ideas LLC. On the App Store as &quot;Marble Race: Physics
                Bet&quot; and Google Play as &quot;Marble Race Bet Game.&quot;
              </p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h4>Game</h4>
                <a href="/games/marble-racing#marbles">Meet the Marbles</a>
                <a href="/games/marble-racing#features">Features</a>
                <a href="/games/marble-racing#gallery">Screenshots</a>
                <a href="/games/marble-racing#how">How it works</a>
              </div>
              <div className="foot-col">
                <h4>Legal &amp; Support</h4>
                <Link href="/games/marble-racing/support">Support</Link>
                <Link href="/games/marble-racing/privacy">Privacy Policy</Link>
                <Link href="/games/marble-racing/terms">Terms of Use</Link>
                <Link href="/games/marble-racing/responsible-gaming">Responsible Gaming</Link>
                <Link href="/games/marble-racing/delete-account">Delete Account</Link>
              </div>
              <div className="foot-col">
                <h4>Studio</h4>
                <a href="https://donkeyideas.com" target="_blank" rel="noopener">
                  donkeyideas.com
                </a>
                <a
                  href="https://apps.apple.com/us/app/donkey-marble-racing/id6769627792"
                  target="_blank"
                  rel="noopener"
                >
                  App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.donkeymarble.racing"
                  target="_blank"
                  rel="noopener"
                >
                  Google Play
                </a>
              </div>
            </div>
          </div>
          <div className="disclaimer">
            <span className="badge">Please Note</span>
            <span>
              Ages 17+ · Virtual coins only · No real-money gambling. Coins have no cash value and cannot be cashed
              out.
            </span>
          </div>
          <div className="foot-bottom">
            <span>&copy; {new Date().getFullYear()} Donkey Ideas LLC. All rights reserved.</span>
            <span>Made for marble-race fans everywhere.</span>
          </div>
        </div>
      </footer>

      <MarbleRacingReveal />
    </div>
  );
}
