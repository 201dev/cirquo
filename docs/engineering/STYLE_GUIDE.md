# Style Guide

| Field | Value |
| --- | --- |
| **Document Type** | Engineering Standard |
| **Status** | Draft v1.0 |
| **Last Updated** | 2026-08-06 |
| **Owner** | Cirquo Engineering |
| **Applies To** | All TypeScript, TSX, CSS, and Convex source in this repository |

---

## 1. Purpose

This document defines how code is written in Cirquo. It exists for three reasons:

1. **Consistency under time pressure.** A 2–3 person team building toward a fixed
   competition deadline cannot afford to relitigate formatting or naming in review.
2. **Correctness of the domain model.** Cirquo's central claim is that it tracks
   *every kilogram* of surplus food through the Material Flow Ledger. Some of the
   rules here (units, ledger write placement, pure-logic separation) are not
   stylistic preferences — a violation produces wrong impact numbers.
3. **Explainability to judges.** Code that follows an articulated convention can be
   walked through in a demo. Code that does not, cannot.

Rules are marked **MUST**, **SHOULD**, or **MAY**. A **MUST** violation blocks a
pull request. A **SHOULD** violation requires a written justification in the PR
description.

---

## 2. Language and Tooling Baseline

### 2.1 Versions

| Tool | Version | Notes |
| --- | --- | --- |
| TypeScript | ~6.0 | `strict` enabled; project references via `tsc -b` |
| Bun | latest stable | Package manager and script runner |
| Vite | 8.x | Build tool; `@` alias configured to `./src` |
| React | 19.2 | Function components only |
| Tailwind CSS | v4 | CSS-first config, no `tailwind.config.js` |
| Convex | 1.43 | Backend functions and database |
| oxlint | latest | Linter — **not** ESLint |

### 2.2 TypeScript configuration

TypeScript runs in `strict` mode. The build script is:

```json
"build": "tsc -b && vite build"
```

`tsc -b` runs first. **A type error fails the build.** This is deliberate: the
build is the type gate, and there is no separate `typecheck` script to forget to
run.

### 2.3 Why oxlint instead of ESLint

| Consideration | oxlint | ESLint |
| --- | --- | --- |
| Speed on this repo | Sub-second | Seconds, growing with plugins |
| Configuration surface | One `.oxlintrc.json` | Flat config + plugin resolution |
| Plugin ecosystem | Smaller | Much larger |
| Type-aware rules | Limited | Available via typescript-eslint |

We accept a smaller rule set in exchange for a linter that runs fast enough to be
part of the inner loop rather than an afterthought. The rules ESLint would give us
that oxlint does not are largely type-aware rules — and `tsc -b` already covers
the type dimension.

### 2.4 The actual oxlint configuration

`.oxlintrc.json` as it exists today:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

Two rules matter in practice:

- **`react/rules-of-hooks: error`** — hooks must be called unconditionally at the
  top level of a component or another hook. This is a correctness rule, not style.
- **`react/only-export-components: warn` with `allowConstantExport`** — a module
  that exports a component should not also export arbitrary non-component values,
  because that breaks Fast Refresh. Constant exports are permitted, which is why
  the `*_CONFIG` pattern (§8.3) is legal alongside a component in the same file —
  though we still prefer separate files.

Run the linter with:

```bash
bun run lint
```

### 2.5 Formatting

There is no Prettier in the repository today. Formatting is enforced by
convention and by editor configuration rather than by a tool.

| Aspect | Convention |
| --- | --- |
| Indentation | 2 spaces, never tabs |
| Quotes | Single quotes in TS/TSX; double quotes in JSON and JSX attributes |
| Semicolons | Always |
| Trailing commas | Multiline literals and parameter lists |
| Line length | Soft target 100 characters; hard stop at 120 |
| Line endings | LF |
| Final newline | Required |

If a formatter is added later it MUST be added in a single `chore:` commit that
touches formatting only, so that the diff is reviewable.

---

## 3. The No-`any` Rule

### 3.1 The rule

**MUST NOT** use `any` in application code. There are no approved exceptions in
`src/` or `convex/`.

`any` disables the type checker at exactly the boundary where we most need it —
around external data. In a project whose entire value proposition is the
integrity of numeric records, silently accepting an unchecked value is how a
`string` weight ends up summed into a ledger total.

### 3.2 What to do instead

**Use `unknown` plus narrowing** for values whose shape is genuinely unknown at
compile time — parsed JSON, webhook bodies, caught errors.

```ts
// Invalid Wrong
function handleWebhook(body: any) {
  return body.transaction_status;
}

// Valid Right
function handleWebhook(body: unknown): string {
  const parsed = midtransNotificationSchema.parse(body);
  return parsed.transaction_status;
}
```

**Use generics** when a function is polymorphic over its input.

```ts
// Invalid Wrong
function first(items: any[]): any {
  return items[0];
}

// Valid Right
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
```

**Use discriminated unions** when a value is one of a fixed set of shapes. This is
the right tool for our status-driven domain.

```ts
type RoutingResult =
  | { kind: 'matched'; processorId: Id<'processors'>; score: number }
  | { kind: 'no_capacity'; consideredCount: number }
  | { kind: 'material_rejected'; consideredCount: number }
  | { kind: 'unroutable'; attempts: number };

function describe(result: RoutingResult): string {
  switch (result.kind) {
    case 'matched':
      return `Matched processor with score ${result.score}`;
    case 'no_capacity':
      return `No processor had capacity (${result.consideredCount} considered)`;
    case 'material_rejected':
      return `No processor accepts this material type`;
    case 'unroutable':
      return `Gave up after ${result.attempts} attempts`;
  }
}
```

The `switch` above is exhaustive. If a new variant is added to `RoutingResult`,
`tsc` reports the missing case. That is the payoff.

**Type caught errors properly.** `catch` binds `unknown` under `strict`.

```ts
// Valid Right
try {
  await reserveItem(args);
} catch (error: unknown) {
  const code = error instanceof ConvexError ? String(error.data) : 'UNKNOWN';
  toast.error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN);
}
```

### 3.3 Escape hatches require a comment

**MUST** attach an explanatory comment to any `@ts-ignore`, `@ts-expect-error`,
or lint suppression. The comment states *why* the suppression is necessary and
*what would remove it*.

