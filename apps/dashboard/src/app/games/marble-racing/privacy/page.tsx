import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Donkey Marble Racing privacy policy. Learn how we collect, use, and protect your personal data.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing/privacy',
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-10">
        Effective Date: May 2026 &mdash; Last Updated: May 13, 2026
      </p>

      <div className="space-y-10 text-white/70 text-[15px] leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
          <p>
            Donkey Ideas LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Donkey Marble Racing mobile application (the &ldquo;App&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App. Please read this policy carefully. By using the App, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">2.1 Information You Provide</h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Account Information:</strong> Email address, username, and password when you create an account.</li>
            <li><strong>Support Communications:</strong> Any information you provide when contacting our support team.</li>
          </ul>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">2.2 Information Collected Automatically</h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Device Information:</strong> Device type, operating system version, unique device identifiers, and app version.</li>
            <li><strong>Usage Data:</strong> Gameplay data including races watched, bets placed (virtual coins only), marbles selected, courses played, session duration, and feature interactions.</li>
            <li><strong>Purchase History:</strong> Records of in-app purchases processed through Apple App Store or Google Play Store.</li>
            <li><strong>Log Data:</strong> IP address, access times, and crash reports for app stability improvements.</li>
          </ul>

          <h3 className="font-semibold text-white/90 mt-4 mb-2">2.3 Information from Third Parties</h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>App Store Platforms:</strong> Purchase validation data from Apple and Google to confirm in-app purchase transactions.</li>
            <li><strong>Analytics Providers:</strong> Aggregated analytics data to help us understand app usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To provide, maintain, and improve the App and its features.</li>
            <li>To process in-app purchases and manage your virtual coin balance.</li>
            <li>To personalize your experience (e.g., tracking your favorite marbles and betting history).</li>
            <li>To manage season standings, race history, and Season Pass progress.</li>
            <li>To respond to your support requests and communications.</li>
            <li>To send push notifications about game events (with your permission).</li>
            <li>To detect, prevent, and address cheating, fraud, and technical issues.</li>
            <li>To analyze usage trends and improve game balance and performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Data Sharing and Disclosure</h2>
          <p className="mb-3">We do not sell your personal information. We may share information with:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Apple Inc. and Google LLC:</strong> Purchase transaction data for in-app purchase processing and validation.</li>
            <li><strong>Analytics Providers:</strong> Anonymized, aggregated usage data to help us understand how users interact with the App.</li>
            <li><strong>Legal Requirements:</strong> If required by law, regulation, or legal process.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
          </ul>
          <p className="mt-3">All third-party partners are required to protect your data with standards equal to or greater than ours.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide you services. If you request account deletion, we will permanently delete your data within 30 days of your request, except where we are legally required to retain certain information (e.g., purchase records for tax compliance, which may be retained for up to 7 years).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal data.</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated data. You can do this in the App (Settings &gt; Delete Account) or via our <Link href="/games/marble-racing/delete-account" className="text-[#6ec1ff] hover:underline">Account Deletion page</Link>.</li>
            <li><strong>Opt-Out:</strong> Disable push notifications through your device settings.</li>
            <li><strong>Data Portability:</strong> Request an export of your data in a machine-readable format.</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@donkeyideas.com" className="text-[#6ec1ff] hover:underline">support@donkeyideas.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">7. Children&apos;s Privacy</h2>
          <p>
            Donkey Marble Racing is rated 17+ and is not directed at children under the age of 17. We do not knowingly collect personal information from children under 17. If we become aware that we have collected data from a child under 17, we will promptly delete that information. If you believe a child has provided us with personal data, please contact us at <a href="mailto:support@donkeyideas.com" className="text-[#6ec1ff] hover:underline">support@donkeyideas.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">8. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your data, including encryption in transit (TLS/SSL) and at rest, secure authentication, and access controls. However, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">9. International Users</h2>
          <p>
            Your data may be processed and stored in the United States. By using the App, you consent to the transfer of your data to the United States. For users in the European Economic Area (EEA), we process data based on your consent and our legitimate interests in providing and improving the App.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">10. California Residents (CCPA)</h2>
          <p>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete it, and the right to opt out of the sale of your data. We do not sell personal information. To exercise your rights, contact <a href="mailto:support@donkeyideas.com" className="text-[#6ec1ff] hover:underline">support@donkeyideas.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the App and updating the &ldquo;Last Updated&rdquo; date. Your continued use of the App after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, contact us at:
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
