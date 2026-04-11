import { SignJWT, importPKCS8 } from 'jose';
import { gunzipSync } from 'zlib';

const ASC_BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

// Generate JWT for App Store Connect API using jose (ES256)
async function generateASCToken(): Promise<string | null> {
  const keyId = process.env.ASC_KEY_ID;
  const issuerId = process.env.ASC_ISSUER_ID;
  const privateKeyPem = process.env.ASC_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!keyId || !issuerId || !privateKeyPem) return null;

  const privateKey = await importPKCS8(privateKeyPem, 'ES256');

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60)
    .setAudience('appstoreconnect-v1')
    .sign(privateKey);

  return token;
}

// Make authenticated request to App Store Connect API
async function ascFetch(endpoint: string, token: string): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${ASC_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`ASC API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  return response.json();
}

// Fetch gzip-compressed report from URL
async function fetchReport(url: string, token: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Report download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Check for gzip
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return gunzipSync(buffer).toString('utf-8');
  }
  return buffer.toString('utf-8');
}

// Check if ASC credentials are configured
export function hasASCCredentials(): boolean {
  return !!(process.env.ASC_KEY_ID && process.env.ASC_ISSUER_ID && process.env.ASC_PRIVATE_KEY);
}

// Look up app ID from bundle ID
async function getAppByBundleId(bundleId: string, token: string): Promise<{ id: string; name: string } | null> {
  try {
    const data = await ascFetch(`/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId`, token);
    const app = data.data?.[0];
    if (!app) return null;
    return { id: app.id, name: app.attributes?.name || bundleId };
  } catch (e: any) {
    console.error(`[ASC] Failed to look up app ${bundleId}:`, e.message);
    return null;
  }
}

// Calculate date range
function getDateRange(range: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case '7d': start.setDate(end.getDate() - 7); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    default: start.setDate(end.getDate() - 30); break;
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// Fetch customer reviews
async function fetchReviews(appId: string, token: string) {
  try {
    const data = await ascFetch(
      `/apps/${appId}/customerReviews?sort=-createdDate&limit=50&fields[customerReviews]=rating,title,body,reviewerNickname,createdDate,territory`,
      token
    );
    return (data.data || []).map((review: any) => ({
      reviewId: review.id,
      authorName: review.attributes?.reviewerNickname || 'Anonymous',
      starRating: review.attributes?.rating || 0,
      text: [review.attributes?.title, review.attributes?.body].filter(Boolean).join(' - '),
      device: review.attributes?.territory || '',
      androidOsVersion: '', // N/A for iOS
      appVersionCode: 0,
      appVersionName: '',
      lastModified: review.attributes?.createdDate || new Date().toISOString(),
      hasReply: false,
      replyText: null,
    }));
  } catch (e: any) {
    console.error('[ASC] Failed to fetch reviews:', e.message);
    return [];
  }
}

// Fetch sales reports (daily) for install data
async function fetchSalesReports(
  token: string,
  vendorNumber: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; units: number; device: string }[]> {
  const rows: { date: string; units: number; device: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Sales reports are available per day, fetch last few days
  // Apple reports have a ~2 day delay
  const reportEnd = new Date(end);
  reportEnd.setDate(reportEnd.getDate() - 2);

  const reportStart = new Date(start);
  if (reportStart > reportEnd) return rows;

  // Fetch weekly summary instead of daily to reduce API calls
  try {
    const dateStr = reportEnd.toISOString().split('T')[0].replace(/-/g, '');
    const data = await ascFetch(
      `/salesReports?filter[reportType]=SALES&filter[reportSubType]=SUMMARY&filter[frequency]=WEEKLY&filter[reportDate]=${dateStr}&filter[vendorNumber]=${vendorNumber}`,
      token
    );

    // Sales reports return gzip TSV
    if (data) {
      const content = typeof data === 'string' ? data : JSON.stringify(data);
      parseSalesTSV(content, rows);
    }
  } catch (e: any) {
    console.log('[ASC] Sales report not available:', e.message);
  }

  return rows;
}

// Parse TSV sales report
function parseSalesTSV(content: string, rows: { date: string; units: number; device: string }[]) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return;

  const headers = lines[0].split('\t');
  const dateIdx = headers.indexOf('Begin Date');
  const unitsIdx = headers.indexOf('Units');
  const deviceIdx = headers.indexOf('Device');
  const typeIdx = headers.indexOf('Product Type Identifier');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const productType = typeIdx >= 0 ? cols[typeIdx] : '';

    // Only count app downloads (not IAP)
    if (productType && !['1', '1F', '1T', 'F1', '1-B'].includes(productType)) continue;

    const dateRaw = dateIdx >= 0 ? cols[dateIdx] : '';
    const units = unitsIdx >= 0 ? parseInt(cols[unitsIdx] || '0') : 0;
    const device = deviceIdx >= 0 ? cols[deviceIdx] || '' : '';

    if (dateRaw && units) {
      // Convert MM/DD/YYYY to YYYY-MM-DD
      const parts = dateRaw.split('/');
      const date = parts.length === 3
        ? `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
        : dateRaw;
      rows.push({ date, units, device });
    }
  }
}

