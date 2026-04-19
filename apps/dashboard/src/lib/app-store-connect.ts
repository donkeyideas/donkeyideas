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
async function ascFetch(endpoint: string, token: string, method = 'GET', body?: any): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${ASC_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`ASC API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  return response.json();
}

// Fetch gzip-compressed report from URL
// Note: S3 pre-signed URLs must NOT include an Authorization header
async function fetchReport(url: string): Promise<string> {
  const response = await fetch(url);

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
function getDateRange(range: string, dateFrom?: string, dateTo?: string): { startDate: string; endDate: string } {
  if (range === 'custom' && dateFrom && dateTo) {
    return { startDate: dateFrom, endDate: dateTo };
  }

  const end = new Date();
  const start = new Date();
  switch (range) {
    case '7d': start.setDate(end.getDate() - 7); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    case 'all': start.setFullYear(end.getFullYear() - 3); break;
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

// Fetch a single daily sales report (returns gzip TSV, NOT JSON)
async function fetchSalesReportForDate(
  token: string,
  vendorNumber: string,
  date: string  // YYYY-MM-DD
): Promise<string | null> {
  const dateFormatted = date.replace(/-/g, '');
  const url = `${ASC_BASE_URL}/salesReports?filter[reportType]=SALES&filter[reportSubType]=SUMMARY&filter[frequency]=DAILY&filter[reportDate]=${dateFormatted}&filter[vendorNumber]=${vendorNumber}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/a-gzip, application/json',
    },
    cache: 'no-store',
  });

  // 404 = no data for this date (normal for recent dates or dates with no sales)
  if (response.status === 404) return null;

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Sales report ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) return null;

  // Decompress gzip if needed
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return gunzipSync(buffer).toString('utf-8');
  }

  return buffer.toString('utf-8');
}

// Parse a sales report TSV and extract units for a specific app
function parseSalesReportForApp(
  tsv: string,
  appleId: string
): { units: number; devices: Record<string, number> } {
  const lines = tsv.trim().split('\n');
  if (lines.length < 2) return { units: 0, devices: {} };

  const headers = lines[0].split('\t');
  const appleIdIdx = headers.indexOf('Apple Identifier');
  const unitsIdx = headers.indexOf('Units');
  const typeIdx = headers.indexOf('Product Type Identifier');
  const deviceIdx = headers.indexOf('Device');

  let totalUnits = 0;
  const devices: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');

    // Filter by Apple ID (the numeric app ID)
    if (appleIdIdx >= 0 && cols[appleIdIdx]?.trim() !== appleId) continue;

    // Only count app downloads (not IAP, subscriptions, etc.)
    const productType = typeIdx >= 0 ? cols[typeIdx]?.trim() : '';
    if (productType && !['1', '1F', '1T', 'F1', '1-B'].includes(productType)) continue;

    const units = unitsIdx >= 0 ? parseInt(cols[unitsIdx] || '0') : 0;
    totalUnits += units;

    const device = deviceIdx >= 0 ? cols[deviceIdx]?.trim() || 'Unknown' : 'Unknown';
    devices[device] = (devices[device] || 0) + units;
  }

  return { units: totalUnits, devices };
}