```ts
// Invalid Wrong
// @ts-ignore
mapRef.current.addControl(control);

// Valid Right
// @ts-expect-error mapbox-gl v3 types omit `addControl` overload for custom
// controls implementing IControl via a plain object. Remove once
// @types/mapbox-gl ships the corrected overload (tracked upstream).
mapRef.current.addControl(control);
```

Prefer `@ts-expect-error` over `@ts-ignore`: it fails the build once the
underlying problem is fixed, so the suppression cannot rot.

### 3.4 Type assertions

`as` **SHOULD** be avoided. It is acceptable in exactly two places:

1. Narrowing a literal to a union member where the compiler cannot infer it,
   e.g. `const status = raw as ItemStatus` **only after** validating `raw`
   against the status list.
2. `as const` on literal objects and arrays — this is a widening suppressor, not
   an unsound cast, and is encouraged.

`as unknown as T` is **forbidden** without a written justification in review.

---

## 4. Naming Conventions

### 4.1 Table

| Entity | Convention | Example |
| --- | --- | --- |
| Directory | kebab-case | `src/components/merchant/` |
| React component file | PascalCase, `.tsx` | `RescueItemCard.tsx` |
| Hook file | camelCase starting `use`, `.ts` | `useCurrentUser.ts` |
| Pure logic module | kebab-case or single word, `.ts` | `src/lib/pricing.ts` |
| Convex module | camelCase, `.ts` | `convex/surplusItems.ts` |
| Type/interface file | kebab-case, `.ts` | `src/types/domain.ts` |
| React component | PascalCase | `PickupCodeDialog` |
| Hook | `use` + PascalCase | `useLedgerSummary` |
| Convex function | camelCase, namespaced by file | `surplusItems.createListing` |
| Type alias / interface | PascalCase | `RescueItem`, `LedgerEvent` |
| Union member (status) | snake_case string literal | `'recovery_pending'` |
| Ledger event name | SCREAMING_SNAKE string literal | `'INTAKE_ACCEPTED'` |
| Error code | SCREAMING_SNAKE string literal | `'PICKUP_WINDOW_CLOSED'` |
| Exported config object | SCREAMING_SNAKE | `PRICING_CONFIG` |
| Local variable / function | camelCase | `eligibleProcessors` |
| Component props interface | `<Component>Props` | `RescueItemCardProps` |
| CSS custom property | kebab-case, `--` prefix | `--color-recovered` |

### 4.2 Boolean prefixes

Booleans **MUST** read as a predicate.

| Prefix | Meaning | Example |
| --- | --- | --- |
| `is` | State of the subject | `isVerified`, `isExpired` |
| `has` | Possession | `hasActiveOrder`, `hasCapacity` |
| `can` | Permission or capability | `canAcceptMaterial`, `canModerate` |
| `should` | Recommendation / directive | `shouldAutoRoute` |
| `did` | Past occurrence | `didWebhookArrive` |

Avoid negated names. `isDisabled` is preferable to `isNotEnabled`; `!isEnabled`
at the call site is clearer than a double negative.

### 4.3 Domain suffixes — non-negotiable

These suffixes encode the unit or identity of a value. They are how §6 is
enforced by reading rather than by tooling.

| Suffix | Type | Meaning | Example |
| --- | --- | --- | --- |
| `*Grams` | `number` (integer) | A mass in grams | `rescuedWeightGrams` |
| `*Idr` | `number` (integer) | An amount in Indonesian Rupiah | `rescuePriceIdr` |
| `*At` | `number` (integer) | Epoch milliseconds, UTC | `pickupWindowEndAt` |
| `*Id` | `Id<'table'>` | A Convex document ID | `merchantId` |
| `*Count` | `number` (integer) | A cardinality | `attemptCount` |
| `*Rate` | `number` (0–1 float) | A ratio, never a percentage | `circularityRate` |
| `*Ms` | `number` (integer) | A duration in milliseconds | `holdDurationMs` |

**MUST NOT** name a weight field `weight`, a price field `price`, or a timestamp
`time`/`date`. The unit is part of the name.

**MUST NOT** store a percentage. `circularityRate` is `0.93`, and the `%` is a
rendering concern.

### 4.4 Terminology

The product vocabulary is fixed. Use it exactly, in code identifiers, comments,
commit messages, and UI copy.

| Use | Never use |
| --- | --- |
| Rescue Item | "deal", "offer", "product", "listing" in user-facing copy |
| Rescued | "sold", "bought" |
| Recovered | "recycled", "composted" as the umbrella term |
| Residual | "waste", "loss" |
| Circular Routing | "matching engine", "AI routing" |
| Material Flow Ledger | "audit log", "history table" |
| Dynamic Rescue Pricing | "AI pricing", "smart pricing" |
| circularity rate | "recovery percentage", "zero waste score" |
| pickup window | "delivery window", "collection slot" |
| pickup code | "OTP", "voucher code" |
| Cirquo | "CirQuo", "cirQuo" |

**Forbidden claims** — these MUST NOT appear anywhere in the codebase, including
comments and mock data: *zero waste*, *100% closed-loop*, *AI pricing*,
*delivery*. Cirquo is not a delivery app: consumers collect in person.
Circularity in the model lands between ~85% and ~95%; the demo target is 93%;
it is **never** 100%.

---

## 5. Imports and Module Organisation

### 5.1 The `@` alias

`@` resolves to `./src`. **MUST** use it for any import that would otherwise
require two or more `../` segments.

```ts
// Invalid Wrong
import { cn } from '../../../lib/utils';

// Valid Right
import { cn } from '@/lib/utils';
```

Sibling and single-parent imports **MAY** stay relative:

```ts
import { RescueItemCard } from './RescueItemCard';
```

Convex generated code is imported from the repository-relative path Convex
produces:

```ts
import { api } from '../convex/_generated/api';
```

### 5.2 Import order

Six groups, blank line between each, alphabetised within a group.

```ts
// 1. React and framework
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party packages
import { useMutation, useQuery } from 'convex/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, MapPin } from 'lucide-react';

// 3. Convex generated
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// 4. Internal absolute (@/)
import { Button } from '@/components/ui/button';
import { suggestRescuePrice } from '@/lib/pricing';
import { cn } from '@/lib/utils';

// 5. Internal relative
import { PickupCodeDialog } from './PickupCodeDialog';

// 6. Types
import type { RescueItem, ItemStatus } from '@/types/domain';
```