// Fetch performance metrics (crashes)
async function fetchPerfMetrics(appId: string, token: string) {
  try {
    const data = await ascFetch(
      `/apps/${appId}/perfPowerMetrics?filter[metricType]=HANG_RATE,LAUNCH_TIME,DISK&filter[platform]=IOS`,
      token
    );
    return data.data || [];
  } catch (e: any) {
    console.log('[ASC] Perf metrics not available:', e.message);
    return [];
  }
}

// Main fetch function — mirrors fetchPlayStoreData return shape
export async function fetchAppStoreData(bundleId: string, dateRange: string) {
  const token = await generateASCToken();
  if (!token) {
    throw new Error('App Store Connect credentials not configured');
  }

  const app = await getAppByBundleId(bundleId, token);
  if (!app) {
    throw new Error(`App not found for bundle ID: ${bundleId}`);
  }

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch all data in parallel
  const [reviews, perfMetrics] = await Promise.all([
    fetchReviews(app.id, token),
    fetchPerfMetrics(app.id, token),
  ]);

  // Calculate rating stats from reviews
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  reviews.forEach((r: any) => {
    const rating = Math.round(r.starRating);
    if (rating >= 1 && rating <= 5) distribution[rating]++;
  });
  const totalRatings = Object.values(distribution).reduce((a, b) => a + b, 0);
  const weightedSum = Object.entries(distribution).reduce(
    (sum, [star, count]) => sum + parseInt(star) * count, 0
  );
  const averageRating = totalRatings > 0
    ? Math.round((weightedSum / totalRatings) * 10) / 10
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution[star],
    percentage: totalRatings > 0 ? Math.round((distribution[star] / totalRatings) * 100) : 0,
  }));

  // Try to get install data from Analytics Reports API
  let installTimeSeries: any[] = [];
  let totalInstalls = 0;
  let dailyInstalls = 0;
  let activeDevices = 0;

  try {
    const analyticsData = await fetchAnalyticsData(app.id, token, startDate, endDate);
    installTimeSeries = analyticsData.timeSeries;
    totalInstalls = analyticsData.totalInstalls;
    dailyInstalls = analyticsData.dailyInstalls;
    activeDevices = analyticsData.activeDevices;
  } catch (e: any) {
    console.log('[ASC] Analytics data not available:', e.message);
  }

  // Try store listing metrics
  let storeListing = { visitors: 0, acquisitions: 0, conversionRate: 0 };
  try {
    const storeData = await fetchStoreMetrics(app.id, token, startDate, endDate);
    storeListing = storeData;
  } catch (e: any) {
    console.log('[ASC] Store metrics not available:', e.message);
  }

  return {
    overview: {
      crashRate: 0, // Will be populated if perf metrics available
      anrRate: 0,   // iOS doesn't have ANR, map to hang rate
      slowStartRate: 0,
      slowRenderingRate: 0,
      activeDevices,
      averageRating,
      totalReviews: reviews.length,
      totalInstalls,
      dailyInstalls,
      dailyUninstalls: 0, // Apple doesn't expose uninstalls
      dailyUpdates: 0,
    },
    vitalsTimeSeries: [],
    installTimeSeries,
    storeListing,
    ratingDistribution,
    reviews,
    deviceBreakdown: [],
    versionBreakdown: [],
    errorIssues: [],
  };
}

