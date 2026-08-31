// Legacy contact page retired (old copy + duplicate form). Permanent redirect to
// the homepage pitch form, which lands in the same admin inbox.
import { permanentRedirect } from 'next/navigation';

export default function ContactPage() {
  permanentRedirect('/#contact');
}