### 5.3 Type-only imports

**MUST** use `import type` for imports used only in type position. This lets the
bundler drop them entirely and makes the runtime dependency graph honest.

```ts
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
```

### 5.4 Barrel files

**SHOULD NOT** create `index.ts` barrel files. They obscure the dependency graph,
defeat tree-shaking in some bundler configurations, and produce circular imports
that are painful to diagnose. Import from the concrete module.

---

## 6. Unit Conventions — Enforceable Rules

This section is the most important in the document. Everything Cirquo claims about
impact rests on these three rules.

### 6.1 The three rules

| Domain | Storage type | Unit | Display |
| --- | --- | --- | --- |
| **Mass** | `number` (integer) | grams | kilograms, 1 decimal |
| **Money** | `number` (integer) | IDR | `Rp` with thousands separators |
| **Time** | `number` (integer) | epoch milliseconds, UTC | WIB (UTC+7) |

**MUST NOT** use a floating-point number for any value that is summed.

Floats accumulate error. A ledger that sums 4,000 fractional kilogram deltas will
not close to exactly zero, and the weight-conservation invariant (§6.5) becomes
untestable. Integers in grams sum exactly. The same logic applies to IDR: Rupiah
has no subunit in practice, so integer IDR is both exact and correct.

### 6.2 Mass

```ts
// Invalid Wrong — float kilograms
const weight = 2.5;
interface Item { weightKg: number }

// Valid Right — integer grams
const weightGrams = 2500;
interface RescueItem { weightGrams: number }
```

Conversion happens once, at render:

```ts
/** Format an integer gram value for display in kilograms. */
export function formatKg(grams: number): string {
  return `${(grams / 1000).toFixed(1)} kg`;
}
```

Input forms accept kilograms and convert immediately at the schema boundary:

```ts
const listingSchema = z.object({
  weightKg: z.coerce.number().positive().max(500),
  // ...
}).transform((v) => ({
  weightGrams: Math.round(v.weightKg * 1000),
}));
```

`Math.round` — not `Math.floor` — so that 2.5 kg is 2500 g and not 2499 g from a
representation artefact.

### 6.3 Money

```ts
// Invalid Wrong
const price = 15000.0;
const discounted = price * 0.7; // 10499.999999999998

// Valid Right
const priceIdr = 15_000;
const discountedIdr = Math.round(priceIdr * 0.7); // 10500
```

Any arithmetic that could produce a fraction **MUST** be rounded back to an
integer before storage. Rounding is applied at the point of computation, not
deferred.

Display:

```ts
/** Format an integer IDR amount for Indonesian locale display. */
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
```

### 6.4 Time

```ts
// Invalid Wrong
const created = new Date();
const created = '2026-08-06T10:00:00+07:00';

// Valid Right
const createdAt = Date.now();
```

Store `number`. Never store a `Date` object, never store an ISO string, never
store a WIB-offset string. The timezone is applied only when formatting:

```ts
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';

/** Render an epoch-ms timestamp in Western Indonesian Time (WIB, UTC+7). */
export function formatWib(epochMs: number): string {
  return format(new TZDate(epochMs, 'Asia/Jakarta'), 'd MMM yyyy, HH:mm');
}
```

Durations are also integers, in milliseconds, and live in config constants:

```ts
export const ORDER_CONFIG = {
  /** Unpaid reservations are released after this hold duration. */
  RESERVATION_HOLD_MS: 15 * 60 * 1000,
} as const;
```

### 6.5 Why this is a correctness rule

Two invariants must be mechanically checkable:

- **Weight conservation** — for a fully-resolved Rescue Item, the sum of
  `weightDeltaGrams` across all its Material Flow Ledger entries equals exactly
  `0`.
- **Ledger completeness** — every item in a terminal status has at least one
  terminal ledger event.

The first invariant is only expressible as an equality if the values are
integers. With floats you would need an epsilon tolerance, and an epsilon
tolerance is an admission that you cannot account for every kilogram — which is
the one thing Cirquo claims to do.

---

## 7. React Conventions

### 7.1 Component form

**MUST** use function components. Class components are not used anywhere.

```tsx
interface RescueItemCardProps {
  item: RescueItem;
  distanceMeters: number | null;
  onReserve: (itemId: Id<'surplusItems'>) => void;
}

export function RescueItemCard({ item, distanceMeters, onReserve }: RescueItemCardProps) {
  // ...
}
```

Props are destructured in the signature. The props interface is declared
immediately above the component and named `<Component>Props`.

### 7.2 Exports

| File kind | Export style |
| --- | --- |
| Component in `src/components/**` | Named export |
| Page in `src/pages/**` | Default export (route-level code splitting) |
| `src/App.tsx` | Default export |
| Hook | Named export |
| Pure logic module | Named exports only |
| Type module | Named `export type` only |

Named exports for components keep `react/only-export-components` happy and make
renames greppable. Pages are the exception because `React.lazy` expects a default
export.

### 7.3 Hooks

`react/rules-of-hooks` is an **error**. Hooks are called unconditionally, at the
top of the component, before any early return.

```tsx
// Invalid Wrong
export function ItemDetail({ id }: Props) {
  if (!id) return null;
  const item = useQuery(api.surplusItems.getById, { id });
}

// Valid Right
export function ItemDetail({ id }: Props) {
  const item = useQuery(api.surplusItems.getById, id ? { id } : 'skip');
  if (!id) return null;
  // ...
}
```

Convex's `'skip'` sentinel is the correct way to make a query conditional.

Custom hooks live in `src/hooks/`, start with `use`, and return either a single
value or a stable object. A hook that returns an object **SHOULD** memoise it so
consumers can depend on its identity.

### 7.4 When to extract a component

Extract when **any** of these hold:

- The JSX block exceeds ~40 lines.
- The same block appears twice.
- The block has its own local state that the parent does not need.
- The block maps over a list and the item rendering has more than trivial logic.

Do **not** extract purely to shorten a file if it produces a component with eight
props that is used once.

### 7.5 Keys, state, effects

