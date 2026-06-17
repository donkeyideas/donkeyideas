// Portfolio Growth Agent — email delivery via SendGrid HTTPS API (no SDK dep).
// Fail-soft: returns false on any problem, never throws into the run.

import type { Briefing } from './types';
import { ZONE_LABELS } from './types';

const ZONE_COLOR: Record<string, string> = {
  'double-down': '#34d399',
  'small-tests': '#4d8df6',
  'protect-or-partner': '#eab308',
  'cut-pause-sell': '#f87171',
};

export function renderBriefingHtml(b: Briefing): string {
  const rows = b.products
    .map(
      (p) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025;font-weight:600;color:#f4f5f7">${p.displayName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025;color:#8b8e96;font-size:12px;text-transform:capitalize">${p.archetype.replace('-', ' / ')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025;color:#c9ccd2">${p.traction}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025;color:#c9ccd2">${p.leverage}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025"><span style="color:${ZONE_COLOR[p.zone]};font-weight:700;font-size:12px">${ZONE_LABELS[p.zone]}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #1e2025;color:#8b8e96;font-size:12px">${p.why}</td>
      </tr>`,
    )
    .join('');

  const broken = b.quietlyBroken.length
    ? b.quietlyBroken
        .map(
          (q) =>
            `<li style="margin-bottom:8px;color:#c9ccd2"><b style="color:#f87171">${q.title}</b><br/><span style="color:#8b8e96;font-size:13px">${q.detail}</span></li>`,
        )
        .join('')
    : '<li style="color:#8b8e96">None detected.</li>';

  return `<div style="background:#0a0b0d;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#f4f5f7">
    <h1 style="font-size:22px;margin:0 0 4px">Portfolio Growth Agent</h1>
    <p style="color:#8b8e96;margin:0 0 20px">Daily allocation briefing · ${b.date} · ${b.beaconsReachable}/${b.beaconsTotal} beacons reachable</p>
    <div style="background:#101822;border:1px solid #20303f;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="color:#4d8df6;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700">The call</div>
      <h2 style="font-size:18px;margin:8px 0;line-height:1.4">${b.headline}</h2>
      <p style="color:#c9ccd2;margin:0">${b.narrative}</p>
    </div>
    <h3 style="font-size:14px;margin:0 0 8px">Quietly broken</h3>
    <ul style="padding-left:18px;margin:0 0 22px">${broken}</ul>
    <h3 style="font-size:14px;margin:0 0 8px">All products — ranked</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="text-align:left;color:#62656d;font-size:11px;text-transform:uppercase">
        <th style="padding:6px 10px">Product</th><th style="padding:6px 10px">Archetype</th>
        <th style="padding:6px 10px">Trac</th><th style="padding:6px 10px">Lev</th>
        <th style="padding:6px 10px">Zone</th><th style="padding:6px 10px">Why</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#62656d;font-size:11px;margin-top:20px">Run ${b.trigger} · ${b.tokensUsed} tokens · $${b.cost.toFixed(4)} · ${b.model}</p>
  </div>`;
}

export async function sendBriefingEmail(
  b: Briefing,
  opts: { apiKey: string; to: string; from: string },
): Promise<boolean> {
  if (!opts.apiKey || !opts.to || !opts.from) return false;
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: opts.from, name: 'Donkey Ideas Portfolio Agent' },
        subject: `Portfolio briefing — ${b.date}: ${b.headline.slice(0, 80)}`,
        content: [{ type: 'text/html', value: renderBriefingHtml(b) }],
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('Portfolio email failed:', e);
    return false;
  }
}
