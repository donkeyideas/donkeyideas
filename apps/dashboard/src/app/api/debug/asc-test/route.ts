import { NextResponse } from 'next/server';
import { hasASCCredentials } from '@/lib/app-store-connect';
import { SignJWT, importPKCS8 } from 'jose';
import { gunzipSync } from 'zlib';

export const dynamic = 'force-dynamic';

const BASE = 'https://api.appstoreconnect.apple.com/v1';

// Target report names per category
const TARGET_REPORTS: Record<string, string[]> = {
  APP_USAGE: ['App Store Installation and Deletion', 'App Sessions'],
  COMMERCE: ['App Downloads'],
  APP_STORE_ENGAGEMENT: ['App Store Discovery and Engagement'],
};

// ASC diagnostic endpoint — tests every step of the analytics + sales flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bundleId = searchParams.get('bundleId') || 'com.basktball.app';

  try {
    if (!hasASCCredentials()) {
      return NextResponse.json({ configured: false, message: 'Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.' });
    }

    const keyId = process.env.ASC_KEY_ID!;
    const issuerId = process.env.ASC_ISSUER_ID!;
    const vendorNumber = process.env.ASC_VENDOR_NUMBER || null;
    const privateKeyPem = process.env.ASC_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(privateKeyPem, 'ES256');
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
      .setIssuer(issuerId)
      .setIssuedAt(now)
      .setExpirationTime(now + 20 * 60)
      .setAudience('appstoreconnect-v1')
      .sign(privateKey);

    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const result: any = { configured: true, keyId, issuerId, vendorNumber: vendorNumber || 'NOT SET', steps: {} };

    // Step 1: Look up app
    const appResp = await fetch(`${BASE}/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId`, { headers, cache: 'no-store' });
    const appData = await appResp.json();
    const app = appData.data?.[0];
    result.steps.appLookup = app ? { id: app.id, name: app.attributes?.name } : 'NOT_FOUND';
    if (!app) return NextResponse.json(result);
    const appId = app.id;

    // =============================================
    // SALES REPORTS TEST (primary data source)
    // =============================================
    if (vendorNumber) {
      result.steps.salesReports = {};

      // Try fetching yesterday's and 2-days-ago reports
      for (const daysAgo of [2, 3, 4, 5]) {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - daysAgo);
        const dateStr = testDate.toISOString().split('T')[0];
        const dateFormatted = dateStr.replace(/-/g, '');

        try {
          const salesResp = await fetch(
            `${BASE}/salesReports?filter[reportType]=SALES&filter[reportSubType]=SUMMARY&filter[frequency]=DAILY&filter[reportDate]=${dateFormatted}&filter[vendorNumber]=${vendorNumber}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip, application/json' }, cache: 'no-store' }
          );

          if (salesResp.status === 404) {
            result.steps.salesReports[dateStr] = { status: 404, message: 'No data for this date' };
            continue;
          }

          if (!salesResp.ok) {
            const errorText = await salesResp.text().catch(() => '');
            result.steps.salesReports[dateStr] = { status: salesResp.status, error: errorText.slice(0, 300) };
            continue;
          }

          const buf = Buffer.from(await salesResp.arrayBuffer());
          let content: string;
          if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
            content = gunzipSync(buf).toString('utf-8');
          } else {
            content = buf.toString('utf-8');
          }

          const lines = content.split('\n').filter(l => l.trim());
          const tsvHeaders = lines[0]?.split('\t') || [];
          const appleIdIdx = tsvHeaders.indexOf('Apple Identifier');
          const unitsIdx = tsvHeaders.indexOf('Units');
          const titleIdx = tsvHeaders.indexOf('Title');
          const typeIdx = tsvHeaders.indexOf('Product Type Identifier');

          // Find rows for our specific app
          let appUnits = 0;
          const allApps: Record<string, number> = {};

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            const title = titleIdx >= 0 ? cols[titleIdx] : 'unknown';
            const units = unitsIdx >= 0 ? parseInt(cols[unitsIdx] || '0') : 0;
            const productType = typeIdx >= 0 ? cols[typeIdx] : '';

            // Only count app downloads
            if (productType && !['1', '1F', '1T', 'F1', '1-B'].includes(productType)) continue;

            allApps[title] = (allApps[title] || 0) + units;

            if (appleIdIdx >= 0 && cols[appleIdIdx]?.trim() === appId) {
              appUnits += units;
            }
          }

          result.steps.salesReports[dateStr] = {
            status: 200,
            totalLines: lines.length,
            headers: tsvHeaders.slice(0, 10),
            appUnits,
            allApps,
          };

          // Found data — stop checking more dates
          break;
        } catch (e: any) {
          result.steps.salesReports[dateStr] = { error: e.message };
        }
      }
    } else {
      result.steps.salesReports = {
        message: 'Set ASC_VENDOR_NUMBER env var. Find it in App Store Connect → Sales and Trends (top-left of page).',
      };
    }

    // =============================================
    // ANALYTICS REPORTS TEST (fallback)
    // =============================================

    // Step 2: Find report request using app-scoped endpoint
    let requestId: string | null = null;

    try {
      const appScopedResp = await fetch(`${BASE}/apps/${appId}/analyticsReportRequests`, { headers, cache: 'no-store' });
      const appScopedData = await appScopedResp.json();
      const appRequests = appScopedData.data || [];
      result.steps.analyticsReportRequests = {
        count: appRequests.length,
        items: appRequests.map((r: any) => ({
          id: r.id,
          accessType: r.attributes?.accessType,
          stoppedDueToInactivity: r.attributes?.stoppedDueToInactivity,
        })),
      };
      for (const req of appRequests) {
        if (req.attributes?.accessType === 'ONGOING') {
          requestId = req.id;
          break;
        }
      }
    } catch (e: any) {
      result.steps.analyticsReportRequests = { error: e.message };
    }

    if (requestId) {
      result.steps.activeRequestId = requestId;

      // Get reports and check for data
      const reportsResp = await fetch(`${BASE}/analyticsReportRequests/${requestId}/reports`, { headers, cache: 'no-store' });
      const reportsData = await reportsResp.json();
      const allReports = reportsData.data || [];

      const byCategory: Record<string, any[]> = {};
      for (const r of allReports) {
        const cat = r.attributes?.category || 'UNKNOWN';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({ id: r.id, name: r.attributes?.name });
      }
      result.steps.reportsByCategory = Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, names: v.map((r: any) => r.name) }])
      );

      // Check target reports for instances
      for (const [category, targetNames] of Object.entries(TARGET_REPORTS)) {
        const matchingReports = allReports.filter((r: any) =>
          r.attributes?.category === category &&
          targetNames.some((t: string) => (r.attributes?.name || '').includes(t))
        );

        for (const report of matchingReports) {
          const instUrl = report.relationships?.instances?.links?.related;
          if (!instUrl) continue;

          const instResp = await fetch(instUrl, { headers, cache: 'no-store' });
          const instData = await instResp.json();
          const instances = instData.data || [];

          if (!result.steps.analyticsTargetReports) result.steps.analyticsTargetReports = {};
          result.steps.analyticsTargetReports[category] = {
            reportName: report.attributes?.name,
            instanceCount: instances.length,
            latestInstance: instances.length > 0 ? {
              id: instances[instances.length - 1].id,
              processingDate: instances[instances.length - 1].attributes?.processingDate,
            } : null,
          };
          break;
        }
      }
    }

    // Reviews
    try {
      const revResp = await fetch(`${BASE}/apps/${appId}/customerReviews?limit=3&sort=-createdDate`, { headers, cache: 'no-store' });
      result.steps.reviews = revResp.ok
        ? { count: (await revResp.json()).data?.length || 0 }
        : { status: revResp.status };
    } catch (e: any) {
      result.steps.reviews = { error: e.message };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
