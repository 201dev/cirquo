# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before writing any code.

---

## What Cirquo Is

**Cirquo** is a **Circular Food Recovery Platform** built for DSDC ANFORCOM 2026. It connects food businesses, consumers, and organic processors so that surplus food always has a next best use — and so that every kilogram is accounted for.

**It is not a food delivery app.** There is no delivery. Consumers collect in person. The marketplace is the entry point; the product is **Material Flow Orchestration**.

The circular flow:

```
Merchant lists a Rescue Item
        │
        ├── Consumer reserves → pays → collects with a pickup code   ⇒ RESCUED
        │
        └── unclaimed / expired / processing-only
                 └── Circular Routing → Organic Processor
                          └── intake logged → outcome logged        ⇒ RECOVERED
                                                                    ⇒ RESIDUAL
```

Every state change writes an immutable event to the **Material Flow Ledger**. Every impact number in the product is derived from that ledger and from nothing else.

Product name is **Cirquo** — never "CirQuo" or "CircQuo".

---

## Working Method

**Ponytail is the default.** Graphify is an occasional lookup tool. Neither is a substitute for reading the file you are about to change.

### Ponytail — the default discipline

Ponytail is a laziness discipline for *solutions*, never for *understanding*. Read the code fully, then take the shortest path that actually works.

Climb this ladder and stop at the first rung that holds:

1. Does this need to exist at all? Speculative need ⇒ skip it and say so in one line.
2. Does something in this repo already do it? Check `src/lib/`, `src/components/common/`, `src/components/ui/`, `src/types/domain.ts` before writing anything new.
3. Does the standard library or a native platform feature do it? `Intl.NumberFormat('id-ID')` over a currency helper; `<input type="datetime-local">` over a date-picker dependency; a Convex index over in-memory filtering.
4. Does an already-installed dependency solve it? `date-fns`, `zod`, `sonner`, `lucide-react`, shadcn/ui primitives are all present. Adding a dependency for something a few lines can do is a defect.
5. Can it be one line? Then it is one line.
6. Only then: the minimum code that works.

Applied to this codebase specifically:

| Do | Don't |
|---|---|
| One `StatusBadge` with a discriminated `status` prop | Ten status components |
| One `summariseLedger()` parameterised by scope | Four dashboard aggregation pipelines |
| Extend `SummaryCard` with a variant | Fork it per role |
| A Convex index for a new access pattern | Fetch-then-filter in the handler |
| `Intl.NumberFormat` for IDR and kg | A formatting utility layer |

**Where laziness does not apply.** Never simplify away the ledger write, a server-side guard, input validation at a trust boundary, or an accessibility basic. Those are the four things this project cannot recover from getting wrong. See Non-Negotiable Rules below.

**Marking deliberate corners.** When a simplification cuts a real corner with a known ceiling, leave a comment naming the ceiling and the upgrade path:

```ts
// ponytail: in-memory Haversine filter over all active items.
// Fine at pilot scale (~50 items/day). Add a city-prefixed index
// before multi-city — see docs/domain/DATABASE.md §6.
```

Do not leave these on trivial code. They are for real, knowingly-deferred limits.

**Every non-trivial change leaves one runnable check.** A branch, a loop, a money path, or anything touching weights gets the smallest thing that fails when the logic breaks — an `assert`-based self-check or one small test. No frameworks, no fixtures. See [`docs/engineering/TESTING.md`](docs/engineering/TESTING.md).

### Graphify — occasional, and only for cross-cutting questions

A knowledge graph exists at `graphify-out/` (gitignored, so it may be absent or stale on a fresh clone). It is a lookup index, not a source of truth.

**Do not use Graphify for** single-file edits, renames within a known file, formatting, new isolated components, small UI changes, running lint/build, git operations, or anything answerable from a file you already have open. That covers most tasks in this repo.

**Do use Graphify when** the question spans modules and you do not know which files matter: tracing a flow across page → Convex function → schema, finding every caller before changing a shared function, or impact analysis before a refactor.

```bash
graphify query "which mutations call recordLedgerEvent and which skip it?"
graphify affected "src/lib/impact.ts"
graphify path "CreateSurplusPage" "materialFlowLedger"
```

Keep queries narrow. `graphify query "explain Cirquo"` is a waste — that is what `docs/README.md` is for.

Read `graphify-out/GRAPH_REPORT.md` only when you genuinely need broad architectural context. Do not run `graphify extract` or `graphify update` during ordinary work; rebuild only after a significant architectural change or when explicitly asked.

**Graphify output is never authoritative.** Use it to locate files, then read those files. If it disagrees with source, the source wins.

### Source of truth, in order

1. Current source code
2. Project configuration (`convex/schema.ts`, `package.json`, `vite.config.ts`)
3. Documentation under `docs/`
4. The Graphify graph

If documentation contradicts the implementation, read the implementation and flag the discrepancy — do not silently follow either one. Note that most of `docs/` describes the **target** design, not what is built today; see Current State below.

