import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Donkey Marble Racing. Contact our support team, report bugs, or request account assistance.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing/support',
  },
  robots: { index: true, follow: true },
};

const faqs = [
  {
    question: 'How do I place a bet?',
    answer: 'From the Lobby, tap "Place Bets" before a race starts. Select your marble, choose your wager amount using virtual coins, and confirm your bet. Bets lock once the race begins.',
  },
  {
    question: 'Are virtual coins real money?',
    answer: 'No. Virtual coins have no real-world monetary value. They cannot be exchanged for real currency, withdrawn as cash, or used outside the app. All betting in Donkey Marble Racing is simulated.',
  },
  {
    question: 'How do I get more virtual coins?',
    answer: 'You earn coins through daily logins, winning bets, race rewards, and season milestones. You can also purchase coin packs through in-app purchases starting at $0.99.',
  },
  {
    question: 'What is the Season Pass?',
    answer: 'The Season Pass unlocks premium rewards across 30 levels during a 10-week season. The Premium tier ($9.99) and Plus tier ($24.99) offer exclusive skins, trails, and bonus coins.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'You can delete your account in-app via Settings > Delete Account, or through our web-based Account Deletion page. All data is permanently removed within 30 days.',
  },
  {
    question: 'How do refunds work?',
    answer: 'In-app purchases are processed by Apple or Google. To request a refund, contact the App Store or Google Play support directly. You can also reach out to us for assistance.',
  },
  {
    question: 'Are races rigged?',
    answer: 'No. All race outcomes are determined by a real-time physics simulation using Matter.js. Each marble has unique physical properties (mass, friction, restitution) that affect performance, but no race outcome is predetermined.',
  },
  {
    question: 'Can I play offline?',
    answer: 'Quick Race mode is available offline. However, season races, betting, and leaderboards require an internet connection to sync with our servers.',
  },
];

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Support</h1>
      <p className="text-white/40 text-sm mb-10">
        We&apos;re here to help. Find answers below or reach out to our team.
      </p>

      <div className="space-y-12">

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Contact Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="mailto:support@donkeyideas.com"
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-[#6ec1ff]/30 transition-colors block"
            >
              <h3 className="font-bold text-white mb-1">Email Support</h3>
              <p className="text-white/50 text-sm">support@donkeyideas.com</p>
              <p className="text-white/30 text-xs mt-2">We typically respond within 24 hours</p>
            </a>
            <Link
              href="/games/marble-racing/delete-account"
              className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-[#e74c3c]/30 transition-colors block"
            >
              <h3 className="font-bold text-white mb-1">Delete Account</h3>
              <p className="text-white/50 text-sm">Request permanent account deletion</p>
              <p className="text-white/30 text-xs mt-2">Processed within 30 days</p>
            </Link>
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl group"
              >
                <summary className="px-5 py-4 cursor-pointer font-semibold text-white/90 text-sm hover:text-white transition-colors list-none flex items-center justify-between">
                  {faq.question}
                  <span className="text-white/30 text-lg ml-4 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4 text-white/50 text-sm leading-relaxed border-t border-white/[0.06] pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Bug Reports */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Report a Bug</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Found a bug or experiencing a crash? Help us fix it by emailing us with the following details:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-white/50 text-sm">
              <li>Your device model and operating system version</li>
              <li>App version (found in Settings)</li>
              <li>Steps to reproduce the issue</li>
              <li>Screenshots or screen recordings (if possible)</li>
            </ul>
            <a
              href="mailto:support@donkeyideas.com?subject=Bug Report — Donkey Marble Racing"
              className="inline-block mt-5 bg-[#6ec1ff] text-[#0a1a3a] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#5ab0ee] transition-colors"
            >
              Send Bug Report
            </a>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/games/marble-racing/privacy"
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 transition-colors text-center"
            >
              Privacy Policy
            </Link>
            <Link
              href="/games/marble-racing/terms"
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 transition-colors text-center"
            >
              Terms of Service
            </Link>
            <Link
              href="/games/marble-racing/responsible-gaming"
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-semibold text-white/70 hover:text-white hover:border-white/20 transition-colors text-center"
            >
              Responsible Gaming
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