// Fetch sales data for a specific app across a date range
async function fetchSalesData(
  appAppleId: string,
  token: string,
  vendorNumber: string,
  startDate: string,
  endDate: string
): Promise<{
  timeSeries: { date: string; installs: number; uninstalls: number; updates: number; activeDevices: number }[];
  totalInstalls: number;
  dailyInstalls: number;
  deviceBreakdown: { device: string; count: number }[];
}> {
  const timeSeries: any[] = [];
  let totalInstalls = 0;
  const deviceTotals: Record<string, number> = {};

  // Apple reports have ~2 day delay
  const reportEnd = new Date(endDate);
  reportEnd.setDate(reportEnd.getDate() - 2);

  const reportStart = new Date(startDate);
  if (reportStart > reportEnd) {
    return { timeSeries: [], totalInstalls: 0, dailyInstalls: 0, deviceBreakdown: [] };
  }

  // Limit to last 14 days to avoid too many API calls
  const maxDays = 14;
  const fetchStart = new Date(
    Math.max(reportStart.getTime(), reportEnd.getTime() - maxDays * 86400000)
  );

  // Fetch all daily reports in parallel
  const datePromises: Promise<{ date: string; content: string | null }>[] = [];

  for (let d = new Date(fetchStart); d <= reportEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    datePromises.push(
      fetchSalesReportForDate(token, vendorNumber, dateStr)
        .then(content => ({ date: dateStr, content }))
        .catch(() => ({ date: dateStr, content: null }))
    );
  }

  const results = await Promise.all(datePromises);

  for (const { date, content } of results) {
    if (!content) {
      // Include zero-data days in time series for chart continuity
      timeSeries.push({ date, installs: 0, uninstalls: 0, updates: 0, activeDevices: 0 });
      continue;
    }

    const { units, devices } = parseSalesReportForApp(content, appAppleId);
    totalInstalls += units;
    timeSeries.push({ date, installs: units, uninstalls: 0, updates: 0, activeDevices: 0 });

    for (const [device, count] of Object.entries(devices)) {
      deviceTotals[device] = (deviceTotals[device] || 0) + count;
    }
  }

  // Sort by date
  timeSeries.sort((a: any, b: any) => a.date.localeCompare(b.date));

  const dailyInstalls = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].installs : 0;
  const deviceBreakdown = Object.entries(deviceTotals)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  return { timeSeries, totalInstalls, dailyInstalls, deviceBreakdown };
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
export async function fetchAppStoreData(bundleId: string, dateRange: string, dateFrom?: string, dateTo?: string) {
  const token = await generateASCToken();
  if (!token) {
    throw new Error('App Store Connect credentials not configured');
  }

  const app = await getAppByBundleId(bundleId, token);
  if (!app) {
    throw new Error(`App not found for bundle ID: ${bundleId}`);
  }

  const { startDate, endDate } = getDateRange(dateRange, dateFrom, dateTo);

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

  // Try to get install data
  let installTimeSeries: any[] = [];
  let totalInstalls = 0;
  let dailyInstalls = 0;
  let activeDevices = 0;
  let deviceBreakdown: { device: string; count: number }[] = [];

  // Strategy 1: Sales Reports API (requires ASC_VENDOR_NUMBER, most reliable)
  const vendorNumber = process.env.ASC_VENDOR_NUMBER;
  if (vendorNumber) {
    try {
      console.log('[ASC] Trying Sales Reports API with vendor number');
      const salesData = await fetchSalesData(app.id, token, vendorNumber, startDate, endDate);
      installTimeSeries = salesData.timeSeries;
      totalInstalls = salesData.totalInstalls;
      dailyInstalls = salesData.dailyInstalls;
      deviceBreakdown = salesData.deviceBreakdown;
      console.log(`[ASC] Sales Reports: ${totalInstalls} total installs from ${installTimeSeries.length} days`);
    } catch (e: any) {
      console.log('[ASC] Sales Reports not available:', e.message);
    }
  }

  // Strategy 2: Analytics Reports API (async, may not have data yet)
  if (installTimeSeries.length === 0 || totalInstalls === 0) {
    try {
      const analyticsData = await fetchAnalyticsData(app.id, token, startDate, endDate);
      if (analyticsData.totalInstalls > 0) {
        installTimeSeries = analyticsData.timeSeries;
        totalInstalls = analyticsData.totalInstalls;
        dailyInstalls = analyticsData.dailyInstalls;
        activeDevices = analyticsData.activeDevices;
        console.log(`[ASC] Analytics Reports: ${totalInstalls} total installs`);
      }
    } catch (e: any) {
      console.log('[ASC] Analytics data not available:', e.message);
    }
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
      crashRate: 0,
      anrRate: 0,
      slowStartRate: 0,
      slowRenderingRate: 0,
      activeDevices,
      averageRating,
      totalReviews: reviews.length,
      totalInstalls,
      dailyInstalls,
      dailyUninstalls: 0,
      dailyUpdates: 0,
    },
    vitalsTimeSeries: [],
    installTimeSeries,
    storeListing,
    ratingDistribution,
    reviews,
    deviceBreakdown: deviceBreakdown.map(d => ({
      device: d.device,
      percentage: totalInstalls > 0 ? Math.round((d.count / totalInstalls) * 100) : 0,
      count: d.count,
    })),
    versionBreakdown: [],
    errorIssues: [],
  };
}

