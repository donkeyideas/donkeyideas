import { NextResponse } from 'next/server';
import { fetchPlayStoreData } from '@/lib/google-play';

export async function GET() {
  try {
    // Test the full production path with argufight
    const data = await fetchPlayStoreData('com.argufight.app', '30d');

    return NextResponse.json({
      overview: data.overview,
      installTimeSeriesCount: data.installTimeSeries.length,
      installTimeSeriesSample: data.installTimeSeries.slice(0, 3),
      storeListing: data.storeListing,
      vitalsTimeSeriesCount: data.vitalsTimeSeries.length,
      reviewsCount: data.reviews.length,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
