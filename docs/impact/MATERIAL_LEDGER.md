# Material Flow Ledger — Cirquo

**Document type:** Technical specification  
**Status:** Draft v1.0  
**Last updated:** 2026-08-06  
**Implementation status:** 📋 Not yet built — highest-priority MVP addition

> The Material Flow Ledger is Cirquo's core differentiator. Every impact number the product displays is derived from it and from nothing else. If the ledger has gaps, the platform's central claim — *we know where every kilogram went* — is false.

---

## 1. Purpose

The ledger answers one question, for any quantity of surplus food, at any point in time:

> Where did it go, when, and who was responsible?

It exists because self-reported sustainability numbers are not credible. A merchant claiming "we saved 200 kg this month" is an assertion. A queryable, append-only, timestamped event log that sums to 200 kg is evidence.

### What the ledger is

- An **immutable event log** of every lifecycle transition of every Rescue Item
- The **only** source of truth for impact metrics
- An **audit trail** an Admin, judge, or auditor can inspect item by item
- A **data moat** — a competitor cannot retroactively produce two years of verified material flow history

### What the ledger is not

- Not a general application log (that is observability, see [DEPLOYMENT.md](../engineering/DEPLOYMENT.md))
- Not a cache of computed totals
- Not mutable — no correction ever edits a row
- Not optional — a mutation that changes Rescue Item state without writing to the ledger is a defect

---

## 2. Design Guarantees

| # | Guarantee | Enforcement |
|---|---|---|
| G1 | **Append-only.** No row is ever updated or deleted | Code review discipline; no mutation may call `ctx.db.patch` or `ctx.db.delete` on the ledger table. In a future PostgreSQL migration, enforce with `RULE ... DO INSTEAD NOTHING` |
| G2 | **Transactional.** The ledger write happens in the same transaction as the state change | Convex mutations are atomic across tables. Never write the ledger from a separate mutation, action, or client call |
| G3 | **Complete.** Every state transition emits exactly one entry | Transition table in [STATE_MACHINE.md](../domain/STATE_MACHINE.md) is the checklist; completeness check in §7 verifies it |
| G4 | **Attributed.** Every entry names an actor or is explicitly system-generated | `actorId` nullable only when `actorRole` is absent and the cause is a scheduled job |
| G5 | **Self-contained.** An entry carries the weight delta at the time of the event | Never recompute a historical weight from the current entity state |
| G6 | **Versioned.** Every entry records the impact methodology version in force | `methodologyVersion` field; see [IMPACT.md](IMPACT.md) §Versioning |

**G2 is the one that is easiest to get wrong.** The tempting pattern is a helper that fires the ledger write after the mutation returns. That produces exactly the failure mode in [RISKS.md](../business/RISKS.md) TECH-04: state changed, event missing, impact silently wrong. The ledger insert must be a statement inside the same mutation body.

---

## 3. Schema

Defined in [DATABASE.md](../domain/DATABASE.md) §3. Reproduced here for reference:

```typescript
materialFlowLedger: defineTable({
  surplusItemId: v.id('surplusItems'),          // always present — the aggregate root
  orderId: v.optional(v.id('orders')),          // for order-scoped events
  recoveryBatchId: v.optional(v.id('recoveryBatches')),
  eventType: ledgerEventType,
  weightDeltaGrams: v.number(),                 // signed; 0 for non-material events
  actorId: v.optional(v.id('users')),           // null when system-generated
  actorRole: v.optional(userRole),
  metadata: v.optional(v.string()),             // JSON string
  methodologyVersion: v.string(),               // e.g. "impact-v1"
  occurredAt: v.number(),                       // epoch ms UTC
})
  .index('by_rescue_item', ['surplusItemId'])
  .index('by_occurred_at', ['occurredAt'])
  .index('by_actor', ['actorId', 'occurredAt'])
  .index('by_event_type', ['eventType', 'occurredAt'])
  .index('by_order', ['orderId'])
```

### Why `weightDeltaGrams` is signed

Material enters the system once (`LISTED`, positive) and leaves through terminal events (`RESCUED`, `PROCESSED`, `ROUTING_FAILED`, negative). Non-material events (`PRICE_ADJUSTED`, `RESERVED`) carry `0`.