// Find or create analytics report requests for an app
// Returns { ongoingId, snapshotId } — either or both may be set
async function findOrCreateReportRequests(appId: string, token: string): Promise<{ ongoingId: string | null; snapshotId: string | null }> {
  let ongoingId: string | null = null;
  let snapshotId: string | null = null;

  // Use app-scoped endpoint to find existing report requests
  try {
    const existing = await ascFetch(`/apps/${appId}/analyticsReportRequests`, token);
    const requests = existing.data || [];
    for (const req of requests) {
      const accessType = req.attributes?.accessType;
      if (accessType === 'ONGOING' && !ongoingId) {
        ongoingId = req.id;
        console.log(`[ASC] Found existing ONGOING request: ${req.id}`);
      }
      if (accessType === 'ONE_TIME_SNAPSHOT' && !snapshotId) {
        snapshotId = req.id;
        console.log(`[ASC] Found existing ONE_TIME_SNAPSHOT request: ${req.id}`);
      }
    }
  } catch (e: any) {
    console.log('[ASC] App-scoped report request lookup failed:', e.message);
  }

  // Create ONGOING if not found (for future data)
  if (!ongoingId) {
    try {
      console.log(`[ASC] Creating ONGOING report request for app ${appId}`);
      const created = await ascFetch('/analyticsReportRequests', token, 'POST', {
        data: {
          type: 'analyticsReportRequests',
          attributes: { accessType: 'ONGOING' },
          relationships: { app: { data: { type: 'apps', id: appId } } }
        }
      });
      ongoingId = created.data?.id || null;
    } catch (e: any) {
      if (e.message?.includes('409')) {
        // Already exists — retry lookup
        try {
          const retry = await ascFetch(`/apps/${appId}/analyticsReportRequests`, token);
          for (const req of (retry.data || [])) {
            if (req.attributes?.accessType === 'ONGOING') { ongoingId = req.id; break; }
          }
        } catch { /* ignore */ }
      }
      console.log('[ASC] ONGOING request create:', e.message);
    }
  }

  // Create ONE_TIME_SNAPSHOT if not found (for historical data!)
  if (!snapshotId) {
    try {
      console.log(`[ASC] Creating ONE_TIME_SNAPSHOT report request for app ${appId}`);
      const created = await ascFetch('/analyticsReportRequests', token, 'POST', {
        data: {
          type: 'analyticsReportRequests',
          attributes: { accessType: 'ONE_TIME_SNAPSHOT' },
          relationships: { app: { data: { type: 'apps', id: appId } } }
        }
      });
      snapshotId = created.data?.id || null;
      console.log(`[ASC] Created ONE_TIME_SNAPSHOT request: ${snapshotId}`);
    } catch (e: any) {
      if (e.message?.includes('409')) {
        try {
          const retry = await ascFetch(`/apps/${appId}/analyticsReportRequests`, token);
          for (const req of (retry.data || [])) {
            if (req.attributes?.accessType === 'ONE_TIME_SNAPSHOT') { snapshotId = req.id; break; }
          }
        } catch { /* ignore */ }
      }
      console.log('[ASC] ONE_TIME_SNAPSHOT request create:', e.message);
    }
  }

  return { ongoingId, snapshotId };
}

// Report names we care about, in priority order per category
const PREFERRED_REPORTS: Record<string, string[]> = {
  APP_USAGE: ['App Store Installation and Deletion', 'App Sessions'],
  COMMERCE: ['App Downloads'],
  APP_STORE_ENGAGEMENT: ['App Store Discovery and Engagement'],
};

