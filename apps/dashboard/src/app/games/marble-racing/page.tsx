import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Donkey Marble Racing — Pick your marble. Place your bet. Let physics decide.',
  description:
    'Donkey Marble Racing — a physics-driven marble racing & virtual-coin betting game. 8 glossy marbles, real Matter.js physics, live odds, tournaments & seasons. Download free.',
  alternates: {
    canonical: 'https://www.donkeyideas.com/games/marble-racing',
  },
  openGraph: {
    title: 'Donkey Marble Racing — Pick your marble. Place your bet. Let physics decide.',
    description:
      'A physics-driven marble racing & virtual-coin betting game. 8 glossy marbles, real Matter.js physics, live odds, tournaments & seasons.',
    url: 'https://www.donkeyideas.com/games/marble-racing',
  },
};

const APP_STORE_URL = 'https://apps.apple.com/us/app/donkey-marble-racing/id6769627792';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.donkeymarble.racing';

type Stat = 'SPD' | 'PWR' | 'BNC' | 'LCK';

const ROSTER: {
  key: string;
  name: string;
  trait: string;
  color: string;
  s: Record<Stat, number>;
}[] = [
  { key: 'dash', name: 'Dash', trait: 'Reckless', color: 'var(--c-dash)', s: { SPD: 9, PWR: 7, BNC: 5, LCK: 4 } },
  { key: 'spike', name: 'Spike', trait: 'Aggressive', color: 'var(--c-spike)', s: { SPD: 7, PWR: 9, BNC: 4, LCK: 5 } },
  { key: 'rocky', name: 'Rocky', trait: 'Steady', color: 'var(--c-rocky)', s: { SPD: 5, PWR: 8, BNC: 6, LCK: 6 } },
  { key: 'lucky', name: 'Lucky', trait: 'Chaotic', color: 'var(--c-lucky)', s: { SPD: 6, PWR: 5, BNC: 7, LCK: 10 } },
  { key: 'frosty', name: 'Frosty', trait: 'Calm', color: 'var(--c-frosty)', s: { SPD: 6, PWR: 6, BNC: 8, LCK: 7 } },
  { key: 'nova', name: 'Nova', trait: 'Flashy', color: 'var(--c-nova)', s: { SPD: 8, PWR: 6, BNC: 7, LCK: 6 } },
  { key: 'shadow', name: 'Shadow', trait: 'Mysterious', color: 'var(--c-shadow)', s: { SPD: 7, PWR: 7, BNC: 5, LCK: 8 } },
  { key: 'aqua', name: 'Aqua', trait: 'Slippery', color: 'var(--c-aqua)', s: { SPD: 8, PWR: 5, BNC: 9, LCK: 5 } },
];

function StarRow() {
  return (
    <span className="star" aria-label="5 out of 5 stars" role="img">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01z"
          />
        </svg>
      ))}
    </span>
  );
}

function AppStoreBadge() {
  return (
    <a
      className="store-badge"
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener"
      aria-label="Download on the App Store"
    >
      <span className="glyph">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M16.37 12.78c.03 3.27 2.87 4.36 2.9 4.37-.02.08-.45 1.55-1.49 3.07-.9 1.31-1.83 2.62-3.3 2.65-1.44.03-1.91-.85-3.56-.85-1.65 0-2.17.82-3.53.88-1.42.05-2.5-1.42-3.41-2.73-1.86-2.68-3.28-7.57-1.37-10.87.95-1.64 2.64-2.68 4.48-2.71 1.39-.03 2.7.94 3.56.94.85 0 2.45-1.16 4.13-.99.7.03 2.68.28 3.95 2.13-.1.06-2.36 1.38-2.33 4.11M13.66 3.6c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.42.73-3.21 1.65-.71.81-1.33 2.11-1.16 3.36 1.22.09 2.47-.62 3.24-1.54"
          />
        </svg>
      </span>
      <span className="txt">
        <small>Download on the</small>
        <span>App Store</span>
      </span>
    </a>
  );
}

function GooglePlayBadge() {
  return (
    <a
      className="store-badge"
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener"
      aria-label="Get it on Google Play"
    >
      <span className="glyph">&#9654;</span>
      <span className="txt">
        <small>Get it on</small>
        <span>Google Play</span>
      </span>
    </a>
  );
}

