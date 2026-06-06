import { OAuth2Client } from 'google-auth-library';

/**
 * AdMob Reporting API client.
 *
 * Auth: OAuth 2.0 user credentials with a stored refresh token.
 * Service-account auth is NOT supported by the AdMob API — AdMob accounts
 * are tied to individual user identities, so we use a refresh token obtained
 * via a one-time consent flow (see scripts/admob-oauth-setup.mjs).
 *
 * Required env vars:
 *   ADMOB_OAUTH_CLIENT_ID      — OAuth Client ID (Web application type)
 *   ADMOB_OAUTH_CLIENT_SECRET  — corresponding client secret
 *   ADMOB_OAUTH_REFRESH_TOKEN  — long-lived refresh token from the setup script
 *   ADMOB_PUBLISHER_ID         — e.g. "pub-6024881476822443"
 */

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.ADMOB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.ADMOB_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ADMOB_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId) throw new Error('ADMOB_OAUTH_CLIENT_ID env var not set');
  if (!clientSecret) throw new Error('ADMOB_OAUTH_CLIENT_SECRET env var not set');
  if (!refreshToken) throw new Error('ADMOB_OAUTH_REFRESH_TOKEN env var not set');
  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function getPublisherId(): string {
  const id = process.env.ADMOB_PUBLISHER_ID?.trim();
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
  const oauth = getOAuthClient();
  const pubId = getPublisherId();
  const tokenResp = await oauth.getAccessToken();
  const token = tokenResp.token;
  if (!token) throw new Error('AdMob: failed to obtain access token (refresh token may be expired/revoked)');

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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    const rawPub = process.env.ADMOB_PUBLISHER_ID ?? '';
    const diag = `pubId="${pubId}" (raw len=${rawPub.length}, sent len=${pubId.length}, hasPrefix=${pubId.startsWith('pub-')})`;
    throw new Error(`AdMob API ${resp.status}: ${diag}: ${txt.slice(0, 300)}`);
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