### Finding documentation without reading all of it

`docs/` has 43 files across 11 categories. Never read them wholesale. Narrow by directory:

| Question | Directory |
|---|---|
| Requirements, scope, acceptance criteria | `docs/product/` |
| Features, user stories, flows, RBAC | `docs/spec/` |
| Schema, statuses, transitions | `docs/domain/` |
| Convex function contracts | `docs/api/` |
| System design, frontend, backend, scheduler | `docs/architecture/` |
| Pricing, routing, ledger, CO2e methodology | `docs/impact/` |
| Auth, permissions, threat model | `docs/security/` |
| Tokens, components, UI patterns | `docs/design/` |
| Setup, style, testing, deployment | `docs/engineering/` |
| Roadmap, risks, business model | `docs/business/` |
| Process, changelog, agent playbook | `docs/project/` |

---

## Read These First

| Priority | Document | Why |
|---|---|---|
| 1 | [`docs/product/PRD.md`](docs/product/PRD.md) | Source of truth for scope, requirements, acceptance criteria |
| 2 | [`docs/project/AGENTS.md`](docs/project/AGENTS.md) | The detailed agent playbook — task sequencing, conventions, pitfalls |
| 3 | [`docs/domain/DOMAIN.md`](docs/domain/DOMAIN.md) | Ubiquitous language. Terminology deviations are defects |
| 4 | [`docs/impact/MATERIAL_LEDGER.md`](docs/impact/MATERIAL_LEDGER.md) | The one subsystem that must not be got wrong |
| 5 | [`docs/business/ROADMAP.md`](docs/business/ROADMAP.md) | What to build, in what order |

The full index is [`docs/README.md`](docs/README.md). 43 documents cover product, business, spec, domain, API, architecture, impact, security, design, engineering, and project process.

---

## Current State

**Version 0.1.0 — scaffold only. Roughly 15% of the MVP.**

✅ Exists: Vite + Bun + TypeScript toolchain, oxlint, React Router with four role layouts, 17 shadcn/ui primitives, three custom components (`PageHeader`, `SummaryCard`, `RoleShell`), a Convex schema with 5 tables, **6 internal read-only queries**, 9 placeholder pages rendering `src/constants/mock-data.ts`, Capacitor Android, PWA manifest, Tailwind v4 OKLCH tokens. The queries stay internal until M1 adds authentication guards.

📋 Does not exist: the `materialFlowLedger` table, **any mutation at all**, authentication, Mapbox, Midtrans, scheduled functions, impact calculation, notifications, QR pickup, admin tooling.

Every number on every dashboard today is hardcoded. Do not treat the placeholder UI as evidence that a feature works.

---

## Non-Negotiable Rules

### 1. Every state-changing mutation writes to the ledger, in the same transaction

Convex mutations are transactional across tables. The ledger write is a statement inside the mutation body — never a separate call, never from an `action`, never from the client.

```ts
// ✅ correct
export const confirmPickup = mutation({
  args: { orderId: v.id('orders'), pickupCode: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, 'merchant')
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new ConvexError('NOT_FOUND')
    if (order.pickupCode !== args.pickupCode) throw new ConvexError('INVALID_PICKUP_CODE')

    await ctx.db.patch(args.orderId, { status: 'picked_up', pickedUpAt: Date.now() })

    await recordLedgerEvent(ctx, {
      surplusItemId: order.surplusItemId,
      orderId: args.orderId,
      eventType: 'RESCUED',
      weightDeltaGrams: -order.rescuedWeightGrams,  // the snapshot, not a recompute
      actorId: actor._id,
      actorRole: 'merchant',
    })
  },
})
```

```ts
// ❌ wrong — state can change without an event
await ctx.db.patch(orderId, { status: 'picked_up' })
await ctx.scheduler.runAfter(0, internal.ledger.record, { ... })
```

A missing ledger event silently corrupts every impact figure that includes that item. This is the failure mode the entire architecture exists to prevent.

### 2. Authorization is enforced server-side

Every non-internal Convex function is callable by anyone who knows its name. The frontend may hide a button; the server must reject the call regardless. Guards (`requireAuth`, `requireRole`, `requireOwnership`) are the first statements in a handler. See [`docs/security/PERMISSIONS.md`](docs/security/PERMISSIONS.md).

### 3. The ledger is append-only

Never `ctx.db.patch`, `delete`, or `replace` on `materialFlowLedger`. Corrections are compensating entries with a `correction: true` metadata flag.

### 4. Units are fixed

| Value | Storage | Display |
|---|---|---|
| Weight | Integer **grams** | kg, one decimal |
| Money | Integer **IDR** | `Rp22.000` via `id-ID` |
| Time | Integer **epoch ms UTC** | WIB, at render only |

Floats are never used for anything that gets summed. Timestamps are never constructed from local-time strings server-side — that is how pickup windows get corrupted.

### 5. Business logic stays framework-agnostic

