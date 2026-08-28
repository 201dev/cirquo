# Development Guide

| Field | Value |
| --- | --- |
| **Document Type** | Engineering Guide |
| **Status** | Active development guide |
| **Last Updated** | 2026-08-29 |
| **Owner** | Cirquo Engineering |
| **Audience** | Anyone running Cirquo locally — team members, reviewers, AI agents |

---

## 1. Overview

Cirquo is a **Circular Food Recovery Platform**. Merchants list surplus food as
**Rescue Items**; consumers find them on a map, reserve, pay, and **collect in
person** using a **pickup code**. Anything unclaimed is matched by **Circular
Routing** to an **Organic Processor** (BSF larvae, compost, biogas, animal feed).
Every state change appends an immutable entry to the **Material Flow Ledger**,
and every impact figure is derived from that ledger.

There is no delivery. Consumers collect in person.

This guide gets the whole thing running on your machine.

---

## 2. Current State — Read This First

The source and `.env.example` are authoritative. This snapshot prevents wasted
hours looking for code that was never written.

| Area | Status | Detail |
| --- | --- | --- |
| Convex schema | ✅ | 10 tables, including sessions, auth events, Material Flow Ledger, and payments |
| Convex functions | ✅ Partial | Auth, profile, Merchant lifecycle, Consumer discovery/reservation, and payment functions exist; Processor/Admin flows remain incomplete |
| Authentication | ✅ | Opaque session token, server-side guards, profile onboarding, and client persistence |
| Material Flow Ledger | ✅ Foundation | Append-only table/helper with current Rescue Item and order event writes |
| Mapbox | ✅ | Explore route reads `VITE_MAPBOX_ACCESS_TOKEN` |
| Midtrans | 🚧 | Sandbox transaction action and webhook code exist; integration UAT remains required |
| Scheduler / cron | 🚧 | Reservation hold uses `ctx.scheduler.runAt`; no `convex/crons.ts` sweep exists |
| Impact calculation | 📋 | Dashboards still require ledger-derived aggregation |
| Tests | ✅ Partial | Unit tests and the ledger immutability check exist; full UAT remains required |
| Pages | 🚧 | Auth, Merchant Rescue Item, and Consumer discovery/order pages use real flows; some dashboards remain placeholders |
| Routing | ✅ | React Router role guards and session restoration |
| Design system | ✅ Works | Tailwind v4 OKLCH tokens, 17 shadcn primitives |
| Capacitor Android | ✅ Configured | `com.cirquo.app`, `webDir: dist` |
| PWA | ✅ Basic | `manifest.webmanifest` + `sw.js`, registered in PROD only |

See [`../api/API.md`](../api/API.md) for the current function index. Do not use
this guide as a substitute for source validators or the generated Convex API.

---

## 3. Prerequisites

### 3.1 Required for web development

