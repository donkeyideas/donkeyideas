import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Donkey Marble Racing terms of service. Read the rules governing your use of the app, virtual currency, and in-app purchases.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing/terms',
  },
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Terms of Service</h1>
      <p className="text-white/40 text-sm mb-10">
        Effective Date: May 2026 &mdash; Last Updated: May 13, 2026
      </p>

      <div className="space-y-10 text-white/70 text-[15px] leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using the Donkey Marble Racing application (the &ldquo;App&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the App. These Terms constitute a legally binding agreement between you and Donkey Ideas LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Eligibility</h2>
          <p>
            The App is rated 17+ and is intended for users who are at least 17 years of age. By using the App, you represent and warrant that you are at least 17 years old. If you are under 17, you may not use the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. Account Registration</h2>
          <p>
            To access certain features of the App, you may be required to create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Virtual Currency &amp; In-App Purchases</h2>

          <div className="bg-[#ffc220]/[0.06] border border-[#ffc220]/20 rounded-xl p-5 my-4">
            <p className="text-white/80 font-semibold mb-2">Important Disclaimer</p>
            <p>
              Donkey Marble Racing uses <strong>virtual coins only</strong>. No real money is wagered, won, or lost through gameplay. The betting mechanics in the App are simulated and for entertainment purposes only. This is <strong>not real-money gambling</strong>.
            </p>
          </div>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">4.1 Virtual Coins</h3>
          <p>
            Virtual coins (&ldquo;Coins&rdquo;) are an in-app currency used for simulated betting on marble races. Coins have no real-world monetary value and cannot be exchanged for real currency, goods, or services outside the App. We reserve the right to manage, regulate, modify, or eliminate Coins at any time without liability to you.
          </p>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">4.2 Coin Purchases</h3>
          <p>
            You may purchase Coins through in-app purchases processed by the Apple App Store or Google Play Store. All purchases are subject to the terms of the respective platform. Prices are displayed in your local currency prior to purchase.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Starter Pack: $0.99</li>
            <li>Basic Pack: $4.99</li>
            <li>Popular Pack: $9.99</li>
            <li>Premium Pack: $19.99</li>
            <li>Elite Pack: $24.99</li>
          </ul>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">4.3 Season Pass</h3>
          <p>
            The App offers optional Season Pass subscriptions that unlock additional rewards and content:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Season Pass Premium: $9.99 per season</li>
            <li>Season Pass Plus: $24.99 per season</li>
          </ul>
          <p className="mt-2">
            Season Passes are one-time purchases per season and do not auto-renew.
          </p>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">4.4 Refund Policy</h3>
          <p>
            All in-app purchases are processed through Apple or Google and are subject to their respective refund policies. We do not directly process refunds. If you believe you are entitled to a refund, please contact Apple App Store support or Google Play support, or reach out to us at <a href="mailto:support@donkeyideas.com" className="text-[#6ec1ff] hover:underline">support@donkeyideas.com</a> for assistance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Simulated Betting</h2>
          <p>
            The App includes simulated betting mechanics where you place virtual coin wagers on marble race outcomes. These mechanics are designed for entertainment only. You acknowledge and agree that:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
            <li>No real money is involved in any betting activity within the App.</li>
            <li>Virtual coins cannot be converted to real currency or withdrawn as cash.</li>
            <li>Race outcomes are determined by physics simulation and are not predetermined or rigged.</li>
            <li>Past performance of marbles does not guarantee future results.</li>
            <li>The simulated betting experience does not constitute real gambling.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. User Conduct</h2>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the App for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Attempt to exploit, hack, reverse-engineer, or modify the App or its systems.</li>
            <li>Use automated scripts, bots, or tools to interact with the App.</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
            <li>Engage in fraudulent activity, including manipulation of in-app purchase systems.</li>
            <li>Harass, abuse, or harm other users through any App features.</li>
            <li>Attempt to transfer, sell, or trade your account or virtual coins to others.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">7. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the App — including but not limited to text, graphics, logos, icons, marble designs, course designs, animations, and software — are the exclusive property of Donkey Ideas LLC and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any part of the App without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">8. Account Suspension &amp; Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise inappropriate. Upon termination, your right to use the App ceases immediately. Any virtual coins or purchased items in your account may be forfeited upon termination for cause.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">9. Account Deletion</h2>
          <p>
            You may request deletion of your account at any time through the App (Settings &gt; Delete Account) or via our <Link href="/games/marble-racing/delete-account" className="text-[#6ec1ff] hover:underline">Account Deletion page</Link>. Upon deletion, all your personal data, virtual coins, and progress will be permanently removed within 30 days. This action is irreversible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">10. Disclaimer of Warranties</h2>
          <p>
            The App is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of harmful components. We disclaim all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">11. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, Donkey Ideas LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or in connection with your use of the App. Our total liability for any claim arising from the App shall not exceed the amount you paid to us in the 12 months preceding the claim, or $100, whichever is greater.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Donkey Ideas LLC, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney&apos;s fees) arising from your use of the App, your violation of these Terms, or your violation of any rights of a third party.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or the App shall be resolved in the courts located in the State of Florida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">14. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms in the App and updating the &ldquo;Last Updated&rdquo; date. Your continued use of the App after changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">15. Contact Us</h2>
          <p>
            If you have questions about these Terms of Service, contact us at:
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
