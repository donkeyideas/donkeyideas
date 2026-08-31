'use client';

import { useState } from 'react';

// Fractional CFO lead form. Submits to the SAME endpoint as the site contact
// form (/api/contact), tagged source/interest = 'fractional-cfo', so requests
// land in the admin inbox at /app/messages (filterable by source). Includes a
// honeypot field (_hp) that silently drops bots server-side.
const STAGES = [
  'Pre-revenue',
  '$0–$500K revenue',
  '$500K–$1M revenue',
  '$1M–$10M revenue',
  '$10M+ revenue',
];

export default function CfoLeadForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const company = String(fd.get('company') || '').trim();
    const stage = String(fd.get('stage') || '').trim();
    const detail = String(fd.get('message') || '').trim();
    const hp = String(fd.get('_hp') || '');

    // All fields are mandatory — cuts down on low-effort spam.
    if (!name || !email || !company || !stage || !detail) {
      setStatus('error');
      setError('Please fill in every field so I can give you a useful read.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    // Compose a single message body that preserves the revenue stage (the
    // ContactSubmission model has no dedicated stage column).
    const message = [`Revenue stage: ${stage}`, detail].filter(Boolean).join('\n\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: company || null,
          message,
          interest: 'fractional-cfo',
          source: 'fractional-cfo',
          _hp: hp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }
      setStatus('ok');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  }

  if (status === 'ok') {
    return (
      <div className="form-ok">
        <h3>Request received.</h3>
        <p>Thanks — I&apos;ll personally review your numbers and get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      <div className="row2">
        <div className="field">
          <label htmlFor="cfo-name">Name</label>
          <input id="cfo-name" name="name" type="text" required autoComplete="name" placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="cfo-email">Email</label>
          <input id="cfo-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="cfo-company">Company</label>
          <input id="cfo-company" name="company" type="text" required autoComplete="organization" placeholder="Company name" />
        </div>
        <div className="field">
          <label htmlFor="cfo-stage">Revenue stage</label>
          <select id="cfo-stage" name="stage" required defaultValue="">
            <option value="" disabled>Select…</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="cfo-message">What do you need help with?</label>
        <textarea id="cfo-message" name="message" required placeholder="A raise, cash-flow visibility, a model you can defend to investors…" />
      </div>

      {/* Honeypot — hidden from humans; bots fill it and get dropped server-side. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="cfo-hp">Do not fill this out</label>
        <input id="cfo-hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === 'error' && <div className="form-err">{error}</div>}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Request a free CFO call'}
      </button>
      <p className="form-note">All fields required. Free 30-minute diagnostic — no pressure, no obligation.</p>
    </form>
  );
}
