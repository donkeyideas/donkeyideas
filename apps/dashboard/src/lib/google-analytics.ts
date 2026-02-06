import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Initialize GA4 Data API client with service account credentials
export function getAnalyticsClient() {
  const clientEmail = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

// Calculate date range
export function getDateRange(range: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '30d':
    default:
      startDate.setDate(endDate.getDate() - 30);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// Fetch real GA4 data
export async function fetchRealAnalytics(propertyId: string, dateRange: string) {
  const client = getAnalyticsClient();
  if (!client) {
    throw new Error('Google Analytics credentials not configured');
  }

  const { startDate, endDate } = getDateRange(dateRange);
  const property = `properties/${propertyId}`;

  // Fetch overview metrics
  const [overviewResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
    ],
  });

  // Fetch sessions over time
  const [sessionsOverTimeResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  // Fetch traffic sources
  const [trafficSourcesResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 5,
  });

  // Fetch top pages
  const [topPagesResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 5,
  });

  // Fetch device breakdown
  const [devicesResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  // Parse overview data
  const overviewRow = overviewResponse.rows?.[0];
  const totalUsers = parseInt(overviewRow?.metricValues?.[0]?.value || '0');
  const newUsers = parseInt(overviewRow?.metricValues?.[1]?.value || '0');
  const sessions = parseInt(overviewRow?.metricValues?.[2]?.value || '0');
  const pageviews = parseInt(overviewRow?.metricValues?.[3]?.value || '0');
  const avgSessionDuration = Math.round(parseFloat(overviewRow?.metricValues?.[4]?.value || '0'));
  const bounceRate = Math.round(parseFloat(overviewRow?.metricValues?.[5]?.value || '0') * 100);
  const engagementRate = Math.round(parseFloat(overviewRow?.metricValues?.[6]?.value || '0') * 100);

  // Parse sessions over time
  const sessionsOverTime = (sessionsOverTimeResponse.rows || []).map((row) => {
    const dateStr = row.dimensionValues?.[0]?.value || '';
    // Format YYYYMMDD to YYYY-MM-DD
    const formattedDate = dateStr.length === 8
      ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      : dateStr;
    return {
      date: formattedDate,
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      pageviews: parseInt(row.metricValues?.[2]?.value || '0'),
    };
  });

  // Parse traffic sources
  const totalTrafficSessions = (trafficSourcesResponse.rows || []).reduce(
    (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'),
    0
  );
  const trafficSources = (trafficSourcesResponse.rows || []).map((row) => {
    const sourceSessions = parseInt(row.metricValues?.[0]?.value || '0');
    return {
      source: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: sourceSessions,
      percentage: totalTrafficSessions > 0
        ? Math.round((sourceSessions / totalTrafficSessions) * 100)
        : 0,
    };
  });

  // Parse top pages
  const topPages = (topPagesResponse.rows || []).map((row) => ({
    page: row.dimensionValues?.[0]?.value || '/',
    title: row.dimensionValues?.[1]?.value || 'Unknown',
    pageviews: parseInt(row.metricValues?.[0]?.value || '0'),
    avgTimeOnPage: Math.round(parseFloat(row.metricValues?.[1]?.value || '0')),
  }));

  // Parse devices
  const totalDeviceSessions = (devicesResponse.rows || []).reduce(
    (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'),
    0
  );
  const devices = (devicesResponse.rows || []).map((row) => {
    const deviceSessions = parseInt(row.metricValues?.[0]?.value || '0');
    const deviceName = row.dimensionValues?.[0]?.value || 'Unknown';
    return {
      device: deviceName.charAt(0).toUpperCase() + deviceName.slice(1),
      sessions: deviceSessions,
      percentage: totalDeviceSessions > 0
        ? Math.round((deviceSessions / totalDeviceSessions) * 100)
        : 0,
    };
  });

  return {
    overview: {
      totalUsers,
      newUsers,
      returningUsers: totalUsers - newUsers,
      sessions,
      pageviews,
      avgSessionDuration,
      bounceRate,
      engagementRate,
    },
    sessionsOverTime,
    trafficSources,
    topPages,
    devices,
    countries: [], // Would need additional API call
  };
}