This makes the conservation invariant a single sum:

```
Σ weightDeltaGrams for a fully-resolved item == 0
```

A non-zero sum means material is unaccounted for. That is a one-line integrity check rather than a multi-table reconciliation.

### Why `metadata` is a JSON string, not a structured object

Event types carry heterogeneous detail — a `PRICE_ADJUSTED` event needs old and new price, a `PROCESSED` event needs output type and quantity, a `MODERATED` event needs a reason. Convex validators would require either a wide sparse object or a discriminated union per event type. A JSON string keeps the table narrow at the cost of losing type-safety inside metadata.

**Trade-off accepted:** metadata is for human audit and forensics, never for computation. Anything a metric depends on must be a first-class column. This is why `weightDeltaGrams` is a column and not a metadata key.

---

## 4. Event Catalogue

Thirteen event types. Each maps to exactly one transition in [STATE_MACHINE.md](../domain/STATE_MACHINE.md).

| Event | Emitted by | Weight delta | Terminal | Metadata |
|---|---|---|:-:|---|
| `LISTED` | Merchant publishes | `+initialQuantity × weightPerItemGrams` | — | `originalPrice`, `currentPrice`, `floorPrice`, `materialType` |
| `PRICE_ADJUSTED` | Pricing engine or merchant | `0` | — | `previousPrice`, `newPrice`, `trigger` |
| `RESERVED` | Consumer reserves | `0` | — | `quantity`, `unitPrice`, `orderId` |
| `PAID` | Midtrans webhook | `0` | — | `amount`, `method`, `providerTransactionId` |
| `RESCUED` | Merchant verifies pickup code | `−quantity × weightPerItemGrams` | ✅ | `quantity`, `totalPrice`, `pickupCode` |
| `CANCELLED` | Consumer hold expiry or Merchant cancellation | `0` for a reservation/hold; `−remainingQuantity × weightPerItemGrams` when an active Rescue Item is cancelled by its Merchant | Merchant cancellation only | `quantity` returned, `reason`, `cancelledBy` |
| `EXPIRED` | Scheduler | `0` | — | `remainingQuantity`, `pickupEndAt` |
| `ROUTED` | Circular Routing | `0` | — | `processorId`, `rank`, `distanceMeters`, `attempt` |
| `ROUTING_FAILED` | Circular Routing | `−unrouted weight` | ✅ | `attempts`, `declinedBy[]`, `reason` |
| `INTAKE_ACCEPTED` | Processor accepts | `0` | — | `processorId`, `acceptedWeightGrams` (measured) |
| `INTAKE_DECLINED` | Processor declines or TTL | `0` | — | `processorId`, `reason` |
| `PROCESSED` | Processor logs outcome | `−(outputWeight + residualWeight)` | ✅ | `outputType`, `outputWeightGrams`, `residualWeightGrams` |
| `MODERATED` | Admin removes listing | `−remaining weight` | ✅ | `adminId`, `reason` |

### Terminal events and their impact attribution

Only four events attribute material to a final outcome:

| Event | Contributes to |
|---|---|
| `RESCUED` | **Rescued** weight |
| `PROCESSED` | **Recovered** weight (the `outputWeightGrams` portion) and **Residual** weight (the `residualWeightGrams` portion) |
| `ROUTING_FAILED` | **Residual** weight |
| `MODERATED` | **Residual** weight |

`PROCESSED` is the only event that splits across two outcomes. This is why the metric layer parses its metadata for the residual portion rather than treating the whole delta as recovered — an important detail for honest reporting. See [IMPACT.md](IMPACT.md) §3.

---

## 5. Write Path

### The single helper

Every mutation writes through one internal function. There is no second path.

