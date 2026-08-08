# Cirquo

> **Closing the Loop, Saving Every Meal.**

Cirquo is a **Circular Food Recovery Platform** that connects food businesses, consumers, and organic processors into a single circular ecosystem. It is not a food delivery app — the marketplace is only the entry point. The product is **Material Flow Orchestration**: knowing where every kilogram of surplus food goes.

Built for **DSDC ANFORCOM 2026**.

---

## The Problem

Indonesia generates an estimated **23–48 million tonnes** of food loss and waste per year, worth **Rp213–551 trillion** annually (Bappenas). At street level the failure is not technological but organisational:

- Bakeries, restaurants, and caterers have predictable daily surplus with no recovery path
- Consumers would buy discounted surplus but cannot discover it in time
- Organic processors (BSF/maggot, composting, biogas) want feedstock but receive it inconsistently
- Nobody can measure what actually happened to any of it

In Semarang the infrastructure already exists — TPA Jatibarang operates BSF processing, TPST Gemah receives organic waste from restaurants and shops and routes it to maggot farmers. **Cirquo digitises an ecosystem that is already there but fragmented.**

---

## The Solution

Every unit of surplus food gets a next best use, and every outcome is recorded.

```
                        MERCHANT
                     surplus food
                           │
                           ▼
                  ┌─────────────────┐
                  │     CIRQUO      │
                  │  Rescue Engine  │
                  │ Pricing Engine  │
                  │ Material Ledger │
                  └────────┬────────┘
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
            STILL EDIBLE        NOT RESCUED
                 │                   │
                 ▼                   ▼
             CONSUMER         ORGANIC PROCESSOR
             RESCUED           BSF / COMPOST
                 │                   │
                 │              RECOVERED
                 └─────────┬─────────┘
                           ▼
                   IMPACT TRACKING
              rescued · recovered · residual
```

Three terminal outcomes, always measured:

| Outcome | Meaning |
|---|---|
| **Rescued** | A Consumer collected and ate it |
| **Recovered** | An Organic Processor turned it into compost, BSF larvae, feed, or biogas |
| **Residual** | Neither happened — reported honestly, never hidden |

`circularity rate = (rescued + recovered) / total surplus`

We do not claim zero waste. We claim we know where every kilogram went.

---

## Core Features

| Feature | Description |
|---|---|
| **Material Flow Ledger** | Append-only, immutable event log of every Rescue Item lifecycle event. The single source of truth for all impact metrics |
| **Circular Routing** | Automatically matches unclaimed or unsellable surplus to a verified Organic Processor by material type, distance, and capacity |
| **Dynamic Rescue Pricing** | Transparent rule-based discount curve that escalates as the pickup window closes, always respecting the merchant's floor price |
| **Map Discovery** | Mapbox-powered nearby Rescue Item discovery, ranked by proximity, discount, and urgency |
| **Impact Tracking** | Role-scoped dashboards showing kg rescued, kg recovered, kg residual, circularity rate, and estimated CO2e — all derived from the ledger |
| **Pickup Verification** | Code/QR handover confirmation that makes physical fulfilment auditable |

---

## Actors

| Role | What they do |
|---|---|
| **Consumer** | Discovers Rescue Items on a map, reserves, pays, collects, sees personal impact |
| **Merchant** | Lists surplus, receives a suggested price, confirms pickup, tracks recovered revenue and impact |
| **Organic Processor** | Receives routed material, logs measured intake and processing outcome |
| **Admin** | Verifies businesses, moderates listings, resolves disputes, audits the ledger, monitors platform impact |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · Vite 8 · TypeScript · React Router v7 |
| **Styling** | Tailwind CSS v4 (OKLCH tokens) · shadcn/ui · Lucide |
| **Backend** | Convex (database, serverless functions, realtime, scheduler) |
| **Maps** | Mapbox |
| **Payments** | Midtrans Sandbox (QRIS) |
| **Mobile** | Capacitor 8 (Android) |
| **Forms** | React Hook Form + Zod |
| **Tooling** | Bun · oxlint |

Rationale and rejected alternatives for every choice: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

---

## Quick Start

