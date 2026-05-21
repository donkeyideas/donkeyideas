'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MarbleRacingNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header>
      <div className="wrap nav">
        <Link className="brand" href="/games/marble-racing" aria-label="Donkey Marble Racing home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="app-icon" src="/games/marble-racing/app-icon.png" alt="Donkey Marble Racing app icon" />
          <span className="wordmark">
            Donkey<br />Marble <em>Racing</em>
          </span>
        </Link>
        <nav className={`nav-links${open ? ' open' : ''}`} id="navlinks">
          <a href="/games/marble-racing#marbles" onClick={close}>Marbles</a>
          <a href="/games/marble-racing#features" onClick={close}>Features</a>
          <a href="/games/marble-racing#gallery" onClick={close}>Screenshots</a>
          <a href="/games/marble-racing#how" onClick={close}>How it works</a>
          <a className="btn btn-gold" href="/games/marble-racing#download" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1zM5 19h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z"
              />
            </svg>
            Download
          </a>
        </nav>
        <button
          className="menu-toggle"
          type="button"
          id="menuBtn"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M3 6h18v2.2H3zm0 4.9h18v2.2H3zm0 4.9h18V18H3z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
