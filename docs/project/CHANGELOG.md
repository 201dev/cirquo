# Changelog

| Field | Value |
| --- | --- |
| **Document Type** | Release Record |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-08-29 |
| **Owner** | Cirquo Engineering |
| **Format** | [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) |
| **Versioning** | [Semantic Versioning](https://semver.org/spec/v2.0.0.html) |

All notable changes to Cirquo are documented in this file.

---

## Format and Versioning Policy

### Why Keep a Changelog

A changelog is written for humans, not machines. `git log` records what changed
in the code; this file records what changed for a **user of the platform** —
Consumer, Merchant, Organic Processor, or Admin — and for anyone auditing how the
impact numbers were produced.

Rules we follow:

- Newest version first.
- Every version has a release date in `YYYY-MM-DD`.
- Changes are grouped by category.
- An `[Unreleased]` section always sits at the top.
- Entries describe **outcomes**, not commits.
- Entries use exact Cirquo terminology: Rescue Item, Rescued, Recovered,
  Residual, Circular Routing, Material Flow Ledger, Dynamic Rescue Pricing,
  circularity rate, pickup window, pickup code.

### Semantic Versioning, adapted to a pre-1.0 competition project

Cirquo ships its MVP as **0.x**. This is deliberate and honest: the public
contract is not stable, the schema is still moving, and the platform has not run
a real pilot. Calling an unproven competition MVP `1.0.0` would misrepresent its
maturity.

**Before 1.0.0:**

| Bump | Meaning | Example |
| --- | --- | --- |
| **MINOR** (`0.X.0`) | A milestone lands, or a breaking change ships | Circular Routing implemented; `weightKg` renamed to `weightGrams` |
| **PATCH** (`0.0.X`) | Bug fixes and small improvements within a milestone | Pickup code validation corrected |

Under SemVer, anything may change in a 0.x release. In practice we still call out
breaking changes prominently, because our own Android builds and any pilot
partner depend on them.

**After 1.0.0:**

| Bump | Meaning |
| --- | --- |
| **MAJOR** (`X.0.0`) | Breaking change to the Convex public API, a schema change requiring migration, or a change to the impact methodology that alters how new figures are computed |
| **MINOR** (`0.X.0`) | Backward-compatible new functionality |
| **PATCH** (`0.0.X`) | Backward-compatible bug fixes |

**1.0.0 is reached when** the platform has run a real pilot with real merchants
and processors, the Material Flow Ledger has proven its integrity invariants over
production data, and the Convex API is stable enough that we are willing to
promise backward compatibility.

### Categories

Standard Keep a Changelog categories:

| Category | Use |
| --- | --- |
| **Added** | New features |
| **Changed** | Changes to existing functionality |
| **Deprecated** | Soon-to-be-removed features |
| **Removed** | Removed features |
| **Fixed** | Bug fixes |
| **Security** | Vulnerability fixes and hardening |

Plus two categories specific to this project.

#### Impact Methodology

Any change to an emission factor, a conversion coefficient, or the methodology
version string is recorded here — **never** silently folded into "Changed".

Impact figures are the substance of Cirquo's claim. If the number of kilograms of
CO₂e attributed to a rescued kilogram of food changes, anyone reading a historical
figure must be able to find out when and why.

**The retroactivity rule is absolute:**

> **A methodology change NEVER retroactively recomputes historical figures.**
>
> Every stored impact figure carries a methodology version stamp (`impact-v1`
> today). Changing a factor creates `impact-v2` and applies **only to figures
> computed after the change**. Records stamped `impact-v1` keep their original
> values forever.
>
> Retroactive recomputation would silently restate history, which is exactly the
> failure mode that makes carbon-accounting claims untrustworthy. The Material
> Flow Ledger is append-only for the same reason.

An Impact Methodology entry states: what changed, the old and new values, the
source for the new value, the new methodology version, and the effective date.

#### Schema

Convex schema changes are recorded separately because they carry deployment risk
that no other change does.

The migration discipline is **additive → backfill → tighten**, across three
separate deploys:

| Step | Action | Rollback safety |
| --- | --- | --- |
| 1 | Add the field as `v.optional(...)` | ✅ Trivially safe both directions |
| 2 | Backfill existing rows with a migration mutation | ✅ Safe; data only |
| 3 | Tighten to required | ⚠️ Rolling back makes it optional again — safe |

**Never combine the three into one deploy.** Convex validates the schema against
existing data at deploy time and will reject a required field that existing rows
lack. More importantly, the frontend and backend deploy independently, so for a
short window an older client talks to the newer backend.

A Schema entry states: which tables and fields changed, whether a backfill is
required, and which migration step this release represents.

---

## [Unreleased]

Work planned across milestones M1–M8. Nothing here has shipped.

### Added

**M1 — Material Flow Ledger and Authentication**
- `materialFlowLedger` table with append-only semantics and the full event
  catalogue: `LISTED`, `PRICE_ADJUSTED`, `RESERVED`, `PAID`, `RESCUED`,
  `CANCELLED`, `EXPIRED`, `ROUTED`, `ROUTING_FAILED`, `INTAKE_ACCEPTED`,
  `INTAKE_DECLINED`, `PROCESSED`, `MODERATED`
- `recordLedgerEvent(ctx, {...})` helper, callable only from within a mutation so
  the ledger write is transactional with the state change it records
- Weight-conservation invariant check — for a fully-resolved Rescue Item the sum
  of `weightDeltaGrams` equals exactly `0`
- Ledger-completeness invariant check — every terminal-status item has at least
  one terminal event
- `convex/integrity.ts` with `runIntegrityCheck` for on-demand verification
- Email and password authentication with sessions
- Four roles: Consumer, Merchant, Organic Processor, Admin
- Server-side guards `requireAuth`, `requireRole`, `requireOwnership` as the
  first statements of every mutation
- Canonical `ConvexError` code catalogue: `AUTH_REQUIRED`, `FORBIDDEN`,
  `NOT_FOUND`, `VALIDATION_FAILED`, `INVALID_TRANSITION`,
  `INSUFFICIENT_QUANTITY`, `PRICE_BELOW_FLOOR`, `PICKUP_WINDOW_CLOSED`,
  `INVALID_PICKUP_CODE`, `PAYMENT_HOLD_EXPIRED`, `NOT_VERIFIED`,
  `CAPACITY_EXCEEDED`, `MATERIAL_TYPE_REJECTED`, `OFFER_EXPIRED`, `RATE_LIMITED`,
  `IDEMPOTENCY_CONFLICT`
- Client-side mapping from error codes to Bahasa Indonesia Sonner toasts
- CI grep guard failing the build on any `db.patch`, `db.delete`, or `db.replace`
  against `materialFlowLedger`

**M2 — Merchant listing and Dynamic Rescue Pricing**
- Rescue Item creation with title, material type, weight, quantity, original
  price, and pickup window
- `src/lib/pricing.ts` with `suggestRescuePrice` and `PRICING_CONFIG` — pure,
  deterministic, no Convex imports, `nowAt` injected rather than read
- Price floor clamp and maximum discount clamp, both reported in the result
- Merchant listing management: draft, publish, edit, deactivate
- Merchant dashboard reading real listing data

**M3 — Consumer discovery and Midtrans payment**
- Mapbox GL map with merchant pins across Semarang
- `src/lib/geo.ts` with `haversineMeters` for distance calculation
- `src/lib/ranking.ts` with `rankListings` and `RANKING_CONFIG`
- Geolocation permission request, with a graceful fallback to a Semarang default
  centre when permission is denied or location services are off
- Rescue Item detail sheet with weight in kg, rescue price in Rp, pickup window
  in WIB, and distance
- Reservation flow — **quantity is decremented at reservation, not at payment**
- 15-minute unpaid reservation hold, released automatically on expiry
- Midtrans Sandbox integration with QRIS
- `convex/http.ts` exposing the Midtrans notification `httpAction`
- Webhook signature verification (SHA-512) and idempotent handling of retries
- Pickup code generation and display

**M4 — Pickup, Scheduler, and Circular Routing**
- Merchant pickup code confirmation, marking an order `picked_up` and emitting a
  `RESCUED` ledger event using the `orders.rescuedWeightGrams` snapshot
- Live consumer order status via Convex reactive queries — no refresh required
- `convex/crons.ts` with scheduled jobs for reservation-hold release, Rescue Item
  expiry, recovery-batch routing, and daily ledger integrity verification
- `src/lib/routing.ts` with `rankEligibleProcessors` and `ROUTING_CONFIG`
- Circular Routing: material-type compatibility, daily capacity, verification
  status, distance, and declined-list exclusion
- Maximum 3 routing attempts with a 6-hour offer TTL, then `unroutable`
- `ROUTING_FAILED` ledger event on exhaustion

**M5 — Organic Processor intake and outcome**
- Processor registration and admin verification
- Processor capability profile: accepted material types and daily capacity
- Offer inbox with TTL countdown, accept and decline
- Measured intake logging — the weighed figure, which may differ from the estimate
- Outcome logging by method: BSF larvae, compost, biogas, animal feed
- Recovered weight and **residual** weight recorded separately
- Validation rejecting an outcome where recovered + residual exceeds intake
- `INTAKE_ACCEPTED`, `INTAKE_DECLINED`, and `PROCESSED` ledger events

**M6 — Impact dashboards**
- `src/lib/impact.ts` with `summariseLedger`, `estimateCo2e`, and `IMPACT_CONFIG`
- Consumer impact view: meals rescued, kg rescued, CO₂e avoided
- Merchant impact view: kg listed, kg rescued, kg recovered, revenue, circularity
  rate
- Processor impact view: kg intake, kg recovered, kg residual, conversion rate by
  method
- Admin platform view: totals and overall circularity rate
- `impactSnapshots` table caching periodic rollups
- **All hardcoded dashboard figures removed**; every number derives from the
  Material Flow Ledger

**M7 — Admin and polish**
- Merchant and processor verification queue
- Rescue Item moderation with a `MODERATED` ledger event
- Material Flow Ledger audit trail view — read-only, with no edit or delete
  control anywhere on the screen
- Dispute recording
- Accessibility pass: focus management, labels, contrast, tap targets
- Empty, loading, and error states across all screens

**M8 — Mobile build and demo readiness**
- Signed Android APK for `com.cirquo.app`
- Geolocation permission grant and denial paths verified on physical hardware
- Offline application shell via the service worker
- Performance tuning against the sub-2s budget, including lazy-loading
  `mapbox-gl` on the map route only
- Demo seed data producing a circularity rate near **0.93** with a visible
  residual

### Changed
- Impact dashboards move from hardcoded constants to ledger-derived values (M6)
- Placeholder pages move from `src/constants/mock-data.ts` to live Convex queries
  (M2–M6)
- `impact.getPlaceholderSummary` is replaced by a real `summariseLedger`-backed
  query (M6)

### Removed
- `src/constants/mock-data.ts`, once every page reads live data (M6)
- `impact.getPlaceholderSummary` (M6)

### Security
- Server-side role and ownership guards on every mutation (M1)
- Midtrans webhook signature verification (M3)
- Mapbox token scoped to read-only scopes and restricted by URL per environment
  (M3)
- All secrets held in Convex environment variables; nothing sensitive behind a
  `VITE_` prefix (M3)
- Rate limiting on reservation and authentication mutations (M7)

### Schema
- **M1**: add `materialFlowLedger`, `sessions`
- **M2**: add fields to `surplusItems` for Dynamic Rescue Pricing and pickup
  window
- **M3**: add `payments`; add reservation-hold fields to `orders`
- **M4**: add routing attempt and TTL fields to `recoveryBatches`
- **M5**: add `processors`; add intake and outcome fields to `recoveryBatches`
- **M6**: add `impactSnapshots`
- **M7**: add `notifications`, `disputes`

Historical planning target: **12 tables**, from the 5-table scaffold that
existed at that time. The current source has 10 tables; see
[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

### Impact Methodology
- **M6**: establish `impact-v1` — the initial methodology version. Emission
  factors, meal-equivalent conversion, and the circularity rate definition are
  fixed and documented in
  [IMPACT.md](../impact/IMPACT.md). Every figure computed under this version is
  stamped `impact-v1` and will never be retroactively recomputed.

---

## [0.1.0] - 2026-08-06

Initial project scaffold. **This release contains no working backend
functionality.** It establishes the application shell, the design system, the
Convex schema foundation, and the complete documentation system.

### Added

**Application shell**
- React 19.2 + Vite 8 + TypeScript ~6.0, running on Bun
- React Router v7 with 4 role layouts (Consumer, Merchant, Organic Processor,
  Admin) plus an auth layout
- `src/app/router.tsx` route tree and `src/app/providers.tsx` provider
  composition
- `src/main.tsx` entry point, which throws a Bahasa Indonesia error if `#root` is
  missing and registers `/sw.js` in PROD only
- `@` path alias resolving to `./src`

**Design system**
- Tailwind CSS v4 via `@tailwindcss/vite`, configured CSS-first through `@theme`
  in `src/index.css`. No `tailwind.config.js` — and none should be added.
- OKLCH colour tokens, chosen for perceptual uniformity so the rescued /
  recovered / residual states stay equally legible against the same background
- Dark mode via `next-themes`
- `@fontsource-variable/geist` typography
- **17 shadcn/ui primitives** in `src/components/ui/`, new-york style, neutral
  base, on `radix-ui` and `@base-ui/react`
- **3 custom shared components** in `src/components/common/`
- Sonner for toasts, Lucide React for icons
- `cn()` utility in `src/lib/utils.ts` combining `clsx` and `tailwind-merge`

**Backend foundation**
- Convex 1.43 configured
- **Convex schema with 5 tables**: `users`, `merchants`, `surplusItems`,
  `orders`, `recoveryBatches`
- **6 read-only Convex queries**:
  - `users.getByEmail`
  - `merchants.getByOwner`
  - `surplusItems.listByStatus`
  - `orders.listByUser`
  - `recoveryBatches.listByStatus`
  - `impact.getPlaceholderSummary` — returns **placeholder** figures, not
    ledger-derived
- `src/lib/convex.ts`, which creates the Convex client only when
  `VITE_CONVEX_URL` is set; otherwise the app runs in a no-backend placeholder
  mode and logs an informational message in DEV only

**Pages**
- **9 placeholder pages** across the consumer, merchant, processor, admin, and
  auth areas, all reading from `src/constants/mock-data.ts`
- Dashboards displaying hardcoded figures

**Mobile and PWA**
- Capacitor 8 configured for Android, app ID `com.cirquo.app`, `webDir` `dist`
- `android/` native project generated
- Scripts: `android:sync`, `android:open`, `android:run`
- `public/manifest.webmanifest`, `public/sw.js`, `public/favicon.svg`, and PWA
  icons

**Tooling**
- oxlint with the `react`, `typescript`, and `oxc` plugins; rules
  `react/rules-of-hooks: error` and `react/only-export-components: warn` with
  `allowConstantExport`
- Scripts: `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`, `convex`
- React Hook Form 7 + Zod 4 + `@hookform/resolvers` installed
- `date-fns` for date formatting
- `.env.example` containing only `VITE_CONVEX_URL`

**Documentation**
- Complete documentation system under `docs/`, covering product, domain, impact,
  architecture, API, security, design, engineering, business, spec, and project
  areas

### Not Included

Stated explicitly so no reader assumes otherwise:

| Not present | Detail |
| --- | --- |
| **Convex mutations** | **Zero mutations exist.** The backend is read-only. |
| **Material Flow Ledger** | The `materialFlowLedger` table does not exist. |
| **Authentication** | No auth of any kind. No sessions, no guards, no roles enforced. |
| **Mapbox** | Not integrated. No map renders. |
| **Midtrans** | Not integrated. No payment is possible. |
| **Scheduler** | No `convex/crons.ts`. Nothing expires, nothing routes. |
| **Circular Routing** | Not implemented. |
| **Impact calculation** | Dashboards show hardcoded figures. `impact.getPlaceholderSummary` is a placeholder. |
| **Pure logic modules** | `pricing.ts`, `routing.ts`, `ranking.ts`, `impact.ts`, `geo.ts` are planned, not written. |
| **Tests** | **No tests of any kind.** No Vitest, no Playwright, no `convex-test`. |
| **CI/CD** | No GitHub Actions workflow. |
| **Deployment** | Nothing is hosted. No production Convex deployment. |

At this version Cirquo is a well-structured shell with a documented plan. It is
not a working platform.

---

## Entry Template

Copy this into `[Unreleased]` when adding a change. Delete unused categories.

```markdown
### Added
- Description of the new capability, from the user's point of view.
  Reference the requirement ID. (REQ-XXXX-NNN)

### Changed
- What changed and what the user will notice.

### Deprecated
- What will be removed, when, and what replaces it.

### Removed
- What was removed and why.

### Fixed
- The bug, and the observable symptom it caused.

### Security
- The hardening or vulnerability fix. No exploit details before the fix ships.

### Impact Methodology
- Factor changed: <name>
  - Old value: <value> (<unit>)
  - New value: <value> (<unit>)
  - Source: <citation>
  - Methodology version: impact-vN
  - Effective: <YYYY-MM-DD>
  - **Historical figures stamped with earlier versions are NOT recomputed.**

### Schema
- Table `<name>`: added field `<name>` as `v.optional(...)`
  - Migration step: 1 of 3 (additive)
  - Backfill required: yes/no
  - Breaking: no
```

---

## Release Process

```bash
# 1. Confirm `dev` is green and the full manual smoke checklist passes.
#    See docs/engineering/TESTING.md §7.

# 2. Move [Unreleased] entries into a new version section in this file, with
#    today's date. Leave [Unreleased] in place with empty category headings.

# 3. Update the Android versionName and increment versionCode in
#    android/app/build.gradle to match.

# 4. Open a PR from dev into main, titled "release: 0.X.0".

# 5. Merge after CI passes and the PR is approved.

# 6. Tag the release.
git checkout main && git pull
git tag -a v0.X.0 -m "Release 0.X.0 — <one-line summary>"
git push origin v0.X.0

# 7. CI deploys Convex production; Vercel deploys the frontend.

# 8. Run post-deploy verification.
#    See docs/engineering/DEPLOYMENT.md §10.2.
bunx convex run integrity:runIntegrityCheck --prod
```

Checklist before tagging:

```
[ ] Manual smoke checklist passes on staging
[ ] `bun run build`, `bun run lint`, and `bun test` all pass
[ ] Ledger immutability guard passes
[ ] Integrity check returns ok: true
[ ] Circularity rate reads between 0.85 and 0.95 — verified NOT 1.0
[ ] CHANGELOG.md updated with the new version and date
[ ] Android versionCode incremented and versionName matched
[ ] No forbidden terminology in the release notes
```

---

## Version History

Target dates are aligned to the roadmap and the DSDC ANFORCOM 2026 preliminary
deadline of **31 August 2026**. They are roadmap markers, not release tags;
M1–M5 source availability is recorded below and still requires the stated UAT.

| Version | Target date | Milestone | Summary |
| --- | --- | --- | --- |
| **0.1.0** | 2026-08-06 | — | ✅ **Released.** Scaffold, design system, 5-table schema, 6 read-only queries, 9 placeholder pages, Capacitor Android, documentation system |
| **0.2.0** | 2026-08-10 | M1 | 📋 Material Flow Ledger and authentication. `materialFlowLedger` table, `recordLedgerEvent`, integrity invariants, four roles, server-side guards, `ConvexError` catalogue, CI ledger guard |
| **0.3.0** | 2026-08-13 | M2 | 📋 Merchant listing and Dynamic Rescue Pricing. Rescue Item creation, `suggestRescuePrice` with floor and max-discount clamps, merchant dashboard on live data |
| **0.4.0** | 2026-08-17 | M3 | 🧪 Source available; Sandbox UAT pending. Consumer discovery and Midtrans payment. Mapbox map, `haversineMeters`, `rankListings`, geolocation with denial fallback, reservation with a 15-minute hold, Midtrans Sandbox QRIS, webhook with signature verification |
| **0.5.0** | 2026-08-20 | M4 | 🧪 Source available; deployment UAT pending. Pickup, scheduler, and Circular Routing. Pickup code confirmation with live consumer updates, cron jobs, `rankEligibleProcessors`, 3-attempt limit with 6-hour offer TTL |
| **0.6.0** | 2026-08-23 | M5 | 🧪 Source available; deployment UAT pending. Organic Processor intake and outcome. `processors` table, offer inbox, measured intake logging, outcome by method with recorded residual |
| **0.7.0** | 2026-08-26 | M6 | 📋 Impact dashboards. `summariseLedger`, `estimateCo2e`, `impact-v1` methodology, all four dashboards ledger-derived, hardcoded figures removed, `mock-data.ts` deleted |
| **0.8.0** | 2026-08-28 | M7 | 📋 Admin and polish. Verification queue, moderation, read-only ledger audit trail, disputes, accessibility pass, empty and error states |
| **0.9.0** | 2026-08-30 | M8 | 📋 Mobile build and demo readiness. Signed APK, geolocation paths verified on hardware, offline shell, performance tuning, demo seed at ~0.93 circularity. **48-hour code freeze begins.** |
| **1.0.0** | Post-competition | — | 📋 Hardening after a real pilot. Playwright E2E for the four critical journeys, production Midtrans, stable public API, proven ledger integrity over real data |

**On 1.0.0.** It is deliberately not scheduled before the deadline. A `1.0.0`
tag is a promise of API stability and production readiness, and Cirquo will not
have earned that until it has run with real merchants, real Organic Processors,
and a Material Flow Ledger that has held its invariants over data nobody on the
team created.

---

## Related Documents

| Document | Relevance |
| --- | --- |
| [Contributing](CONTRIBUTING.md) | Commit conventions and the release process |
| [Agent Guide](AGENTS.md) | Rules for AI contributors |
| [Roadmap](../business/ROADMAP.md) | Milestones M1–M8 and their scope |
| [Product Requirements](../product/PRD.md) | Requirement IDs referenced in entries |
| [Material Flow Ledger](../impact/MATERIAL_LEDGER.md) | Event catalogue and append-only guarantee |
| [Impact Methodology](../impact/IMPACT.md) | Emission factors and methodology versioning |
| [Impact Algorithm](../impact/ALGORITHM.md) | Pricing, routing, and impact maths |
| [Database Schema](../domain/DATABASE.md) | Tables and the additive-backfill-tighten discipline |
| [State Machine](../domain/STATE_MACHINE.md) | Legal status transitions |
| [API Reference](../api/API.md) | Convex function signatures |
| [Development Guide](../engineering/DEVELOPMENT.md) | Local setup and workflow |
| [Style Guide](../engineering/STYLE_GUIDE.md) | Code conventions |
| [Testing Strategy](../engineering/TESTING.md) | Smoke checklist and integrity checks |
| [Deployment](../engineering/DEPLOYMENT.md) | CI, hosting, and post-deploy verification |
| [Architecture](../architecture/ARCHITECTURE.md) | System overview |
| [Backend](../architecture/BACKEND.md) | Convex module structure |
| [Frontend](../architecture/FRONTEND.md) | Component and routing structure |
| [Scheduler](../architecture/SCHEDULER.md) | Cron jobs and TTLs |
| [Security](../security/SECURITY.md) | Threat model |
| [Authentication](../security/AUTH.md) | Session handling |
| [Permissions](../security/PERMISSIONS.md) | Role matrix |
| [UI Guide](../design/UI_GUIDE.md) | Design tokens |
| [Components](../design/COMPONENTS.md) | Component inventory |
| [Risks](../business/RISKS.md) | Risk register |
| [Feature Spec](../spec/FEATURES.md) | Feature-level requirements |

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
