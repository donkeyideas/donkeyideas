// Legacy consulting page retired. Permanent redirect to the productized service
// (fractional CFO) so inbound SEO equity flows to the live brand.
import { permanentRedirect } from 'next/navigation';

export default function ServicesPage() {
  permanentRedirect('/fractional-cfo');
}