export default function MarbleRacingLandingPage() {
  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy reveal">
            <span className="pill">
              <span className="dot" />
              Out now on iOS &amp; Android
            </span>
            <h1 className="hero-title">
              Donkey<br />Marble <em>Racing</em>
            </h1>
            <p className="tag">Pick your marble. Place your bet. Let physics decide.</p>
            <p className="sub">
              Eight glossy marbles tumble down wild, physics-driven tracks — no scripts, no rigging. Bet virtual coins
              on live odds and watch chaos crown a winner.
            </p>
            <div className="hero-cta" id="download">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
            <div className="hero-meta">
              <span>
                <StarRow /> &nbsp;Casual gamers&apos; favorite
              </span>
              <span className="sep" />
              <span>8 racers · 266 tracks</span>
              <span className="sep" />
              <span>Free to play</span>
            </div>
          </div>
          <div className="hero-visual reveal">
            <div className="float-card fc-1">
              <span className="marble m-lucky" />
              <span>
                <span className="fc-t">LUCKY</span>
                <br />
                <span className="fc-s">Odds 9.5x · long shot</span>
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="frame"
              src="/games/marble-racing/hero-race.svg"
              alt="Marbles racing down a glowing night track"
            />
            <div className="float-card fc-2">
              <span className="marble m-rocky" />
              <span>
                <span className="fc-t">BET WON</span>
                <br />
                <span className="fc-s">+4,750 coins</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MARQUEE STRIP ================= */}
      <div className="strip" aria-hidden="true">
        <div className="marquee">
          <span className="item">
            <span className="marble m-dash" />
            Real Matter.js physics
          </span>
          <span className="item alt">Live betting odds</span>
          <span className="item">
            <span className="marble m-spike" />
            266 wild tracks
          </span>
          <span className="item alt">8-player multiplayer</span>
          <span className="item">
            <span className="marble m-nova" />
            Seasons &amp; playoffs
          </span>
          <span className="item alt">No two races alike</span>
          <span className="item">
            <span className="marble m-dash" />
            Real Matter.js physics
          </span>
          <span className="item alt">Live betting odds</span>
          <span className="item">
            <span className="marble m-spike" />
            266 wild tracks
          </span>
          <span className="item alt">8-player multiplayer</span>
          <span className="item">
            <span className="marble m-nova" />
            Seasons &amp; playoffs
          </span>
          <span className="item alt">No two races alike</span>
        </div>
      </div>

      {/* ================= MEET THE MARBLES ================= */}
      <section className="sec" id="marbles">
        <div className="wrap">
          <div className="sec-head center reveal">
            <p className="kicker">The Starting Grid</p>
            <h2>
              Meet the <em>Marbles</em>
            </h2>
            <p>
              Eight racers, eight personalities. Every one has its own blend of Speed, Power, Bounce and Luck — learn
              the roster, pick a favorite, ride it all season.
            </p>
          </div>
          <div className="roster-grid">
            {ROSTER.map((m, i) => (
              <article
                key={m.key}
                className="card-marble reveal"
                style={
                  {
                    '--accent': m.color,
                    transitionDelay: `${(i % 4) * 0.06}s`,
                  } as React.CSSProperties
                }
              >
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <div className="sphere-wrap">
                  <span className={`marble m-${m.key}`} />
                </div>
                <div className="mname">{m.name}</div>
                <div className="mtrait">{m.trait}</div>
                {(Object.entries(m.s) as [Stat, number][]).map(([k, v]) => (
                  <div className="stat" key={k}>
                    <div className="stat-row">
                      <span className="lbl">{k}</span>
                      <span className="val">{v}/10</span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${v * 10}%` }} />
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="sec" id="features" style={{ background: 'rgba(8,18,40,.45)' }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="kicker">Why You&apos;ll Stay</p>
            <h2>
              More than a <em>race</em>
            </h2>
            <p>
              From a single quick race to a full championship season — Donkey Marble Racing is packed with modes that
              keep the marbles rolling.
            </p>
          </div>
          <div className="feat-grid">
            <article className="feat f1 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 1h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.18.07.47-.03.61-.22l2-3.46a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"
                  />
                </svg>
              </div>
              <h3>Physics-driven races</h3>
              <p>
                Eight marbles, real Matter.js physics, every bump and bounce simulated. No scripted outcomes — the
                track decides the winner.
              </p>
              <div className="tags">
                <span>Matter.js</span>
                <span>No rigging</span>
              </div>
            </article>
            <article className="feat f2 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".65" />
                  <path
                    fill="currentColor"
                    d="M12 8.3c-1.3 0-2.3.5-2.3 1.6 0 1 .8 1.4 2 1.7 1.1.3 1.4.5 1.4.9 0 .4-.4.6-1.1.6-.8 0-1.4-.3-1.9-.7l-.7 1.2c.5.4 1.2.7 2 .8v1.1h1.2v-1.1c1.3-.2 2.1-.9 2.1-1.9 0-1.1-.8-1.5-2.1-1.8-1-.3-1.3-.4-1.3-.8 0-.3.3-.5 1-.5.7 0 1.3.2 1.8.6l.7-1.2c-.5-.3-1.1-.6-1.8-.7V7h-1.2z"
                  />
                </svg>
              </div>
              <h3>Bet &amp; win</h3>
              <p>
                Place virtual-coin bets with live, shifting odds. Back the favorite for safe coins — or take the long
                shot for a massive payout.
              </p>
              <div className="tags">
                <span>Live odds</span>
                <span>Up to 9.5x</span>
              </div>
            </article>
            <article className="feat f3 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M18 4h3v2.5a3.5 3.5 0 0 1-3.5 3.5h-.36A6 6 0 0 1 13 13.9V17h3a1 1 0 0 1 1 1v1H7v-1a1 1 0 0 1 1-1h3v-3.1A6 6 0 0 1 6.86 10H6.5A3.5 3.5 0 0 1 3 6.5V4h3V3h12zM6 6H5v.5A1.5 1.5 0 0 0 6.5 8H6zm12 0v2h.5A1.5 1.5 0 0 0 20 6.5V6z"
                  />
                </svg>
              </div>
              <h3>Tournaments</h3>
              <p>
                Three stake tiers — Bronze Cup, Silver Cup and Gold Cup. King of the Hill: 8 marbles race — last place
                eliminated each round until one champion remains.
              </p>
              <div className="tags">
                <span>Bronze</span>
                <span>Silver</span>
                <span>Gold</span>
              </div>
            </article>
            <article className="feat f4 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 8H5v9h14zm-9 2v2H8v-2zm4 0v2h-2v-2zm4 0v2h-2v-2zm-8 4v2H8v-2zm4 0v2h-2v-2z"
                  />
                </svg>
              </div>
              <h3>Season mode</h3>
              <p>
                Commit to a full 10-week season. Climb the standings race by race, fight into the playoffs and chase a
                championship banner.
              </p>
              <div className="tags">
                <span>10 weeks</span>
                <span>Playoffs</span>
              </div>
            </article>
            <article className="feat f5 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M9 1h6v2H9zm3 4a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm1 2v4.59l3 3-1.41 1.41L11 13.41V9zM19.04 4.55l1.41 1.41-2.12 2.12-1.41-1.41z"
                  />
                </svg>
              </div>
              <h3>National races</h3>
              <p>
                Timed daily events — Grand Prix, Marble Mile, Speed Demon and Chaos Cup — each with multiplier payouts.
                Show up or miss out.
              </p>
              <div className="tags">
                <span>Daily</span>
                <span>Multipliers</span>
              </div>
            </article>
            <article className="feat f6 reveal">
              <div className="ico">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M9 13.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm-2.83-3.33a6 6 0 0 1 10.66 0l-1.78 1.04a4 4 0 0 0-7.1 0zM3.4 6.84a11 11 0 0 1 17.2 0l-1.78 1.05a9 9 0 0 0-13.64 0zM8.5 18h7l2 4h-11z"
                  />
                </svg>
              </div>
              <h3>Multiplayer</h3>
              <p>
                Jump into real-time 8-player lobbies. Draft your marble in a live snake draft, then race head-to-head
                against real opponents.
              </p>
              <div className="tags">
                <span>8 players</span>
                <span>Live draft</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="sec" id="gallery">
        <div className="wrap">
          <div className="sec-head center reveal">
            <p className="kicker">Inside the App</p>
            <h2>
              See it in <em>motion</em>
            </h2>
            <p>Glossy marbles, chunky type, gold everywhere. Here&apos;s a peek at race day.</p>
          </div>
          <div className="gallery">
            <figure className="phone reveal">
              <div className="notch" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/marble-racing/shot-race.svg" alt="A live marble race in progress" />
              <figcaption className="cap">Live Race</figcaption>
            </figure>
            <figure className="phone reveal">
              <div className="notch" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/marble-racing/shot-betting.svg" alt="The betting screen with live odds" />
              <figcaption className="cap">Place a Bet</figcaption>
            </figure>
            <figure className="phone reveal">
              <div className="notch" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/marble-racing/shot-bracket.svg" alt="Gold Cup tournament bracket" />
              <figcaption className="cap">Tournament</figcaption>
            </figure>
            <figure className="phone reveal">
              <div className="notch" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/marble-racing/shot-results.svg" alt="Race results podium with payout" />
              <figcaption className="cap">Podium</figcaption>
            </figure>
            <figure className="phone reveal">
              <div className="notch" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/marble-racing/shot-roster.svg" alt="The full marble roster screen" />
              <figcaption className="cap">The Roster</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="sec" id="how" style={{ background: 'rgba(8,18,40,.45)' }}>
        <div className="wrap">
          <div className="sec-head center reveal">
            <p className="kicker">Race Day in 3</p>
            <h2>
              How it <em>works</em>
            </h2>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="n">1</div>
              <h3>Pick your marble</h3>
              <p>Study the odds, read the roster stats, and back the racer you believe in — favorite or underdog.</p>
            </div>
            <div className="step reveal">
              <div className="n">2</div>
              <h3>Place your bet</h3>
              <p>Stake virtual coins. Live odds mean a long-shot win pays huge — and yes, those coins are pretend.</p>
            </div>
            <div className="step reveal">
              <div className="n">3</div>
              <h3>Let physics decide</h3>
              <p>Drop the marbles and watch. Pure simulation, total chaos, one checkered flag. Then run it back.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="sec" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <div className="cta-band reveal">
            <div className="marbles-row">
              <span className="marble m-dash" />
              <span className="marble m-spike" />
              <span className="marble m-rocky" />
              <span className="marble m-lucky" />
              <span className="marble m-frosty" />
              <span className="marble m-nova" />
              <span className="marble m-shadow" />
              <span className="marble m-aqua" />
            </div>
            <h2>
              Download <em>free</em>.<br />The marbles are waiting.
            </h2>
            <p>Join the start line — pick a marble, place your bet and let the physics fly. No cost, no catch.</p>
            <div className="hero-cta">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