```typescript
// convex/lib/ledger.ts
import { MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'

export const METHODOLOGY_VERSION = 'impact-v1'

type LedgerInput = {
  surplusItemId: Id<'surplusItems'>
  eventType: LedgerEventType
  weightDeltaGrams: number
  actorId?: Id<'users'>
  actorRole?: UserRole
  orderId?: Id<'orders'>
  recoveryBatchId?: Id<'recoveryBatches'>
  metadata?: Record<string, unknown>
}

/**
 * Append a Material Flow Ledger entry.
 *
 * MUST be called inside the same mutation as the state change it records.
 * Never call from an action or from the client.
 */
export async function recordLedgerEvent(
  ctx: MutationCtx,
  input: LedgerInput,
): Promise<Id<'materialFlowLedger'>> {
  return ctx.db.insert('materialFlowLedger', {
    surplusItemId: input.surplusItemId,
    orderId: input.orderId,
    recoveryBatchId: input.recoveryBatchId,
    eventType: input.eventType,
    weightDeltaGrams: Math.round(input.weightDeltaGrams),
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    methodologyVersion: METHODOLOGY_VERSION,
    occurredAt: Date.now(),
  })
}
```

`Math.round` is defensive: a weight delta must never be fractional, because fractional grams summed across hundreds of thousands of rows reintroduce exactly the drift that integer storage was chosen to prevent.

### Correct usage

```typescript
// convex/orders.ts
export const confirmPickup = mutation({
  args: { orderId: v.id('orders'), pickupCode: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, 'merchant')
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new ConvexError('ORDER_NOT_FOUND')

    const item = await ctx.db.get(order.surplusItemId)
    if (!item) throw new ConvexError('ITEM_NOT_FOUND')

    assertTransition('order', order.status, 'picked_up', { ... })
    if (order.pickupCode !== args.pickupCode) {
      throw new ConvexError('INVALID_PICKUP_CODE')
    }

    // ── state change ──
    await ctx.db.patch(args.orderId, {
      status: 'picked_up',
      pickedUpAt: Date.now(),
    })

    // ── ledger write, same transaction ──
    await recordLedgerEvent(ctx, {
      surplusItemId: order.surplusItemId,
      orderId: args.orderId,
      eventType: 'RESCUED',
      weightDeltaGrams: -order.rescuedWeightGrams,
      actorId: actor._id,
      actorRole: 'merchant',
      metadata: {
        quantity: order.quantity,
        totalPrice: order.totalPrice,
      },
    })

    // ── cascade: item closed if all siblings collected ──
    await maybeCloseItem(ctx, order.surplusItemId)
  },
})
```

Both writes are inside one mutation. Convex commits them together or not at all.

### Anti-patterns

```typescript
// ❌ Separate call — state can change without an event
await ctx.db.patch(orderId, { status: 'picked_up' })
await ctx.scheduler.runAfter(0, internal.ledger.record, { ... })

// ❌ From an action — actions are not transactional
export const confirmPickup = action({ handler: async (ctx) => {
  await ctx.runMutation(internal.orders.setPickedUp, { ... })
  await ctx.runMutation(internal.ledger.record, { ... })   // may not run
}})

// ❌ From the client — trivially forgeable
await convex.mutation(api.ledger.record, { eventType: 'RESCUED', ... })

// ❌ Recomputing historical weight
weightDeltaGrams: -(order.quantity * item.weightPerItemGrams)
// item.weightPerItemGrams may have been edited since the order was placed.
// Use order.rescuedWeightGrams — the snapshot.
```

The last one is subtle and worth restating: **never derive a ledger weight from current entity state.** Use the snapshot taken at claim time. This is why `orders.rescuedWeightGrams` exists as a stored column.

---

## 6. Read Path

### Audit trail for one item (ADM-03)

```typescript
export const getItemLedger = query({
  args: { surplusItemId: v.id('surplusItems') },
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin')
    return ctx.db
      .query('materialFlowLedger')
      .withIndex('by_rescue_item', q => q.eq('surplusItemId', args.surplusItemId))
      .order('asc')
      .collect()
  },
})
```

This query is the demo's credibility moment. Opening one item and showing every timestamped event, in order, with actors named, is what separates a tracked system from a claimed one.

### Aggregation for impact

```typescript
export const aggregateImpact = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query('materialFlowLedger')
      .withIndex('by_occurred_at', q =>
        q.gte('occurredAt', args.from).lte('occurredAt', args.to))
      .collect()

    return summariseLedger(entries)   // pure function in src/lib/impact.ts
  },
})
```

