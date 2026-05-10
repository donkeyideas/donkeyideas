import { google } from 'googleapis';
import { gunzipSync } from 'zlib';

// Initialize Google Play API clients with service account credentials
export function getPlayClients() {
  const clientEmail = process.env.GP_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GP_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/playdeveloperreporting',
      'https://www.googleapis.com/auth/androidpublisher',
      'https://www.googleapis.com/auth/devstorage.read_only',
    ],
  });

  const reporting = google.playdeveloperreporting({ version: 'v1beta1', auth });
  const publisher = google.androidpublisher({ version: 'v3', auth });
  const storage = google.storage({ version: 'v1', auth });

  return { reporting, publisher, storage, auth };
}

// Calculate date range for Play API (ISO format)
export function getPlayDateRange(range: string, dateFrom?: string, dateTo?: string): { startDate: string; endDate: string } {
  if (range === 'custom' && dateFrom && dateTo) {
    return { startDate: dateFrom, endDate: dateTo };
  }

  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'all':
      startDate.setFullYear(endDate.getFullYear() - 3);
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

// Build timeline spec for Play Developer Reporting API
function buildTimelineSpec(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  return {
    startTime: {
      year: startYear,
      month: startMonth,
      day: startDay,
    },
    endTime: {
      year: endYear,
      month: endMonth,
      day: endDay,
    },
    aggregationPeriod: 'DAILY',
  };
}

// Safe number extraction from Play API metric values
function extractMetricValue(row: any, metricIndex: number): number {
  const val = row?.metrics?.[metricIndex]?.decimalValue;
  if (val) return parseFloat(val);
  const val2 = row?.metrics?.[metricIndex]?.decimalValueConfidenceInterval?.lowerBound;
  if (val2) return parseFloat(val2);
  return 0;
}

// Fetch Play Store data for a package
export async function fetchPlayStoreData(packageName: string, dateRange: string, dateFrom?: string, dateTo?: string) {
  const clients = getPlayClients();
  if (!clients) {
    throw new Error('Google Play Console credentials not configured');
  }

  const { reporting, publisher } = clients;
  const { startDate, endDate } = getPlayDateRange(dateRange, dateFrom, dateTo);
  const timelineSpec = buildTimelineSpec(startDate, endDate);
  const parent = `apps/${packageName}`;

  // Fetch all data in parallel with error tolerance
  const [
    crashRateResult,
    anrRateResult,
    slowStartResult,
    slowRenderResult,
    reviewsResult,
    crashByDeviceResult,
    crashByVersionResult,
    errorIssuesResult,
  ] = await Promise.allSettled([
    // 1. Crash rate over time
    reporting.vitals.crashrate.query({
      name: `${parent}/crashRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['crashRate', 'userPerceivedCrashRate', 'distinctUsers'],
        dimensions: [],
      },
    }),

    // 2. ANR rate over time
    reporting.vitals.anrrate.query({
      name: `${parent}/anrRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['anrRate', 'userPerceivedAnrRate', 'distinctUsers'],
        dimensions: [],
      },
    }),

    // 3. Slow start rate
    reporting.vitals.slowstartrate.query({
      name: `${parent}/slowStartRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['slowStartRate', 'distinctUsers'],
        dimensions: [],
      },
    }),

    // 4. Slow rendering rate
    reporting.vitals.slowrenderingrate.query({
      name: `${parent}/slowRenderingRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['slowRenderingRate20Fps', 'distinctUsers'],
        dimensions: [],
      },
    }),

    // 5. Reviews
    publisher.reviews.list({
      packageName,
      maxResults: 50,
    }),

    // 6. Crash rate by device
    reporting.vitals.crashrate.query({
      name: `${parent}/crashRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['crashRate', 'distinctUsers'],
        dimensions: ['deviceModel'],
        pageSize: 10,
      },
    }),

    // 7. Crash rate by version
    reporting.vitals.crashrate.query({
      name: `${parent}/crashRateMetricSet`,
      requestBody: {
        timelineSpec,
        metrics: ['crashRate', 'distinctUsers'],
        dimensions: ['versionCode'],
        pageSize: 10,
      },
    }),

    // 8. Error issues
    reporting.vitals.errors.issues.search({
      parent,
      pageSize: 10,
    }),
  ]);

  // Parse crash rate time series
  const crashTimeSeries = parseCrashRateTimeSeries(crashRateResult);
  const anrTimeSeries = parseAnrRateTimeSeries(anrRateResult);

  // Parse overview KPIs (latest data points)
  const latestCrash = getLatestValue(crashTimeSeries, 'crashRate');
  const latestAnr = getLatestValue(anrTimeSeries, 'anrRate');
  const latestSlowStart = parseLatestMetric(slowStartResult, 'slowStartRate');
  const latestSlowRender = parseLatestMetric(slowRenderResult, 'slowRenderingRate');
  const activeDevices = parseActiveDevices(crashRateResult);

  // Parse reviews
  const reviews = parseReviews(reviewsResult);
  const { averageRating, ratingDistribution } = calculateRatingStats(reviews);

  // Parse breakdowns
  const deviceBreakdown = parseDeviceBreakdown(crashByDeviceResult);
  const versionBreakdown = parseVersionBreakdown(crashByVersionResult);

  // Parse error issues
  const errorIssues = parseErrorIssues(errorIssuesResult);

  // Build vitals time series (merged crash + ANR)
  const vitalsTimeSeries = mergeTimeSeries(crashTimeSeries, anrTimeSeries);

  // Fetch GCS install/store reports if bucket configured
  const gcsData = await fetchGCSReports(packageName, dateRange, dateFrom, dateTo);

  return {
    overview: {
      crashRate: latestCrash,
      anrRate: latestAnr,
      slowStartRate: latestSlowStart,
      slowRenderingRate: latestSlowRender,
      activeDevices: gcsData?.overview?.activeDeviceInstalls || activeDevices,
      averageRating,
      totalReviews: reviews.length,
      // New GCS metrics
      totalInstalls: gcsData?.overview?.totalInstalls || 0,
      dailyInstalls: gcsData?.overview?.dailyInstalls || 0,
      dailyUninstalls: gcsData?.overview?.dailyUninstalls || 0,
      dailyUpdates: gcsData?.overview?.dailyUpdates || 0,
    },
    vitalsTimeSeries,
    installTimeSeries: gcsData?.installTimeSeries || [],
    storeListing: gcsData?.storeListing || { visitors: 0, acquisitions: 0, conversionRate: 0 },
    ratingDistribution,
    reviews,
    deviceBreakdown,
    versionBreakdown,
    errorIssues,
  };
}

// Parse crash rate time series from API response
function parseCrashRateTimeSeries(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const rows = result.value?.data?.rows || [];
  return rows.map((row: any) => ({
    date: formatTimelineDate(row.startTime),
    crashRate: extractMetricValue(row, 0) * 100,
    userPerceivedCrashRate: extractMetricValue(row, 1) * 100,
    distinctUsers: extractMetricValue(row, 2),
  }));
}

// Parse ANR rate time series
function parseAnrRateTimeSeries(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const rows = result.value?.data?.rows || [];
  return rows.map((row: any) => ({
    date: formatTimelineDate(row.startTime),
    anrRate: extractMetricValue(row, 0) * 100,
    userPerceivedAnrRate: extractMetricValue(row, 1) * 100,
    distinctUsers: extractMetricValue(row, 2),
  }));
}

// Format timeline date object to YYYY-MM-DD string
function formatTimelineDate(timeObj: any): string {
  if (!timeObj) return '';
  const y = timeObj.year || 0;
  const m = String(timeObj.month || 1).padStart(2, '0');
  const d = String(timeObj.day || 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get latest value from time series
function getLatestValue(timeSeries: any[], key: string): number {
  if (!timeSeries.length) return 0;
  return timeSeries[timeSeries.length - 1]?.[key] || 0;
}

// Parse latest metric value from a result
function parseLatestMetric(result: PromiseSettledResult<any>, _key: string): number {
  if (result.status !== 'fulfilled') return 0;
  const rows = result.value?.data?.rows || [];
  if (!rows.length) return 0;
  const lastRow = rows[rows.length - 1];
  return extractMetricValue(lastRow, 0) * 100;
}

// Parse active devices count
function parseActiveDevices(result: PromiseSettledResult<any>): number {
  if (result.status !== 'fulfilled') return 0;
  const rows = result.value?.data?.rows || [];
  if (!rows.length) return 0;
  const lastRow = rows[rows.length - 1];
  return Math.round(extractMetricValue(lastRow, 2));
}

// Parse reviews from publisher API
function parseReviews(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const reviews = result.value?.data?.reviews || [];
  return reviews.map((review: any) => {
    const comment = review.comments?.[0]?.userComment;
    const devReply = review.comments?.[1]?.developerComment;
    return {
      reviewId: review.reviewId,
      authorName: review.authorName || 'Anonymous',
      starRating: comment?.starRating || 0,
      text: comment?.text || '',
      device: comment?.device || '',
      androidOsVersion: comment?.androidOsVersion || '',
      appVersionCode: comment?.appVersionCode || 0,
      appVersionName: comment?.appVersionName || '',
      lastModified: comment?.lastModified?.seconds
        ? new Date(parseInt(comment.lastModified.seconds) * 1000).toISOString()
        : new Date().toISOString(),
      hasReply: !!devReply,
      replyText: devReply?.text || null,
    };
  });
}

// Calculate rating statistics from reviews
function calculateRatingStats(reviews: any[]) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;

  reviews.forEach((r: any) => {
    const rating = Math.round(r.starRating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
    }
  });

  const totalRatings = Object.values(distribution).reduce((a, b) => a + b, 0);
  const weightedSum = Object.entries(distribution).reduce(
    (sum, [star, count]) => sum + parseInt(star) * count,
    0
  );
  const averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution[star],
    percentage: totalRatings > 0 ? Math.round((distribution[star] / totalRatings) * 100) : 0,
  }));

  return { averageRating: Math.round(averageRating * 10) / 10, ratingDistribution };
}

// Parse device breakdown
function parseDeviceBreakdown(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const rows = result.value?.data?.rows || [];
  return rows
    .map((row: any) => ({
      device: row.dimensions?.[0]?.stringValue || 'Unknown',
      crashRate: extractMetricValue(row, 0) * 100,
      users: Math.round(extractMetricValue(row, 1)),
    }))
    .sort((a: any, b: any) => b.crashRate - a.crashRate)
    .slice(0, 10);
}

// Parse version breakdown
function parseVersionBreakdown(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const rows = result.value?.data?.rows || [];
  return rows
    .map((row: any) => ({
      versionCode: row.dimensions?.[0]?.stringValue || 'Unknown',
      crashRate: extractMetricValue(row, 0) * 100,
      users: Math.round(extractMetricValue(row, 1)),
    }))
    .sort((a: any, b: any) => b.users - a.users)
    .slice(0, 10);
}

// Parse error issues
function parseErrorIssues(result: PromiseSettledResult<any>) {
  if (result.status !== 'fulfilled') return [];
  const issues = result.value?.data?.errorIssues || [];
  return issues
    .map((issue: any) => ({
      name: issue.name || '',
      type: issue.type || 'CRASH',
      errorMessage: issue.cause || issue.name || 'Unknown error',
      location: issue.location || '',
      issueUri: issue.issueUri || '',
      distinctUsers: issue.distinctUsers || 0,
      distinctUsersPercent: issue.distinctUsersPercent
        ? parseFloat(issue.distinctUsersPercent) * 100
        : 0,
      lastOccurrence: issue.lastOsVersion || '',
    }))
    .slice(0, 10);
}

// Merge crash and ANR time series
function mergeTimeSeries(crashSeries: any[], anrSeries: any[]) {
  const dateMap = new Map<string, any>();

  crashSeries.forEach((item) => {
    dateMap.set(item.date, {
      date: item.date,
      crashRate: item.crashRate,
      anrRate: 0,
      distinctUsers: item.distinctUsers,
    });
  });

  anrSeries.forEach((item) => {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.anrRate = item.anrRate;
    } else {
      dateMap.set(item.date, {
        date: item.date,
        crashRate: 0,
        anrRate: item.anrRate,
        distinctUsers: item.distinctUsers,
      });
    }
  });

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================
// GCS Cloud Storage Report Parsing
// ============================================

// Get months to cover for the date range
function getMonthsForRange(dateRange: string, dateFrom?: string, dateTo?: string): string[] {
  const { startDate, endDate } = getPlayDateRange(dateRange, dateFrom, dateTo);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months: string[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    months.push(
      `${current.getFullYear()}${String(current.getMonth() + 1).padStart(2, '0')}`
    );
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// Get ALL months that have install data available for this package in GCS
async function getAllAvailableInstallMonths(storageApi: any, bucketId: string, packageName: string): Promise<string[]> {
  const files = await listBucketFiles(storageApi, bucketId, 'stats/installs/');
  const months = new Set<string>();
  const pattern = new RegExp(`installs_${packageName.replace('.', '\\.')}_(\\d{6})_overview\\.csv$`);
  for (const file of files) {
    const match = file.match(pattern);
    if (match) months.add(match[1]);
  }
  return Array.from(months).sort();
}

// Fetch total_store_performance acquisitions for months where installs data is missing
async function fetchStoreAcquisitionsForMissingMonths(
  storageApi: any,
  bucketId: string,
  packageName: string,
  missingMonths: string[],
  startDate: string,
  endDate: string,
): Promise<{ date: string; installs: number }[]> {
  if (missingMonths.length === 0) return [];

  const allFiles = await listBucketFiles(storageApi, bucketId, 'stats/store_performance/');
  const results: { date: string; installs: number }[] = [];

  for (const month of missingMonths) {
    // Try total_store_performance first (includes all acquisition sources), then regular store_performance
    const candidates = [
      `stats/store_performance/total_store_performance_${packageName}_${month}_country.csv`,
      `stats/store_performance/store_performance_${packageName}_${month}_country.csv`,
    ];

    for (const objectPath of candidates) {
      if (!allFiles.includes(objectPath)) continue;
      console.log(`[GCS] Using store_performance as install proxy: ${objectPath}`);
      const content = await downloadGCSFile(storageApi, bucketId, objectPath);
      if (!content) continue;

      const rows = parseCSV(content);
      // Aggregate by date (country CSV has per-country rows)
      const dateAcquisitions: Record<string, number> = {};
      for (const row of rows) {
        const date = row['Date'] || '';
        if (!date || date < startDate || date > endDate) continue;
        const acquisitions = parseInt(
          row['Total store acquisitions'] || row['Store Listing Acquisitions'] || row['Store listing acquisitions'] || row['Installers'] || '0'
        );
        dateAcquisitions[date] = (dateAcquisitions[date] || 0) + acquisitions;
      }

      for (const [date, installs] of Object.entries(dateAcquisitions)) {
        results.push({ date, installs });
      }
      break; // Got data from one candidate, skip others
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// Fetch and parse GCS CSV reports
async function fetchGCSReports(packageName: string, dateRange: string, dateFrom?: string, dateTo?: string) {
  const bucketId = process.env.GP_GCS_BUCKET_ID;
  if (!bucketId) {
    console.log('[GCS] No GP_GCS_BUCKET_ID configured, skipping GCS reports');
    return null;
  }

  const clients = getPlayClients();
  if (!clients) return null;

  const { storage } = clients;
  const months = getMonthsForRange(dateRange, dateFrom, dateTo);
  const { startDate, endDate } = getPlayDateRange(dateRange, dateFrom, dateTo);
  const storageApi = getGCSStorageApi();
  if (!storageApi) return null;

  console.log(`[GCS] Fetching reports for ${packageName}, bucket: ${bucketId}, months: ${months.join(',')}`);

  try {
    // Find all available install months for this package
    const availableInstallMonths = await getAllAvailableInstallMonths(storageApi, bucketId, packageName);
    // Determine which months in our range have install data and which don't
    const monthsWithInstalls = months.filter(m => availableInstallMonths.includes(m));
    const monthsMissingInstalls = months.filter(m => !availableInstallMonths.includes(m));

    if (monthsMissingInstalls.length > 0) {
      console.log(`[GCS] Missing install data for months: ${monthsMissingInstalls.join(',')} — will use store_performance`);
    }

    // For totalInstalls: fetch ALL available install months (not just date range)
    // This gives us the cumulative total across all history
    const allInstallMonths = availableInstallMonths.length > 0 ? availableInstallMonths : monthsWithInstalls;

    // Fetch install reports, store performance reports, AND store acquisitions for missing months
    const [installRows, storeRows, storeAcquisitions] = await Promise.all([
      fetchCSVReport(storage, bucketId, packageName, allInstallMonths, 'installs', 'installs_'),
      fetchCSVReport(storage, bucketId, packageName, months, 'store_performance', 'store_performance_'),
      fetchStoreAcquisitionsForMissingMonths(storageApi, bucketId, packageName, monthsMissingInstalls, startDate, endDate),
    ]);

    console.log(`[GCS] Parsed ${installRows.length} install rows, ${storeRows.length} store rows, ${storeAcquisitions.length} acquisition proxy rows`);

    // Parse install data (filtered to date range for time series)
    const filteredInstalls = filterRowsByDateRange(installRows, startDate, endDate);
    const installTimeSeries = filteredInstalls.map((row) => ({
      date: row['Date'] || '',
      installs: parseInt(row['Daily Device Installs'] || row['Daily User Installs'] || '0'),
      uninstalls: parseInt(row['Daily Device Uninstalls'] || row['Daily User Uninstalls'] || '0'),
      updates: parseInt(row['Daily Device Upgrades'] || row['Update Events'] || '0'),
      activeDevices: parseInt(row['Active Device Installs'] || '0'),
    }));

    // Append store acquisition data for missing months as install proxy
    const installDates = new Set(installTimeSeries.map(d => d.date));
    for (const acq of storeAcquisitions) {
      if (!installDates.has(acq.date)) {
        installTimeSeries.push({
          date: acq.date,
          installs: acq.installs,
          uninstalls: 0,
          updates: 0,
          activeDevices: 0,
        });
      }
    }
    // Re-sort after appending
    installTimeSeries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totalInstalls: sum of ALL available daily installs (all history, not just date range)
    const allTimeInstalls = installRows.reduce(
      (sum, row) => sum + parseInt(row['Daily Device Installs'] || row['Daily User Installs'] || '0'), 0
    );
    // Add current month acquisitions from store_performance
    const currentMonthAcquisitions = storeAcquisitions.reduce((sum, d) => sum + d.installs, 0);
    const totalInstalls = allTimeInstalls + currentMonthAcquisitions;

    const totalUninstalls = installTimeSeries.reduce((sum, d) => sum + d.uninstalls, 0);
    const totalUpdates = installTimeSeries.reduce((sum, d) => sum + d.updates, 0);
    const latestActiveDevices = installTimeSeries.length > 0
      ? installTimeSeries[installTimeSeries.length - 1].activeDevices
      : 0;
    const latestDailyInstalls = installTimeSeries.length > 0
      ? installTimeSeries[installTimeSeries.length - 1].installs
      : 0;
    const latestDailyUninstalls = installTimeSeries.length > 0
      ? installTimeSeries[installTimeSeries.length - 1].uninstalls
      : 0;

    // Determine latest data date
    const lastInstallDate = installTimeSeries.length > 0 ? installTimeSeries[installTimeSeries.length - 1].date : null;

    // Parse store listing data (country CSV has per-country rows, aggregate them)
    const filteredStore = filterRowsByDateRange(storeRows, startDate, endDate);
    const totalVisitors = filteredStore.reduce(
      (sum, row) => sum + parseInt(row['Store Listing Visitors'] || row['Store listing visitors'] || '0'), 0
    );
    const totalAcquisitions = filteredStore.reduce(
      (sum, row) => sum + parseInt(row['Store Listing Acquisitions'] || row['Store listing acquisitions'] || row['Installers'] || '0'), 0
    );
    const conversionRate = totalVisitors > 0
      ? Math.round((totalAcquisitions / totalVisitors) * 10000) / 100
      : 0;

    return {
      overview: {
        totalInstalls,
        dailyInstalls: latestDailyInstalls,
        dailyUninstalls: latestDailyUninstalls,
        dailyUpdates: totalUpdates,
        activeDeviceInstalls: latestActiveDevices,
      },
      installTimeSeries,
      storeListing: {
        visitors: totalVisitors,
        acquisitions: totalAcquisitions,
        conversionRate,
      },
      dataAsOf: lastInstallDate,
    };
  } catch (err: any) {
    console.error('Failed to fetch GCS reports:', err.message);
    return null;
  }
}

// Download a GCS file using the googleapis REST API (works on Node v24 Windows)
async function downloadGCSFile(storageApi: any, bucketId: string, objectPath: string): Promise<string | null> {
  try {
    const res = await storageApi.objects.get(
      { bucket: bucketId, object: objectPath, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    let data = Buffer.from(res.data as ArrayBuffer);
    // Check for gzip magic bytes (0x1f 0x8b)
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      data = gunzipSync(data);
    }
    // Check for UTF-16LE BOM (0xFF 0xFE) — Play Console CSVs are often UTF-16LE
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
      return data.toString('utf16le').replace(/^\ufeff/, '');
    }
    // Check for UTF-16LE without BOM (null bytes between ASCII chars)
    if (data.length >= 4 && data[1] === 0x00 && data[3] === 0x00) {
      return data.toString('utf16le').replace(/^\ufeff/, '');
    }
    return data.toString('utf-8');
  } catch (e: any) {
    return null;
  }
}

// Get authenticated GCS storage REST API client
function getGCSStorageApi() {
  const clientEmail = process.env.GP_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GP_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/devstorage.read_only'],
  });
  return google.storage({ version: 'v1', auth });
}

// List files in GCS bucket matching a prefix (cached per request)
const _bucketFileCache = new Map<string, string[]>();
async function listBucketFiles(storageApi: any, bucketId: string, prefix: string): Promise<string[]> {
  const cacheKey = `${bucketId}:${prefix}`;
  if (_bucketFileCache.has(cacheKey)) return _bucketFileCache.get(cacheKey)!;

  const files: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await storageApi.objects.list({
      bucket: bucketId,
      prefix,
      maxResults: 500,
      pageToken,
    });
    res.data.items?.forEach((item: any) => files.push(item.name));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  _bucketFileCache.set(cacheKey, files);
  return files;
}

// Fetch CSV report files from GCS bucket
async function fetchCSVReport(
  _storage: any,
  bucketId: string,
  packageName: string,
  months: string[],
  reportType: string,
  filePrefix: string
): Promise<Record<string, string>[]> {
  const storageApi = getGCSStorageApi();
  if (!storageApi) return [];

  // List all available files once, then filter — avoids hundreds of 404 attempts
  const [files1, files2] = await Promise.all([
    listBucketFiles(storageApi, bucketId, `stats/${reportType}/`),
    listBucketFiles(storageApi, bucketId, `stats/stats/${reportType}/`),
  ]);
  const allFiles = new Set([...files1, ...files2]);

  const allRows: Record<string, string>[] = [];
  const suffix = reportType === 'store_performance' ? '_country.csv' : '_overview.csv';

  for (const month of months) {
    // Build candidate file paths
    const candidates = [
      `stats/${reportType}/${filePrefix}${packageName}_${month}${suffix}`,
      `stats/stats/${reportType}/${filePrefix}${packageName}_${month}${suffix}`,
    ];
    if (reportType === 'store_performance') {
      candidates.push(
        `stats/${reportType}/total_${filePrefix}${packageName}_${month}${suffix}`,
        `stats/stats/${reportType}/total_${filePrefix}${packageName}_${month}${suffix}`,
      );
    } else {
      candidates.push(`stats/${reportType}/${filePrefix}${packageName}_${month}.csv`);
    }

    // Only download files that actually exist
    for (const objectPath of candidates) {
      if (!allFiles.has(objectPath)) continue;
      console.log(`[GCS] Downloading: ${objectPath}`);
      const content = await downloadGCSFile(storageApi, bucketId, objectPath);
      if (content) {
        const rows = parseCSV(content);
        console.log(`[GCS] Success: ${objectPath} - ${rows.length} rows`);
        allRows.push(...rows);
        break;
      }
    }
  }

  return allRows;
}

// Simple CSV parser
function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Filter CSV rows by date range
function filterRowsByDateRange(
  rows: Record<string, string>[],
  startDate: string,
  endDate: string
): Record<string, string>[] {
  return rows.filter((row) => {
    const date = row['Date'] || '';
    return date >= startDate && date <= endDate;
  });
}