Algorithms live in `src/lib/*.ts` with **no Convex imports**: `pricing.ts`, `routing.ts`, `ranking.ts`, `impact.ts`, `geo.ts`. Convex functions load data, call the pure function, persist the result.

This keeps the logic unit-testable without a Convex runtime, portable if the backend changes, and explainable to a judge who asks to see the pricing formula.

---

## Language Rules

| ✅ Use | ❌ Never |
|---|---|
| Cirquo | CirQuo, CircQuo |
| Rescue Item | Listing, Product, Offer, Surprise Bag |
| Rescued / Recovered / Residual | Sold, Composted, Wasted |
| Circular Routing | Forwarding, Disposal |
| Material Flow Ledger | Event log, Audit log |
| Dynamic Rescue Pricing | AI pricing, Smart pricing |
| Dietary preference filtering | Allergy matching, Allergen-safe |
| Estimated CO2e | CO2e saved, Carbon offset |
| Circularity rate ~93% | Zero waste, 100% closed-loop |

The banned phrases are not stylistic preferences. Each one is an overclaim that cannot survive a judge's follow-up question. See [`docs/business/RISKS.md`](docs/business/RISKS.md) §8 for the prepared Q&A defences.

---

## Build Order

Follow [`docs/business/ROADMAP.md`](docs/business/ROADMAP.md). The sequence matters — the ledger must exist before any mutation is written, because retrofitting audit trails reliably fails.

| Milestone | Scope |
|---|---|
| **M1** | Material Flow Ledger + authentication |
| **M2** | Merchant listing + Dynamic Rescue Pricing |
| **M3** | Consumer discovery (Mapbox) + reservation + Midtrans |
| **M4** | Pickup confirmation + scheduler + Circular Routing |
| **M5** | Processor intake + outcome logging |
| **M6** | Impact dashboards (delete all hardcoded numbers) |
| **M7** | Admin tools + notifications + polish |
| **M8** | Capacitor build + demo assets |

Within a milestone, follow the MoSCoW priorities in PRD §6: finish all **M** items before any **S** item.

---

## Commands

```bash
bun install              # install
bunx convex dev          # backend (terminal 1)
bun run dev              # frontend (terminal 2)
bun run build            # tsc -b && vite build
bun run lint             # oxlint
bun run android:sync     # build web + sync to Android
bun run android:run      # run on device/emulator
```

Without `VITE_CONVEX_URL` the app runs in placeholder mode with no backend.

---

## Definition of Done

A feature is complete when **all** of these hold:

- [ ] Convex schema updated if new data is required
- [ ] Convex functions implement the logic, with guards first
- [ ] Ledger event written for every state change, in the same transaction
- [ ] Pure business logic lives in `src/lib/`, not inside the mutation
- [ ] UI renders real reactive data — no `mock-data.ts` imports remaining
- [ ] Form validation works (Zod schema plus error messages)
- [ ] Mobile layout verified at 375px width
- [ ] Happy path tested end to end manually
- [ ] Error states show a useful message, not a console error
- [ ] No `any`, no unexplained `@ts-ignore`
- [ ] Units correct: grams, IDR, epoch-ms

A form that validates but does not persist is not done. A dashboard reading `mock-data.ts` is not done.

---

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Forgetting the ledger write | Impact numbers silently wrong; the product's central claim fails |
| Writing the ledger from an `action` | Actions are not transactional — the event may never be written |
| Recomputing historical weight from current entity state | Editing a listing retroactively rewrites impact history |
| Decrementing quantity at payment instead of reservation | Two consumers buy the last portion; one payment is unrecoverable |
| Trusting a client-supplied price | Floor price invariant bypassed |
| Client-side-only permission checks | Every mutation becomes publicly callable |
| Adding features not in the PRD | Scope creep is the top-scored risk for a 2–3 person team |
| Presenting placeholder UI as working | Wastes review cycles and erodes trust |
| Showing 100% circularity | Invites the one question that cannot be answered |
| Building an abstraction for one call site | Complexity with no payer; delete it |
| Adding a dependency for a few lines of logic | Bundle cost and a supply-chain surface for nothing |
| Being "lazy" about reading the code before changing it | A small diff in the wrong place is a second bug |

---

## How to Report Work

State what changed, which requirement ID it implements (e.g. "MER-01, MER-02"), what assumptions you made, what remains a placeholder, and the exact command plus route to verify it.

Do not claim completion without having run the flow. Do not add unrequested features. Do not fill responses with filler — state the facts.

---

## When the Spec Is Ambiguous

Prefer the interpretation that best serves the circular-economy mission, take the more restrictive path, add a `// TODO: clarify` comment, and flag the assumption in your response. Do not silently invent a permanent design decision and bury it.

If something conflicts with [`docs/product/PRD.md`](docs/product/PRD.md), the PRD wins.

---

**Built for DSDC ANFORCOM 2026**  
**Cirquo — Closing the Loop, Saving Every Meal**

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
