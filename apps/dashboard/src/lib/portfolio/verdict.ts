// Portfolio Growth Agent — the verdict (DeepSeek).
//
// The scoring is deterministic; the model only NARRATES it: a blunt, evidence-
// based allocation call. Reuses the same DeepSeek endpoint, model, and pricing
// as the AI chat assistant. Returns the verdict plus token/cost for ApiUsage.

import type { ScoredProject, QuietlyBroken, Verdict, ZoneCounts } from './types';
import { ZONE_LABELS } from './types';
import { contextFor } from './config';

// Same pricing table as /api/ai/chat (deepseek-chat).
const PRICING = { input: 0.14, output: 0.28 }; // USD per 1M tokens
function calcCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * PRICING.input + (completionTokens / 1_000_000) * PRICING.output;
}

function buildPrompt(
  scored: ScoredProject[],
  broken: QuietlyBroken[],
  zones: ZoneCounts,
): string {
  const measurable = scored.filter((s) => !s.insufficientData);
  const blindSpots = scored.filter((s) => s.insufficientData);

  const rows = measurable
    .map((s) => {
      const u = s.metrics.universal;
      const facts = [
        u.mrr != null ? `MRR $${Math.round(u.mrr).toLocaleString()}` : null,
        u.organicShare != null ? `${Math.round(u.organicShare * 100)}% organic` : null,
        u.retentionD7 != null ? `D7 ${Math.round(u.retentionD7 * 100)}%` : null,
        u.signupsTrendPct != null ? `signups ${u.signupsTrendPct > 0 ? '+' : ''}${u.signupsTrendPct}%` : null,
        s.metrics.status !== 'live' ? s.metrics.status : null,
      ]
        .filter(Boolean)
        .join(', ');
      const ctx = contextFor(s.projectKey);
      return `- ${s.displayName} [${s.archetype}] → ${ZONE_LABELS[s.zone]} (traction ${s.traction}, leverage ${s.leverage}, confidence ${s.dataConfidence}%)\n    what it is: ${ctx?.thesis || 'n/a'}\n    metrics: ${facts || 'thin signal'}`;
    })
    .join('\n');

  const doubleDown = measurable.filter((s) => s.zone === 'double-down').map((s) => s.displayName);
  const blindList = blindSpots.map((s) => s.displayName).join(', ') || '(none)';

  const brokenList = broken.length
    ? broken.map((b) => `- ${b.title}: ${b.detail}`).join('\n')
    : '(none detected)';

  return `You are the allocation strategist for the Donkey Ideas portfolio of ${scored.length} products. The scoring below is computed by a deterministic engine — do NOT recompute or second-guess the numbers.

HARD RULES (violating these makes the briefing dangerous and useless):
1. NEVER recommend cutting, selling, killing, or abandoning a product in the BLIND SPOTS list. Their low scores mean THE AGENT CAN'T SEE THEM (no data feed yet), NOT that they're failing. For these, the only valid recommendation is "instrument it / add its data feed."
2. Only call a product a "double down" if it is in the DOUBLE-DOWN list below. If that list is empty, say plainly that nothing has earned a double-down yet — do NOT promote a small-tests product to double-down.
3. Base every claim on the measured products and the evidence shown. Do not invent metrics.
4. JUDGE EACH PRODUCT ON ITS OWN TERMS (see "what it is"). An app-first product (e.g. a mobile game/app) is judged on INSTALLS + engagement, NOT website signups — do not call it failing or recommend cutting it for low web signups if installs are healthy. A product with no revenue model is not "zero revenue = cut" if its installs/engagement are strong. A seasonal product's off-season lull is expected. An early fintech's low volume is expected.

DATA COVERAGE: ${measurable.length}/${scored.length} products have real signal; ${blindSpots.length} are blind spots.
DOUBLE-DOWN products (the ONLY ones you may call double-down): ${doubleDown.length ? doubleDown.join(', ') : 'NONE'}
BLIND SPOTS (never recommend cutting these — recommend instrumenting): ${blindList}

MEASURED PRODUCTS (within-archetype):
${rows || '(none have real signal yet)'}

QUIETLY BROKEN (bug/gap, not marketing):
${brokenList}

Write the verdict for a busy solo operator. Be direct and evidence-based, but honest about uncertainty: if coverage is thin, say the briefing is provisional until beacons are added. Reply with ONLY a JSON object of this exact shape:
{
  "headline": "1-2 sentences: where to point attention now given what's actually measurable. If nothing is a double-down, say so. Never tell the user to cut a blind-spot product.",
  "narrative": "1 short paragraph (3-5 sentences): the reasoning, including that blind-spot products need instrumentation before any cut/keep call."
}`;
}