// Fetch analytics data using the Analytics Reports API
async function fetchAnalyticsData(
  appId: string,
  token: string,
  startDate: string,
  endDate: string
): Promise<{
  timeSeries: any[];
  totalInstalls: number;
  dailyInstalls: number;
  activeDevices: number;
}> {
  // Try creating an analytics report request
  try {
    // Request app usage report
    const reportRequest = await ascFetch('/analyticsReportRequests', token);
    const requests = reportRequest.data || [];

    // Look for existing completed report
    for (const req of requests) {
      if (req.attributes?.accessType === 'ONGOING') {
        // Get report instances
        const instancesUrl = req.relationships?.reports?.links?.related;
        if (instancesUrl) {
          const instancesData = await ascFetch(instancesUrl, token);
          const reports = instancesData.data || [];

          for (const report of reports) {
            if (report.attributes?.category === 'APP_USAGE') {
              const segmentsUrl = report.relationships?.instances?.links?.related;
              if (segmentsUrl) {
                const segments = await ascFetch(segmentsUrl, token);
                // Process segments for install data
                const instances = segments.data || [];
                if (instances.length > 0) {
                  // Download and parse the latest instance
                  const latest = instances[instances.length - 1];
                  const downloadUrl = latest.relationships?.segments?.links?.related;
                  if (downloadUrl) {
                    const segmentData = await ascFetch(downloadUrl, token);
                    const segmentItems = segmentData.data || [];
                    if (segmentItems.length > 0) {
                      const fileUrl = segmentItems[0].attributes?.url;
                      if (fileUrl) {
                        const csvContent = await fetchReport(fileUrl, token);
                        return parseAnalyticsCSV(csvContent, startDate, endDate);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.log('[ASC] Analytics report request failed:', e.message);
  }

  return { timeSeries: [], totalInstalls: 0, dailyInstalls: 0, activeDevices: 0 };
}

// Parse analytics CSV from Apple
function parseAnalyticsCSV(
  content: string,
  startDate: string,
  endDate: string
): {
  timeSeries: any[];
  totalInstalls: number;
  dailyInstalls: number;
  activeDevices: number;
} {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { timeSeries: [], totalInstalls: 0, dailyInstalls: 0, activeDevices: 0 };

  const headers = lines[0].split('\t').map((h) => h.trim());
  const dateIdx = headers.findIndex((h) => h.toLowerCase().includes('date'));
  const installIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('installation') || h.toLowerCase().includes('download') || h.toLowerCase().includes('first time')
  );
  const activeIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('active') && h.toLowerCase().includes('device')
  );

  const timeSeries: any[] = [];
  let totalInstalls = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : '';

    if (!date || date < startDate || date > endDate) continue;

    const installs = installIdx >= 0 ? parseInt(cols[installIdx] || '0') : 0;
    const active = activeIdx >= 0 ? parseInt(cols[activeIdx] || '0') : 0;

    totalInstalls += installs;
    timeSeries.push({
      date,
      installs,
      uninstalls: 0,
      updates: 0,
      activeDevices: active,
    });
  }

  const latestDaily = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].installs : 0;
  const latestActive = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].activeDevices : 0;

  return { timeSeries, totalInstalls, dailyInstalls: latestDaily, activeDevices: latestActive };
}

// Fetch App Store engagement metrics (impressions, page views)
async function fetchStoreMetrics(
  appId: string,
  token: string,
  startDate: string,
  endDate: string
): Promise<{ visitors: number; acquisitions: number; conversionRate: number }> {
  // Try the analytics reports API for store engagement
  try {
    const reportRequest = await ascFetch('/analyticsReportRequests', token);
    const requests = reportRequest.data || [];

    for (const req of requests) {
      if (req.attributes?.accessType === 'ONGOING') {
        const reportsUrl = req.relationships?.reports?.links?.related;
        if (reportsUrl) {
          const reportsData = await ascFetch(reportsUrl, token);
          const reports = reportsData.data || [];

          for (const report of reports) {
            if (report.attributes?.category === 'APP_STORE_ENGAGEMENT') {
              const instancesUrl = report.relationships?.instances?.links?.related;
              if (instancesUrl) {
                const instances = await ascFetch(instancesUrl, token);
                const items = instances.data || [];
                if (items.length > 0) {
                  const latest = items[items.length - 1];
                  const segmentsUrl = latest.relationships?.segments?.links?.related;
                  if (segmentsUrl) {
                    const segments = await ascFetch(segmentsUrl, token);
                    const segItems = segments.data || [];
                    if (segItems.length > 0) {
                      const fileUrl = segItems[0].attributes?.url;
                      if (fileUrl) {
                        const csvContent = await fetchReport(fileUrl, token);
                        return parseStoreEngagementCSV(csvContent, startDate, endDate);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.log('[ASC] Store engagement data not available:', e.message);
  }

  return { visitors: 0, acquisitions: 0, conversionRate: 0 };
}

// Parse store engagement CSV
function parseStoreEngagementCSV(
  content: string,
  startDate: string,
  endDate: string
): { visitors: number; acquisitions: number; conversionRate: number } {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { visitors: 0, acquisitions: 0, conversionRate: 0 };

  const headers = lines[0].split('\t').map((h) => h.trim());
  const dateIdx = headers.findIndex((h) => h.toLowerCase().includes('date'));
  const impressionIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('impression') || h.toLowerCase().includes('product page view')
  );
  const downloadIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('download') || h.toLowerCase().includes('conversion')
  );

  let totalVisitors = 0;
  let totalAcquisitions = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : '';

    if (date && (date < startDate || date > endDate)) continue;

    totalVisitors += impressionIdx >= 0 ? parseInt(cols[impressionIdx] || '0') : 0;
    totalAcquisitions += downloadIdx >= 0 ? parseInt(cols[downloadIdx] || '0') : 0;
  }

  const conversionRate = totalVisitors > 0
    ? Math.round((totalAcquisitions / totalVisitors) * 10000) / 100
    : 0;

  return { visitors: totalVisitors, acquisitions: totalAcquisitions, conversionRate };
}