- `key` **MUST** be a stable domain identifier (`item._id`), never an array index.
- Derived values **MUST NOT** be mirrored into state. Compute during render, and
  reach for `useMemo` only when a profile shows it matters.
- `useEffect` is for synchronising with something outside React (map instance,
  subscription, timer). It is **not** for reacting to prop changes to set state.

### 7.6 shadcn/ui and Base UI

The project uses shadcn/ui in the **new-york** style with the **neutral** base
colour, on top of `radix-ui` and `@base-ui/react`.

Base UI replaces Radix's `asChild` with a `render` prop:

```tsx
// Invalid Wrong (Radix idiom, does not apply to Base UI components)
<Button asChild>
  <Link to="/consumer/map">Open map</Link>
</Button>

// Valid Right (Base UI idiom)
<Button render={<Link to="/consumer/map" />}>Open map</Button>
```

Primitives in `src/components/ui/` are vendored. They **MAY** be edited to fit
the design system, but the edit **SHOULD** be minimal and noted in the PR, since
re-running the shadcn CLI would overwrite it.

---

## 8. Convex Conventions

### 8.1 Function shape

Every Convex function declares explicit `args` validators and an explicit
`returns` type where practical.

```ts
import { v, ConvexError } from 'convex/values';
import { mutation } from './_generated/server';
import { requireAuth, requireRole, requireOwnership } from './lib/guards';
import { recordLedgerEvent } from './lib/ledger';
import { suggestRescuePrice, PRICING_CONFIG } from './lib/pricing';

export const createListing = mutation({
  args: {
    merchantId: v.id('merchants'),
    title: v.string(),
    materialType: v.union(
      v.literal('bakery'),
      v.literal('produce'),
      v.literal('cooked'),
      v.literal('dairy'),
    ),
    weightGrams: v.number(),
    quantity: v.number(),
    originalPriceIdr: v.number(),
    pickupWindowStartAt: v.number(),
    pickupWindowEndAt: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Guards first, always.
    const user = await requireAuth(ctx);
    requireRole(user, 'merchant');
    await requireOwnership(ctx, 'merchants', args.merchantId, user._id);

    // 2. Validate domain rules.
    if (args.weightGrams <= 0 || !Number.isInteger(args.weightGrams)) {
      throw new ConvexError('VALIDATION_FAILED');
    }
    if (args.pickupWindowEndAt <= args.pickupWindowStartAt) {
      throw new ConvexError('VALIDATION_FAILED');
    }

    // 3. Pure logic.
    const now = Date.now();
    const suggestion = suggestRescuePrice({
      originalPriceIdr: args.originalPriceIdr,
      windowStartAt: args.pickupWindowStartAt,
      windowEndAt: args.pickupWindowEndAt,
      nowAt: now,
      remainingQuantity: args.quantity,
      initialQuantity: args.quantity,
    });

    // 4. Persist.
    const itemId = await ctx.db.insert('surplusItems', {
      ...args,
      status: 'active',
      rescuePriceIdr: suggestion.priceIdr,
      remainingQuantity: args.quantity,
      createdAt: now,
    });

    // 5. Ledger write — same transaction, never optional.
    await recordLedgerEvent(ctx, {
      itemId,
      event: 'LISTED',
      weightDeltaGrams: args.weightGrams * args.quantity,
      actorId: user._id,
      occurredAt: now,
    });

    return itemId;
  },
});
```

The five-step order — **guards, validate, pure logic, persist, ledger** — is the
canonical mutation shape. Deviating from it **MUST** be justified in review.

### 8.2 Ledger write placement

**MUST** call `recordLedgerEvent(ctx, {...})` inside the same mutation as the
state change. Convex mutations are transactional; a ledger write in the same
mutation either commits with the state change or not at all.

**MUST NOT:**

- Write ledger events from an action. Actions are not transactional.
- Write ledger events from the client. The client cannot be trusted with the
  audit trail.
- Recompute a historical weight. When a pickup completes, read
  `orders.rescuedWeightGrams` — the snapshot taken at reservation — rather than
  recomputing from the item's current state, which may have changed.
- Patch, replace, or delete a `materialFlowLedger` document. The ledger is
  append-only. A correction is a **compensating entry** with an offsetting
  `weightDeltaGrams` and a `correctsEventId` reference.

CI enforces the append-only rule with a grep guard that fails the build on any
`db.patch`, `db.delete`, or `db.replace` targeting `materialFlowLedger`.

### 8.3 Errors

**MUST** throw `ConvexError` with a code from the canonical catalogue. Never
throw a bare `Error`, never throw a human-readable sentence — the client owns
the wording, and the wording is in Bahasa Indonesia.

| Code | Meaning |
| --- | --- |
| `AUTH_REQUIRED` | No authenticated session |
| `FORBIDDEN` | Authenticated but wrong role or not the owner |
| `NOT_FOUND` | Referenced document does not exist |
| `VALIDATION_FAILED` | Arguments failed a domain rule |
| `INVALID_TRANSITION` | Status change not permitted by the state machine |
| `INSUFFICIENT_QUANTITY` | Requested quantity exceeds remaining |
| `PRICE_BELOW_FLOOR` | Rescue price below the configured floor |
| `PICKUP_WINDOW_CLOSED` | Pickup attempted outside the window |
| `INVALID_PICKUP_CODE` | Pickup code did not match |
| `PAYMENT_HOLD_EXPIRED` | 15-minute reservation hold elapsed |
| `NOT_VERIFIED` | Merchant or processor not yet admin-verified |
| `CAPACITY_EXCEEDED` | Processor daily capacity would be exceeded |
| `MATERIAL_TYPE_REJECTED` | Processor does not accept this material type |
| `OFFER_EXPIRED` | Routing offer past its 6-hour TTL |
| `RATE_LIMITED` | Too many requests from this actor |
| `IDEMPOTENCY_CONFLICT` | Duplicate request with a different payload |

```ts
if (order.status !== 'paid') {
  throw new ConvexError('INVALID_TRANSITION');
}
```

Client-side mapping:

```ts
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PICKUP_CODE: 'Kode pengambilan tidak valid.',
  PICKUP_WINDOW_CLOSED: 'Waktu pengambilan sudah berakhir.',
  INSUFFICIENT_QUANTITY: 'Stok tidak mencukupi.',
  UNKNOWN: 'Terjadi kesalahan. Silakan coba lagi.',
};
```

