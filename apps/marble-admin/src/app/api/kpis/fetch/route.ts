import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';

/* ------------------------------------------------------------------ */
/*  GA4 Auth — uses service account from env var                       */
/* ------------------------------------------------------------------ */

function getCredentials() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var not set');
  return JSON.parse(json);
}

function getAnalyticsClient() {
  const credentials = getCredentials();
  return new BetaAnalyticsDataClient({ credentials });
}

function getAdminClient() {
  const credentials = getCredentials();
  return new AnalyticsAdminServiceClient({ credentials });
}

/* ------------------------------------------------------------------ */
/*  Auto-discover GA4 Property ID from Firebase project                */
/* ------------------------------------------------------------------ */

async function discoverPropertyId(): Promise<string> {
  // Check if manually configured
  if (process.env.GA4_PROPERTY_ID) {
    return process.env.GA4_PROPERTY_ID;
  }

  // Auto-discover from the service account's project
  const adminClient = getAdminClient();
  const [properties] = await adminClient.listProperties({
    filter: `parent:accounts/-`,
    showDeleted: false,
  });

  // Find property linked to our Firebase project
  const credentials = getCredentials();
  const projectId = credentials.project_id; // "donkey-marble-racing"

  for (const prop of properties || []) {
    if (prop.name) {
      // Check if this property has a Firebase link to our project
      try {
        const [links] = await adminClient.listFirebaseLinks({
          parent: prop.name,
        });
        for (const link of links || []) {
          if (link.project && link.project.includes(projectId)) {
            // Extract property ID from "properties/123456789"
            return prop.name.replace('properties/', '');
          }
        }
      } catch {
        // Skip properties we don't have access to
      }
    }
  }

  throw new Error(
    `Could not auto-discover GA4 property for project "${projectId}". Set GA4_PROPERTY_ID env var manually.`
  );
}

/* ------------------------------------------------------------------ */
/*  Fetch metrics from GA4                                             */
/* ------------------------------------------------------------------ */

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const propertyId = await discoverPropertyId();
    const analyticsClient = getAnalyticsClient();

    // Calculate date range: last 7 days (this week's data)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    // Calculate Monday of current week for the entry
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    // Fetch core metrics
    const [metricsResponse] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'sessionsPerUser' },
        { name: 'averageSessionDuration' },
        { name: 'totalRevenue' },
      ],
    });

    // Fetch D1 retention via cohort
    let d1Retention = 0;
    let d7Retention = 0;
    try {
      const [cohortResponse] = await analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'cohortNthDay' }],
        metrics: [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }],
        cohortSpec: {
          cohorts: [
            {
              name: 'recent',
              dateRange: {
                startDate: new Date(now.getTime() - 8 * 86400000).toISOString().split('T')[0],
                endDate: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
              },
            },
          ],
          cohortsRange: {
            endOffset: 7,
            granularity: 'DAILY' as any,
          },
        },
      });

      // Parse cohort data
      for (const row of cohortResponse?.rows || []) {
        const nthDay = parseInt(row.dimensionValues?.[0]?.value || '0');
        const active = parseInt(row.metricValues?.[0]?.value || '0');
        const total = parseInt(row.metricValues?.[1]?.value || '1');
        const retention = total > 0 ? (active / total) * 100 : 0;

        if (nthDay === 1) d1Retention = retention;
        if (nthDay === 7) d7Retention = retention;
      }
    } catch {
      // Cohort data may not be available yet
    }

    // Parse main metrics
    const row = metricsResponse?.rows?.[0];
    const dau = parseInt(row?.metricValues?.[0]?.value || '0');
    const sessions = parseInt(row?.metricValues?.[1]?.value || '0');
    const sessionsPerDau = parseFloat(row?.metricValues?.[2]?.value || '0');
    const avgSessionSecs = Math.round(parseFloat(row?.metricValues?.[3]?.value || '0'));
    const totalRevenue = parseFloat(row?.metricValues?.[4]?.value || '0');
    const arpdau = dau > 0 ? totalRevenue / dau : 0;

    // Get rating from google-play-scraper (already available in project)
    let rating = 0;
    try {
      const gplay = require('google-play-scraper').default || require('google-play-scraper');
      const appInfo = await gplay.app({ appId: 'com.donkeymarble.racing' });
      rating = appInfo.score || 0;
    } catch {
      // App may not be rated yet
    }

    // Save to database
    const entry = await prisma.gameKpiEntry.upsert({
      where: { weekOf: monday },
      update: {
        dau,
        d1Retention: Math.round(d1Retention * 10) / 10,
        d7Retention: Math.round(d7Retention * 10) / 10,
        d30Retention: 0, // GA4 needs 30 days of data for this
        sessionsPerDau: Math.round(sessionsPerDau * 10) / 10,
        avgSessionSecs,
        arpdau: Math.round(arpdau * 100) / 100,
        rating: Math.round(rating * 10) / 10,
        crashRate: 0, // Requires Play Developer Reporting API (separate setup)
        notes: 'Auto-fetched from GA4',
      },
      create: {
        weekOf: monday,
        dau,
        d1Retention: Math.round(d1Retention * 10) / 10,
        d7Retention: Math.round(d7Retention * 10) / 10,
        d30Retention: 0,
        sessionsPerDau: Math.round(sessionsPerDau * 10) / 10,
        avgSessionSecs,
        arpdau: Math.round(arpdau * 100) / 100,
        rating: Math.round(rating * 10) / 10,
        crashRate: 0,
        notes: 'Auto-fetched from GA4',
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      propertyId,
      raw: {
        dau,
        sessions,
        sessionsPerDau,
        avgSessionSecs,
        totalRevenue,
        arpdau,
        d1Retention,
        d7Retention,
        rating,
      },
    });
  } catch (error: any) {
    console.error('KPI fetch error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch KPIs from GA4' } },
      { status: 500 },
    );
  }
}
