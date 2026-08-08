# AI Agent Guide — Cirquo Development

**Audience:** AI coding agents working on this repository  
**Purpose:** Task-level instructions, context, and guidelines for autonomous development  
**Last updated:** 2026-08-06

---

## Mission Statement

You are helping build **Cirquo**, a Circular Food Recovery Platform for DSDC ANFORCOM 2026. This is not a food delivery app. It is a **material flow orchestration system** that tracks every kilogram of surplus food from listing → rescue (consumer purchase) or routing → organic processing (compost/BSF/biogas), producing transparent impact metrics from an append-only Material Flow Ledger.

**Core differentiator:** We don't just sell discounted food. We track where every unit of surplus goes and close the loop.

---

## Documentation Structure

All requirements live in `docs/`. The structure is:

```
docs/
├── README.md                    # Master index (start here)
├── product/                     # What and why
│   ├── PRD.md                  # Source of truth ⭐
│   ├── PRODUCT.md
│   └── VISION.md
├── business/                    # Business model, roadmap, risks
├── spec/                        # Features, user stories, flows, RBAC
├── domain/                      # Domain model, state machines, database
├── api/                         # Backend function contracts per role
├── architecture/                # System design, frontend, backend, scheduler
├── impact/                      # Algorithms, CO2e methodology, ledger design
├── security/                    # Threat model, auth, permissions
├── design/                      # UI/UX, components, Figma
├── engineering/                 # Dev setup, testing, deployment
└── project/                     # This file, CHANGELOG, CONTRIBUTING
```

**Start with:** [`product/PRD.md`](../product/PRD.md) — it defines the scope, requirements, and acceptance criteria.

---

## Current Implementation Status

**✅ Implemented (MVP foundation in place):**

- Folder structure: `src/`, `convex/`, `public/`, `docs/`
- Convex schema with 5 tables: `users`, `merchants`, `surplusItems`, `orders`, `recoveryBatches`
- Basic Convex queries (6 read-only functions, no mutations yet)
- React Router with role-based layouts (Consumer, Merchant, Processor, Admin)
- Placeholder UI components (shadcn/ui primitives + 3 custom commons)
- Responsive mobile-first layout with Capacitor Android setup
- Tailwind CSS v4 with OKLCH color tokens
- Mock data in `src/constants/mock-data.ts` for development

**🚧 In Progress:**

