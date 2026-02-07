import { google } from 'googleapis';
import { getDateRange } from './google-analytics';

function getSearchConsoleClient() {
  const clientEmail = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return google.searchconsole({ version: 'v1', auth });
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.donkeyideas.com';

export interface GSCOverview {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}

export interface GSCOverTimeEntry {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
}

export interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
}

export interface GSCData {
  overview: GSCOverview;
  overTime: GSCOverTimeEntry[];
  topKeywords: GSCKeyword[];
  topPages: GSCPage[];
  devices: GSCDevice[];
  countries: GSCCountry[];
}

export async function fetchSearchConsoleData(dateRange: string): Promise<GSCData> {
  const client = getSearchConsoleClient();
  if (!client) {
    throw new Error('Google Search Console credentials not configured');
  }

  const { startDate, endDate } = getDateRange(dateRange);

  // Fetch overview + daily data
  const [overTimeRes, keywordsRes, pagesRes, devicesRes, countriesRes] = await Promise.all([
    client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 500,
      },
    }),
    client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 100,
        type: 'web',
      },
    }),
    client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 50,
        type: 'web',
      },
    }),
    client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['device'],
        type: 'web',
      },
    }),
    client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['country'],
        rowLimit: 20,
        type: 'web',
      },
    }),
  ]);

  // Parse daily data
  const overTime: GSCOverTimeEntry[] = (overTimeRes.data.rows || []).map((row: any) => ({
    date: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: Math.round((row.ctr || 0) * 10000) / 100,
    position: Math.round((row.position || 0) * 10) / 10,
  }));

  // Calculate overview from daily data
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalCtr = 0;
  let totalPosition = 0;
  const rowCount = overTime.length || 1;

  for (const entry of overTime) {
    totalClicks += entry.clicks;
    totalImpressions += entry.impressions;
    totalCtr += entry.ctr;
    totalPosition += entry.position;
  }

  const overview: GSCOverview = {
    totalClicks,
    totalImpressions,
    avgCtr: Math.round((totalCtr / rowCount) * 100) / 100,
    avgPosition: Math.round((totalPosition / rowCount) * 10) / 10,
  };

  // Parse keywords
  const topKeywords: GSCKeyword[] = (keywordsRes.data.rows || []).map((row: any) => ({
    keyword: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: Math.round((row.ctr || 0) * 10000) / 100,
    position: Math.round((row.position || 0) * 10) / 10,
  }));

  // Parse pages
  const topPages: GSCPage[] = (pagesRes.data.rows || []).map((row: any) => ({
    page: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: Math.round((row.ctr || 0) * 10000) / 100,
    position: Math.round((row.position || 0) * 10) / 10,
  }));

  // Parse devices
  const devices: GSCDevice[] = (devicesRes.data.rows || []).map((row: any) => ({
    device: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
  }));

  // Parse countries
  const countries: GSCCountry[] = (countriesRes.data.rows || []).map((row: any) => ({
    country: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
  }));

  return { overview, overTime, topKeywords, topPages, devices, countries };
}

export async function fetchTopKeywords(dateRange: string, limit: number = 50): Promise<GSCKeyword[]> {
  const client = getSearchConsoleClient();
  if (!client) {
    throw new Error('Google Search Console credentials not configured');
  }

  const { startDate, endDate } = getDateRange(dateRange);

  const res = await client.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
      type: 'web',
    },
  });

  return (res.data.rows || []).map((row: any) => ({
    keyword: row.keys[0],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: Math.round((row.ctr || 0) * 10000) / 100,
    position: Math.round((row.position || 0) * 10) / 10,
  }));
}
