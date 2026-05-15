import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete Account',
  description: 'Request permanent deletion of your Donkey Marble Racing account and all associated data.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing/delete-account',
  },
  robots: { index: true, follow: true },
};

export default function DeleteAccountPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-2 tracking-tight">Delete Your Account</h1>
      <p className="text-white/40 text-sm mb-10">
        Request permanent deletion of your Donkey Marble Racing account and all associated data.
      </p>

      <div className="space-y-10">

        {/* Warning */}
        <div className="bg-[#e74c3c]/[0.08] border border-[#e74c3c]/25 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#ff6b6b] mb-3">Before You Delete</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-4">
            Account deletion is <strong className="text-white/80">permanent and irreversible</strong>. Once processed, the following data will be permanently removed:
          </p>
          <ul className="space-y-2 text-white/50 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>Your account profile, username, and email address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>All virtual coins and purchased coin balances</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>Season Pass progress and unlocked rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>Race history, betting records, and statistics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>All marble skins, trails, and cosmetic items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#e74c3c] mt-0.5 flex-shrink-0">&times;</span>
              <span>Season standings and championship history</span>
            </li>
          </ul>
          <p className="text-white/40 text-xs mt-4">
            Note: Purchase transaction records may be retained for up to 7 years as required by tax regulations.
          </p>
        </div>

        {/* In-App Option */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">Option 1: Delete In-App</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              The fastest way to delete your account is directly through the app:
            </p>
            <ol className="space-y-3 text-white/60 text-sm">
              <li className="flex items-start gap-3">
                <span className="bg-white/10 text-white/70 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Open Donkey Marble Racing and go to <strong className="text-white/80">Settings</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-white/10 text-white/70 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <strong className="text-white/80">Delete Account</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-white/10 text-white/70 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Confirm your identity by entering your password</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-white/10 text-white/70 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <span>Tap <strong className="text-white/80">Permanently Delete</strong> to confirm</span>
              </li>
            </ol>
          </div>
        </section>

        {/* Email Option */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">Option 2: Request via Email</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              If you cannot access the app, you can request account deletion by email. Send your request to:
            </p>
            <a
              href="mailto:support@donkeyideas.com?subject=Account Deletion Request — Donkey Marble Racing&body=I would like to permanently delete my Donkey Marble Racing account.%0A%0AAccount email: [your account email]%0AUsername: [your username]%0A%0AI understand this action is permanent and irreversible."
              className="inline-block bg-[#e74c3c] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#d44332] transition-colors"
            >
              Send Deletion Request
            </a>
            <p className="text-white/40 text-xs mt-4">
              Include the email address and username associated with your account. We may ask you to verify your identity before processing the request.
            </p>
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-xl font-bold text-white mb-3">What Happens Next</h2>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/70 font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-sm">Request Received</h3>
                  <p className="text-white/50 text-xs mt-1">We confirm receipt of your deletion request within 24 hours.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/70 font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-sm">Grace Period (7 Days)</h3>
                  <p className="text-white/50 text-xs mt-1">You have 7 days to cancel the deletion by contacting support. During this time, your account is deactivated but your data is preserved.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/70 font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-sm">Data Deletion (Within 30 Days)</h3>
                  <p className="text-white/50 text-xs mt-1">All personal data is permanently deleted from our systems. Purchase records are retained separately for tax compliance as required by law.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/70 font-bold text-sm">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-sm">Confirmation</h3>
                  <p className="text-white/50 text-xs mt-1">You will receive a final confirmation email once your data has been fully deleted.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="text-center pt-4">
          <p className="text-white/40 text-sm mb-4">
            Have questions? Check our{' '}
            <Link href="/games/marble-racing/privacy" className="text-[#6ec1ff] hover:underline">
              Privacy Policy
            </Link>{' '}
            or{' '}
            <Link href="/games/marble-racing/support" className="text-[#6ec1ff] hover:underline">
              contact support
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
