// Portfolio Growth Agent — orchestrator.
// collect → score → verdict → persist → (optional) email. One source of truth
// (the PortfolioBriefing row) feeds the dashboard page, mobile tab, and email.

import { prisma } from '@donkey-ideas/database';
import { collectMetrics } from './collect';
import { scoreProject, detectQuietlyBroken, countZones, rankProjects } from './score';
import { generateVerdict } from './verdict';
import { sendBriefingEmail } from './email';
import type { Briefing } from './types';

function todayUtcDate(): { iso: string; dateOnly: Date } {
  const now = new Date();
  const dateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { iso: dateOnly.toISOString().slice(0, 10), dateOnly };
}

interface RunOptions {
  userId: string;
  ownerEmail: string;
  trigger: 'manual' | 'cron';
  email?: boolean; // send the email after the run
}

export async function runBriefing(opts: RunOptions): Promise<Briefing> {
  const { userId, ownerEmail, trigger } = opts;

  // --- collect ---
  const { metrics, beaconsReachable, beaconsTotal } = await collectMetrics(userId);

  // --- score ---
  const scored = rankProjects(metrics.map(scoreProject));
  const quietlyBroken = detectQuietlyBroken(scored);
  const zoneCounts = countZones(scored);

  // --- verdict (DeepSeek) ---
  let headline = '';
  let narrative = '';
  let tokensUsed = 0;
  let cost = 0;
  let model = 'deepseek-chat';

  const settings = await prisma.userSettings
    .findUnique({ where: { userId }, select: { deepSeekApiKey: true, sendgridApiKey: true } })
    .catch(() => null);
  const deepSeekKey = settings?.deepSeekApiKey || process.env.DEEPSEEK_API_KEY || '';

  if (deepSeekKey) {
    try {
      const verdict = await generateVerdict(deepSeekKey, scored, quietlyBroken, zoneCounts);
      headline = verdict.headline;
      narrative = verdict.narrative;
      tokensUsed = verdict.tokensUsed;
      cost = verdict.cost;
      model = verdict.model;
      // cost tracking — same table as the AI chat assistant
      await prisma.apiUsage
        .create({
          data: {
            userId,
            provider: 'deepseek',
            endpoint: 'portfolio-briefing',
            model,
            totalTokens: tokensUsed,
            cost,
            statusCode: 200,
          },
        })
        .catch(() => {});
    } catch (e: any) {
      narrative = `Verdict generation failed: ${e?.message || 'unknown error'}. Scores below are still valid.`;
      const dd = scored.filter((s) => s.zone === 'double-down').map((s) => s.displayName);
      headline = dd.length ? `Point yourself at ${dd.join(' and ')}.` : 'No double-down product this run.';
    }
  } else {
    const dd = scored.filter((s) => s.zone === 'double-down').map((s) => s.displayName);
    headline = dd.length ? `Point yourself at ${dd.join(' and ')}.` : 'No double-down product this run.';
    narrative = 'DeepSeek API key not configured — showing rule-based scores without an AI verdict. Add a key in Settings or set DEEPSEEK_API_KEY.';
  }

  const { iso, dateOnly } = todayUtcDate();
  const briefing: Briefing = {
    date: iso,
    runAt: new Date().toISOString(),
    trigger,
    products: scored,
    quietlyBroken,
    zoneCounts,
    headline,
    narrative,
    beaconsReachable,
    beaconsTotal,
    tokensUsed,
    cost,
    model,
  };

  // --- persist (upsert one row per owner per day) ---
  await prisma.portfolioBriefing.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: {
      userId,
      date: dateOnly,
      runAt: new Date(),
      products: scored as any,
      headline,
      narrative,
      quietlyBroken: quietlyBroken as any,
      zoneCounts: zoneCounts as any,
      beaconsReachable,
      beaconsTotal,
      tokensUsed,
      cost,
      model,
      trigger,
    },
    update: {
      runAt: new Date(),
      products: scored as any,
      headline,
      narrative,
      quietlyBroken: quietlyBroken as any,
      zoneCounts: zoneCounts as any,
      beaconsReachable,
      beaconsTotal,
      tokensUsed,
      cost,
      model,
      trigger,
    },
  });

  // --- email (cron always; manual on request) ---
  if (opts.email) {
    const sgKey = settings?.sendgridApiKey || process.env.SENDGRID_API_KEY || '';
    const to = process.env.PORTFOLIO_EMAIL_TO || ownerEmail;
    const from = process.env.PORTFOLIO_EMAIL_FROM || ownerEmail;
    await sendBriefingEmail(briefing, { apiKey: sgKey, to, from });
  }

  return briefing;
}
