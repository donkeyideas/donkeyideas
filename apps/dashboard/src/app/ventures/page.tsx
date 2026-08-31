// Legacy ventures index retired — the live portfolio ledger is on the homepage.
// Permanent redirect. NOTE: this only affects the exact /ventures path; the
// venture detail pages at /ventures/[slug] are unaffected.
import { permanentRedirect } from 'next/navigation';

export default function VenturesPage() {
  permanentRedirect('/#ledger');
}
