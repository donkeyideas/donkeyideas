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

// ASC diagnostic endpoint — tests every step of the analytics flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bundleId = searchParams.get('bundleId') || 'com.basktball.app';

  try {
    if (!hasASCCredentials()) {
      return NextResponse.json({ configured: false, message: 'Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.' });
    }

    const keyId = process.env.ASC_KEY_ID!;
    const issuerId = process.env.ASC_ISSUER_ID!;
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

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const result: any = { configured: true, keyId, issuerId, steps: {} };

    // Step 1: Look up app
    const appResp = await fetch(`${BASE}/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId`, { headers, cache: 'no-store' });
    const appData = await appResp.json();
    const app = appData.data?.[0];
    result.steps.appLookup = app ? { id: app.id, name: app.attributes?.name } : 'NOT_FOUND';
    if (!app) return NextResponse.json(result);
    const appId = app.id;

    // Step 2: Find report request using app-scoped endpoint
    let requestId: string | null = null;

    // Try app-scoped endpoint first
    try {
      const appScopedResp = await fetch(`${BASE}/apps/${appId}/analyticsReportRequests`, { headers, cache: 'no-store' });
      const appScopedData = await appScopedResp.json();
      const appRequests = appScopedData.data || [];
      result.steps.appScopedRequests = {
        status: appScopedResp.status,
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
      result.steps.appScopedRequests = { error: e.message };
    }

    // Fall back to global list
    if (!requestId) {
      const globalResp = await fetch(`${BASE}/analyticsReportRequests`, { headers, cache: 'no-store' });
      const globalData = await globalResp.json();
      result.steps.globalRequests = { count: (globalData.data || []).length };
      for (const req of (globalData.data || [])) {
        if (req.attributes?.accessType === 'ONGOING') {
          requestId = req.id;
          break;
        }
      }
    }

    // Create if not found
    if (!requestId) {
      try {
        const createResp = await fetch(`${BASE}/analyticsReportRequests`, {
          method: 'POST', headers,
          body: JSON.stringify({
            data: {
              type: 'analyticsReportRequests',
              attributes: { accessType: 'ONGOING' },
              relationships: { app: { data: { type: 'apps', id: appId } } }
            }
          }),
        });
        const createData = await createResp.json();
        result.steps.createRequest = { status: createResp.status, response: createData };
        requestId = createData.data?.id;
      } catch (e: any) {
        result.steps.createRequest = { error: e.message };
      }
    }

    if (!requestId) return NextResponse.json(result);
    result.steps.activeRequestId = requestId;

    // Step 3: Get ALL reports and group by category
    const reportsResp = await fetch(`${BASE}/analyticsReportRequests/${requestId}/reports`, { headers, cache: 'no-store' });
    const reportsData = await reportsResp.json();
    const allReports = reportsData.data || [];

    // Group by category
    const byCategory: Record<string, any[]> = {};
    for (const r of allReports) {
      const cat = r.attributes?.category || 'UNKNOWN';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ id: r.id, name: r.attributes?.name });
    }
    result.steps.reportsByCategory = Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, names: v.map((r: any) => r.name) }])
    );

    // Step 4: Try to download data from target reports
    for (const [category, targetNames] of Object.entries(TARGET_REPORTS)) {
      const categoryReports = allReports.filter((r: any) => r.attributes?.category === category);
      const matchingReports = categoryReports.filter((r: any) =>
        targetNames.some(t => (r.attributes?.name || '').includes(t))
      );

      // Prefer "Standard" reports
      matchingReports.sort((a: any, b: any) => {
        const aStd = (a.attributes?.name || '').includes('Standard') ? 0 : 1;
        const bStd = (b.attributes?.name || '').includes('Standard') ? 0 : 1;
        return aStd - bStd;
      });

      for (const report of matchingReports) {
        const reportName = report.attributes?.name || 'unknown';
        const instUrl = report.relationships?.instances?.links?.related;
        if (!instUrl) continue;

        const instResp = await fetch(instUrl, { headers, cache: 'no-store' });
        const instData = await instResp.json();
        const instances = instData.data || [];

        const reportResult: any = {
          reportName,
          category,
          instanceCount: instances.length,
        };

        if (instances.length > 0) {
          const latest = instances[instances.length - 1];
          reportResult.latestInstance = {
            id: latest.id,
            processingDate: latest.attributes?.processingDate,
          };

          const segUrl = latest.relationships?.segments?.links?.related;
          if (segUrl) {
            const segResp = await fetch(segUrl, { headers, cache: 'no-store' });
            const segData = await segResp.json();
            const segments = segData.data || [];
            reportResult.segmentCount = segments.length;

            if (segments.length > 0 && segments[0].attributes?.url) {
              try {
                const dlResp = await fetch(segments[0].attributes.url);
                const buf = Buffer.from(await dlResp.arrayBuffer());
                let content: string;
                if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
                  content = gunzipSync(buf).toString('utf-8');
                } else {
                  content = buf.toString('utf-8');
                }
                const lines = content.split('\n');
                reportResult.download = {
                  totalLines: lines.length,
                  headers: lines[0]?.slice(0, 500),
                  sampleRow: lines[1]?.slice(0, 500),
                  lastDataRow: lines[Math.max(1, lines.length - 2)]?.slice(0, 500),
                };
              } catch (e: any) {
                reportResult.downloadError = e.message;
              }
            }
          }
        }

        if (!result.steps.targetReports) result.steps.targetReports = {};
        result.steps.targetReports[category] = reportResult;
        break; // Only first matching report per category
      }
    }

    // Step 5: Reviews
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