**Prerequisites:** [Bun](https://bun.sh), Node.js (Vite-compatible), Git. Android Studio + SDK only if building the APK.

```bash
git clone <repository-url>
cd cirquo
bun install
cp .env.example .env.local
```

Run with a Convex backend (two terminals):

```bash
# Terminal 1 — backend
bunx convex dev

# Terminal 2 — frontend
bun run dev
```

`bunx convex dev` prompts for login, creates or selects a deployment, generates `convex/_generated`, and writes `VITE_CONVEX_URL` into your local env.

Without `VITE_CONVEX_URL` the app still runs in a **placeholder mode** with no backend — useful for UI work.

Full setup, troubleshooting, and the Android workflow: [`docs/engineering/DEVELOPMENT.md`](docs/engineering/DEVELOPMENT.md).

---

## Commands

| Command | Purpose |
|---|---|
| `bun run dev` | Start the Vite dev server |
| `bunx convex dev` | Start the Convex backend and watch functions |
| `bun run build` | Typecheck and build to `dist/` |
| `bun run lint` | Run oxlint |
| `bun run preview` | Preview the production build |
| `bun run android:sync` | Build web and sync into the Android project |
| `bun run android:open` | Open the project in Android Studio |
| `bun run android:run` | Run on a connected device or emulator |

---

## Environment Variables

| Variable | Scope | Public? | Purpose |
|---|---|---|---|
| `VITE_CONVEX_URL` | Client | ⚠️ Yes | Convex deployment URL. Unset ⇒ placeholder mode |
| `VITE_MAPBOX_TOKEN` | Client | ⚠️ Yes | Mapbox access token (scope and URL-restrict it) |
| `MIDTRANS_SERVER_KEY` | Convex | 🔒 No | Set via `bunx convex env set` — never in `.env` |
| `MIDTRANS_CLIENT_KEY` | Convex | 🔒 No | Set via `bunx convex env set` |

**Anything prefixed `VITE_` is embedded in the client bundle and is therefore public.** Secrets belong in Convex environment variables only. See [`docs/security/SECURITY.md`](docs/security/SECURITY.md).

---

## Project Structure

```text
src/
  app/            router and providers
  components/
    ui/           shadcn/ui primitives
    common/       cross-role composites
    consumer/     role-specific components
    merchant/
    processor/
    admin/
  constants/      placeholder data (to be removed)
  features/       feature-scoped modules
  hooks/          shared React hooks
  layouts/        per-role navigation shells
  lib/            framework-agnostic logic (pricing, routing, impact, geo)
  pages/          route components by role
  types/          domain and navigation types

convex/           schema and backend functions
public/           PWA manifest, service worker, icons
android/          Capacitor Android project
docs/             complete documentation system
```

**Architectural discipline:** business algorithms live in `src/lib/*.ts` with **no Convex imports**. Convex functions load data, call the pure function, and persist the result. This keeps the logic unit-testable, portable, and explainable.

---

## Routes

| Actor | Routes |
|---|---|
| Consumer | `/` · `/explore` · `/orders` |
| Merchant | `/merchant` · `/merchant/surplus` · `/merchant/surplus/new` |
| Processor | `/processor` · `/processor/recovery` |
| Admin | `/admin` |
| Fallback | `*` |

Planned routes (auth, listing detail, checkout, pickup verification, ledger audit, and more) are inventoried in [`docs/spec/USER_FLOW.md`](docs/spec/USER_FLOW.md).

---

## Current Status

**Version 0.1.0 — foundation scaffold.** Roughly 15% of the MVP.

**✅ In place**

- Vite + Bun + TypeScript toolchain, oxlint
- React Router with four role-scoped layouts
- 17 shadcn/ui primitives plus `PageHeader`, `SummaryCard`, `RoleShell`
- Convex schema with 5 tables and 10 indexes
- 6 internal read-only Convex queries (kept non-public until M1 auth guards land)
- 9 placeholder pages rendering mock data
- Capacitor Android configured (`com.cirquo.app`), PWA manifest and service worker
- Tailwind v4 OKLCH design tokens, Geist Variable font
- Complete documentation system (38 documents)

**📋 Not yet built**

- Material Flow Ledger table and write path
- All mutations — nothing can currently be written
- Authentication and role onboarding
- Mapbox, Midtrans, scheduled functions
- Impact calculation, notifications, QR pickup, admin tooling

Dashboard figures shown today are hardcoded placeholders. Honest status per feature: [`docs/spec/FEATURES.md`](docs/spec/FEATURES.md). Delivery plan: [`docs/business/ROADMAP.md`](docs/business/ROADMAP.md).

---

## Documentation

The full documentation system lives in [`docs/`](docs/README.md). Start with [`docs/README.md`](docs/README.md) as the index.

| Area | Documents |
|---|---|
| **Product** | [PRD](docs/product/PRD.md) · [PRODUCT](docs/product/PRODUCT.md) · [VISION](docs/product/VISION.md) |
| **Business** | [BUSINESS](docs/business/BUSINESS.md) · [ROADMAP](docs/business/ROADMAP.md) · [RISKS](docs/business/RISKS.md) |
| **Specification** | [FEATURES](docs/spec/FEATURES.md) · [USER_STORIES](docs/spec/USER_STORIES.md) · [USER_FLOW](docs/spec/USER_FLOW.md) · [ROLES](docs/spec/ROLES.md) |
| **Domain** | [DOMAIN](docs/domain/DOMAIN.md) · [STATE_MACHINE](docs/domain/STATE_MACHINE.md) · [DATA_MODEL](docs/domain/DATA_MODEL.md) · [DATABASE](docs/domain/DATABASE.md) |
| **API** | [API](docs/api/API.md) · [AUTH](docs/api/API_AUTH.md) · [CONSUMER](docs/api/API_CONSUMER.md) · [MERCHANT](docs/api/API_MERCHANT.md) · [PROCESSOR](docs/api/API_PROCESSOR.md) · [ADMIN](docs/api/API_ADMIN.md) |
| **Architecture** | [ARCHITECTURE](docs/architecture/ARCHITECTURE.md) · [FRONTEND](docs/architecture/FRONTEND.md) · [BACKEND](docs/architecture/BACKEND.md) · [REALTIME](docs/architecture/REALTIME.md) · [SCHEDULER](docs/architecture/SCHEDULER.md) |
| **Impact** | [ALGORITHM](docs/impact/ALGORITHM.md) · [IMPACT](docs/impact/IMPACT.md) · [MATERIAL_LEDGER](docs/impact/MATERIAL_LEDGER.md) |
| **Security** | [SECURITY](docs/security/SECURITY.md) · [AUTH](docs/security/AUTH.md) · [PERMISSIONS](docs/security/PERMISSIONS.md) |
| **Design** | [DESIGN](docs/design/DESIGN.md) · [UI_GUIDE](docs/design/UI_GUIDE.md) · [COMPONENTS](docs/design/COMPONENTS.md) · [FIGMA](docs/design/FIGMA.md) |
| **Engineering** | [STYLE_GUIDE](docs/engineering/STYLE_GUIDE.md) · [DEVELOPMENT](docs/engineering/DEVELOPMENT.md) · [TESTING](docs/engineering/TESTING.md) · [DEPLOYMENT](docs/engineering/DEPLOYMENT.md) |
| **Project** | [AGENTS](docs/project/AGENTS.md) · [CONTRIBUTING](docs/project/CONTRIBUTING.md) · [CHANGELOG](docs/project/CHANGELOG.md) |

**AI agents working on this repository:** read [`AGENTS.md`](AGENTS.md) first.

---

## Screenshots

_Placeholder — to be added once the core flows are implemented._

| Screen | Preview |
|---|---|
| Consumer map discovery | `docs/assets/screens/consumer-explore.png` |
| Reservation and pickup code | `docs/assets/screens/consumer-pickup.png` |
| Merchant listing creation | `docs/assets/screens/merchant-create.png` |
| Circular routing to processor | `docs/assets/screens/processor-queue.png` |
| Material Flow Ledger audit trail | `docs/assets/screens/admin-ledger.png` |
| Impact dashboard | `docs/assets/screens/impact-dashboard.png` |

---

## Contributing

Branch model: `main` ← `dev` ← `feat/*`

```text
main
└── dev
    ├── feat/consumer-marketplace
    ├── feat/merchant-dashboard
    ├── feat/recovery-flow
    └── feat/impact-dashboard
```

Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Feature branches merge into `dev`; `dev` promotes to `main` after review.

**Two rules that are never negotiable:**

1. Every state-changing mutation writes a Material Flow Ledger event **in the same transaction**.
2. Every mutation enforces authorization **server-side**. The frontend may hide a button; the server must reject the call regardless.

Full workflow and PR checklist: [`docs/project/CONTRIBUTING.md`](docs/project/CONTRIBUTING.md).

---

## Scope

**In scope for the competition MVP:** four-role authentication, merchant listing with Dynamic Rescue Pricing, consumer map discovery with reservation and Midtrans Sandbox payment, pickup code verification, automatic Circular Routing of unclaimed surplus, processor intake and outcome logging, Material Flow Ledger, role-scoped impact dashboards, admin verification and moderation, Capacitor Android build.

**Explicitly out of scope:** logistics dispatch and route optimisation, peer-to-peer food swap, allergy-safety guarantees (only dietary preference filtering on merchant-declared attributes), AI demand forecasting, multiple payment gateways, multi-currency, native Flutter/React Native apps, loyalty and gamification, computer-vision quality verification.

Rationale for each exclusion: [`docs/business/ROADMAP.md`](docs/business/ROADMAP.md) §9.

---

## License

To be determined before public release.

---

**Built for DSDC ANFORCOM 2026**  
**Cirquo — Closing the Loop, Saving Every Meal**
