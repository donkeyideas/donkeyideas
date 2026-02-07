import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchSearchConsoleData } from '@/lib/google-search-console';
import { fetchCoreWebVitals } from '@/lib/pagespeed-insights';
import { auditAllPublicPages } from '@/lib/seo-audit';
import { auditGeoReadiness } from '@/lib/geo-audit';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.donkeyideas.com';

// Allow up to 60 seconds for PageSpeed Insights API calls
export const maxDuration = 60;

// GET /api/seo-geo?dateRange=30d
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const refresh = searchParams.get('refresh') === 'true';

    // Check for a cached snapshot from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let snapshot = null;
    if (!refresh) {
      try {
        snapshot = await prisma.seoGeoSnapshot.findUnique({ where: { date: today } });
      } catch { /* table might not exist */ }
    }

    // Fetch all data sources in parallel
    const results = await Promise.allSettled([
      fetchSearchConsoleData(dateRange),
      snapshot ? Promise.resolve(null) : fetchCoreWebVitals(SITE_URL),
      snapshot ? Promise.resolve(null) : auditAllPublicPages(),
      snapshot ? Promise.resolve(null) : auditGeoReadiness(),
    ]);

    const gscResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const gscError = results[0].status === 'rejected' ? results[0].reason?.message : null;

    const webVitalsResult = results[1].status === 'fulfilled' ? results[1].value : null;
    const seoAuditResult = results[2].status === 'fulfilled' ? results[2].value : null;
    const geoAuditResult = results[3].status === 'fulfilled' ? results[3].value : null;

    // Save snapshot if we fetched fresh data
    if (!snapshot && (webVitalsResult || seoAuditResult || geoAuditResult)) {
      try {
        snapshot = await prisma.seoGeoSnapshot.upsert({
          where: { date: today },
          update: {
            totalClicks: gscResult?.overview.totalClicks,
            totalImpressions: gscResult?.overview.totalImpressions,
            avgCtr: gscResult?.overview.avgCtr,
            avgPosition: gscResult?.overview.avgPosition,
            lcp: webVitalsResult?.mobile.coreWebVitals.lcp,
            fid: webVitalsResult?.mobile.coreWebVitals.fid,
            cls: webVitalsResult?.mobile.coreWebVitals.cls,
            fcp: webVitalsResult?.mobile.coreWebVitals.fcp,
            ttfb: webVitalsResult?.mobile.coreWebVitals.ttfb,
            performanceScore: webVitalsResult?.mobile.lighthouseScores.performanceScore,
            seoScore: webVitalsResult?.mobile.lighthouseScores.seoScore,
            accessibilityScore: webVitalsResult?.mobile.lighthouseScores.accessibilityScore,
            geoOverallScore: geoAuditResult?.overallScore,
            structuredDataScore: geoAuditResult?.structuredData.score,
            llmAccessScore: geoAuditResult?.llmAccessibility.score,
            contentQualityScore: geoAuditResult?.contentQuality.score,
            technicalSignalsScore: geoAuditResult?.technicalSignals.score,
            seoAuditScore: seoAuditResult?.overallScore,
            issuesFound: seoAuditResult
              ? seoAuditResult.totalIssues.errors + seoAuditResult.totalIssues.warnings + seoAuditResult.totalIssues.info
              : undefined,
            auditDetails: seoAuditResult ? JSON.parse(JSON.stringify(seoAuditResult)) : undefined,
          },
          create: {
            date: today,
            totalClicks: gscResult?.overview.totalClicks,
            totalImpressions: gscResult?.overview.totalImpressions,
            avgCtr: gscResult?.overview.avgCtr,
            avgPosition: gscResult?.overview.avgPosition,
            lcp: webVitalsResult?.mobile.coreWebVitals.lcp,
            fid: webVitalsResult?.mobile.coreWebVitals.fid,
            cls: webVitalsResult?.mobile.coreWebVitals.cls,
            fcp: webVitalsResult?.mobile.coreWebVitals.fcp,
            ttfb: webVitalsResult?.mobile.coreWebVitals.ttfb,
            performanceScore: webVitalsResult?.mobile.lighthouseScores.performanceScore,
            seoScore: webVitalsResult?.mobile.lighthouseScores.seoScore,
            accessibilityScore: webVitalsResult?.mobile.lighthouseScores.accessibilityScore,
            geoOverallScore: geoAuditResult?.overallScore,
            structuredDataScore: geoAuditResult?.structuredData.score,
            llmAccessScore: geoAuditResult?.llmAccessibility.score,
            contentQualityScore: geoAuditResult?.contentQuality.score,
            technicalSignalsScore: geoAuditResult?.technicalSignals.score,
            seoAuditScore: seoAuditResult?.overallScore,
            issuesFound: seoAuditResult
              ? seoAuditResult.totalIssues.errors + seoAuditResult.totalIssues.warnings + seoAuditResult.totalIssues.info
              : undefined,
            auditDetails: seoAuditResult ? JSON.parse(JSON.stringify(seoAuditResult)) : undefined,
          },
        });
      } catch (e) {
        console.error('Failed to save snapshot:', e);
      }
    }

    // Save keywords to tracking table
    if (gscResult?.topKeywords) {
      try {
        for (const kw of gscResult.topKeywords.slice(0, 50)) {
          await prisma.keywordTracking.upsert({
            where: { date_keyword: { date: today, keyword: kw.keyword } },
            update: { clicks: kw.clicks, impressions: kw.impressions, ctr: kw.ctr, position: kw.position },
            create: { date: today, keyword: kw.keyword, clicks: kw.clicks, impressions: kw.impressions, ctr: kw.ctr, position: kw.position },
          });
        }
      } catch (e) {
        console.error('Failed to save keywords:', e);
      }
    }

    // Fetch historical snapshots for charts
    let history: any[] = [];
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      sinceDate.setHours(0, 0, 0, 0);

      history = await prisma.seoGeoSnapshot.findMany({
        where: { date: { gte: sinceDate } },
        orderBy: { date: 'asc' },
      });
    } catch { /* table might not exist */ }

    return NextResponse.json({
      searchConsole: {
        connected: gscResult !== null,
        error: gscError,
        data: gscResult,
      },
      pageSpeed: webVitalsResult || (snapshot ? {
        mobile: {
          coreWebVitals: {
            lcp: Number(snapshot.lcp) || 0,
            fid: Number(snapshot.fid) || 0,
            cls: Number(snapshot.cls) || 0,
            fcp: Number(snapshot.fcp) || 0,
            ttfb: Number(snapshot.ttfb) || 0,
          },
          lighthouseScores: {
            performanceScore: snapshot.performanceScore || 0,
            seoScore: snapshot.seoScore || 0,
            accessibilityScore: snapshot.accessibilityScore || 0,
            bestPracticesScore: 0,
          },
          diagnostics: [],
        },
        desktop: null,
      } : null),
      seoAudit: seoAuditResult || (snapshot?.auditDetails ? snapshot.auditDetails : null),
      geoAudit: geoAuditResult || (snapshot ? {
        overallScore: snapshot.geoOverallScore || 0,
        structuredData: { score: snapshot.structuredDataScore || 0, checks: [], issues: [] },
        llmAccessibility: { score: snapshot.llmAccessScore || 0, checks: [], issues: [] },
        contentQuality: { score: snapshot.contentQualityScore || 0, checks: [], issues: [] },
        technicalSignals: { score: snapshot.technicalSignalsScore || 0, checks: [], issues: [] },
        recommendations: [],
      } : null),
      history,
      snapshot: snapshot ? {
        date: snapshot.date,
        seoScore: snapshot.seoScore,
        geoScore: snapshot.geoOverallScore,
        performanceScore: snapshot.performanceScore,
        seoAuditScore: snapshot.seoAuditScore,
      } : null,
    });
  } catch (error: any) {
    console.error('SEO-GEO API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to load SEO/GEO data' } },
      { status: 500 }
    );
  }
}