The aggregation logic lives in a **framework-agnostic pure function**. The Convex query only fetches rows and delegates. This keeps it unit-testable without a Convex runtime and keeps it portable if the backend ever changes. See [BACKEND.md](../architecture/BACKEND.md).

### Personal scope

Consumer and Merchant dashboards use `by_actor`, which indexes `actorId` then `occurredAt` — one index scan for "this user's events in this period."

---

## 7. Integrity Checks

These are not optional scripts. They are Admin queries surfaced in the UI, because the answer determines whether every other number in the product can be trusted.

### C1 — Weight conservation

For every Rescue Item in a terminal status:

```
Σ weightDeltaGrams == 0
```

```typescript
export const checkWeightConservation = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const terminal = ['recovered', 'residual', 'closed', 'moderated']
    const items = await ctx.db.query('surplusItems').collect()
    const violations = []

    for (const item of items.filter(i => terminal.includes(i.status))) {
      const entries = await ctx.db
        .query('materialFlowLedger')
        .withIndex('by_rescue_item', q => q.eq('surplusItemId', item._id))
        .collect()
      const net = entries.reduce((s, e) => s + e.weightDeltaGrams, 0)
      if (net !== 0) {
        violations.push({ itemId: item._id, netGrams: net, status: item.status })
      }
    }
    return { checked: items.length, violations }
  },
})
```

**A non-empty result halts feature work.** Every impact figure that includes a violating item is wrong by an unknown amount.

### C2 — Ledger completeness

Every item in a terminal status has at least one terminal event.

| Item status | Required terminal event |
|---|---|
| `closed` | ≥1 `RESCUED` |
| `recovered` | ≥1 `PROCESSED` |
| `residual` | ≥1 `ROUTING_FAILED` or `PROCESSED` with residual |
| `moderated` | ≥1 `MODERATED` |

### C3 — Event ordering

Certain sequences are impossible and indicate a bug:

- `RESCUED` before `PAID` for the same order
- `PROCESSED` before `INTAKE_ACCEPTED` for the same batch
- Any event before `LISTED` for the same item
- Two `LISTED` events for one item

### C4 — Immutability audit

Convex has no built-in change history for a table. The practical guard is code review plus a grep in CI:

```bash
# Fail the build if anything patches or deletes the ledger
rg "db\.(patch|delete|replace)\(.*materialFlowLedger" convex/ && exit 1
```

Crude, but it catches the accidental case, which is the realistic one.

---

## 8. Corrections Without Mutation

An append-only ledger still needs a way to fix bad data. The answer is a compensating entry, never an edit.

**Scenario:** a merchant declared 5 kg but the processor measured 3 kg on intake.

Wrong approach — patch the original entry. This rewrites history and breaks the audit trail.

Right approach — the `INTAKE_ACCEPTED` event records the measured weight in metadata, and the `PROCESSED` event's delta uses the measured figure. The declared-vs-measured variance is then visible in the trail rather than erased.

**Scenario:** an event was written in error, e.g. a double-submitted pickup confirmation.

Right approach — append a compensating entry with the inverse delta and a metadata reason:

```typescript
await recordLedgerEvent(ctx, {
  surplusItemId: item._id,
  eventType: 'RESCUED',
  weightDeltaGrams: +originalDelta,      // inverse sign
  actorId: admin._id,
  actorRole: 'admin',
  metadata: {
    correction: true,
    correctsEntryId: badEntryId,
    reason: 'duplicate pickup confirmation',
  },
})
```

Net weight becomes correct, and the fact that a correction occurred remains visible. That transparency is more valuable than a clean-looking log.

**Idempotency is the better prevention.** Guard mutations so a duplicate submission is rejected before it writes, rather than corrected after. See [BACKEND.md](../architecture/BACKEND.md).

---

## 9. Worked Example

A bakery lists 10 loaves at 400 g each — 4,000 g total. Three are rescued, seven expire and are routed; the processor recovers 2,600 g and reports 200 g residual.

