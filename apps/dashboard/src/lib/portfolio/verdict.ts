// Portfolio Growth Agent — the verdict (DeepSeek).
//
// The scoring is deterministic; the model only NARRATES it: a blunt, evidence-
// based allocation call. Reuses the same DeepSeek endpoint, model, and pricing
// as the AI chat assistant. Returns the verdict plus token/cost for ApiUsage.

import type { ScoredProject, QuietlyBroken, Verdict, ZoneCounts } from './types';
import { ZONE_LABELS } from './types';

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
  const rows = scored
    .map((s) => {
      const u = s.metrics.universal;
      const facts = [
        u.mrr != null ? `MRR $${Math.round(u.mrr).toLocaleString()}` : null,
        u.organicShare != null ? `${Math.round(u.organicShare * 100)}% organic` : null,
        u.retentionD7 != null ? `D7 ${Math.round(u.retentionD7 * 100)}%` : null,
        u.signupsTrendPct != null ? `signups ${u.signupsTrendPct > 0 ? '+' : ''}${u.signupsTrendPct}%` : null,
        s.metrics.status !== 'live' ? s.metrics.status : null,
        s.metrics.source === 'unreachable' ? 'NO DATA (beacon down)' : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `- ${s.displayName} [${s.archetype}] traction ${s.traction}/100, leverage ${s.leverage}/100 → ${ZONE_LABELS[s.zone]}. ${facts || 'little signal'}`;
    })
    .join('\n');

  const brokenList = broken.length
    ? broken.map((b) => `- ${b.title}: ${b.detail}`).join('\n')
    : '(none detected)';

  return `You are the allocation strategist for the Donkey Ideas portfolio of ${scored.length} products. The scoring below is already computed by a deterministic engine — do NOT recompute or second-guess the numbers. Your job is to deliver the blunt, investor-grade allocation call a busy solo operator can act on in the next hour.

ZONE TALLY: ${zones.doubleDown} double-down, ${zones.smallTests} small-tests, ${zones.protectPartner} protect/partner, ${zones.cutPauseSell} cut/pause/sell.

SCORED PRODUCTS (within-archetype):
${rows}

QUIETLY BROKEN (bug/gap, not marketing):
${brokenList}

Write the verdict. Be direct and specific — name products, call out dead weight plainly, and separate a broken funnel from an empty one. Do not hedge. Reply with ONLY a JSON object of this exact shape:
{
  "headline": "1-2 sentences: where to point attention now, and what to cut/park. Name names.",
  "narrative": "1 short paragraph (3-5 sentences) of supporting reasoning grounded in the evidence above."
}`;
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