- Complete documentation system (you're reading part of it)

**📋 Planned (MVP required, not yet started):**

- Material Flow Ledger implementation (core differentiator)
- Dynamic Rescue Pricing algorithm
- Circular Routing logic (unclaimed items → processor matching)
- Authentication (session-based, role onboarding)
- Payment integration (Midtrans Sandbox)
- Map integration (Mapbox for discovery + geolocation)
- Realtime subscriptions (Convex reactive queries)
- Scheduled jobs (pricing updates, expiry checks, routing triggers)
- Impact calculation module (kg rescued, kg diverted, CO2e estimation)
- Notifications (new listings, reservation confirmed, pickup reminders)
- QR code pickup verification
- Admin moderation tools

**❌ Explicitly out of MVP scope:**

- Multi-payment gateways beyond Midtrans
- POS/inventory integrations
- Computer vision food verification
- Route optimization for processor pickups
- Loyalty/gamification
- Multi-country/currency
- Native mobile apps (Capacitor web wrapper is sufficient)

---

## Key Terminology (Use Consistently)

| Term | Meaning | ❌ Don't Say |
|---|---|---|
| **Cirquo** | Platform name | CirQuo, CircQuo |
| **Rescue Item** | Unit of surplus food listed by merchant | Listing, Product, Offer |
| **Rescue** (verb/noun) | Consumer reserves + picks up a Rescue Item | Sale, Purchase, Order |
| **Routing** / **Circular Routing** | Directing unclaimed item to processor | Disposal, Forwarding |
| **Material Flow Ledger** | Append-only log of every Rescue Item lifecycle event | Event Log, Transaction Log, Audit Trail |
| **Dynamic Rescue Pricing** | Algorithm suggesting discount based on time-to-expiry | Dynamic Pricing, Auto-discount |
| **Impact Tracking** | Computed metrics (kg rescued, diverted, CO2e avoided) | Analytics, Dashboard Stats |
| **Organic Processor** | Facility that converts organic waste (BSF, compost, biogas) | Processor, Partner, Waste Handler |
| **Consumer** | End user who buys Rescue Items | Customer, User, Buyer |
| **Merchant** | Food business listing surplus | Vendor, Seller, Restaurant |

---

## Core Principles

### 1. Material Flow is the Product

Every action that changes a Rescue Item's state must write to the **Material Flow Ledger**. This is non-negotiable. The ledger is:

- Append-only (never update or delete)
- Timestamped
- Tied to a user/actor
- The single source of truth for impact metrics

Impact dashboards derive from ledger data, never from hand-entered totals.

### 2. Circular Economy, Not 100% Closed-Loop

Do not claim "100% zero waste" or "100% closed-loop." The platform aims for **high circularity** but some residual waste is inevitable (contamination, transport failures, processor capacity limits).

Acceptable framing:
- "Circular Food Recovery Platform"
- "Material Flow Orchestration"
- "Track where every surplus item goes"

Not acceptable:
- "Zero waste guaranteed"
- "100% closed-loop system"

### 3. Rescue-First, Processing-Second

The ideal outcome is a Consumer rescues the food (it's still edible). Processing (BSF/compost) is the fallback for unclaimed or processing-only items. Both count as circular outcomes.

### 4. Mobile-First, Responsive Web + Capacitor

Target mid-range Android devices on 4G. Single React codebase → responsive web + Capacitor-wrapped mobile app. No separate native builds.

### 5. Indonesia Context

- Primary language: Bahasa Indonesia (UI already uses it)
- Currency: IDR
- Timezone: WIB
- Regulatory context: UU PDP (Personal Data Protection Law)
- Local ecosystem: Semarang has existing BSF/compost facilities (Jatibarang TPA, TPST Gemah) — platform digitizes existing flows

---

## Development Workflow

### When Starting a New Feature

1. **Read the spec first:** Check `docs/spec/FEATURES.md` and `docs/product/PRD.md` for acceptance criteria.
2. **Check implementation status:** Look for ✅/🚧/📋 markers in this file and `docs/engineering/DEVELOPMENT.md`.
3. **Schema first, UI second:** If the feature needs new data, update `convex/schema.ts` and write Convex functions before touching React.
4. **Verify before presenting:** Run `bun run dev` and test the flow end-to-end. Placeholder UI is fine, but broken flows are not.

### Convex Function Conventions

```typescript
// queries return data, never mutate
export const listActive = query({
  args: { status: v.literal('active') },
  handler: async (ctx, args) => { /* ... */ }
})

// mutations change data, return the new ID or state
export const createSurplus = mutation({
  args: { merchantId: v.id('merchants'), name: v.string(), /* ... */ },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('surplusItems', { /* ... */ })
    // 🔴 CRITICAL: Also write to Material Flow Ledger here
    await ctx.db.insert('materialFlowLedger', { 
      rescueItemId: id,
      event: 'created',
      timestamp: Date.now(),
      actorId: args.merchantId
    })
    return id
  }
})
```

Every mutation that changes a Rescue Item's lifecycle must write to the ledger. This is a cross-cutting requirement.

### React Component Conventions

- Use TypeScript strictly (no `any`, no `@ts-ignore`)
- shadcn/ui components for primitives (Button, Card, Form, etc.)
- Custom components in `src/components/common/` for cross-role reuse
- Role-specific components in `src/components/{consumer,merchant,processor,admin}/`
- Page components in `src/pages/{role}/`
- Layouts in `src/layouts/`
- Hooks in `src/hooks/`
- Types in `src/types/domain.ts` and `src/types/navigation.ts`

### State Management

- **Server state:** Convex reactive queries (no Redux, no Zustand for server data)
- **Local UI state:** React `useState` for modals, forms, toggles
- **Form state:** React Hook Form + Zod validation (already configured)

### Styling

- Tailwind CSS v4 with OKLCH tokens (see `src/index.css`)
- Use semantic color tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`
- Accent: emerald (`emerald-700`, `emerald-800`, `emerald-50`) for brand touches
- Spacing: 4px rhythm (gap-3, p-5, mt-6, etc.)
- Radii: consistent `rounded-md`, `rounded-lg`
- Do not hardcode hex colors; derive from CSS custom properties

---

## Testing Strategy

**Unit tests:** Not required for competition MVP (tight timeline).

**Integration tests:** Not required for competition MVP.

**Manual E2E testing:** Required. Test every user flow before marking a feature complete:

1. Merchant creates surplus → see it in surplus list
2. Consumer discovers on map → reserves → pays → gets pickup code
3. Merchant confirms pickup → order status updates
4. Unclaimed item → expires → becomes recovery batch
5. Processor accepts batch → logs outcome
6. Impact dashboard reflects all of the above

**Browser testing:** Chrome/Edge (desktop), Chrome Android (mobile via `bun run android:run` or Capacitor Live Reload).

---

## Common Pitfalls to Avoid

### ❌ Don't: Add features not in the PRD

Stick to the MoSCoW priorities in `docs/product/PRD.md` Section 6. No loyalty systems, no gamification, no multi-currency in MVP.

### ❌ Don't: Skip the Material Flow Ledger

Every state change must log an event. If you implement consumer reservation but forget to write to the ledger, the impact dashboard will be wrong.

### ❌ Don't: Hardcode business logic in the frontend

Pricing calculations, routing decisions, eligibility checks — all belong in Convex functions, not React components.

### ❌ Don't: Use "CirQuo" or "CircQuo"

The platform name is **Cirquo** (capital C, lowercase rest, no camelCase Q).

### ❌ Don't: Claim features are complete without backend

A form that validates client-side but doesn't save to Convex is not complete. A dashboard showing mock data from `src/constants/mock-data.ts` is not complete.

### ❌ Don't: Ignore mobile layout

Test every page at 375px width. Bottom nav for Consumer, hamburger menu for Merchant/Processor/Admin.

---

## Priority Order for Development

Based on PRD Section 6 (MoSCoW priorities), implement in this order:

### Phase 1: Core Infrastructure (Week 1-2)
1. ✅ Schema + basic queries (done)
2. Material Flow Ledger table + insert helpers
3. Authentication (session-based, role selection)
4. Merchant onboarding flow

### Phase 2: Marketplace (Week 3-4)
5. Merchant: Create Rescue Item (form → Convex mutation → ledger entry)
6. Dynamic Rescue Pricing (time-based discount suggestion)
7. Consumer: Discover on map (Mapbox integration)
8. Consumer: Reserve + pay (Midtrans Sandbox)
9. Merchant: Confirm pickup (QR code verification)

### Phase 3: Circular Routing (Week 5-6)
10. Scheduled job: Detect expired unclaimed items
11. Circular Routing logic (match to processor by material type, location)
12. Processor: View routed items queue
13. Processor: Accept intake + log outcome

### Phase 4: Impact (Week 7)
14. Impact calculation module (kg rescued, kg diverted, circularity rate, CO2e estimation)
15. Dashboards for Consumer, Merchant, Processor, Admin
16. Material Flow Ledger viewer (Admin)

### Phase 5: Polish (Week 8)
17. Notifications (Convex scheduled functions → toast)
18. Admin: Merchant/Processor verification
19. Error handling + loading states
20. Capacitor build + mobile testing

---

## Decision-Making Guidelines

### When the spec is ambiguous

**Prefer the interpretation that best serves the circular-economy mission.** Example: If the PRD says "Merchant can edit a listing" but doesn't specify constraints, assume:
- Can edit before it's reserved
- Cannot edit after it's reserved (would break consumer expectations)
- Log the edit as a ledger event

If still unclear, add a `// TODO: Clarify with product owner` comment and pick the safer path (restrict rather than allow).

### When a dependency is missing

**Document the gap, implement a defensible placeholder.** Example: Mapbox integration is planned but not built yet. Acceptable placeholder:
- Show a static map image with merchant pins
- Use browser geolocation to get consumer lat/lng
- Calculate distance with Haversine formula
- Clearly mark `// PLACEHOLDER: Replace with Mapbox SDK` in code

Not acceptable:
- Skip the feature entirely
- Hardcode fake locations
- Claim it works when it doesn't

### When a trade-off arises

**Optimize for:**
1. **Correctness** (impact numbers must be accurate)
2. **Competition demo** (judges test the app live)
3. **Auditability** (Material Flow Ledger must be complete)
4. **Mobile UX** (target market uses mid-range Android)
5. **Code clarity** (small team, tight timeline)

Not:
- Premature optimization (no Kubernetes, no microservices)
- Overengineering (PostgreSQL migration can wait)
- Aesthetic polish over functionality

---

## Communication with Developers

When presenting work to the human developer:

### ✅ Do:
- State what you built and what changed
- Mention any assumptions you made
- Flag known limitations or placeholders
- Provide the exact command to test (e.g., `bun run dev`, then visit `/merchant/surplus/new`)
- Reference the PRD section or feature ID (e.g., "Implements MER-01, MER-02 from PRD Section 6.2")

### ❌ Don't:
- Say "I can't do X because I'm an AI" (if you truly can't, explain the technical blocker)
- Present half-finished work as complete
- Add features the developer didn't ask for
- Use filler phrases like "I hope this helps!" (just state the facts)

---

## Key Files Reference

| Path | Purpose |
|---|---|
| `docs/product/PRD.md` | Requirements, scope, acceptance criteria |
| `convex/schema.ts` | Database schema (single source of truth for data model) |
| `src/types/domain.ts` | TypeScript types mirroring Convex schema |
| `src/app/router.tsx` | All routes and their components |
| `src/constants/mock-data.ts` | Placeholder data for development |
| `src/index.css` | Tailwind config, color tokens, global styles |
| `.env.example` | Required environment variables |
| `convex/` | Backend logic (queries, mutations, actions, scheduled functions) |
| `src/pages/` | Page-level components |
| `src/layouts/` | Role-based shell layouts |
| `src/components/` | Reusable UI components |

---

## Commands Cheat Sheet

```bash
# Install dependencies
bun install

# Start dev server (frontend only, no backend)
bun run dev

# Start Convex backend (required for real data)
bunx convex dev

# Run both (two terminals)
# Terminal 1:
bunx convex dev
# Terminal 2:
bun run dev

# Build for production
bun run build

# Sync to Android
bun run android:sync

# Open Android Studio
bun run android:open

# Run on device/emulator
bun run android:run

# Lint
bun run lint
```

---

## Acceptance Criteria — Definition of Done (from PRD)

A feature is complete when:

1. ✅ Convex schema includes necessary tables/fields
2. ✅ Convex functions (queries/mutations) implement the logic
3. ✅ Material Flow Ledger receives events for state changes
4. ✅ UI components render the data reactively
5. ✅ Form validation works (Zod schema + error messages)
6. ✅ Mobile layout is usable (tested at 375px width)
7. ✅ Happy path works end-to-end (manual test)
8. ✅ Error states show helpful messages (not just console.error)
9. ✅ Code follows conventions (TypeScript strict, no `any`, consistent naming)
10. ✅ No `// @ts-ignore` or `eslint-disable` without explanation

The MVP as a whole is complete when the full circular flow works:

> Merchant lists surplus → Consumer discovers on map → Consumer reserves + pays → Merchant confirms pickup → Ledger records "rescued" → OR item expires unclaimed → Circular Routing matches to Processor → Processor accepts + logs outcome → Ledger records "diverted" → Impact dashboards show accurate totals for Consumer, Merchant, Processor, Admin.

All testable on both web and Capacitor Android build.

---

## Final Notes

**This is a competition project with a fixed deadline.** Prioritize working features over perfect code. A "good enough" implementation that judges can interact with beats a beautifully architected system that isn't finished.

**The judges will use the app.** They will create merchant accounts, list surplus, try to reserve as consumers, and check the impact dashboard. Make sure those flows work smoothly.

**The Material Flow Ledger is the product differentiator.** If the ledger is incomplete or impact numbers are wrong, the entire circular-economy narrative falls apart. Protect it.

**When in doubt, read the PRD.** [`docs/product/PRD.md`](../product/PRD.md) is the source of truth. If something conflicts with the PRD, the PRD wins.

---

**Ready to start?**  
Read [`docs/product/PRD.md`](../product/PRD.md) → check [`docs/engineering/DEVELOPMENT.md`](../engineering/DEVELOPMENT.md) → pick a Phase 1 task from the priority list above → implement → test → present.

Good luck building Cirquo. Let's close the loop. 🌱
