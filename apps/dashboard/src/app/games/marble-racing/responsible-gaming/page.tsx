import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Responsible Gaming',
  description: 'Donkey Marble Racing responsible gaming policy. Learn about our commitment to safe, responsible gameplay with virtual currency only.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing/responsible-gaming',
  },
  robots: { index: true, follow: true },
};

export default function ResponsibleGamingPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Responsible Gaming</h1>
      <p className="text-white/40 text-sm mb-10">
        Our commitment to safe, fair, and responsible entertainment.
      </p>

      <div className="space-y-10 text-white/70 text-[15px] leading-relaxed">

        {/* Key Disclaimer */}
        <div className="bg-[#ffc220]/[0.06] border border-[#ffc220]/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#ffc220] mb-3">Virtual Currency Only</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Donkey Marble Racing uses <strong className="text-white">virtual coins only</strong>. No real money is wagered, won, or lost through gameplay. Virtual coins have no real-world monetary value and cannot be exchanged for real currency, goods, or services. The betting experience in our app is entirely simulated and designed for entertainment purposes only.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Our Commitment</h2>
          <p>
            At Donkey Ideas LLC, we take responsible gaming seriously. While Donkey Marble Racing does not involve real-money gambling, we recognize that simulated betting mechanics can still lead to compulsive behavior patterns. We are committed to providing a safe, enjoyable experience for all players and have implemented safeguards to promote healthy gameplay habits.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Age Requirement</h2>
          <p>
            Donkey Marble Racing is rated <strong className="text-white">17+</strong> on the Apple App Store and is intended for mature audiences. This rating reflects the simulated gambling mechanics present in the app. Users must be at least 17 years old to create an account and use the app. We do not knowingly allow users under 17 to access the app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Built-In Safeguards</h2>
          <p className="mb-4">
            We have designed the following safeguards directly into the game:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm mb-2">Betting Limits</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Maximum bet amounts are capped per race to prevent excessive spending of virtual coins in a single session.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm mb-2">Purchase Limits</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                In-app purchase spending is managed through Apple and Google parental controls and purchase confirmation dialogs.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm mb-2">Session Awareness</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                The app tracks session duration and may display reminders encouraging players to take breaks during extended play sessions.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm mb-2">Free Coin Economy</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Players earn virtual coins through daily logins, race rewards, and season milestones — no purchase is ever required to enjoy the game.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Fair Play</h2>
          <p>
            All marble races in Donkey Marble Racing are powered by real-time physics simulation. Race outcomes are <strong className="text-white">never predetermined or rigged</strong>. Each marble has unique physical properties (mass, friction, restitution) that affect its performance, but the actual race result is determined entirely by the physics engine running in real time. We believe fair, transparent gameplay is essential to a responsible gaming experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Parental Controls</h2>
          <p className="mb-4">
            We encourage parents and guardians to use the built-in parental control features provided by Apple and Google:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong className="text-white/90">Apple Screen Time:</strong> Set app time limits, restrict in-app purchases, and enforce content restrictions via Settings &gt; Screen Time on iOS devices.
            </li>
            <li>
              <strong className="text-white/90">Google Family Link:</strong> Manage app usage, approve purchases, and set screen time limits for Android devices.
            </li>
            <li>
              <strong className="text-white/90">Purchase Authentication:</strong> Enable &ldquo;Ask to Buy&rdquo; (Apple) or purchase approval (Google) to require permission before any in-app purchase.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Signs of Problematic Behavior</h2>
          <p className="mb-4">
            Even with virtual currency, be mindful of these patterns that may indicate unhealthy gaming habits:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3 text-white/60 text-sm">
              <span className="text-[#ffc220] mt-0.5 flex-shrink-0">&#9679;</span>
              <span>Spending more time or money on in-app purchases than intended</span>
            </li>
            <li className="flex items-start gap-3 text-white/60 text-sm">
              <span className="text-[#ffc220] mt-0.5 flex-shrink-0">&#9679;</span>
              <span>Feeling anxious or irritable when unable to play or place bets</span>
            </li>
            <li className="flex items-start gap-3 text-white/60 text-sm">
              <span className="text-[#ffc220] mt-0.5 flex-shrink-0">&#9679;</span>
              <span>Neglecting responsibilities or relationships due to gameplay</span>
            </li>
            <li className="flex items-start gap-3 text-white/60 text-sm">
              <span className="text-[#ffc220] mt-0.5 flex-shrink-0">&#9679;</span>
              <span>Chasing losses by making increasingly larger bets with virtual coins</span>
            </li>
            <li className="flex items-start gap-3 text-white/60 text-sm">
              <span className="text-[#ffc220] mt-0.5 flex-shrink-0">&#9679;</span>
              <span>Hiding gameplay habits from family or friends</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Resources</h2>
          <p className="mb-4">
            If you or someone you know is struggling with gaming habits or gambling-related concerns, the following resources are available:
          </p>
          <div className="space-y-3">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm">National Council on Problem Gambling</h3>
              <p className="text-white/50 text-xs mt-1">Call: 1-800-522-4700 (24/7 confidential helpline)</p>
              <p className="text-white/50 text-xs">Text: 1-800-522-4700</p>
              <p className="text-white/50 text-xs">Chat: ncpgambling.org</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm">Gamblers Anonymous</h3>
              <p className="text-white/50 text-xs mt-1">gamblersanonymous.org</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
              <h3 className="font-bold text-white/90 text-sm">SAMHSA National Helpline</h3>
              <p className="text-white/50 text-xs mt-1">Call: 1-800-662-4357 (free, confidential, 24/7)</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Self-Exclusion</h2>
          <p>
            If you feel you need a break from the app, you can:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-3">
            <li>Uninstall the app from your device at any time</li>
            <li>Contact us to temporarily suspend your account</li>
            <li><Link href="/games/marble-racing/delete-account" className="text-[#6ec1ff] hover:underline">Permanently delete your account</Link> and all associated data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Contact Us</h2>
          <p>
            If you have concerns about responsible gaming or need assistance, please contact us:
          </p>
          <div className="mt-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-5">
            <p className="font-semibold text-white">Donkey Ideas LLC</p>
            <p>Email: <a href="mailto:support@donkeyideas.com" className="text-[#6ec1ff] hover:underline">support@donkeyideas.com</a></p>
            <p>Website: <a href="https://www.donkeyideas.com" className="text-[#6ec1ff] hover:underline">www.donkeyideas.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