### 8.4 Public versus internal

| Kind | Use for |
| --- | --- |
| `query` / `mutation` / `action` | Called from the client |
| `internalQuery` / `internalMutation` / `internalAction` | Called from other Convex functions, crons, or webhooks |

**MUST** mark anything a client should never invoke as internal. Cron-triggered
expiry, routing, and payment-webhook reconciliation are all internal.

### 8.5 Indexes

**MUST** query via an index. `ctx.db.query('x').collect()` followed by a JS
`.filter()` is a table scan and will not survive real data volume.

```ts
// Invalid Wrong
const all = await ctx.db.query('surplusItems').collect();
const active = all.filter((i) => i.status === 'active');

// Valid Right
const active = await ctx.db
  .query('surplusItems')
  .withIndex('by_status', (q) => q.eq('status', 'active'))
  .collect();
```

Index names read as `by_<field>` or `by_<field>_and_<field>`.

---

## 9. Pure-Logic Separation

### 9.1 The rule

All non-trivial algorithms **MUST** live in framework-agnostic modules under
`src/lib/` with **no Convex imports**. Convex functions load data, call the pure
function, and persist the result.

| Module | Exported function | Responsibility |
| --- | --- | --- |
| `src/lib/pricing.ts` | `suggestRescuePrice` | Dynamic Rescue Pricing suggestion |
| `src/lib/routing.ts` | `rankEligibleProcessors` | Circular Routing candidate ranking |
| `src/lib/ranking.ts` | `rankListings` | Consumer discovery ordering |
| `src/lib/impact.ts` | `summariseLedger`, `estimateCo2e` | Impact derivation from ledger |
| `src/lib/geo.ts` | `haversineMeters` | Great-circle distance |

### 9.2 Why

1. **Unit-testable without a Convex runtime.** A pure function is called with a
   plain object and asserted against a number. No deployment, no fixtures, no
   database.
2. **Portable.** If the backend ever moves off Convex, the algorithms move
   unchanged. Only the thin loader/persister layer is rewritten.
3. **Explainable.** In a demo, `suggestRescuePrice` can be opened and read top to
   bottom. An algorithm interleaved with `ctx.db` calls cannot.
4. **Shared with the client.** The merchant listing form can preview a suggested
   price by calling the same function the server will call, with no round trip
   and no drift.

### 9.3 Before and after

**Before — algorithm entangled with the database:**

```ts
// convex/pricing.ts — Invalid Wrong
export const getPrice = query({
  args: { itemId: v.id('surplusItems') },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new ConvexError('NOT_FOUND');
    const merchant = await ctx.db.get(item.merchantId);

    const total = item.pickupWindowEndAt - item.pickupWindowStartAt;
    const elapsed = Date.now() - item.pickupWindowStartAt;
    let ratio = elapsed / total;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;

    let discount = 0.3 + ratio * 0.4;
    if (item.remainingQuantity / item.quantity > 0.8) discount += 0.05;
    if (discount > 0.75) discount = 0.75;

    let price = Math.round(item.originalPriceIdr * (1 - discount));
    const floor = merchant?.priceFloorIdr ?? 2000;
    if (price < floor) price = floor;
    return price;
  },
});
```

This cannot be tested without a Convex deployment, cannot be reused on the
client, hides the algorithm inside I/O, and reads `Date.now()` internally so its
output is not reproducible.

**After — pure function plus thin Convex wrapper:**

```ts
// src/lib/pricing.ts — Valid Right. No Convex imports anywhere in this file.

export const PRICING_CONFIG = {
  /** Discount applied at the very start of the pickup window. */
  BASE_DISCOUNT_RATE: 0.3,
  /** Additional discount accrued linearly across the window. */
  TIME_DISCOUNT_RANGE: 0.4,
  /** Extra discount when most of the stock is still unsold. */
  SURPLUS_BONUS_RATE: 0.05,
  /** Threshold above which the surplus bonus applies. */
  SURPLUS_BONUS_THRESHOLD: 0.8,
  /** Hard cap on total discount — protects merchant margin. */
  MAX_DISCOUNT_RATE: 0.75,
  /** Absolute minimum rescue price in IDR. */
  DEFAULT_PRICE_FLOOR_IDR: 2_000,
} as const;

export interface PricingInput {
  originalPriceIdr: number;
  windowStartAt: number;
  windowEndAt: number;
  nowAt: number;
  remainingQuantity: number;
  initialQuantity: number;
  priceFloorIdr?: number;
}

export interface PricingSuggestion {
  priceIdr: number;
  discountRate: number;
  clampedByFloor: boolean;
  clampedByMaxDiscount: boolean;
}

/**
 * Suggest a Dynamic Rescue Pricing value for a Rescue Item.
 *
 * Deterministic and side-effect free: `nowAt` is injected rather than read,
 * so the same input always yields the same output. Never returns a price below
 * the floor, and never discounts more than MAX_DISCOUNT_RATE.
 */
export function suggestRescuePrice(input: PricingInput): PricingSuggestion {
  const {
    originalPriceIdr, windowStartAt, windowEndAt, nowAt,
    remainingQuantity, initialQuantity,
    priceFloorIdr = PRICING_CONFIG.DEFAULT_PRICE_FLOOR_IDR,
  } = input;

  const windowMs = Math.max(1, windowEndAt - windowStartAt);
  const elapsedRatio = clamp01((nowAt - windowStartAt) / windowMs);

  let discountRate =
    PRICING_CONFIG.BASE_DISCOUNT_RATE +
    elapsedRatio * PRICING_CONFIG.TIME_DISCOUNT_RANGE;

  const remainingRatio =
    initialQuantity > 0 ? remainingQuantity / initialQuantity : 0;
  if (remainingRatio > PRICING_CONFIG.SURPLUS_BONUS_THRESHOLD) {
    discountRate += PRICING_CONFIG.SURPLUS_BONUS_RATE;
  }

  const clampedByMaxDiscount = discountRate > PRICING_CONFIG.MAX_DISCOUNT_RATE;
  if (clampedByMaxDiscount) discountRate = PRICING_CONFIG.MAX_DISCOUNT_RATE;

  const raw = Math.round(originalPriceIdr * (1 - discountRate));
  const clampedByFloor = raw < priceFloorIdr;

  return {
    priceIdr: clampedByFloor ? priceFloorIdr : raw,
    discountRate,
    clampedByFloor,
    clampedByMaxDiscount,
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
```