// Per-account daily summaries — one punchy line per product. Batched into a
// single DeepSeek call. Returns { projectKey: summary } and token usage.
export async function generateAccountSummaries(
  apiKey: string,
  scored: ScoredProject[],
): Promise<{ summaries: Record<string, string>; tokensUsed: number; cost: number }> {
  const lines = scored
    .map((s) => {
      const u = s.metrics.universal;
      const facts = [
        `traction ${s.traction}`,
        `leverage ${s.leverage}`,
        ZONE_LABELS[s.zone],
        u.signups28d != null ? `${u.signups28d} signups/28d` : null,
        u.signupsTrendPct != null ? `${u.signupsTrendPct > 0 ? '+' : ''}${u.signupsTrendPct}%` : null,
        u.mau != null ? `${u.mau} MAU` : null,
        u.mrr ? `$${Math.round(u.mrr)} MRR` : null,
        u.payingUsers != null ? `${u.payingUsers} paying` : null,
        u.installs28d != null ? `${u.installs28d} installs` : null,
        s.insufficientData ? 'NO DATA FEED' : null,
      ].filter(Boolean).join(', ');
      const ctx = contextFor(s.projectKey);
      return `${s.projectKey} — ${s.displayName} [${s.archetype}]: ${ctx?.thesis || ''} | metrics: ${facts}`;
    })
    .join('\n');

  const prompt = `For EACH product below, write ONE punchy sentence (max ~22 words): its current state and the single most important next action. Judge each product on ITS OWN primary metric described in its line — an app-first/mobile product on INSTALLS (not website signups), a SaaS on revenue, a seasonal product allowing for off-season, an early fintech allowing for low volume. Never suggest cutting an app-first product for low web signups, and for NO DATA FEED products the action is "instrument it / add a data feed." Be specific and blunt.

PRODUCTS:
${lines}

Reply with ONLY a JSON object mapping each product key to its one-sentence summary: { "argufight": "...", "opticrank": "...", ... }`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a sharp portfolio analyst writing terse daily account summaries. You always return valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) return { summaries: {}, tokensUsed: 0, cost: 0 };
  const data = await res.json();
  const usage = data.usage ?? {};
  let summaries: Record<string, string> = {};
  try { summaries = JSON.parse(data.choices?.[0]?.message?.content ?? '{}'); } catch { summaries = {}; }
  return {
    summaries,
    tokensUsed: usage.total_tokens ?? 0,
    cost: calcCost(usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
  };
}

export async function generateVerdict(
  apiKey: string,
  scored: ScoredProject[],
  broken: QuietlyBroken[],
  zones: ZoneCounts,
): Promise<Verdict> {
  const prompt = buildPrompt(scored, broken, zones);

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a sharp, no-nonsense portfolio allocation strategist. You tell the truth about which products deserve effort and which are dead weight, even when it stings. You always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'DeepSeek request failed');
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const usage = data.usage ?? {};
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;

  let headline = '';
  let narrative = '';
  try {
    const parsed = JSON.parse(raw);
    headline = String(parsed.headline ?? '').trim();
    narrative = String(parsed.narrative ?? '').trim();
  } catch {
    // Fallback: use the raw text as the narrative.
    narrative = String(raw).trim();
  }
  if (!headline) {
    const top = scored.filter((s) => s.zone === 'double-down').map((s) => s.displayName);
    headline = top.length
      ? `Point yourself at ${top.join(' and ')}.`
      : 'No clear double-down product this run — focus on fixing the quietly-broken funnels first.';
  }

  return {
    headline,
    narrative,
    tokensUsed: usage.total_tokens ?? promptTokens + completionTokens,
    cost: calcCost(promptTokens, completionTokens),
    model: data.model || 'deepseek-chat',
  };
}
