# Portfolio Growth Agent — Build Handoff & Go-Live Checklist

The full central engine is built and typechecks clean. It runs **automatically every
morning (6:00 UTC)** and emails the briefing, once the secrets below are set. This
doc is everything needed to turn it on and finish the 11 remaining beacons.

---

## What was built (code is done)

**Donkey Ideas dashboard (`apps/dashboard`)**
- `src/lib/portfolio/types.ts` — the ProjectMetrics contract types
- `src/lib/portfolio/config.ts` — the 12-product registry (archetype + beacon env key)
- `src/lib/portfolio/collect.ts` — Layer 1 (dashboard data) + Layer 2 (beacons), fail-soft
- `src/lib/portfolio/score.ts` — rules-based traction/leverage/zone + quietly-broken detector
- `src/lib/portfolio/verdict.ts` — DeepSeek verdict (reuses `deepseek-chat` + pricing)
- `src/lib/portfolio/email.ts` — SendGrid HTML briefing (no SDK dep)
- `src/lib/portfolio/run.ts` — orchestrator: collect → score → verdict → persist → email
- `src/app/api/portfolio/run/route.ts` — POST, manual trigger (owner auth)
- `src/app/api/portfolio/latest/route.ts` — GET, latest stored briefing
- `src/app/api/cron/portfolio/route.ts` — GET, daily cron (CRON_SECRET) → run + email
- `src/app/app/portfolio-agent/page.tsx` — the dashboard page (grid, verdict, table)
- `src/components/dashboard/sidebar.tsx` — "Portfolio Agent" nav entry added
- `vercel.json` — daily cron `0 6 * * *` added

**Database (`packages/database/prisma/schema.prisma`)**
- New `PortfolioBriefing` model (one row per owner per day) + `User.portfolioBriefings`

**Internal mobile app (`apps/mobile`)**
- `src/api/portfolio.ts` — client for the two endpoints
- `app/(app)/portfolio.tsx` — the Portfolio Agent tab
- `app/(app)/_layout.tsx` — tab registered in the drawer

**ArguFight (`C:\Users\beltr\argufight.v.2`)**
- `app/api/portfolio/stats/route.ts` — the reference beacon (THE TEMPLATE)

---

## Go-live checklist (what only you can do)

### 1. Push the DB migration (manual, per your workflow)
```bash
export DATABASE_URL="<direct postgres url from memory>"
npx prisma db push --schema=packages/database/prisma/schema.prisma
```
Creates the `portfolio_briefings` table. (`prisma validate` + `generate` already pass.)

### 2. Set dashboard env vars on Vercel (project: donkey-ideas)
| Var | Value |
|---|---|
| `PORTFOLIO_BEACON_SECRET` | one shared secret — `openssl rand -hex 32` |
| `CRON_SECRET` | a second random secret (Vercel cron auth) |
| `DEEPSEEK_API_KEY` | your DeepSeek key (cron has no logged-in user to read it from Settings) |
| `SENDGRID_API_KEY` | SendGrid key for the email |
| `PORTFOLIO_EMAIL_FROM` | a SendGrid-verified sender |
| `PORTFOLIO_EMAIL_TO` / `PORTFOLIO_OWNER_EMAIL` | info@donkeyideas.com |
| `BEACON_URL_ARGUFIGHT` … `BEACON_URL_MARBLE` | each product's production base URL (see §3) |

> Without `DEEPSEEK_API_KEY` the run still works — it shows the rule-based scores with
> a fallback headline instead of an AI verdict. Without `CRON_SECRET` the cron returns 401.

### 3. Give me each product's production URL
The agent needs the live base URL per product to call its beacon, e.g.
`BEACON_URL_ARGUFIGHT=https://www.argufight.com`. I know argufight.com and opticrank.com;
I need the rest. A product with no URL set is still scored from dashboard data alone.

### 4. Deploy the 11 remaining beacons
Copy ArguFight's `app/api/portfolio/stats/route.ts` into each product, change ONLY the
queries to that product's schema, keep the response shape identical, and set
`PORTFOLIO_BEACON_SECRET` (same value) in each product's env. Status:

| Product | Beacon | Notes |
|---|---|---|
| ArguFight | ✅ template built | login-session = active; MRR via central layer |
| OpticRank | ⬜ to do | Supabase orgs/usage/billing — easy |
| Top Viso | ⬜ to do | same schema family as OpticRank |
| go.viral | ⬜ to do | Stripe + RevenueCat + own analytics |
| Buildwrk | ⬜ to do | derive demos/activations from CRM tables |
| Havana | ⬜ to do | Booking/Payment tables; bookings = core action |
| Basktball | ⬜ to do | traffic real, revenue = 0 (report 0, not null) |
| CFB Social | ⬜ to do | has analytics_events/daily_stats |
| Jetdale | ⬜ to do | PostHog + product_events; pre-launch fields |
| Julyu | ⬜ to do | waitlist via Supabase; pre-launch fields |
| Kamioi | ⬜ to do | target the **kamioi.v.1** Supabase repo |
| Marble | ⬜ stub | no backend — return mostly null until instrumented |

I can write all 11 — each needs ~15 min against its schema. Say the word.

### 5. Test before trusting the cron
- **Manual:** open the dashboard → Portfolio Agent → "Run Briefing Now".
- **Cron path:** `GET https://<dashboard>/api/cron/portfolio?secret=<CRON_SECRET>` →
  should return `{ ok: true, headline, beacons, zones }` and send the email.
- Let it run for a couple of weeks. The success test: does it tell you something
  uncomfortable about a product you like — and do you agree?

---

## How the scoring works (so you can tune it)
- **traction** and **leverage** are 0–100, computed by archetype-specific weighted
  signals in `score.ts` (weights are explicit constants — change them there).
- Both are **dampened by data confidence**, so a product the agent can barely see
  sinks to cut/instrument rather than scoring high by accident.
- **Zone** = quadrant at the `HIGH = 55` threshold (also in `score.ts`).
- **Quietly broken** fires on: ≥3% funnel error rate, conversion <½ the portfolio
  median (with ≥30 sample), usage with $0 revenue, or no data at all.

## Open contract questions (still v1-draft — see metrics-contract.md §9)
1. Currency (any non-USD products?)
2. Havana is scored as a new `marketplace` archetype — keep it or fold into consumer?
3. organic/paid split: from beacons or always central GA4? (currently: central, beacon optional)
