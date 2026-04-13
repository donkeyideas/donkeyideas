import { NextResponse } from 'next/server';
import { fetchPlayStoreData } from '@/lib/google-play';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pkg = searchParams.get('pkg') || 'com.basktball.app';

  try {
    const data = await fetchPlayStoreData(pkg, '30d');
    const ts = data.installTimeSeries;

    return NextResponse.json({
      packageName: pkg,
      overview: data.overview,
      storeListing: data.storeListing,
      installTimeSeries: {
        count: ts.length,
        firstDate: ts[0]?.date || null,
        lastDate: ts[ts.length - 1]?.date || null,
        first3: ts.slice(0, 3),
        last3: ts.slice(-3),
      },
      vitalsCount: data.vitalsTimeSeries.length,
      reviewsCount: data.reviews.length,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
