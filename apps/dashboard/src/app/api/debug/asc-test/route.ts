import { NextResponse } from 'next/server';
import { hasASCCredentials } from '@/lib/app-store-connect';
import { SignJWT, importPKCS8 } from 'jose';
import { gunzipSync } from 'zlib';

export const dynamic = 'force-dynamic';

const BASE = 'https://api.appstoreconnect.apple.com/v1';

// ASC diagnostic endpoint — tests every step of the analytics flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bundleId = searchParams.get('bundleId') || 'com.basktball.app';

  try {
    if (!hasASCCredentials()) {
      return NextResponse.json({
        configured: false,
        message: 'Set ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.',
      });
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

    // Step 1: Look up app by bundle ID
    const appResp = await fetch(`${BASE}/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId`, { headers, cache: 'no-store' });
    const appData = await appResp.json();
    const app = appData.data?.[0];
    result.steps.appLookup = app ? { id: app.id, name: app.attributes?.name } : 'NOT_FOUND';
    if (!app) return NextResponse.json(result);
    const appId = app.id;

    // Step 2: List analytics report requests
    const reqResp = await fetch(`${BASE}/analyticsReportRequests`, { headers, cache: 'no-store' });
    const reqData = await reqResp.json();
    const requests = reqData.data || [];
    result.steps.reportRequests = requests.map((r: any) => ({
      id: r.id,
      accessType: r.attributes?.accessType,
      stoppedDueToInactivity: r.attributes?.stoppedDueToInactivity,
      appId: r.relationships?.app?.data?.id,
    }));

    // Find ONGOING request for our app
    let requestId: string | null = null;
    for (const req of requests) {
      if (req.attributes?.accessType === 'ONGOING') {
        const reqAppId = req.relationships?.app?.data?.id;
        if (!reqAppId || reqAppId === appId) {
          requestId = req.id;
          break;
        }
      }
    }

    // Create if not found
    if (!requestId) {
      try {
        const createResp = await fetch(`${BASE}/analyticsReportRequests`, {
          method: 'POST',
          headers,
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

    // Step 3: Get reports
    const reportsResp = await fetch(`${BASE}/analyticsReportRequests/${requestId}/reports`, { headers, cache: 'no-store' });
    const reportsData = await reportsResp.json();
    const reports = reportsData.data || [];
    result.steps.reports = reports.map((r: any) => ({
      id: r.id,
      category: r.attributes?.category,
      name: r.attributes?.name,
    }));

    // Step 4: For first APP_USAGE report, drill into instances → segments → download
    for (const report of reports) {
      if (report.attributes?.category === 'APP_USAGE') {
        const instUrl = report.relationships?.instances?.links?.related;
        if (!instUrl) { result.steps.appUsage = 'no_instances_url'; break; }

        const instResp = await fetch(instUrl, { headers, cache: 'no-store' });
        const instData = await instResp.json();
        const instances = instData.data || [];
        result.steps.appUsage = {
          reportName: report.attributes?.name,
          instanceCount: instances.length,
        };

        if (instances.length > 0) {
          const latest = instances[instances.length - 1];
          result.steps.appUsage.latestInstance = {
            id: latest.id,
            processingDate: latest.attributes?.processingDate,
          };

          const segUrl = latest.relationships?.segments?.links?.related;
          if (segUrl) {
            const segResp = await fetch(segUrl, { headers, cache: 'no-store' });
            const segData = await segResp.json();
            const segments = segData.data || [];
            result.steps.appUsage.segmentCount = segments.length;

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
                result.steps.appUsage.download = {
                  totalLines: lines.length,
                  headers: lines[0]?.slice(0, 500),
                  sampleRow: lines[1]?.slice(0, 500),
                  lastDataRow: lines[Math.max(1, lines.length - 2)]?.slice(0, 500),
                };
              } catch (e: any) {
                result.steps.appUsage.downloadError = e.message;
              }
            }
          }
        }
        break;
      }
    }

    // Step 5: Check reviews
    try {
      const revResp = await fetch(`${BASE}/apps/${appId}/customerReviews?limit=3&sort=-createdDate`, { headers, cache: 'no-store' });
      if (revResp.ok) {
        const revData = await revResp.json();
        result.steps.reviews = { count: revData.data?.length || 0 };
      } else {
        result.steps.reviews = { status: revResp.status };
      }
    } catch (e: any) {
      result.steps.reviews = { error: e.message };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