// Navigate the analytics report hierarchy to download a report CSV
async function downloadAnalyticsReport(
  requestId: string,
  category: string,
  token: string
): Promise<string | null> {
  // Step 1: Get reports for this request, filtered by category
  const reportsData = await ascFetch(
    `/analyticsReportRequests/${requestId}/reports?filter[category]=${category}`,
    token
  );
  const reports = reportsData.data || [];
  console.log(`[ASC] Found ${reports.length} reports for category ${category}`);

  if (reports.length === 0) return null;

  // Sort reports: preferred names first ("Standard" before "Detailed"), others last
  const preferred = PREFERRED_REPORTS[category] || [];
  const sortedReports = [...reports].sort((a: any, b: any) => {
    const nameA = a.attributes?.name || '';
    const nameB = b.attributes?.name || '';
    const prefA = preferred.findIndex(p => nameA.includes(p));
    const prefB = preferred.findIndex(p => nameB.includes(p));
    const scoreA = prefA >= 0 ? prefA : 999;
    const scoreB = prefB >= 0 ? prefB : 999;
    if (scoreA !== scoreB) return scoreA - scoreB;
    // Prefer "Standard" over "Detailed" (less data to download)
    if (nameA.includes('Standard') && !nameB.includes('Standard')) return -1;
    if (!nameA.includes('Standard') && nameB.includes('Standard')) return 1;
    return 0;
  });

  // Try each report to find one with data
  for (const report of sortedReports) {
    const reportName = report.attributes?.name || 'unknown';

    // Skip irrelevant reports (e.g., "Shortcut App Usage" in APP_USAGE)
    if (preferred.length > 0 && !preferred.some(p => reportName.includes(p))) {
      continue;
    }

    console.log(`[ASC] Processing report: ${reportName} (${report.id})`);

    // Step 2: Get instances for this report
    const instancesUrl = report.relationships?.instances?.links?.related;
    if (!instancesUrl) continue;

    const instancesData = await ascFetch(instancesUrl, token);
    const instances = instancesData.data || [];
    console.log(`[ASC] Found ${instances.length} instances for report ${reportName}`);

    if (instances.length === 0) continue;

    // Get the latest instance
    const latest = instances[instances.length - 1];
    console.log(`[ASC] Using instance: ${latest.id} (date: ${latest.attributes?.processingDate || 'unknown'})`);

    // Step 3: Get segments for this instance
    const segmentsUrl = latest.relationships?.segments?.links?.related;
    if (!segmentsUrl) continue;

    const segmentsData = await ascFetch(segmentsUrl, token);
    const segments = segmentsData.data || [];
    console.log(`[ASC] Found ${segments.length} segments`);

    if (segments.length === 0) continue;

    // Step 4: Download the segment file
    const fileUrl = segments[0].attributes?.url;
    if (!fileUrl) continue;

    console.log(`[ASC] Downloading report from: ${fileUrl.slice(0, 80)}...`);
    const content = await fetchReport(fileUrl);
    console.log(`[ASC] Downloaded ${content.length} chars, first line: ${content.split('\n')[0]?.slice(0, 100)}`);
    return content;
  }

  return null;
}

// Fetch analytics data using the Analytics Reports API
// Tries both ONGOING and ONE_TIME_SNAPSHOT requests
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
  const defaults = { timeSeries: [], totalInstalls: 0, dailyInstalls: 0, activeDevices: 0 };

  try {
    const { ongoingId, snapshotId } = await findOrCreateReportRequests(appId, token);

    // Try each request ID (snapshot first since it has historical data)
    const requestIds = [snapshotId, ongoingId].filter(Boolean) as string[];
    if (requestIds.length === 0) {
      console.log('[ASC] No report requests available');
      return defaults;
    }

    for (const requestId of requestIds) {
      console.log(`[ASC] Trying request ${requestId}`);
      // Try APP_USAGE first (Installation and Deletion reports), then COMMERCE (App Downloads)
      for (const category of ['APP_USAGE', 'COMMERCE']) {
        const csvContent = await downloadAnalyticsReport(requestId, category, token);
        if (csvContent) {
          console.log(`[ASC] Got analytics data from ${category} category (request: ${requestId})`);
          return parseAnalyticsCSV(csvContent, startDate, endDate);
        }
      }
    }

    console.log('[ASC] No analytics report data available yet');
    return defaults;
  } catch (e: any) {
    console.error('[ASC] Analytics data fetch failed:', e.message);
    return defaults;
  }
}

// Parse analytics CSV from Apple
// Apple's format uses dimensional rows with a "Counts" column:
//   Date \t App Name \t App Apple Identifier \t Download Type \t ... \t Counts
//   2026-04-14 \t BASKETBALL \t 6760516741 \t First-time download \t ... \t 1
// We aggregate the Counts column by date, optionally filtering by Download Type.
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
  const dateIdx = headers.findIndex((h) => h.toLowerCase() === 'date');
  const countsIdx = headers.findIndex((h) => h.toLowerCase() === 'counts');
  const downloadTypeIdx = headers.findIndex((h) => h.toLowerCase() === 'download type');
  const activeIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('active') && h.toLowerCase().includes('device')
  );

  // If no "Counts" column, fall back to looking for numeric-named columns
  const valueIdx = countsIdx >= 0 ? countsIdx : headers.findIndex((h) =>
    h.toLowerCase().includes('installation') || h.toLowerCase() === 'units'
  );

  if (valueIdx < 0) {
    console.log(`[ASC] parseAnalyticsCSV: Could not find Counts column. Headers: ${headers.join(', ')}`);
    return { timeSeries: [], totalInstalls: 0, dailyInstalls: 0, activeDevices: 0 };
  }

  // Aggregate counts by date (multiple rows per date due to dimensional breakdown)
  const dailyMap: Record<string, { installs: number; activeDevices: number }> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : '';

    if (!date || date < startDate || date > endDate) continue;

    // For COMMERCE reports with Download Type, only count first-time downloads
    if (downloadTypeIdx >= 0) {
      const dlType = cols[downloadTypeIdx]?.trim().toLowerCase() || '';
      if (dlType && !dlType.includes('first') && !dlType.includes('download')) continue;
    }

    const count = parseInt(cols[valueIdx] || '0') || 0;
    const active = activeIdx >= 0 ? (parseInt(cols[activeIdx] || '0') || 0) : 0;

    if (!dailyMap[date]) dailyMap[date] = { installs: 0, activeDevices: 0 };
    dailyMap[date].installs += count;
    dailyMap[date].activeDevices = Math.max(dailyMap[date].activeDevices, active);
  }

  const timeSeries = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      installs: data.installs,
      uninstalls: 0,
      updates: 0,
      activeDevices: data.activeDevices,
    }));

  const totalInstalls = timeSeries.reduce((sum, d) => sum + d.installs, 0);
  const latestDaily = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].installs : 0;
  const latestActive = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].activeDevices : 0;

  console.log(`[ASC] parseAnalyticsCSV: ${timeSeries.length} days, ${totalInstalls} total installs`);
  return { timeSeries, totalInstalls, dailyInstalls: latestDaily, activeDevices: latestActive };
}