| Tool | Version | Why | Install |
| --- | --- | --- | --- |
| **Bun** | ≥ 1.2 | Package manager, script runner, test runner | `curl -fsSL https://bun.sh/install \| bash` |
| **Node.js** | ≥ 20.19 (or ≥ 22.12) | Vite 8 and parts of the Convex CLI resolve against a Node runtime even though Bun runs the scripts | [nodejs.org](https://nodejs.org) or `fnm install 22` |
| **Git** | ≥ 2.40 | Version control | System package manager |

Verify:

```bash
bun --version
node --version
git --version
```

> **Why Node if we use Bun?** Bun runs `package.json` scripts and installs
> dependencies. Vite 8 and some Convex CLI paths still reach for a Node runtime
> for certain native modules. Having both installed avoids a class of confusing
> resolution errors. Bun is what you type; Node is what some tools reach for
> underneath.

### 3.2 Additional for Android (Capacitor 8)

Only needed when building the APK — skip until milestone **M8**.

| Tool | Version | Notes |
| --- | --- | --- |
| **JDK** | 21 (LTS) | Required by the Android Gradle Plugin used by Capacitor 8 |
| **Android Studio** | Ladybug (2024.2) or newer | SDK manager, emulator, build tooling |
| **Android SDK Platform** | API 35 | Compile and target SDK |
| **Android SDK Build-Tools** | 35.x | |
| **Android SDK Platform-Tools** | latest | Provides `adb` |

Environment variables (add to `~/.zshrc`):

```bash
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

Verify:

```bash
java -version
adb --version
```

### 3.3 Accounts

| Service | Needed for | Cost |
| --- | --- | --- |
| Convex | Backend — required from day one | Free tier |
| Mapbox | Consumer discovery map (M3) | Free tier: 50,000 map loads/month |
| Midtrans Sandbox | Payments (M3) | Free |
| Google Play Console | Store distribution (optional) | One-off USD 25 |

---

## 4. First-Time Setup

### Step 1 — Clone

```bash
git clone <repository-url> cirquo
cd cirquo
```

### Step 2 — Install dependencies

```bash
bun install
```

Uses `bun.lock`. **Do not** run `npm install` or `yarn` — a second lockfile will
appear and resolution will diverge between machines.

### Step 3 — Create the local environment file

```bash
cp .env.example .env.local
```

`.env.example` contains the client variables required by the current web app:

```bash
VITE_CONVEX_URL=
VITE_MAPBOX_ACCESS_TOKEN=
VITE_MIDTRANS_CLIENT_KEY=
```

`.env.local` is gitignored. `.env.example` is committed and **must never contain
a real value**.

### Step 4 — Start Convex

```bash
bunx convex dev
```

On first run this will:

1. **Prompt you to log in** — opens a browser for OAuth against Convex.
2. **Ask you to create or select a project** — create a new project named
   `cirquo`, or select the team project if you were invited.
3. **Create a personal dev deployment** — each developer gets an isolated
   deployment, so your seed data never collides with a teammate's.
4. **Generate `convex/_generated/`** — the typed `api` object, `dataModel`
   types, and server helpers. **This directory is gitignored and does not exist
   until you run this command.** If your editor reports that `api` cannot be
   found, this is why.
5. **Write the deployment URL** into `.env.local` as `VITE_CONVEX_URL`, and the
   deployment name as `CONVEX_DEPLOYMENT`.
6. **Push the schema and functions**, then stay running and watch `convex/`,
   re-pushing on every save.

Leave this running. It is a long-lived process, not a one-shot command.

### Step 5 — Start the web dev server

In a **second terminal**:

```bash
bun run dev
```

Vite starts on `http://localhost:5173`.

### Step 6 — Verify

| Check | Expected |
| --- | --- |
| `http://localhost:5173` loads | Cirquo landing page renders |
| Browser console | No red errors |
| Convex terminal | `Convex functions ready!` |
| Convex dashboard | 10 schema tables listed after `convex dev` syncs |
| Navigate to `/explore` | Real discovery data when Convex and Mapbox are configured; otherwise the app's fallback state |

---

## 5. The Two-Terminal Workflow

Cirquo needs two processes running side by side.

```
┌───────────────────────────────┬───────────────────────────────┐
│ Terminal 1                    │ Terminal 2                    │
│ $ bunx convex dev             │ $ bun run dev                 │
│                               │                               │
│ • Watches convex/**           │ • Watches src/**              │
│ • Type-checks Convex funcs    │ • HMR to the browser          │
│ • Regenerates _generated/     │ • Serves on :5173             │
│ • Pushes to your dev deploy   │ • Reads .env.local at start   │
│ • Streams function logs       │                               │
└───────────────────────────────┴───────────────────────────────┘
```

**Important:** Vite reads `.env.local` **once, at startup**. When
`bunx convex dev` writes `VITE_CONVEX_URL` for the first time, or whenever you
change any `VITE_` variable, you **must restart `bun run dev`**. Hot reload will
not pick it up, and the symptom — a client that silently never connects — looks
like a Convex problem rather than an environment one.

### 5.1 Placeholder no-backend mode

`src/lib/convex.ts` constructs the Convex client **only when `VITE_CONVEX_URL`
is set**. If it is absent:

- No client is created.
- The app boots normally and renders placeholder pages backed by
  `src/constants/mock-data.ts`.
- An **informational** message is logged **in DEV only** explaining that the app
  is running without a backend.

This is deliberate. It means a designer or a judge can run
`bun install && bun run dev` and see the UI with no Convex account, and a
frontend-only branch is never blocked on backend availability.

Two rules follow:

1. Components **must not** assume a Convex client exists.
2. Mock data **must never** be presented as live. Hardcoded impact figures must
   be replaced by ledger-derived values before M6 ships.

### 5.2 `src/main.tsx` behaviour

- If `#root` is missing from `index.html`, `main.tsx` **throws an error in
  Bahasa Indonesia**. This is a fail-fast guard — a silent blank page is much
  harder to debug than a thrown message.
- The service worker at `/sw.js` is registered **in PROD only**. In development
  there is no service worker, which is why you never see stale-cache behaviour
  locally but might after a production build.

---

## 6. Environment Variables

### 6.1 The public/secret rule

> **Anything prefixed `VITE_` is inlined into the client JavaScript bundle at
> build time and is therefore PUBLIC.** Vite performs a literal text
> substitution. The value ends up in `dist/assets/*.js`, downloadable by anyone.
>
> **Never put a secret behind a `VITE_` prefix.** Server-side secrets live in
> Convex environment variables, set with `bunx convex env set`, and are readable
> only inside Convex functions via `process.env`.

### 6.2 Full matrix

| Variable | Scope | Required | Public? | Purpose | Where to set |
| --- | --- | --- | --- | --- | --- |
| `VITE_CONVEX_URL` | Client | ✅ Yes (backend mode) | 🔓 **Public** | Convex deployment URL the client connects to | `.env.local` — written automatically by `bunx convex dev`; set in the host's env for production |
| `CONVEX_DEPLOYMENT` | CLI | ✅ Yes | 🔓 Public | Tells the Convex CLI which deployment to target | `.env.local` — written by `bunx convex dev` |
| `VITE_MAPBOX_ACCESS_TOKEN` | Client | Required for map | 🔓 **Public** | Mapbox GL access token for the discovery map | `.env.local`; must be a **scoped, URL-restricted** public token (`pk.*`) |
| `MIDTRANS_SERVER_KEY` | **Convex server** | Required for checkout/webhook | 🔒 **SECRET** | Signs Snap transaction requests and verifies webhook signatures | `bunx convex env set MIDTRANS_SERVER_KEY <key>` |
| `VITE_MIDTRANS_CLIENT_KEY` | Client | Required for Snap checkout | 🔓 **Public** | Midtrans Snap client key, embedded in the client bundle by design | `.env.local` and the frontend host environment |

`VITE_MIDTRANS_CLIENT_KEY` is public by design and is read by the checkout
page. Only `MIDTRANS_SERVER_KEY` is secret and must remain in the Convex
environment.

### 6.3 Setting Convex secrets

```bash
# Sandbox credentials from https://dashboard.sandbox.midtrans.com
bunx convex env set MIDTRANS_SERVER_KEY "SB-Mid-server-xxxxxxxxxxxxxxxxxxxx"

# Inspect
bunx convex env list

# Remove
bunx convex env remove MIDTRANS_SERVER_KEY
```

These are per-deployment. Setting them on your dev deployment does **not** set
them on production.

### 6.4 `.env.example` maintenance

When a new client-side variable is introduced, add it to `.env.example` **with
an empty value and a comment**, in the same PR. A teammate who pulls and finds a
missing variable loses an hour.

```bash
# Convex deployment URL — written automatically by `bunx convex dev`.
VITE_CONVEX_URL=

# Mapbox public token (pk.*). Scope to styles:read + fonts:read and restrict by
# URL. PUBLIC — embedded in the client bundle.
VITE_MAPBOX_ACCESS_TOKEN=

# Midtrans Snap client key. PUBLIC — embedded in the client bundle.
VITE_MIDTRANS_CLIENT_KEY=
```

---

## 7. Command Reference

Every script in `package.json`:

| Command | Underlying | What it does | When |
| --- | --- | --- | --- |
| `bun run dev` | `vite` | Dev server with HMR on :5173 | Every session |
| `bun run build` | `tsc -b && vite build` | Type-check then bundle to `dist/` | Before pushing; in CI |
| `bun run lint` | `oxlint` | Lint `src/` and `convex/` | Before pushing; in CI |
| `bun run preview` | `vite preview` | Serve the built `dist/` locally | Verifying a production build |
| `bun run convex` | `convex dev` | Convex watch mode | Every session |
| `bun run android:sync` | `bun run build && cap sync android` | Build web assets and copy into the Android project | Before any Android build |
| `bun run android:open` | `cap open android` | Open the project in Android Studio | Building an APK |
| `bun run android:run` | `cap run android` | Build and deploy to a connected device/emulator | Device testing |

Useful commands not in `package.json`:

| Command | Purpose |
| --- | --- |
| `bunx convex dashboard` | Open the deployment dashboard in a browser |
| `bunx convex logs` | Stream function logs in the terminal |
| `bunx convex env list` | List server-side environment variables |
| `bunx convex run <module>:<fn> '<json>'` | Invoke a function from the CLI |
| `bunx convex deploy` | Push to the production deployment |
| `bunx shadcn@latest add <component>` | Add a shadcn/ui primitive |
| `bun test` | Run Vitest once configured (see [TESTING.md](TESTING.md)) |

> **Type-checking has no dedicated script.** `bun run build` runs `tsc -b` first,
> so building *is* the type gate.

---

## 8. Repository Structure

```
cirquo/
├── android/                       ✅ Capacitor 8 native project (com.cirquo.app)
├── convex/                        ✅ Backend — Convex 1.43
│   ├── _generated/                🔧 Generated by `convex dev`, gitignored
│   ├── schema.ts                  ✅ 10 tables, including sessions, ledger, payments
│   ├── auth.ts                    ✅ registration, login, logout, current-session query
│   ├── merchants.ts               ✅ profile creation and guarded owner lookup
│   ├── surplusItems.ts            ✅ Merchant Rescue Item lifecycle + listMine
│   ├── discovery.ts               ✅ active Consumer discovery queries
│   ├── orders.ts                  ✅ reservation and Consumer order queries
│   └── payments.ts / http.ts      ✅ Midtrans transaction and webhook handling
├── docs/                          ✅ This documentation system
├── public/
│   ├── manifest.webmanifest       ✅ PWA manifest
│   ├── sw.js                      ✅ Service worker (registered in PROD only)
│   ├── favicon.svg                ✅
│   └── icons/                     ✅ PWA icons
├── src/
│   ├── app/
│   │   ├── router.tsx             ✅ React Router v7 route tree
│   │   └── providers.tsx          ✅ Convex, theme, Sonner providers
│   ├── assets/                    ✅ Static imports
│   ├── components/
│   │   ├── ui/                    ✅ 17 shadcn/ui primitives (new-york/neutral)
│   │   ├── common/                ✅ 3 shared components
│   │   ├── consumer/              📋 Role-specific components
│   │   ├── merchant/              📋
│   │   ├── processor/             📋
│   │   └── admin/                 📋
│   ├── constants/
│   │   └── mock-data.ts           ✅ Placeholder data — to be deleted by M6
│   ├── features/
│   │   ├── auth/                  📋 M1
│   │   ├── impact/                📋 M6
│   │   ├── orders/                📋 M3
│   │   ├── pricing/               📋 M2
│   │   ├── recovery/              📋 M4–M5
│   │   └── surplus/               📋 M2
│   ├── hooks/                     ✅ Shared hooks
│   ├── layouts/                   ✅ 4 role layouts + auth layout
│   ├── lib/
│   │   ├── convex.ts              ✅ Client factory; null when URL unset
│   │   ├── utils.ts               ✅ cn()
│   │   ├── pricing.ts             📋 suggestRescuePrice
│   │   ├── routing.ts             📋 rankEligibleProcessors
│   │   ├── ranking.ts             📋 rankListings
│   │   ├── impact.ts              📋 summariseLedger, estimateCo2e
│   │   └── geo.ts                 📋 haversineMeters
│   ├── pages/
│   │   ├── consumer/              ✅ Placeholder pages
│   │   ├── merchant/              ✅ Placeholder pages
│   │   ├── processor/             ✅ Placeholder pages
│   │   ├── admin/                 ✅ Placeholder pages
│   │   └── auth/                  ✅ Placeholder pages
│   ├── types/
│   │   ├── domain.ts              ✅ Domain types
│   │   └── navigation.ts          ✅ Route/nav types
│   ├── index.css                  ✅ Tailwind v4 @theme, OKLCH tokens
│   ├── main.tsx                   ✅ Entry; #root guard, SW in PROD
│   └── App.tsx                    ✅ Root component
├── .env.example                   ✅ Public Convex, Mapbox, and Midtrans client variables
├── .oxlintrc.json                 ✅ react/typescript/oxc plugins
├── capacitor.config.ts            ✅ com.cirquo.app, webDir: dist
├── components.json                ✅ shadcn config (new-york, neutral)
├── package.json                   ✅
├── tsconfig.json                  ✅ @ → ./src
└── vite.config.ts                 ✅ @tailwindcss/vite, @ alias
```

**Notably absent:** `tailwind.config.js` (Tailwind v4 is CSS-first — do not add
one), `convex/crons.ts`, `convex/http.ts`, any test file, any `.eslintrc`.

---

## 9. Common Tasks

### 9.1 Adding a new page

1. Create the component in the role directory with a **default export**:

```tsx
// src/pages/merchant/ListingsPage.tsx
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ListingSkeleton } from '@/components/merchant/ListingSkeleton';
import { EmptyListings } from '@/components/merchant/EmptyListings';
import { ListingTable } from '@/components/merchant/ListingTable';

export default function ListingsPage() {
  const items = useQuery(api.surplusItems.listByStatus, { status: 'active' });

  if (items === undefined) return <ListingSkeleton />;
  if (items.length === 0) return <EmptyListings />;
  return <ListingTable items={items} />;
}
```

2. Register the route in `src/app/router.tsx` under the correct role layout.
3. Add the nav entry if the page belongs in the sidebar.
4. Verify at 375px width.

Pages use default exports so `React.lazy` can code-split them; components
everywhere else use named exports.

### 9.2 Adding a Convex query

```ts
// convex/surplusItems.ts
import { v } from 'convex/values';
import { query } from './_generated/server';

export const listByMerchant = query({
  args: {
    merchantId: v.id('merchants'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { merchantId, status }) => {
    const results = await ctx.db
      .query('surplusItems')
      .withIndex('by_merchant', (q) => q.eq('merchantId', merchantId))
      .collect();

    return status ? results.filter((i) => i.status === status) : results;
  },
});
```

Save. `bunx convex dev` pushes it and regenerates `api`. Autocomplete for
`api.surplusItems.listByMerchant` appears within a second or two.

Add an index to `convex/schema.ts` if you need a new access path:

```ts
surplusItems: defineTable({ /* ... */ })
  .index('by_status', ['status'])
  .index('by_merchant', ['merchantId'])
  .index('by_status_and_expiry', ['status', 'pickupWindowEndAt']),
```

### 9.3 Adding a Convex mutation — the ledger write is mandatory

This is the single most important pattern in the codebase.

```ts
// convex/orders.ts
import { v, ConvexError } from 'convex/values';
import { mutation } from './_generated/server';
import { requireAuth, requireRole } from './lib/guards';
import { recordLedgerEvent } from './lib/ledger';
import { ORDER_CONFIG } from './lib/orderConfig';

export const reserveItem = mutation({
  args: {
    itemId: v.id('surplusItems'),
    quantity: v.number(),
  },
  handler: async (ctx, { itemId, quantity }) => {
    // 1. GUARDS — always first, before anything else.
    const user = await requireAuth(ctx);
    requireRole(user, 'consumer');

    // 2. LOAD + VALIDATE.
    const item = await ctx.db.get(itemId);
    if (!item) throw new ConvexError('NOT_FOUND');
    if (item.status !== 'active' && item.status !== 'reserved_partial') {
      throw new ConvexError('INVALID_TRANSITION');
    }
    if (item.remainingQuantity < quantity) {
      throw new ConvexError('INSUFFICIENT_QUANTITY');
    }

    const now = Date.now();
    if (now > item.pickupWindowEndAt) {
      throw new ConvexError('PICKUP_WINDOW_CLOSED');
    }

    // 3. STATE CHANGE.
    // Quantity is decremented at RESERVATION, not at payment. An unpaid
    // reservation is released by the scheduler after RESERVATION_HOLD_MS.
    const remaining = item.remainingQuantity - quantity;
    await ctx.db.patch(itemId, {
      remainingQuantity: remaining,
      status: remaining === 0 ? 'sold_out' : 'reserved_partial',
    });

    // Snapshot the weight at reservation time. Pickup MUST read this value
    // rather than recomputing from the item, which may have changed since.
    const rescuedWeightGrams = item.weightGrams * quantity;

    const orderId = await ctx.db.insert('orders', {
      itemId,
      consumerId: user._id,
      merchantId: item.merchantId,
      quantity,
      rescuedWeightGrams,
      totalIdr: item.rescuePriceIdr * quantity,
      status: 'reserved',
      pickupCode: generatePickupCode(),
      reservedAt: now,
      holdExpiresAt: now + ORDER_CONFIG.RESERVATION_HOLD_MS,
    });

    // 4. LEDGER — same mutation, same transaction. Non-negotiable.
    await recordLedgerEvent(ctx, {
      itemId,
      orderId,
      event: 'RESERVED',
      weightDeltaGrams: -rescuedWeightGrams,
      actorId: user._id,
      occurredAt: now,
    });

    return orderId;
  },
});
```

What this demonstrates:

- **Guards first.** The frontend may hide a button; the server must reject
  regardless.
- **`ConvexError` with a canonical code.** The client maps the code to a Bahasa
  Indonesia Sonner toast.
- **Ledger inside the mutation.** Convex mutations are transactional — the
  ledger entry and the state change commit together or not at all. Never from an
  action, never from the client.
- **Snapshot the weight.** `orders.rescuedWeightGrams` is written once and read
  forever. Never recompute a historical weight.
- **Append-only ledger.** `recordLedgerEvent` only inserts. CI runs a grep guard
  that fails the build on any `db.patch`, `db.delete`, or `db.replace` targeting
  `materialFlowLedger`. Corrections are compensating entries.

### 9.4 Adding a shadcn/ui component

```bash
bunx shadcn@latest add dialog
```

The file lands in `src/components/ui/`. It is **vendored** — yours to edit. Two
notes:

- The project uses `@base-ui/react` alongside `radix-ui`. Base UI components use
  `render={<Component />}` where Radix uses `asChild`. Do not mix them up.
- If you edit a vendored primitive, say so in the PR — re-running the CLI later
  would overwrite the change.

### 9.5 Seeding demo data

Seeding is required before any meaningful local work, because a fresh deployment
has empty tables.

**The seed must call real mutations.** It must not `db.insert` into
`materialFlowLedger` directly.

Why:

1. Direct inserts bypass the mutations, so the seed proves nothing about whether
   the mutations work.
2. Hand-written ledger rows will not satisfy weight conservation, and the
   integrity check — the thing that validates the entire model — would fail on
   data we wrote ourselves.
3. A seed built from real mutations is a smoke test. If the seed runs, the happy
   path works.

```ts
// convex/seed.ts
import { internalMutation } from './_generated/server';

/**
 * Seed a demo dataset by driving the real mutations end to end.
 *
 * MUST NOT insert into materialFlowLedger directly — every ledger entry here is
 * produced by the same code path production uses, so the seed doubles as a
 * smoke test and the resulting data satisfies weight conservation.
 *
 * The dataset is intentionally shaped so the resulting circularity rate lands
 * near 0.93. It MUST leave a visible residual: a 100% figure would be both
 * physically implausible and a claim Cirquo does not make.
 */
export const seedDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Create users for all four roles.
    // 2. Admin-verify the merchant and the processor.
    // 3. Create Rescue Items across several material types.
    // 4. Reserve + pay + pick up a subset  -> RESCUED events.
    // 5. Expire the remainder              -> EXPIRED events.
    // 6. Route expired items               -> ROUTED events.
    // 7. Processor accepts + logs intake   -> INTAKE_ACCEPTED events.
    // 8. Processor logs outcome with a measured residual -> PROCESSED events.
  },
});
```

Run it:

```bash
bunx convex run seed:seedDemo
```

**The residual rule.** The seed must produce a measurable residual so the
circularity rate computes to roughly **0.93**, and **never 1.0**. A processor
logging a 100% conversion outcome is not credible — BSF conversion, composting,
and biogas all leave a fraction. The demo number is 93%; the model's realistic
range is 85–95%. If the dashboard shows 100%, the seed is wrong.

### 9.6 Resetting local data

```bash
# Wipe every table on your dev deployment
bunx convex data --clear

# Reseed
bunx convex run seed:seedDemo
```

Do this whenever the schema changes shape enough that old rows are invalid.

---

## 10. Using the Convex Dashboard

```bash
bunx convex dashboard
```

| Tab | Use it for |
| --- | --- |
| **Data** | Browse and edit table rows. Fastest way to inspect a ledger sequence: sort `materialFlowLedger` by `occurredAt` and read the story of an item. |
| **Functions** | Deployed function list, invocation counts, error rates, execution time. |
| **Logs** | Live `console.log` output and thrown errors, with arguments. This is your primary backend debugger. |
| **Schedules** | Pending and completed scheduled functions. Essential for debugging expiry and routing. |
| **Settings → Environment Variables** | The web equivalent of `bunx convex env set`. |
| **Health** | Deployment status, storage usage, bandwidth against free-tier limits. |

### 10.1 Reading a ledger sequence

The Data tab is the fastest correctness check available. Filter
`materialFlowLedger` by `itemId`, sort by `occurredAt`, and add
`weightDeltaGrams` mentally. For a fully-resolved item the sum must be exactly
`0`. If it is not, a mutation is missing a ledger write or writing the wrong
sign.

| Event | Typical sign | Meaning |
| --- | --- | --- |
| `LISTED` | Positive | Material enters the system |
| `RESERVED` | Negative | Material committed to a consumer |
| `CANCELLED` / `EXPIRED` (of a reservation) | Positive | Material returns to the pool |
| `RESCUED` | Negative | Material leaves via consumer pickup |
| `EXPIRED` (of an item) | Negative | Material leaves the consumer channel |
| `ROUTED` | Positive then negative pair | Transfer into the recovery channel |
| `INTAKE_ACCEPTED` | Positive | Processor takes custody of measured intake |
| `PROCESSED` | Negative | Material converted; residual closed out |

`PRICE_ADJUSTED`, `ROUTING_FAILED`, `INTAKE_DECLINED`, and `MODERATED` carry a
`weightDeltaGrams` of `0` — they record a decision, not a material movement.

---

## 11. Android Workflow

Not needed before **M8**, but here is the whole loop.

### 11.1 The three commands

```bash
bun run android:sync   # bun run build && cap sync android
bun run android:open   # cap open android
bun run android:run    # cap run android
```

### 11.2 What `cap sync` actually does

`cap sync android` performs two distinct steps:

1. **`cap copy`** — copies the contents of `webDir` (which is `dist`, per
   `capacitor.config.ts`) into
   `android/app/src/main/assets/public/`, and regenerates
   `capacitor.config.json` inside the native project.
2. **`cap update`** — reads `package.json`, finds installed Capacitor plugins,
   and updates the native dependency list and `capacitor.plugins.json`
   accordingly.

The critical consequence: **`cap sync` copies whatever is currently in `dist`.**
If you have not rebuilt, you ship a stale bundle. This is exactly why
`android:sync` chains `bun run build` first, and why you should never call
`cap sync android` bare.

### 11.3 Device testing loop

```bash
# 1. Enable Developer Options and USB debugging on the phone.
# 2. Connect via USB and authorise the prompt.
adb devices          # should list the device

# 3. Build, sync, install, launch.
bun run android:run

# 4. Watch logs.
adb logcat | grep -i capacitor
```

Remote-debug the WebView from desktop Chrome at `chrome://inspect`. This gives
you the full DevTools — console, network, elements — against the app running on
the physical device.

### 11.4 Geolocation permission and its denial path

Consumer discovery asks for location to sort Rescue Items by distance. Both
outcomes must be tested on a real device.

| Case | How to produce it | Required behaviour |
| --- | --- | --- |
| Permission granted | Accept the system dialog | Map centres on the user; listings sorted by distance |
| Permission denied | Decline the dialog | **No crash, no blank screen.** Map falls back to a Semarang city-centre default, listings sort by pickup-window urgency, and a non-blocking banner explains that enabling location improves results |
| Permission permanently denied | Deny twice, or set "Don't allow" in App Info | Same fallback, plus a link to app settings |
| Location services off at OS level | Toggle off in the quick settings panel | Same fallback |

The denial path is not an edge case. A meaningful share of users decline, and a
demo where a declined prompt produces a white screen is a failed demo.

Emulators lie about geolocation. Test on hardware.

### 11.5 What we do and do not claim

The Android build is a **Capacitor WebView wrapper** around the same React
application served on the web. It gives us an installable APK, a home-screen
icon, native geolocation and camera permission prompts, and offline shell
caching.

It is **not** a native application, and we **never** claim native performance.
Saying so to a judge who knows what Capacitor is costs more credibility than the
claim could ever buy. The honest framing: *"One codebase ships as a web app and
as an installable Android app, so a warung owner with a low-end phone can install
it from a link rather than needing the Play Store."*

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Cannot find module '../../convex/_generated/api'` | `convex dev` has never run; the directory is gitignored | Run `bunx convex dev` and leave it running |
| Editor shows red squiggles on `api.*` after adding a function | TS server cached the old generated types | Restart the TypeScript server in your editor |
| App loads but no data; no network activity to Convex | `VITE_CONVEX_URL` unset, or Vite started before it was written | Check `.env.local`, then **restart `bun run dev`** |
| Console says the app is in placeholder mode | Intended behaviour without `VITE_CONVEX_URL` | Add the URL and restart Vite, or continue UI-only |
| `bunx convex dev` exits with an auth error | Session expired | `bunx convex logout && bunx convex dev` |
| Schema push rejected | Existing rows violate a newly added required field | Add the field as `v.optional(...)`, backfill, then tighten — see [DATABASE.md](../domain/DATABASE.md) |
| Convex function changes not taking effect | `convex dev` crashed silently | Check Terminal 1; restart it |
| Mapbox container is blank | Missing `mapbox-gl` CSS import | `import 'mapbox-gl/dist/mapbox-gl.css'` once at app entry |
| Mapbox 401 in the network tab | Token missing, wrong, or URL-restricted to a different origin | Check `VITE_MAPBOX_ACCESS_TOKEN`; add `http://localhost:5173` to the token's URL allowlist |
| Map renders at zero height | Parent has no explicit height | Give the container `h-[60vh]` or `flex-1 min-h-0` |
| Midtrans webhook never arrives locally | Midtrans cannot reach `localhost` | Deploy the `httpAction` to your Convex dev deployment and register **that public URL** — see §12.1 |
| Payment succeeds in Snap but order stays `reserved` | Webhook not registered, or signature verification failing | Check Convex Logs for the httpAction; verify `MIDTRANS_SERVER_KEY` |
| `EADDRINUSE: :5173` | Another Vite instance is running | `lsof -ti:5173 \| xargs kill -9`, or `bun run dev -- --port 5174` |
| Android build: `SDK location not found` | `ANDROID_HOME` unset | Export it, or create `android/local.properties` with `sdk.dir=/home/you/Android/Sdk` |
| Android build: Gradle JDK mismatch | Android Studio using a different JDK | Settings → Build Tools → Gradle → Gradle JDK → 21 |
| APK shows an old version of the UI | `cap sync` ran against a stale `dist` | Always use `bun run android:sync`, never bare `cap sync` |
| Production build serves stale assets | Old service worker still controlling the page | DevTools → Application → Service Workers → Unregister, then hard reload. Bump the cache name in `public/sw.js` when shipping |
| Blank page in production, works in dev | Host is not rewriting unknown paths to `index.html` | Add the SPA fallback — see [DEPLOYMENT.md](DEPLOYMENT.md) |
| Thrown Bahasa Indonesia error on boot | `#root` missing from `index.html` | Restore the `<div id="root"></div>` element |

### 12.1 Exposing the Midtrans webhook during local development

Midtrans posts payment notifications to a public URL. Your laptop is not one.
There are two workable approaches; the first is strongly preferred.

**Option A — use your Convex dev deployment's HTTP endpoint (recommended).**

Convex `httpAction` endpoints are already publicly reachable, including on dev
deployments. There is no tunnel to run and no extra dependency.

```ts
// convex/http.ts
import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

http.route({
  path: '/midtrans/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body: unknown = await request.json();
    // Signature verification happens inside the internal mutation, which also
    // writes the ledger event transactionally.
    await ctx.runMutation(internal.payments.handleNotification, { body });
    return new Response('OK', { status: 200 });
  }),
});

export default http;
```

The public URL is your deployment's HTTP domain, e.g.
`https://<deployment-name>.convex.site/midtrans/webhook`. Register that in
the Midtrans Sandbox dashboard under **Settings → Configuration → Payment
Notification URL**.

Because every developer has their own dev deployment, each of you registers your
own URL while testing. Coordinate so you are not overwriting each other's
setting; in practice one person owns payment integration at a time.

**Option B — a tunnel.** If you must run the handler on your machine, expose it
with `ngrok http 5173` or Cloudflare Tunnel and register the generated URL. This
adds a moving part that breaks on every restart. Use Option A.

**Testing without waiting for a real payment:** replay a captured notification
body straight at the internal mutation.

```bash
bunx convex run payments:handleNotification '{
  "body": {
    "order_id": "cirquo-order-abc123",
    "status_code": "200",
    "gross_amount": "12000.00",
    "signature_key": "<computed-sha512>",
    "transaction_status": "settlement",
    "payment_type": "qris"
  }
}'
```

---

## 13. Debugging Techniques

### 13.1 Reactive queries

`useQuery` subscribes. When the underlying data changes, every subscribed
component re-renders automatically — no invalidation, no refetch call. This is
the mechanism behind the demo moment where the merchant confirms a pickup code
and the consumer's screen updates without a refresh.

Three states, always distinguished:

```tsx
const items = useQuery(api.surplusItems.listByStatus, { status: 'active' });

if (items === undefined) return <Skeleton />;   // loading
if (items.length === 0) return <EmptyState />;  // loaded, empty
return <Grid items={items} />;                  // loaded, populated
```

Rendering the empty state during load is the most common bug in this codebase's
shape.

**A query not updating** almost always means the mutation did not actually
commit. Check the Convex Logs tab for a thrown `ConvexError` before assuming a
reactivity problem.

**Conditional queries** use the `'skip'` sentinel, never an `if` around the
hook — `react/rules-of-hooks` is an error:

```tsx
const order = useQuery(api.orders.getById, orderId ? { orderId } : 'skip');
```

### 13.2 Scheduled functions

Cron and delayed jobs — reservation-hold expiry, item expiry, routing retries —
are invisible in the browser. Debug them in the dashboard.

| Where | What it tells you |
| --- | --- |
| **Schedules** tab | Pending jobs with their scheduled time; completed jobs with their result |
| **Logs** tab | `console.log` and errors from the job body |
| `bunx convex logs` | The same stream in your terminal |

To test time-dependent behaviour without waiting 15 minutes, expose the timing as
config and provide a debug mutation that back-dates a timestamp:

```ts
/** DEV ONLY. Back-dates an order's hold so the expiry cron picks it up now. */
export const expireHoldNow = internalMutation({
  args: { orderId: v.id('orders') },
  handler: async (ctx, { orderId }) => {
    await ctx.db.patch(orderId, { holdExpiresAt: Date.now() - 1_000 });
  },
});
```

```bash
bunx convex run debug:expireHoldNow '{"orderId":"<id>"}'
```

Keep such helpers in a `convex/debug.ts` module, mark them `internalMutation`,
and delete or gate the module before production deploy.

### 13.3 Frontend

| Technique | Use |
| --- | --- |
| React DevTools Profiler | Find components re-rendering more than expected |
| Network tab, WS filter | Confirm the Convex WebSocket is connected and receiving |
| `console.table(items)` | Inspect a query result without expanding nested objects |
| Chrome `chrome://inspect` | Debug the Capacitor WebView on a physical device |
| Elements → toggle `.dark` on `<html>` | Verify dark-mode tokens without changing OS settings |

---

## 14. Performance Profiling

The budget is **sub-2s** for a meaningful first paint on a mid-range Android
device over 4G. Semarang users are not on flagship hardware.

### 14.1 Bundle size

```bash
bun run build
ls -lh dist/assets/
```

Watch the biggest offenders:

| Dependency | Approx. impact | Mitigation |
| --- | --- | --- |
| `mapbox-gl` | Largest single dependency | Lazy-load the map route only; never import at app entry |
| `react` + `react-dom` | Baseline | Unavoidable |
| `lucide-react` | Small if tree-shaken | Import named icons only, never `import * as Icons` |
| `date-fns` | Small if tree-shaken | Import individual functions |
| Midtrans Snap | External script | Load on demand at checkout, not on boot |

Route-level splitting:

```tsx
const MapPage = lazy(() => import('@/pages/consumer/MapPage'));
```

### 14.2 Lighthouse

```bash
bun run build
bun run preview
# then run Lighthouse against http://localhost:4173 in Chrome DevTools
```

Always profile the **preview** build, never the dev server. Dev serves unminified
modules over many requests and its numbers are meaningless.

| Metric | Target |
| --- | --- |
| First Contentful Paint | < 1.5 s |
| Largest Contentful Paint | < 2.5 s |
| Total Blocking Time | < 300 ms |
| Cumulative Layout Shift | < 0.1 |
| Performance score (mobile throttled) | ≥ 80 |

### 14.3 Backend

The Convex **Functions** tab reports execution time per function. Two rules
prevent almost all backend slowness here:

1. **Always query through an index.** A `.collect()` followed by a JS `.filter()`
   is a table scan.
2. **Never fetch the whole ledger to render a dashboard.** Aggregate with
   `summariseLedger` over an indexed, bounded range, and cache periodic rollups
   into `impactSnapshots` once M6 lands.

---

## 15. Daily Development Loop

### 15.1 Session start

```bash
git checkout dev && git pull
bun install                 # only if bun.lock changed
bunx convex dev             # Terminal 1
bun run dev                 # Terminal 2
git checkout -b feat/<scope>
```

### 15.2 While working

1. Pick one task from the current milestone.
2. If it involves an algorithm, write the pure function in `src/lib/` **first**,
   with its `*_CONFIG` object and JSDoc.
3. Wire the Convex function: guards → validate → pure logic → persist → ledger.
4. Build the UI against the real function, not mock data.
5. Manually smoke the affected flow end to end.
6. `bun run build && bun run lint`.
7. Commit with a Conventional Commits message.

### 15.3 Session end

```bash
bun run build && bun run lint
git push -u origin feat/<scope>
# open a PR into dev
```

### 15.4 Loop tied to the milestones

| Milestone | What you can exercise locally once it lands |
| --- | --- |
| **M1** Ledger + Auth | Register and log in as all four roles; every mutation writes a ledger entry |
| **M2** Merchant listing + Dynamic Pricing | Create a Rescue Item and see a suggested price from `suggestRescuePrice` |
| **M3** Consumer discovery + Midtrans | Map with real listings; Snap sandbox payment; webhook flips the order to `paid` |
| **M4** Pickup + Scheduler + Circular Routing | Merchant pickup confirmation; Rescue Item expiry and routing jobs; M3 hold expiry is not reimplemented |
| **M5** Processor intake + outcome | Accept an offer, log measured intake, log outcome and residual |
| **M6** Impact dashboards | All four dashboards read from `summariseLedger` — hardcoded figures deleted |
| **M7** Admin + polish | Verification queue, moderation, ledger audit trail view |
| **M8** Capacitor + demo | Signed APK on a physical phone; full demo rehearsal |

Without `VITE_CONVEX_URL`, the app runs in placeholder mode against
`mock-data.ts`. That is useful for UI-only work but must never be presented as a
working backend. M1–M3 source requires a configured Convex deployment for real
data.

---

## 16. Related Documents

| Document | Relevance |
| --- | --- |
| [Style Guide](STYLE_GUIDE.md) | Code conventions enforced in review |
| [Testing Strategy](TESTING.md) | What to test and the manual smoke checklist |
| [Deployment](DEPLOYMENT.md) | CI, hosting, Convex deploy, Android release |
| [Product Requirements](../product/PRD.md) | Requirement IDs and MoSCoW priority |
| [Database Schema](../domain/DATABASE.md) | Tables, fields, indexes, migrations |
| [State Machine](../domain/STATE_MACHINE.md) | Legal status transitions |
| [Material Flow Ledger](../impact/MATERIAL_LEDGER.md) | Event catalogue and invariants |
| [Impact Algorithm](../impact/ALGORITHM.md) | Pricing, routing, and impact maths |
| [Impact Methodology](../impact/IMPACT.md) | Emission factors and methodology version |
| [API Reference](../api/API.md) | Convex function signatures |
| [Architecture](../architecture/ARCHITECTURE.md) | System overview |
| [Backend](../architecture/BACKEND.md) | Convex module structure |
| [Frontend](../architecture/FRONTEND.md) | Routing and component structure |
| [Scheduler](../architecture/SCHEDULER.md) | Cron jobs, TTLs, retries |
| [Security](../security/SECURITY.md) | Threat model and secret handling |
| [Authentication](../security/AUTH.md) | Session and identity handling |
| [Permissions](../security/PERMISSIONS.md) | Role matrix and guards |
| [UI Guide](../design/UI_GUIDE.md) | Design tokens and visual language |
| [Components](../design/COMPONENTS.md) | Component inventory |
| [Roadmap](../business/ROADMAP.md) | Milestones M1–M8 |
| [Risks](../business/RISKS.md) | Known risks and mitigations |
| [Feature Spec](../spec/FEATURES.md) | Feature-level requirements |
| [Agent Guide](../project/AGENTS.md) | Rules for AI contributors |
| [Contributing](../project/CONTRIBUTING.md) | Branch, commit, and PR process |
| [Changelog](../project/CHANGELOG.md) | Release history |

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
