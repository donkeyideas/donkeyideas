'use client';

import { useState } from 'react';

// Homepage "Pitch your idea" form. Submits to the SAME endpoint as the site
// contact form (/api/contact), tagged source/interest = 'venture-pitch', so
// requests land in the admin inbox at /app/messages (and the mobile Messages
// tab). Includes a honeypot field (_hp) that silently drops bots server-side.
//
// IMPORTANT positioning: Donkey Ideas is a venture STUDIO — we build, we don't
// fund. The form copy makes that explicit so nobody mistakes this for a VC
// pitch inbox. All fields are mandatory to cut down on low-effort spam.
const STAGES = [
  'Just an idea / napkin sketch',
  'Prototype or MVP',
  'Live with early users',
  'Live with revenue',
];

const INVOLVEMENT = [
  "I want Donkey Ideas to build it",
  "I want to build it together",
  "I already have something — want a partner",
  "Not sure yet",
];

export default function PitchLeadForm() {
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
    const involvement = String(fd.get('involvement') || '').trim();
    const detail = String(fd.get('message') || '').trim();
    const hp = String(fd.get('_hp') || '');

    // All fields are mandatory — cuts down on low-effort spam.
    if (!name || !email || !company || !stage || !involvement || !detail) {
      setStatus('error');
      setError('Please fill in every field so I can actually weigh the idea.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    // The ContactSubmission model has no dedicated stage/involvement columns —
    // fold them into the message body so nothing is lost in the admin inbox.
    const message = [
      `Stage: ${stage}`,
      `What they want: ${involvement}`,
      detail,
    ].filter(Boolean).join('\n\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          message,
          interest: 'venture-pitch',
          source: 'pitch',
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
        <h3>Pitch received.</h3>
        <p>Thanks — I read every one personally and get back within a few days. If it&apos;s a fit to build, we&apos;ll talk about what that looks like.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      <div className="row2">
        <div className="field">
          <label htmlFor="pitch-name">Name</label>
          <input id="pitch-name" name="name" type="text" required autoComplete="name" placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="pitch-email">Email</label>
          <input id="pitch-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="pitch-company">Company / project</label>
          <input id="pitch-company" name="company" type="text" required autoComplete="organization" placeholder="What it's called" />
        </div>
        <div className="field">
          <label htmlFor="pitch-stage">Where it stands</label>
          <select id="pitch-stage" name="stage" required defaultValue="">
            <option value="" disabled>Select…</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pitch-involvement">What you&apos;re looking for</label>
        <select id="pitch-involvement" name="involvement" required defaultValue="">
          <option value="" disabled>Select…</option>
          {INVOLVEMENT.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="pitch-message">The idea, in a few sentences</label>
        <textarea id="pitch-message" name="message" required placeholder="What it does, who it's for, and why it's worth building…" />
      </div>

      {/* Honeypot — hidden from humans; bots fill it and get dropped server-side. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="pitch-hp">Do not fill this out</label>
        <input id="pitch-hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === 'error' && <div className="form-err">{error}</div>}

      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Pitch your idea'}
      </button>
      <p className="form-note">All fields required. We&apos;re a venture studio — we build, we don&apos;t fund. This isn&apos;t a VC inbox.</p>
    </form>
  );
}
