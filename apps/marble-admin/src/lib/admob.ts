import { GoogleAuth } from 'google-auth-library';

/**
 * AdMob Reporting API client.
 *
 * Auth: Google service account that has been invited to the AdMob account
 * as a user (AdMob → Settings → Access & authorization). The service
 * account JSON is provided via the ADMOB_SERVICE_ACCOUNT_JSON env var.
 *
 * Publisher ID (e.g. "pub-6024881476822443") is provided via
 * ADMOB_PUBLISHER_ID — found in AdMob → Settings → Account information.
 */

const SCOPE = 'https://www.googleapis.com/auth/admob.readonly';

function getAuth(): GoogleAuth {
  const json = process.env.ADMOB_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('ADMOB_SERVICE_ACCOUNT_JSON env var not set');
  const credentials = JSON.parse(json);
  return new GoogleAuth({ credentials, scopes: [SCOPE] });
}

function getPublisherId(): string {
  const id = process.env.ADMOB_PUBLISHER_ID;
  if (!id) throw new Error('ADMOB_PUBLISHER_ID env var not set');
  return id;
}

export type AdMobDailyRow = {
  date: string; // YYYY-MM-DD
  platform: 'ios' | 'android';
  impressions: number;
  clicks: number;
  earningsUsd: number;
  ecpmUsd: number;
  matchRate: number | null;
  showRate: number | null;
};

function ymd(d: Date): { year: number; month: number; day: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dateFromYmd(dim: any): string {
  // AdMob returns date as { value: "YYYYMMDD" }
  const v = dim?.value as string;
  if (!v || v.length !== 8) return '';
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

/**
 * Pull a daily revenue report from AdMob for the given date range.
 * Aggregates by date + platform (sums across all apps + ad units).
 * AdMob revenue lags ~24h, so requesting today usually returns zeros.
 */
export async function fetchAdMobDailyReport(
  startDate: Date,
  endDate: Date,
): Promise<AdMobDailyRow[]> {
  const auth = getAuth();
  const pubId = getPublisherId();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('AdMob: failed to obtain access token');

  const body = {
    reportSpec: {
      dateRange: { startDate: ymd(startDate), endDate: ymd(endDate) },
      dimensions: ['DATE', 'PLATFORM'],
      metrics: [
        'IMPRESSIONS',
        'CLICKS',
        'ESTIMATED_EARNINGS',
        'IMPRESSION_RPM',
        'MATCH_RATE',
        'SHOW_RATE',
      ],
    },
  };

  const url = `https://admob.googleapis.com/v1/accounts/${pubId}/networkReport:generate`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AdMob API ${resp.status}: ${txt.slice(0, 400)}`);
  }

  // AdMob returns a JSON array of { header } / { row } / { footer } envelopes.
  // For a small daily report it fits in memory comfortably.
  const data = (await resp.json()) as Array<{ row?: { dimensionValues: any; metricValues: any } }>;
  const rows: AdMobDailyRow[] = [];

  for (const envelope of data) {
    if (!envelope.row) continue;
    const dims = envelope.row.dimensionValues || {};
    const mets = envelope.row.metricValues || {};

    const date = dateFromYmd(dims.DATE);
    const platformRaw = (dims.PLATFORM?.value as string) || '';
    const platform = platformRaw.toLowerCase() === 'ios' ? 'ios' : platformRaw.toLowerCase() === 'android' ? 'android' : null;
    if (!date || !platform) continue;

    // Metric values for IMPRESSIONS/CLICKS are integerValue strings;
    // earnings are microsValue (1e6 = $1) on ESTIMATED_EARNINGS;
    // IMPRESSION_RPM is microsValue too (eCPM in micro-USD).
    const impressions = Number(mets.IMPRESSIONS?.integerValue ?? 0);
    const clicks = Number(mets.CLICKS?.integerValue ?? 0);
    const earningsMicros = Number(mets.ESTIMATED_EARNINGS?.microsValue ?? 0);
    const rpmMicros = Number(mets.IMPRESSION_RPM?.microsValue ?? 0);
    const matchRate = mets.MATCH_RATE?.doubleValue != null ? Number(mets.MATCH_RATE.doubleValue) : null;
    const showRate = mets.SHOW_RATE?.doubleValue != null ? Number(mets.SHOW_RATE.doubleValue) : null;

    rows.push({
      date,
      platform,
      impressions,
      clicks,
      earningsUsd: earningsMicros / 1_000_000,
      ecpmUsd: rpmMicros / 1_000_000,
      matchRate,
      showRate,
    });
  }

  return rows;
}