// Fetch App Store engagement metrics (impressions, page views)
async function fetchStoreMetrics(
  appId: string,
  token: string,
  startDate: string,
  endDate: string
): Promise<{ visitors: number; acquisitions: number; conversionRate: number }> {
  const defaults = { visitors: 0, acquisitions: 0, conversionRate: 0 };

  try {
    const { ongoingId, snapshotId } = await findOrCreateReportRequests(appId, token);
    const requestIds = [snapshotId, ongoingId].filter(Boolean) as string[];
    if (requestIds.length === 0) return defaults;

    for (const requestId of requestIds) {
      const csvContent = await downloadAnalyticsReport(requestId, 'APP_STORE_ENGAGEMENT', token);
      if (csvContent) {
        return parseStoreEngagementCSV(csvContent, startDate, endDate);
      }
    }

    console.log('[ASC] No APP_STORE_ENGAGEMENT report data available yet');
    return defaults;
  } catch (e: any) {
    console.log('[ASC] Store engagement data not available:', e.message);
    return defaults;
  }
}

// Parse store engagement CSV
// Apple's format uses dimensional rows with Event + Counts columns:
//   Date \t App Name \t App Apple Identifier \t Event \t ... \t Counts \t Unique Counts
//   2026-04-14 \t BASKETBALL \t 6760516741 \t Impression \t ... \t 5 \t 3
// We filter by Event type and sum the Counts column.
function parseStoreEngagementCSV(
  content: string,
  startDate: string,
  endDate: string
): { visitors: number; acquisitions: number; conversionRate: number } {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { visitors: 0, acquisitions: 0, conversionRate: 0 };

  const headers = lines[0].split('\t').map((h) => h.trim());
  const dateIdx = headers.findIndex((h) => h.toLowerCase() === 'date');
  const eventIdx = headers.findIndex((h) => h.toLowerCase() === 'event');
  const countsIdx = headers.findIndex((h) => h.toLowerCase() === 'counts');
  const uniqueCountsIdx = headers.findIndex((h) => h.toLowerCase() === 'unique counts');

  // Use unique counts if available (better metric for "visitors"), otherwise counts
  const valueIdx = uniqueCountsIdx >= 0 ? uniqueCountsIdx : countsIdx;

  if (valueIdx < 0) {
    console.log(`[ASC] parseStoreEngagementCSV: No Counts column. Headers: ${headers.join(', ')}`);
    return { visitors: 0, acquisitions: 0, conversionRate: 0 };
  }

  let totalImpressions = 0;
  let totalTaps = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const date = dateIdx >= 0 ? cols[dateIdx]?.trim() : '';

    if (date && (date < startDate || date > endDate)) continue;

    const event = eventIdx >= 0 ? cols[eventIdx]?.trim().toLowerCase() : '';
    const count = parseInt(cols[valueIdx] || '0') || 0;

    if (event.includes('impression')) {
      totalImpressions += count;
    } else if (event.includes('tap') || event.includes('product page view')) {
      totalTaps += count;
    }
  }

  // Visitors = impressions, Acquisitions = taps (product page views)
  const conversionRate = totalImpressions > 0
    ? Math.round((totalTaps / totalImpressions) * 10000) / 100
    : 0;

  console.log(`[ASC] parseStoreEngagementCSV: ${totalImpressions} impressions, ${totalTaps} taps`);
  return { visitors: totalImpressions, acquisitions: totalTaps, conversionRate };
}
