# Portfolio Growth Agent — `ProjectMetrics` Contract (v1)

**Status:** Draft spec — the keystone artifact. Every product's beacon returns this exact shape.
**Owner:** Donkey Ideas (central)
**Rule:** Change this contract in **one place**, bump `contractVersion`, and every beacon copies it. Never let a single product invent its own field.

---

## 1. Why this exists

The agent compares 12 products that have nothing in common internally (ArguFight's `eloRating`, go.viral's `deals`, Havana's `Booking`). It can only do that if every product answers the **same questions the same way**. This contract *is* that agreement. The danger isn't missing data — it's **silent disagreement** (one app counting "active" as "opened the app," another as "performed the core action"). So every ambiguous metric ships with a `definitions` note stating exactly how that product computed it.

**Principle:** read-only, fail-soft, honest. A beacon never writes anything, never crashes the agent if it's down, and reports `null` (not a guess) for anything it can't measure yet.

---

## 2. Transport

| Item | Spec |
|---|---|
| **Endpoint** | `GET /api/portfolio/stats` on each product's own domain |
| **Auth** | Header `x-portfolio-secret: <PORTFOLIO_BEACON_SECRET>` — one shared secret, stored per-repo as an env var. Reject with `401` if absent/wrong. |
| **Method** | `GET` only. The endpoint must have **no side effects** and touch only read replicas / read queries. |
| **Response** | `200` + JSON envelope below. On internal error, return `200` with `status:"error"` and an `errors[]` array — do **not** 500, so one sick app doesn't poison the run. |
| **Caching** | Beacon may cache its own result up to 1h (these are daily-grade metrics; no need to hammer prod on every agent call). Report the cache time in `meta.dataAsOf`. |
| **Timeout** | Agent gives each beacon 10s, then flags it `unreachable` and moves on. |
| **Window** | All counts are over **complete UTC days** (yesterday backward), never partial today, so trends are comparable across apps in different timezones. |

---

## 3. Response envelope

```jsonc
{
  "meta": {
    "projectKey": "argufight",          // stable slug, never changes
    "displayName": "ArguFight",
    "archetype": "consumer-viral",      // see §6
    "status": "live",                   // "live" | "pre-launch" | "down" | "error"
    "contractVersion": "1.0.0",
    "generatedAt": "2026-06-17T06:00:00Z",
    "dataAsOf": "2026-06-16T23:59:59Z",  // last complete day included
    "currency": "USD"
  },
  "universal": { /* §4 — every product fills this */ },
  "archetype": { /* §6 — only the block matching meta.archetype */ },
  "definitions": { /* §5 — plain-English note per ambiguous field */ },
  "errors": []                          // strings; partial failures, never throw
}
```

Any numeric field the product genuinely cannot measure yet → **`null`**. The scorer treats `null` as "no signal" (neither good nor bad), never as zero. Reporting `0` means "measured, and it's zero" — a real and often damning signal (see Basktball revenue).

---

## 4. Universal metrics (every product, every archetype)

These are the spec's "honest traction signals." Trends matter more than absolutes — always report the pair, not a single number.

### 4.1 Acquisition
| Field | Type | Definition |
|---|---|---|
| `signups7d` | int\|null | Distinct **new** user/account records created in the last 7 complete UTC days. |
| `signups28d` | int\|null | Same, last 28 complete days. |
| `signupsTrendPct` | float\|null | `signups28d` vs the **prior** 28-day window, as % change. `+12.5` = up 12.5%. The "is it growing" signal. |
| `installs28d` | int\|null | App installs (mobile products only) last 28d, if obtainable from the app's own DB. Store-level installs come from the dashboard's App Store / Play aggregators — leave `null` if you only have store data. |

### 4.2 Engagement & stickiness
| Field | Type | Definition |
|---|---|---|
| `dau` | int\|null | Distinct users who performed the product's **core action** (not merely opened) on the last complete day. Define the core action in `definitions.activeUser`. |
| `wau` | int\|null | Same, rolling 7 days. |
| `mau` | int\|null | Same, rolling 28 days. |
| `stickiness` | float\|null | `dau / mau`, 0–1. Compute it yourself so the definition of "active" is consistent with your DAU/MAU. |

### 4.3 Retention (the single best "is this real" signal)
| Field | Type | Definition |
|---|---|---|
| `retentionD1` | float\|null | Of users who first signed up ~1 day ago, % who returned and performed the core action the next day. 0–1. |
| `retentionD7` | float\|null | Same, day 7. |
| `retentionD30` | float\|null | Same, day 30. |
| `retentionProxy` | float\|null | Fallback if true cohort retention is hard: % of **last period's** new users active **this** period. Report this if D1/D7/D30 are `null`. |

### 4.4 Revenue
| Field | Type | Definition |
|---|---|---|
| `mrr` | float\|null | Monthly recurring revenue right now, in `meta.currency`. Subscription products only — `null` if not subscription-based. |
| `revenue28d` | float\|null | All recognized revenue last 28 complete days (covers one-off / marketplace / transactional products). |
| `revenueTrendPct` | float\|null | `revenue28d` vs prior 28d, % change. |
| `payingUsers` | int\|null | Distinct paying/subscribed users right now. |
| `arpu` | float\|null | `revenue28d / mau`. Compute yourself. |

### 4.5 Channels — organic vs paid
| Field | Type | Definition |
|---|---|---|
| `organicShare` | float\|null | Share of last-28d new users who arrived **without paid acquisition** (organic search, direct, referral, viral). 0–1. The single best "is this real or am I buying it" signal. |
| `paidShare` | float\|null | `1 - organicShare` where known. |

> If the product can't attribute channels itself, leave both `null` — the dashboard's GA4 layer fills organic/paid centrally.

### 4.6 Funnel health (separates a *broken* funnel from an *empty* one)
| Field | Type | Definition |
|---|---|---|
| `criticalStep` | string\|null | Name of the 1 make-or-break step (e.g. `"signup→first_debate"`, `"checkout"`, `"funded_account"`). |
| `criticalConversion` | float\|null | Conversion rate through that step over last 28d. 0–1. |
| `funnelErrorRate` | float\|null | Error/failure rate (5xx, exceptions, declined payments) on that critical endpoint last 7d. 0–1. **High here + low signups = bug, not a marketing problem.** |
| `funnelSampleSize` | int\|null | Denominator behind the two rates above, so the scorer can ignore noisy small samples. |

---

## 5. `definitions` — the drift guard (required)

Free-text, one line per ambiguous field, stating **how this product computed it**. This is what keeps 12 beacons honest. Minimum required keys:

```jsonc
"definitions": {
  "activeUser": "Posted, voted, or opened a debate (not just app open).",
  "signup":     "Row in auth.users with email confirmed.",
  "revenue28d": "Stripe succeeded charges + invoice.paid, minus refunds.",
  "criticalStep": "signup → first debate created within 48h.",
  "organicShare": "GA4 default channel grouping != 'Paid Search'/'Paid Social'."
}
```

If two products' `definitions.activeUser` disagree in spirit, that's a contract bug to reconcile centrally — not something to paper over.

---

## 6. Archetype extensions

Each product fills **only** the block matching its `meta.archetype`. This is the spec's "score on the archetype's scoreboard, not one universal number."

### 6.1 `consumer-viral` — ArguFight, CFB Social, Basktball, Donkey Marble Racing
```jsonc
"archetype": {
  "sessionsPerUser": 3.4,        // avg sessions per active user, 7d
  "inviteRate": 0.18,            // % of active users who sent ≥1 invite/share, 28d
  "viralCoefficient": 0.4,       // new users per existing user via invites (k-factor), if measurable
  "appStoreRating": 4.6,         // current avg, null if not on a store
  "ratingTrend": "+0.2",         // vs 28d ago
  "seasonalPeak": "2026-08"      // CFB Social: when this product structurally peaks; null if non-seasonal
}
```

### 6.2 `b2b-saas` — OpticRank, Top Viso (ASO), go.viral
```jsonc
"archetype": {
  "signupToActivationRate": 0.52,  // % of signups that hit the "aha" action, 28d
  "trialToPaidRate": 0.14,         // % of trials converting to paid, 28d cohort
  "netChurnRate": 0.03,            // monthly logo+revenue churn, net of expansion
  "organicTraffic28d": 4200,       // organic sessions to marketing site
  "avgKeywordRank": 14.3           // dogfood signal — these tools should rank themselves
}
```

### 6.3 `regulated-trust` — Kamioi (fintech), Buildwrk (construction ERP)
Low volume, high value — count conversations and value, not DAU.
```jsonc
"archetype": {
  "demosBooked28d": 6,
  "applicationsBooked28d": 3,      // funded accounts / signed contracts started
  "activationEvent": "first project created",  // or "account funded"
  "activations28d": 2,
  "salesCycleDays": 41,            // median lead → close
  "avgDealValue": 2400,
  "pipelineValue": 18000           // open weighted pipeline
}
```

### 6.4 `pre-launch` — Julyu, Jetdale, (Donkey Marble Racing until it has a backend)
```jsonc
"archetype": {
  "waitlistSize": 820,
  "waitlistGrowthPct7d": 9.0,      // the only growth signal that matters pre-launch
  "landingConversionRate": 0.06,   // visitor → waitlist signup
  "designPartnerConversations": 4, // live, named partner/customer dev conversations
  "targetLaunchDate": "2026-09-01"
}
```

> A pre-launch product is **never** scored against a live one. The scorer normalizes within archetype, so Julyu competes with Jetdale, not with ArguFight.

---

## 7. Worked example — ArguFight beacon response

```jsonc
{
  "meta": { "projectKey":"argufight","displayName":"ArguFight","archetype":"consumer-viral",
            "status":"live","contractVersion":"1.0.0","generatedAt":"2026-06-17T06:00:00Z",
            "dataAsOf":"2026-06-16T23:59:59Z","currency":"USD" },
  "universal": {
    "signups7d":210,"signups28d":760,"signupsTrendPct":18.2,"installs28d":null,
    "dau":340,"wau":980,"mau":2150,"stickiness":0.158,
    "retentionD1":0.41,"retentionD7":0.22,"retentionD30":0.11,"retentionProxy":null,
    "mrr":1980,"revenue28d":2040,"revenueTrendPct":9.0,"payingUsers":142,"arpu":0.95,
    "organicShare":0.74,"paidShare":0.26,
    "criticalStep":"signup→first_debate","criticalConversion":0.38,
    "funnelErrorRate":0.004,"funnelSampleSize":760
  },
  "archetype": { "sessionsPerUser":3.4,"inviteRate":0.18,"viralCoefficient":0.4,
                 "appStoreRating":4.6,"ratingTrend":"+0.1","seasonalPeak":null },
  "definitions": {
    "activeUser":"Created, joined, or voted on a debate (not app open).",
    "signup":"auth.users row, email confirmed.",
    "revenue28d":"Stripe succeeded charges + invoice.paid − refunds.",
    "organicShare":"GA4 channel != Paid Search/Paid Social."
  },
  "errors": []
}
```

---

## 8. Per-product beacon status (rollout tracker)

| Product | Repo | Archetype | Beacon feasibility |
|---|---|---|---|
| ArguFight | argufight.v.2 | consumer-viral | Easy — already computes D1/D7/D30 |
| OpticRank | OpticRank | b2b-saas | Easy — org/usage/billing tables |
| Top Viso | ASO | b2b-saas | Easy — same schema family |
| go.viral | go.viral.v4 | b2b-saas | Easy — Stripe + RevenueCat + own analytics |
| Buildwrk | Construction.erp | regulated-trust | Medium — derive demos/activations from CRM tables |
| Havana Cleaning | Havana Cleaning | *consumer-viral\** | Easy — Booking/Payment tables (\*marketplace; treat bookings as core action) |
| Basktball | Basktball | consumer-viral | Easy traffic, revenue = 0 (real signal) |
| CFB Social | cfbsocial | consumer-viral | Easy — has `analytics_events`/`daily_stats` |
| Jetdale | Jetdale | pre-launch | Easy — PostHog + `product_events` (best instrumented) |
| Julyu | Julyu | pre-launch | Medium — waitlist via Supabase |
| Kamioi | **kamioi.v.1** | regulated-trust | Medium — Supabase rewrite, add to it |
| Donkey Marble Racing | Donkey.Marble.Racing | pre-launch | Stub — no backend; returns mostly null until instrumented |

---

## 9. Open questions to settle before freezing v1
1. **Currency** — any non-USD products? If so, the agent converts centrally; beacons report native + `meta.currency`.
2. **Marketplace archetype** — Havana doesn't fit cleanly into the 4. Fold into consumer-viral (bookings = core action) or add a 5th `marketplace` archetype? (Leaning: fold in for v1, revisit.)
3. **Channel attribution** — rely on each beacon's `organicShare`, or always take organic/paid from the dashboard's central GA4 layer for consistency? (Leaning: central GA4 is more consistent — make beacon `organicShare` optional.)