| # | Event | Delta (g) | Running | Actor |
|--:|---|---:|---:|---|
| 1 | `LISTED` | +4,000 | 4,000 | Merchant |
| 2 | `PRICE_ADJUSTED` | 0 | 4,000 | System |
| 3 | `RESERVED` (2 loaves) | 0 | 4,000 | Consumer A |
| 4 | `PAID` | 0 | 4,000 | System |
| 5 | `RESERVED` (1 loaf) | 0 | 4,000 | Consumer B |
| 6 | `PAID` | 0 | 4,000 | System |
| 7 | `RESCUED` (2 loaves) | −800 | 3,200 | Merchant |
| 8 | `RESCUED` (1 loaf) | −400 | 2,800 | Merchant |
| 9 | `EXPIRED` (7 remaining) | 0 | 2,800 | System |
| 10 | `ROUTED` | 0 | 2,800 | System |
| 11 | `INTAKE_ACCEPTED` (measured 2,800 g) | 0 | 2,800 | Processor |
| 12 | `PROCESSED` | −2,800 | **0** | Processor |

**Impact derived from these twelve rows:**

| Metric | Value | Source |
|---|---:|---|
| Listed | 4,000 g | Event 1 |
| Rescued | 1,200 g | Events 7, 8 |
| Recovered | 2,600 g | Event 12 metadata `outputWeightGrams` |
| Residual | 200 g | Event 12 metadata `residualWeightGrams` |
| **Circularity rate** | **95.0%** | (1,200 + 2,600) ÷ 4,000 |

Running total closes at zero, so C1 passes. Note that the circularity rate is **not** 100% — the 200 g residual is reported, not hidden. That is the presentation posture required by [RISKS.md](../business/RISKS.md) IMP-03.

---

## 10. Performance

Volume projections from [DATA_MODEL.md](../domain/DATA_MODEL.md) §6: roughly 650 entries/day at pilot scale, ~240,000/year.

| Query | Rows scanned | Assessment |
|---|---|---|
| Item audit trail | ~10 | Trivial |
| Consumer personal impact (30 d) | ~50 | Trivial |
| Merchant impact (30 d) | ~500 | Fine |
| Platform impact (30 d) | ~20,000 | Fine on an indexed range scan |
| Platform impact (all time, year 2) | ~500,000 | Needs pre-aggregation |

**Mitigation when needed:** `impactSnapshots` daily rollups, written by a scheduled job. Critically, snapshots are a **cache, never a source of truth** — they are recomputable from the ledger at any time, and any discrepancy is resolved in the ledger's favour.

Do not build snapshots for the MVP. Read-time aggregation is correct and fast enough at pilot volume, and a premature cache is a second number that can disagree with the first.

---

## 11. Implementation Checklist

| # | Task | Blocks |
|--:|---|---|
| 1 | Add `materialFlowLedger` table + 5 indexes | Everything downstream |
| 2 | Implement `recordLedgerEvent` helper | All mutations |
| 3 | Add `METHODOLOGY_VERSION` constant | Metric versioning |
| 4 | Write `summariseLedger` pure function in `src/lib/impact.ts` | All dashboards |
| 5 | Wire ledger writes into every state-changing mutation | Ledger completeness |
| 6 | Build Admin item audit trail view | ADM-03, demo credibility |
| 7 | Build integrity check queries C1–C3 | Trustworthy numbers |
| 8 | Add CI grep guard for ledger mutation | Immutability |
| 9 | Unit-test `summariseLedger` including the partial-outcome case | Correctness |

**Order matters.** Items 1–3 must land before any other mutation is written. Retrofitting is the failure mode this whole document exists to prevent.

---

## Related Documents

- [IMPACT.md](IMPACT.md) — How ledger entries become metrics; CO2e methodology
- [ALGORITHM.md](ALGORITHM.md) — Pricing, routing, ranking formulas that emit events
- [DATABASE.md](../domain/DATABASE.md) — Full schema and migration path
- [STATE_MACHINE.md](../domain/STATE_MACHINE.md) — Transition table each event corresponds to
- [DOMAIN.md](../domain/DOMAIN.md) — Domain events and the conservation invariant
- [BACKEND.md](../architecture/BACKEND.md) — Convex transaction semantics, pure-logic separation
- [API_ADMIN.md](../api/API_ADMIN.md) — Ledger inspection endpoints
- [RISKS.md](../business/RISKS.md) — TECH-04, IMP-01, IMP-03

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
