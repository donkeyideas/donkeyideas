// Legacy consulting page retired. The build process now lives in the homepage
// "How we turn an idea into a business" section. Permanent redirect.
import { permanentRedirect } from 'next/navigation';

export default function ProcessPage() {
  permanentRedirect('/#manual');
}