```ts
// convex/surplusItems.ts — thin wrapper
export const getSuggestedPrice = query({
  args: { itemId: v.id('surplusItems') },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new ConvexError('NOT_FOUND');
    const merchant = await ctx.db.get(item.merchantId);

    return suggestRescuePrice({
      originalPriceIdr: item.originalPriceIdr,
      windowStartAt: item.pickupWindowStartAt,
      windowEndAt: item.pickupWindowEndAt,
      nowAt: Date.now(),
      remainingQuantity: item.remainingQuantity,
      initialQuantity: item.quantity,
      priceFloorIdr: merchant?.priceFloorIdr,
    });
  },
});
```

### 9.4 The `*_CONFIG` pattern

Every pure module exports a SCREAMING_SNAKE config object marked `as const`.

Rules:

- **MUST NOT** inline a magic number inside a pure function. It goes in the
  config with a doc comment explaining what it means and why that value.
- **MUST** mark the object `as const` so members are literal types.
- **SHOULD** keep configs small enough to fit on one screen. If a config exceeds
  ~12 keys, the module is doing too much.
- The config is the tuning surface. Judges can be shown one object and told
  "these are the levers".

| Config | Module |
| --- | --- |
| `PRICING_CONFIG` | `src/lib/pricing.ts` |
| `ROUTING_CONFIG` | `src/lib/routing.ts` |
| `RANKING_CONFIG` | `src/lib/ranking.ts` |
| `IMPACT_CONFIG` | `src/lib/impact.ts` |
| `ORDER_CONFIG` | `src/lib/orders.ts` |

### 9.5 Purity requirements

A module in `src/lib/` **MUST NOT**:

- Import from `convex/`, `react`, or `react-router-dom`.
- Call `Date.now()`, `Math.random()`, or `crypto` — inject them as parameters.
- Mutate its inputs.
- Perform I/O of any kind.

Injecting `nowAt` rather than reading the clock is what makes boundary tests
(elapsed ratio exactly 0, exactly 1) possible.

---

## 10. Tailwind CSS v4 Conventions

### 10.1 CSS-first configuration

Tailwind v4 is configured through `@theme` in `src/index.css` via
`@tailwindcss/vite`. **There is no `tailwind.config.js` and one MUST NOT be
added** — it would split the source of truth.

```css
@import 'tailwindcss';

@theme {
  --color-background: oklch(0.99 0 0);
  --color-foreground: oklch(0.15 0 0);
  --color-primary: oklch(0.55 0.16 155);
  --color-rescued: oklch(0.62 0.15 150);
  --color-recovered: oklch(0.65 0.14 195);
  --color-residual: oklch(0.60 0.13 55);
}
```

Colours are authored in **OKLCH**. OKLCH is perceptually uniform, so a lightness
change produces a consistent perceived change across hues — which matters because
the three flow states (rescued / recovered / residual) must be equally legible
against the same background.

### 10.2 Semantic tokens over raw palette

**MUST** use semantic token utilities. **MUST NOT** use raw palette utilities or
hardcoded hex for product surfaces.

```tsx
// Invalid Wrong
<div className="bg-green-500 text-white">
<div className="bg-[#22c55e]">
<div style={{ color: '#16a34a' }}>

// Valid Right
<div className="bg-primary text-primary-foreground">
<span className="text-recovered">
```

Raw palette utilities **MAY** appear inside `src/components/ui/` primitives where
shadcn shipped them, but new code **SHOULD** migrate them to tokens.

### 10.3 `cn()`

`cn()` in `src/lib/utils.ts` merges `clsx` and `tailwind-merge`. **MUST** use it
whenever classes are conditional or merged with an incoming `className`.

```tsx
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'rescued' && 'bg-rescued/10 text-rescued',
        status === 'recovered' && 'bg-recovered/10 text-recovered',
        status === 'residual' && 'bg-residual/10 text-residual',
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
```

**MUST NOT** build class strings with template literals — `tailwind-merge` cannot
resolve conflicts in a raw string, and an incoming `className` will not override
as expected.

### 10.4 Class ordering

Within a `className`, order groups consistently:

1. Layout — `flex`, `grid`, `block`, `absolute`
2. Box model — `w-`, `h-`, `p-`, `m-`, `gap-`
3. Typography — `text-`, `font-`, `leading-`, `tracking-`
4. Visual — `bg-`, `border-`, `rounded-`, `shadow-`
5. Interactive — `hover:`, `focus-visible:`, `disabled:`
6. Responsive — `sm:`, `md:`, `lg:`

```tsx
<button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus-visible:ring-2 md:px-6" />
```

### 10.5 Arbitrary values

Arbitrary values (`w-[347px]`, `text-[13px]`) **SHOULD NOT** be used. They opt out
of the scale and produce a design that drifts. Acceptable only when:

- Matching an external constraint (a Mapbox control's fixed dimensions).
- A one-off value that genuinely has no place in the scale, with a comment.

```tsx
{/* Mapbox attribution bar is 24px; offset the sheet so it stays visible. */}
<div className="bottom-[24px]" />
```

### 10.6 Dark mode

`next-themes` drives a `.dark` class on `<html>`. Token values are redefined in a
`.dark` block. **MUST NOT** write `dark:` variants for colours that already have
a token — the token handles it.

```tsx
// Invalid Wrong — the token already flips
<div className="bg-white dark:bg-neutral-900">

// Valid Right
<div className="bg-background">
```

### 10.7 Responsive baseline

Mobile-first. Unprefixed classes target the smallest viewport; breakpoints add.
The reference small viewport is **375px** — every screen must be checked there.

---

## 11. Form Conventions

### 11.1 The stack

React Hook Form 7 + Zod 4 + `@hookform/resolvers/zod`. All forms use this
combination; no uncontrolled ad-hoc forms.

### 11.2 Schema colocation

The Zod schema lives in the same file as the form component, above it, and the
form's TypeScript type is inferred from the schema — never declared separately.

```tsx
const listingFormSchema = z
  .object({
    title: z.string().min(3, 'Judul minimal 3 karakter').max(80),
    materialType: z.enum(['bakery', 'produce', 'cooked', 'dairy']),
    weightKg: z.coerce.number().positive('Berat harus lebih dari 0').max(500),
    quantity: z.coerce.number().int().positive().max(200),
    originalPriceIdr: z.coerce.number().int().min(1_000),
    pickupWindowStartAt: z.coerce.number().int(),
    pickupWindowEndAt: z.coerce.number().int(),
  })
  .refine((v) => v.pickupWindowEndAt > v.pickupWindowStartAt, {
    message: 'Waktu selesai harus setelah waktu mulai',
    path: ['pickupWindowEndAt'],
  })
  .refine((v) => v.pickupWindowEndAt - v.pickupWindowStartAt >= 30 * 60 * 1000, {
    message: 'Pickup window minimal 30 menit',
    path: ['pickupWindowEndAt'],
  });

type ListingFormValues = z.infer<typeof listingFormSchema>;
```

### 11.3 Coerced numbers

**MUST** use `z.coerce.number()` for numeric inputs. HTML inputs produce strings;
without coercion a weight arrives as `"2.5"` and silently poisons arithmetic.

### 11.4 Cross-field validation

Rules spanning two fields **MUST** use `.refine()` with an explicit `path` so the
message renders on the right field. Chain multiple `.refine()` calls rather than
packing conditions into one, so each produces its own message.

### 11.5 Unit conversion at the boundary

Forms take human units (kg). Conversion to storage units (grams) happens in the
submit handler, once.

```tsx
async function onSubmit(values: ListingFormValues) {
  try {
    await createListing({
      title: values.title,
      materialType: values.materialType,
      weightGrams: Math.round(values.weightKg * 1000),
      quantity: values.quantity,
      originalPriceIdr: values.originalPriceIdr,
      pickupWindowStartAt: values.pickupWindowStartAt,
      pickupWindowEndAt: values.pickupWindowEndAt,
      merchantId,
    });
    toast.success('Rescue Item berhasil dipublikasikan');
    navigate('/merchant/listings');
  } catch (error: unknown) {
    toast.error(messageForError(error));
  }
}
```

### 11.6 Submission state

**MUST** disable the submit button while `formState.isSubmitting` is true. Double
submission on a reservation form creates two orders and two ledger events.

---

## 12. Error Handling

### 12.1 Server

- Guards throw first: `AUTH_REQUIRED`, then `FORBIDDEN`, then `NOT_FOUND`.
- Domain validation throws `VALIDATION_FAILED`.
- State machine violations throw `INVALID_TRANSITION`.
- **MUST NOT** return `null` to signal failure from a mutation. Throw.
- **MUST NOT** catch and swallow. If a mutation catches, it either rethrows a
  canonical code or records a compensating ledger entry.

### 12.2 Client

Every mutation call is wrapped, and every failure produces a Sonner toast.

```ts
export function messageForError(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === 'string') {
    return ERROR_MESSAGES[error.data] ?? ERROR_MESSAGES.UNKNOWN;
  }
  return ERROR_MESSAGES.UNKNOWN;
}
```

**MUST NOT** render a raw error object or stack trace to the user. **MUST NOT**
leave a `catch` block empty.

### 12.3 Query loading and empty states

`useQuery` returns `undefined` while loading. **MUST** distinguish three states:

```tsx
const items = useQuery(api.surplusItems.listByStatus, { status: 'active' });

if (items === undefined) return <ListingSkeleton />;   // loading
if (items.length === 0) return <EmptyListings />;      // loaded, empty
return <ListingGrid items={items} />;                  // loaded, populated
```

Rendering "no items found" during load is a bug, and a common one.

### 12.4 No-backend placeholder mode

`src/lib/convex.ts` constructs a Convex client only when `VITE_CONVEX_URL` is
set. Without it the app runs in placeholder mode reading
`src/constants/mock-data.ts`, and logs an informational message in DEV only.

Components **MUST NOT** assume a client exists. Placeholder mode is a development
convenience, and mock data **MUST NOT** be presented anywhere as if it were live.

---

## 13. Comments and Documentation

### 13.1 Policy

Comments explain **why**, not **what**. The code says what it does.

```ts
// Invalid Wrong — restates the code
// Multiply the weight by the quantity
const totalGrams = item.weightGrams * item.quantity;

// Valid Right — explains a decision
// Ledger deltas are per-listing, not per-unit: a partially sold item emits
// several negative RESERVED deltas that must sum against this one positive
// LISTED delta for weight conservation to hold.
const totalGrams = item.weightGrams * item.quantity;
```

### 13.2 JSDoc is required on

1. Every exported function in `src/lib/*.ts`.
2. Every function that reads from or writes to `materialFlowLedger`.
3. Every `*_CONFIG` member whose value is not self-evident.
4. Every exported type in `src/types/domain.ts` whose meaning is domain-specific.

```ts
/**
 * Append an immutable event to the Material Flow Ledger.
 *
 * MUST be called inside the same mutation as the state change it records —
 * Convex mutations are transactional, so this guarantees the ledger and the
 * entity never diverge.
 *
 * The ledger is append-only. This function only ever inserts. Corrections are
 * expressed as compensating entries with an offsetting weightDeltaGrams and a
 * `correctsEventId` pointing at the entry being corrected.
 *
 * @param weightDeltaGrams Signed integer grams. Positive on entry into the
 *   system (LISTED), negative on exit (RESCUED, PROCESSED, residual close-out).
 *   For a fully-resolved item these MUST sum to exactly 0.
 */
export async function recordLedgerEvent(
  ctx: MutationCtx,
  input: LedgerEventInput,
): Promise<Id<'materialFlowLedger'>> {
  // ...
}
```

### 13.3 Prohibited comments

- Commented-out code. Delete it; git remembers.
- `TODO` without an owner and a milestone: use `// TODO(M4, ari): ...`.
- Section-divider ASCII art.
- Comments that contradict the code — worse than none.

---

## 14. File Size and Complexity

| Artefact | Target | Hard limit | Action past limit |
| --- | --- | --- | --- |
| React component | < 150 lines | 250 | Extract subcomponents |
| Custom hook | < 80 lines | 150 | Split by concern |
| Convex module | < 300 lines | 500 | Split by entity |
| Convex function handler | < 60 lines | 100 | Extract to `src/lib/` |
| Pure logic module | < 250 lines | 400 | Split by algorithm |
| Function nesting depth | ≤ 3 | 4 | Early return / extract |
| Function parameters | ≤ 3 | 4 | Pass an options object |

These are guidelines, not lint rules. A 260-line component that is one cohesive
form is fine; a 140-line component doing four unrelated things is not.

---

## 15. Anti-Patterns

| # | Anti-pattern | Why it is wrong | Correct alternative |
| --- | --- | --- | --- |
| 1 | `any` on a webhook body | Unvalidated external data enters the ledger path | `unknown` + Zod parse |
| 2 | Float kilograms | Sums drift; weight conservation untestable | Integer `weightGrams` |
| 3 | Storing a `Date` or ISO string | Timezone bugs, unsortable, larger index | Integer epoch ms |
| 4 | Storing `93` for circularity | Percentage vs ratio confusion at every boundary | Store `0.93` as `circularityRate` |
| 5 | Ledger write in an action | Actions are not transactional; ledger can diverge | Write inside the mutation |
| 6 | `db.patch` on `materialFlowLedger` | Destroys the audit trail; CI guard fails | Append a compensating entry |
| 7 | Recomputing historical weight at pickup | Item may have changed since reservation | Read `orders.rescuedWeightGrams` |
| 8 | Client-side-only permission check | Anyone can call the mutation directly | `requireRole` first in the handler |
| 9 | `throw new Error('Not allowed')` | Untranslatable, unmatchable by the client | `throw new ConvexError('FORBIDDEN')` |
| 10 | Hardcoded dashboard figures | The whole claim is that metrics derive from the ledger | `summariseLedger(events)` |
| 11 | Algorithm inside a Convex handler | Untestable, unportable, unexplainable | Pure function in `src/lib/` |
| 12 | `Date.now()` inside a pure function | Non-deterministic; boundary tests impossible | Inject `nowAt` |
| 13 | `bg-green-500` | Bypasses tokens; breaks dark mode | `bg-primary` / `text-recovered` |
| 14 | Template-literal class strings | `tailwind-merge` cannot resolve conflicts | `cn()` |
| 15 | `asChild` on a Base UI component | Base UI uses a different composition API | `render={<Link />}` |
| 16 | `key={index}` | Reorders corrupt component state | `key={item._id}` |
| 17 | Conditional `useQuery` call | Violates `rules-of-hooks` (error) | Pass `'skip'` |
| 18 | Rendering empty state while loading | `undefined` ≠ `[]` | Check `=== undefined` first |
| 19 | Full `.collect()` then `.filter()` | Table scan | `.withIndex(...)` |
| 20 | Missing `disabled={isSubmitting}` | Double reservation, duplicate ledger events | Disable during submit |
| 21 | Adding `tailwind.config.js` | Splits the config source of truth | `@theme` in `index.css` |
| 22 | Barrel `index.ts` re-exports | Hides the dependency graph, circular imports | Import the concrete module |
| 23 | Writing "delivery" in UI copy | Cirquo has no delivery; consumers collect | "pengambilan" / pickup |
| 24 | Claiming 100% circularity | Dishonest and physically implausible | ~85–95%, demo target 93% |
| 25 | Empty `catch {}` | Silent failure, unreproducible bug reports | Toast + rethrow or handle |

---

## 16. Pre-Commit Self-Review Checklist

Run before every commit. Ten items, under two minutes.

```
[ ] 1. `bun run build` passes (this runs `tsc -b` — types are clean).
[ ] 2. `bun run lint` passes with no new warnings.
[ ] 3. No `any`. Any `@ts-expect-error` has an explanatory comment.
[ ] 4. Units correct: weights are integer *Grams, money integer *Idr,
       timestamps integer *At epoch-ms. No floats in summed values.
[ ] 5. Every state-changing mutation calls recordLedgerEvent in the same
       mutation. No db.patch/delete/replace on materialFlowLedger.
[ ] 6. Every mutation starts with requireAuth / requireRole / requireOwnership
       as appropriate, before any other statement.
[ ] 7. Errors thrown as ConvexError with a code from the catalogue; the client
       maps the code to a Bahasa Indonesia Sonner toast.
[ ] 8. New algorithm lives in src/lib/ with no Convex imports, has JSDoc, and
       reads its magic numbers from a *_CONFIG object.
[ ] 9. Styling uses semantic tokens and cn(). No hex, no raw palette, no
       unjustified arbitrary values. Checked at 375px width.
[ ] 10. No hardcoded impact numbers, no mock data presented as live, no
        forbidden terminology ("zero waste", "100% closed-loop", "AI pricing",
        "delivery", "CirQuo").
```

---

## 17. Related Documents

| Document | Relevance |
| --- | --- |
| [Development Guide](DEVELOPMENT.md) | Local setup, commands, and workflow |
| [Testing Strategy](TESTING.md) | How the rules here are verified |
| [Deployment](DEPLOYMENT.md) | CI enforcement of the ledger guard |
| [Product Requirements](../product/PRD.md) | Requirement IDs and MoSCoW priority |
| [Database Schema](../domain/DATABASE.md) | Field names and unit declarations |
| [State Machine](../domain/STATE_MACHINE.md) | Legal status transitions |
| [Material Flow Ledger](../impact/MATERIAL_LEDGER.md) | Event catalogue and invariants |
| [Impact Algorithm](../impact/ALGORITHM.md) | Pricing, routing, and impact maths |
| [Impact Methodology](../impact/IMPACT.md) | Emission factors and methodology version |
| [API Reference](../api/API.md) | Convex function signatures |
| [Architecture](../architecture/ARCHITECTURE.md) | System overview |
| [Backend](../architecture/BACKEND.md) | Convex function structure |
| [Frontend](../architecture/FRONTEND.md) | Component and routing structure |
| [Scheduler](../architecture/SCHEDULER.md) | Cron jobs and TTL handling |
| [Security](../security/SECURITY.md) | Threat model |
| [Authentication](../security/AUTH.md) | Session and identity handling |
| [Permissions](../security/PERMISSIONS.md) | Role matrix and guard semantics |
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
