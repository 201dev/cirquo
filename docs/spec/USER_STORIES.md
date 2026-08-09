# User Stories — Cirquo

| Field | Value |
|---|---|
| **Document type** | Specification — Agile User Stories |
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-08 |
| **Owner** | Product & Engineering |
| **Audience** | Developers, judges, stakeholders |
| **Related PRD** | [../product/PRD.md](../product/PRD.md) |

---

## 1. Purpose

This document translates the requirements in [../product/PRD.md](../product/PRD.md) into implementation-ready user stories. Every story is written from the perspective of a single actor, carries acceptance criteria in Given/When/Then form, and maps back to a PRD identifier so nothing is invented and nothing is orphaned.

Cirquo is a **circular food recovery platform**, not a food delivery application. There is no courier, no delivery fee, no rider. A Consumer physically collects a **Rescue Item** from a Merchant inside a **pickup window**. When nobody collects, the material does not become waste — it enters **Circular Routing** and is offered to a verified **Organic Processor**. Every gram is written to the **Material Flow Ledger**. The stories below exist to make that loop real.

---

## 2. The INVEST heuristic

Every story in this document is checked against INVEST. The check is written out explicitly per story because a hackathon team under deadline pressure tends to write stories that are really tasks, and the discipline of the check is what stops that.

| Letter | Meaning | What we actually verify |
|---|---|---|
| **I** — Independent | The story can be built without waiting on a sibling story in the same sprint | We list the hard dependency if one exists, and if the dependency is a sibling we consider merging or splitting |
| **N** — Negotiable | The story states the outcome, not the implementation | The story body never names a component file or a Convex function |
| **V** — Valuable | A real actor is measurably better off | We can name the actor and the benefit without saying "so the system works" |
| **E** — Estimable | The team knows enough to size it | If we cannot size it, it becomes a spike, not a story |
| **S** — Small | Fits comfortably inside one milestone | Nothing above 8 points survives; an 8 is a warning sign |
| **T** — Testable | Acceptance criteria are mechanically checkable | Given/When/Then with concrete values, not adjectives |

A story that fails **S** gets split. A story that fails **T** gets rewritten until a QA pass can be run by a person who did not write it.

---

## 3. Estimation scale

Points are a modified Fibonacci scale calibrated for a **2–3 person team** working toward a **fixed 31 August 2026 deadline**. Points measure complexity and risk, not hours — but for a team this small the correlation is tight enough that we publish the indicative hour band as a sanity anchor.

| Points | Meaning | Indicative band | Typical example |
|---|---|---|---|
| **1** | Trivial. Known pattern, no new state, no new schema. | ~1–2 h | Add a status badge variant; add a filter chip to an existing filter bar |
| **2** | Small. One screen or one mutation, no new integration. | ~2–4 h | Merchant profile edit form; notification list page |
| **3** | Standard. One screen plus one mutation plus one ledger event. | ~4–8 h | Create Rescue Item; accept a recovery offer |
| **5** | Substantial. Multi-step interaction, new state transitions, or realtime concerns. | ~1–2 days | Reservation with 15-minute payment hold; processor intake measurement |
| **8** | Large and risky. External integration or a cross-cutting engine. | ~2–3 days | Midtrans Sandbox QRIS payment loop; Circular Routing eligibility engine |

**Rules of the scale**

- Nothing is estimated at 13 or above. If a story feels like a 13, it is not a story, it is an epic, and it must be split before it enters a milestone.
- An 8-point story may not be the only thing in flight for a given developer; it is paired with 1s and 2s so a stall does not idle the whole team.
- Integration stories (Midtrans, Mapbox, Capacitor) carry a risk premium of one step on the scale because failures there are external and cannot be debugged by reading our own code.

---

## 4. Epics

| Epic | Description | Primary actors |
|---|---|---|
| **Identity** | Registration, login, session persistence, role assignment | All |
| **Verification** | Admin gate that unlocks Merchant and Processor capability | Merchant, Processor, Admin |
| **Listing** | Creating and managing Rescue Items | Merchant |
| **Pricing** | Dynamic Rescue Pricing suggestion, override, floor enforcement | Merchant, System |
| **Discovery** | Map, list, filters, item detail | Consumer |
| **Transaction** | Reservation, 15-minute payment hold, Midtrans payment | Consumer, System |
| **Fulfilment** | Pickup code, pickup verification, no-show handling | Consumer, Merchant |
| **Routing** | Circular Routing offer, TTL, retry, unroutable | System, Processor, Admin |
| **Recovery** | Processor intake measurement and outcome logging | Processor |
| **Impact** | Metrics derived from the Material Flow Ledger | All |
| **Governance** | Moderation, disputes, ledger audit, manual re-route | Admin |
| **Platform** | Scheduler jobs, notifications, integrity checks | System |

---

## 5. Consumer stories (US-C-*)

#### US-C-01 — Register as a Consumer
> **As a** Consumer, **I want** to create an account with my email and password, **so that** I can reserve Rescue Items and keep a history of what I have rescued.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | M | 3 | AUTH-01 | Planned |

**Acceptance criteria**
- **Given** I am on the registration screen, **when** I submit a valid name, email, password of at least 8 characters, and select the Consumer role, **then** a `users` record is created with `role = "consumer"` and `status = "active"`, and I am signed in.
- **Given** I submit an email that already exists, **when** the form is sent, **then** the server rejects it and the UI shows "Email sudah terdaftar" without revealing any other account detail.
- **Given** I submit a password shorter than 8 characters, **when** the form is validated by Zod, **then** submission is blocked client-side and the server would reject it anyway.
- **Given** registration succeeds, **when** the response returns, **then** a `sessions` row exists with a token and an `expiresAt` in the future.

**INVEST check** — **I:** depends only on the schema, not on other stories. **N:** does not prescribe hashing library or form layout. **V:** without an account nothing else in the Consumer journey is reachable. **E:** standard email/password flow, well understood. **S:** one form, one mutation. **T:** each criterion is a concrete assertion against `users` and `sessions`.

**Notes**
Password is stored as `passwordHash`; the plaintext never leaves the mutation. Role is chosen from Consumer / Merchant / Processor only — the Admin option is deliberately absent from this screen per AUTH-02.

---

#### US-C-02 — Log in and stay logged in
> **As a** Consumer, **I want** my session to survive closing and reopening the app, **so that** I do not have to type my password every time I walk past a bakery.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | M | 3 | AUTH-03 | Planned |

**Acceptance criteria**
- **Given** valid credentials, **when** I log in, **then** a session token is issued and persisted on the device.
- **Given** a persisted, unexpired token, **when** I reopen the app, **then** I land on the Consumer home screen already authenticated with no login prompt.
- **Given** a token whose `expiresAt` has passed, **when** the app starts, **then** the stored token is discarded and I am shown the login screen.
- **Given** I am running inside the Capacitor Android build, **when** the app is killed from the task switcher and relaunched, **then** the session still restores.

**INVEST check** — **I:** builds on US-C-01 but is independently testable with a seeded account. **N:** storage mechanism is not dictated by the story. **V:** session loss on mobile is the single most common cause of demo failure. **E:** known pattern. **S:** token persistence plus a bootstrap check. **T:** relaunch behaviour is directly observable on device.

**Notes**
Capacitor WebView storage must be verified on a real device, not only in the browser. This is the highest-risk small story in M1.

---

#### US-C-03 — Discover Rescue Items on a map
> **As a** Consumer, **I want** to see nearby Rescue Items as pins on a map, **so that** I can judge at a glance what is close enough to collect on my route home.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | M | 8 | CON-01 | Planned |

**Acceptance criteria**
- **Given** location permission is granted, **when** the explore screen loads, **then** the map centres on my coordinates and renders one pin per `active` Rescue Item within the visible bounds.
- **Given** location permission is denied, **when** the explore screen loads, **then** the map centres on Semarang city centre and a non-blocking banner explains that results are city-wide.
- **Given** an item's `remainingQuantity` reaches 0 while I am looking at the map, **when** the Convex query re-runs reactively, **then** the pin disappears without a manual refresh.
- **Given** an item has `processingOnly = true`, **when** the map renders, **then** that item is never shown to me.
- **Given** I tap a pin, **when** the callout opens, **then** it shows merchant name, item name, `currentPrice`, `originalPrice` struck through, remaining quantity, and pickup window end time in WIB.

**INVEST check** — **I:** requires seeded listings but no other unbuilt story. **N:** clustering strategy is left to implementation. **V:** the map is the product's front door. **E:** Mapbox is known, but permission handling on Android adds risk, hence 8. **S:** one screen — large but not splittable without breaking value. **T:** every criterion is observable in the UI.

**Notes**
Reactivity here is a Convex subscription, not polling. Pins must reflect `remainingQuantity`, which is decremented at **reservation**, not at payment.

---

#### US-C-04 — Browse Rescue Items as a list
> **As a** Consumer, **I want** a list view alongside the map, **so that** I can scan prices and pickup windows quickly on a small screen or with a weak GPS fix.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | M | 3 | CON-02 | Planned |

**Acceptance criteria**
- **Given** I am on the explore screen, **when** I toggle to list view, **then** the same filtered result set renders as cards sorted by distance ascending.
- **Given** my location is unknown, **when** the list renders, **then** sorting falls back to soonest `pickupEndAt` and the distance label is hidden rather than showing a wrong number.
- **Given** the result set is empty, **when** the list renders, **then** an empty state explains that no Rescue Items match and offers a "reset filter" action.

**INVEST check** — **I:** shares the query with US-C-03 but ships separately. **N:** card layout unspecified. **V:** list view is faster than map for deciding. **E:** trivial once the query exists. **S:** one view toggle. **T:** sort order and empty state are checkable.

**Notes**
Never fabricate a distance. A missing fix means no distance label.

---

#### US-C-05 — Filter by dietary preference
> **As a** Consumer, **I want** to filter listings by dietary preference tags, **so that** I only spend time on food I am actually able to eat.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | M | 3 | CON-03 | Planned |

**Acceptance criteria**
- **Given** the filter sheet is open, **when** I select one or more dietary preference tags, **then** the result set narrows to items whose `dietaryTags` contain every selected tag.
- **Given** filters are active, **when** I return to the explore screen from a detail page, **then** my selections are still applied.
- **Given** filters are active, **when** I tap "reset", **then** all selections clear and the full active result set returns.
- **Given** an item has no `dietaryTags`, **when** any dietary filter is active, **then** that item is excluded rather than optimistically included.

**INVEST check** — **I:** independent of map/list rendering. **N:** UI control type not dictated. **V:** relevance drives conversion. **E:** array containment filter. **S:** one filter group. **T:** set membership is exactly checkable.

**Notes**
This is **dietary preference filtering**, a merchant-declared informational tag. It is explicitly not allergy matching and the UI copy must not imply medical safety.

---

#### US-C-06 — Filter by distance, price, and pickup window
> **As a** Consumer, **I want** to constrain results by how far, how cheap, and how soon, **so that** what I see is actually collectable today.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | S | 3 | CON-04 | Planned |

**Acceptance criteria**
- **Given** I set a maximum distance, **when** results refresh, **then** only items whose merchant is within that radius of my position remain.
- **Given** I set a maximum price, **when** results refresh, **then** only items whose `currentPrice` is at or below that value remain.
- **Given** I enable "collectable now", **when** results refresh, **then** only items where the current time falls inside `pickupStartAt`–`pickupEndAt` remain.
- **Given** distance filtering is requested without a location fix, **when** the filter is applied, **then** the distance control is disabled with an explanatory label.

**INVEST check** — **I:** additive to US-C-05. **N:** slider vs input unspecified. **V:** removes obviously unreachable results. **E:** predicate filters. **S:** three predicates on one query. **T:** deterministic given seeded data.

**Notes**
Distance is computed from merchant `latitude`/`longitude`; there is no routing or travel time estimate.

---

#### US-C-07 — View Rescue Item detail
> **As a** Consumer, **I want** a detail screen with everything I need to decide, **so that** I do not reserve something I cannot collect in time.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | M | 3 | CON-05 | Planned |

**Acceptance criteria**
- **Given** I open an item, **when** the page renders, **then** it shows item name, merchant name and address, `currentPrice`, `originalPrice`, discount percentage, `remainingQuantity`, `weightPerItemGrams`, dietary tags, and the pickup window in WIB.
- **Given** `remainingQuantity` is 0, **when** the page renders, **then** the reserve action is disabled and the status reads "Habis".
- **Given** `pickupEndAt` has passed, **when** the page renders, **then** the reserve action is disabled and the status reads "Kedaluwarsa".
- **Given** another Consumer reserves the last unit while I am on the page, **when** the reactive query updates, **then** the reserve action disables without a reload.

**INVEST check** — **I:** needs only an existing item. **N:** layout free. **V:** the decision point of the whole journey. **E:** read-only screen with derived labels. **S:** one route. **T:** each disabled state is directly assertable.

**Notes**
Disabling the button is a courtesy. The reservation mutation re-validates quantity and window server-side regardless.

---

#### US-C-08 — Reserve a Rescue Item
> **As a** Consumer, **I want** to reserve the quantity I want before paying, **so that** nobody takes it from under me while I open my payment app.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Transaction | M | 5 | CON-06 | Planned |

**Acceptance criteria**
- **Given** an item with `remainingQuantity >= n`, **when** I reserve `n` units, **then** `remainingQuantity` is decremented by `n` **in the same transaction** as the order creation.
- **Given** the reservation succeeds, **when** the order is created, **then** its status is `reserved`, `paymentHoldExpiresAt` is set to now + 15 minutes, and a `RESERVED` ledger event is recorded.
- **Given** `remainingQuantity` reaches 0 after my reservation, **when** the item is re-read, **then** its status is `sold_out`; if some remains, the status is `reserved_partial`.
- **Given** two Consumers reserve the final unit simultaneously, **when** both mutations run, **then** exactly one succeeds and the other receives a "stok tidak cukup" error — never a negative `remainingQuantity`.
- **Given** the item is `expired` or `processingOnly`, **when** I attempt to reserve, **then** the server rejects the mutation regardless of what the client sent.

**INVEST check** — **I:** depends on listings existing, not on payment. **N:** does not name the mutation. **V:** this is where scarcity is resolved fairly. **E:** transactional decrement is well understood in Convex. **S:** one mutation with guards. **T:** the concurrency criterion is testable with parallel calls.

**Notes**
Decrementing at reservation rather than at payment is the deliberate anti-overselling decision. It creates the possibility of held-but-unpaid stock, which US-S-02 sweeps back.

---

#### US-C-09 — Pay within the 15-minute hold
> **As a** Consumer, **I want** to pay by QRIS and see the result promptly, **so that** my reservation converts into a confirmed collection.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Transaction | M | 8 | PAY-01, PAY-02 | Planned |

**Acceptance criteria**
- **Given** a `reserved` order, **when** I proceed to payment, **then** a Midtrans Sandbox QRIS charge is created for exactly `totalPrice` in IDR and the QR is displayed with a live countdown to `paymentHoldExpiresAt`.
- **Given** the sandbox reports settlement, **when** the notification is processed, **then** the order becomes `paid`, a `pickupCode` is generated, and a `PAID` ledger event is recorded.
- **Given** payment fails or is denied, **when** the result is processed, **then** the order remains `reserved` and I may retry while time remains in the hold.
- **Given** the same settlement notification arrives twice, **when** it is processed, **then** the order transitions once and exactly one `PAID` ledger event exists.
- **Given** the hold expires before settlement, **when** the sweeper runs, **then** the order becomes `expired` and the quantity is returned to the item.

**INVEST check** — **I:** requires US-C-08 as a precondition but is independently deployable behind a seeded reserved order. **N:** does not dictate Snap vs Core API. **V:** no payment, no rescue. **E:** sandbox is documented, but callback handling carries risk — hence 8. **S:** at the upper bound; splitting charge creation from settlement handling would leave neither half shippable. **T:** idempotency is directly testable by replaying a notification.

**Notes**
Sandbox only. No production credentials exist in this project. Idempotency keys on the payment record are mandatory because sandbox notifications are retried.

---

#### US-C-10 — Receive and use a pickup code
> **As a** Consumer, **I want** a pickup code after payment, **so that** the Merchant can verify I am the right person collecting.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Fulfilment | M | 3 | CON-07 | Planned |

**Acceptance criteria**
- **Given** an order becomes `paid`, **when** I open it, **then** a unique `pickupCode` is displayed prominently along with the merchant address and pickup window.
- **Given** an order is only `reserved`, **when** I open it, **then** no pickup code is shown.
- **Given** the code is shown, **when** the Merchant enters it correctly inside the window, **then** the order becomes `picked_up` and my screen updates reactively to "Sudah diambil".
- **Given** the order has been picked up, **when** I reopen it, **then** the code is replaced by a completion summary including rescued weight.

**INVEST check** — **I:** display-only on the Consumer side. **N:** code format not dictated by the story. **V:** the code is the physical handover proof. **E:** small. **S:** one panel plus reactive state. **T:** each display state is assertable.

**Notes**
Code uniqueness is enforced server-side. Only the paying Consumer and the owning Merchant can ever see it.

---

#### US-C-11 — Track my orders live
> **As a** Consumer, **I want** an orders screen that updates itself, **so that** I always know what I still need to collect today.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Fulfilment | M | 3 | CON-08 | Planned |

**Acceptance criteria**
- **Given** I have orders, **when** I open `/orders`, **then** they are grouped into active (`reserved`, `paid`) and past (`picked_up`, `cancelled`, `expired`, `refunded`).
- **Given** an order is `reserved`, **when** the list renders, **then** a live countdown to `paymentHoldExpiresAt` is shown with a direct "bayar sekarang" action.
- **Given** a Merchant confirms my pickup, **when** the mutation commits, **then** my open list moves that order to past without any manual refresh.
- **Given** I have no orders, **when** the screen renders, **then** an empty state links to the explore screen.

**INVEST check** — **I:** independent given seeded orders. **N:** grouping presentation is free. **V:** prevents missed collections. **E:** one reactive query plus grouping. **S:** one route. **T:** transitions observable.

**Notes**
The `/orders` route exists today as a placeholder using mock data; this story replaces the mock with a live query.

---

#### US-C-12 — Cancel inside the grace period
> **As a** Consumer, **I want** to cancel a reservation I have not yet paid for, **so that** I do not block stock somebody else could rescue.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Transaction | S | 3 | CON-06 | Planned |

**Acceptance criteria**
- **Given** an order is `reserved` and unpaid, **when** I cancel, **then** the order becomes `cancelled`, the reserved quantity returns to `remainingQuantity`, and a `CANCELLED` ledger event is recorded.
- **Given** the item was `sold_out` because of my reservation, **when** the quantity is returned, **then** the item returns to `active` provided its pickup window has not passed.
- **Given** an order is already `paid`, **when** I attempt to cancel, **then** the server refuses and directs me to open a dispute instead.
- **Given** the pickup window has already ended, **when** I attempt to cancel, **then** the server refuses because the expiry sweep owns that transition.

**INVEST check** — **I:** independent of payment work. **N:** entry point unspecified. **V:** returns stock to circulation quickly. **E:** inverse of reservation. **S:** one mutation. **T:** quantity restoration is exactly assertable.

**Notes**
Cancellation restores quantity. It does **not** create residual material — nothing has physically moved.

---

#### US-C-13 — See my personal impact
> **As a** Consumer, **I want** to see how much food I have rescued, **so that** the habit feels worth continuing.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Impact | M | 3 | IMP-01 | Planned |

**Acceptance criteria**
- **Given** I have `picked_up` orders, **when** I open my impact panel, **then** total rescued weight, number of rescues, and rupiah saved are displayed, all derived from `RESCUED` events in the Material Flow Ledger.
- **Given** I have an unpaid reservation, **when** the panel renders, **then** it contributes nothing — only terminal `RESCUED` events count.
- **Given** a new pickup is confirmed, **when** the ledger event commits, **then** my totals update reactively.
- **Given** I have no completed rescues, **when** the panel renders, **then** it shows zero values with an encouraging empty state, never a blank card.

**INVEST check** — **I:** depends on ledger events existing, which M1 delivers. **N:** metric presentation free. **V:** retention driver. **E:** aggregation over a filtered ledger read. **S:** one panel. **T:** numbers are recomputable by hand from ledger rows.

**Notes**
Never compute impact from `orders`. The ledger is the single source of truth, including the `methodologyVersion` stamp.

---

#### US-C-14 — Read notifications
> **As a** Consumer, **I want** in-app notifications for the moments that matter, **so that** I do not lose a reservation to a countdown I did not see.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Platform | S | 3 | NOT-01, NOT-02 | Planned |

**Acceptance criteria**
- **Given** my payment hold has 5 minutes left, **when** the scheduler evaluates it, **then** a notification is created telling me to complete payment.
- **Given** my payment settles, **when** the order becomes `paid`, **then** a notification carrying the pickup code reference is created.
- **Given** my pickup window opens within the hour, **when** the scheduler runs, **then** a reminder notification is created.
- **Given** I open the notification centre, **when** items render, **then** unread items are visually distinct and marking one read persists.

**INVEST check** — **I:** the notification table is independent of any single trigger. **N:** channel abstraction not dictated. **V:** timing is the difference between rescue and expiry. **E:** create-and-list. **S:** one panel plus triggers. **T:** each trigger asserts one row.

**Notes**
MVP is in-app only. Copy is Bahasa Indonesia; see the notification table in [USER_FLOW.md](USER_FLOW.md).

---

#### US-C-15 — Rate a completed rescue
> **As a** Consumer, **I want** to rate a Merchant after collecting, **so that** other Consumers know the listing was accurate.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Discovery | C | 2 | CON-09 | Planned |

**Acceptance criteria**
- **Given** an order is `picked_up`, **when** I open it, **then** a 1–5 star rating control with an optional comment is available.
- **Given** I have already rated that order, **when** I reopen it, **then** my rating is shown read-only.
- **Given** an order is not `picked_up`, **when** I open it, **then** no rating control appears.
- **Given** ratings exist, **when** a merchant profile renders, **then** the average is displayed with the count.

**INVEST check** — **I:** fully additive. **N:** widget unspecified. **V:** trust signal. **E:** small CRUD. **S:** one control. **T:** eligibility rule is binary.

**Notes**
Priority C. This is the first story cut if M7 runs short.

---

## 6. Merchant stories (US-M-*)

#### US-M-01 — Register a business account
> **As a** Merchant, **I want** to register my business, **so that** I can list surplus food instead of throwing it away.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | M | 3 | AUTH-01, MER-01 | Planned |

**Acceptance criteria**
- **Given** I choose the Merchant role at registration, **when** I submit, **then** a `users` record with `role = "merchant"` is created and I am routed to the business profile form.
- **Given** the profile form, **when** I submit name, business type, address, city, latitude, and longitude, **then** a `merchants` record is created with `verificationStatus = "pending"`.
- **Given** my profile is `pending`, **when** I open the merchant dashboard, **then** a persistent banner explains that listing is locked until verification.

**INVEST check** — **I:** parallel to Consumer registration. **N:** form layout free. **V:** entry point for supply. **E:** known. **S:** two forms, one mutation each. **T:** record state assertable.

**Notes**
Coordinates are required because map discovery depends on them. A merchant without coordinates cannot be found.

---

#### US-M-02 — Wait behind the verification gate
> **As a** Merchant, **I want** clear feedback about my verification state, **so that** I understand why I cannot list yet and what happens next.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Verification | M | 2 | AUTH-04 | Planned |

**Acceptance criteria**
- **Given** `verificationStatus = "pending"`, **when** I attempt to create a listing, **then** the server rejects the mutation even if the client sends it directly.
- **Given** an Admin approves me, **when** the status changes to `verified`, **then** the banner disappears reactively and the create action unlocks.
- **Given** an Admin rejects me, **when** the status changes to `rejected`, **then** the reason is displayed and the create action stays locked.

**INVEST check** — **I:** server guard is independent of the Admin UI. **N:** banner design free. **V:** platform trust. **E:** one guard plus one banner. **S:** tiny. **T:** direct mutation attempt is the definitive test.

**Notes**
The gate is enforced in the mutation, not in the router. Hiding the button is cosmetic.

---

#### US-M-03 — Create a Rescue Item
> **As a** Merchant, **I want** to list surplus food quickly, **so that** it reaches a Consumer before it stops being edible.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Listing | M | 5 | MER-02 | Planned |

**Acceptance criteria**
- **Given** I am verified, **when** I submit name, material type, original price, floor price, initial quantity, weight per item in grams, pickup start and end, and dietary tags, **then** a `surplusItems` record is created with `status = "active"`, `remainingQuantity = initialQuantity`, and a `LISTED` ledger event is recorded.
- **Given** `floorPrice > originalPrice`, **when** I submit, **then** validation fails on both client and server.
- **Given** `pickupEndAt <= pickupStartAt`, **when** I submit, **then** validation fails.
- **Given** `weightPerItemGrams` is not a positive integer, **when** I submit, **then** validation fails, because all impact metrics depend on it.
- **Given** creation succeeds, **when** the item is saved as a draft instead, **then** `status = "draft"` and no `LISTED` event is written until it is published.

**INVEST check** — **I:** the core supply story, dependent only on verification. **N:** field ordering free. **V:** no listings, no platform. **E:** one large form. **S:** at the top of standard range. **T:** each validation rule is a discrete test.

**Notes**
Weight is integer grams everywhere. Money is integer IDR. Times are epoch milliseconds UTC and rendered in WIB.

---

#### US-M-04 — Accept or override the price suggestion
> **As a** Merchant, **I want** a suggested Rescue price that I can override, **so that** I price fast without losing control.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Pricing | M | 5 | PRC-01, PRC-02 | Planned |

**Acceptance criteria**
- **Given** I enter an original price and a pickup window, **when** the form recalculates, **then** a **Dynamic Rescue Pricing** suggestion is shown with a plain-language explanation of the discount rationale.
- **Given** a suggestion is shown, **when** I type my own `currentPrice`, **then** my value is used verbatim provided it satisfies `floorPrice <= currentPrice < originalPrice`.
- **Given** I enter a price below `floorPrice`, **when** I submit, **then** the server rejects it.
- **Given** I enter a price at or above `originalPrice`, **when** I submit, **then** the server rejects it — a Rescue Item is always discounted.

**INVEST check** — **I:** suggestion logic is a pure function, testable alone. **N:** formula lives in [../impact/ALGORITHM.md](../impact/ALGORITHM.md), not in this story. **V:** removes the hardest decision from listing. **E:** deterministic rules. **S:** one computed field plus guards. **T:** boundary values are exactly testable.

**Notes**
This is rule-based **Dynamic Rescue Pricing**. It is deterministic and explainable. It must never be described as AI pricing.

---

#### US-M-05 — Set a floor price
> **As a** Merchant, **I want** to set the lowest price I will accept, **so that** automatic markdowns never go below my cost.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Pricing | M | 2 | PRC-03 | Planned |

**Acceptance criteria**
- **Given** I set `floorPrice`, **when** the item is saved, **then** the value persists on the item.
- **Given** the scheduled markdown would produce a price below `floorPrice`, **when** the tick runs, **then** `currentPrice` is clamped to `floorPrice` and no further reduction occurs.
- **Given** `currentPrice == floorPrice`, **when** subsequent ticks run, **then** no `PRICE_ADJUSTED` events are emitted, keeping the ledger free of no-op noise.

**INVEST check** — **I:** field plus clamp. **N:** free. **V:** protects merchant economics. **E:** trivial. **S:** tiny. **T:** clamp is a boundary test.

**Notes**
The floor is the merchant's contract with the platform. Nothing overrides it, including Admin.

---

#### US-M-06 — Watch prices step down automatically
> **As a** Merchant, **I want** prices to decrease as the pickup window closes, **so that** unsold stock becomes more attractive without me watching the clock.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Pricing | S | 3 | PRC-04 | Planned |

**Acceptance criteria**
- **Given** an `active` item with time remaining in its window, **when** the pricing tick runs, **then** `currentPrice` is recalculated from elapsed window fraction and clamped at `floorPrice`.
- **Given** the price actually changes, **when** the mutation commits, **then** a `PRICE_ADJUSTED` ledger event records old and new price in metadata.
- **Given** the item is `reserved_partial`, **when** the tick runs, **then** pricing still applies to the remaining units.
- **Given** the item is `sold_out`, `expired`, or in any recovery state, **when** the tick runs, **then** it is skipped.

**INVEST check** — **I:** a cron job over existing items. **N:** curve defined elsewhere. **V:** conversion on ageing stock. **E:** scheduled function. **S:** one job. **T:** deterministic given a fixed clock.

**Notes**
Already-paid orders are never repriced. `totalPrice` is frozen at reservation.

---

#### US-M-07 — Manage my listings
> **As a** Merchant, **I want** one screen showing everything I have listed and its state, **so that** I know what still needs to move today.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Listing | M | 3 | MER-03 | Planned |

**Acceptance criteria**
- **Given** I have items, **when** I open `/merchant/surplus`, **then** they are listed with status badge, remaining/initial quantity, current price, and window countdown.
- **Given** an item's status changes anywhere in the system, **when** the change commits, **then** my table updates reactively.
- **Given** I filter by status, **when** the filter applies, **then** only matching items remain.
- **Given** I have no items, **when** the page renders, **then** an empty state links to the create form.

**INVEST check** — **I:** read-only over own data. **N:** table shape free. **V:** operational awareness. **E:** one query plus a table. **S:** one route. **T:** scoping to own merchant is assertable.

**Notes**
The route exists with mock data today; this story swaps in a live scoped query.

---

#### US-M-08 — Edit a listing before anyone reserves
> **As a** Merchant, **I want** to correct a listing while it is untouched, **so that** mistakes do not cost me a sale or mislead a Consumer.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Listing | M | 3 | MER-04 | Planned |

**Acceptance criteria**
- **Given** an item is `active` with `remainingQuantity == initialQuantity`, **when** I edit it, **then** all fields are editable and the update succeeds.
- **Given** the item is `reserved_partial` or has any non-cancelled order, **when** I attempt to edit, **then** the server rejects with "Item sudah dipesan, tidak dapat diubah".
- **Given** editing is locked, **when** the page renders, **then** fields are read-only and the reason is explained rather than silently disabled.

**INVEST check** — **I:** builds on US-M-03 but ships separately. **N:** free. **V:** prevents bait-and-switch after commitment. **E:** guard plus form reuse. **S:** small. **T:** the lock condition is binary.

**Notes**
The edit lock protects the Consumer's price and weight expectations, which are already recorded in the ledger.

---

#### US-M-09 — Publish a processing-only listing
> **As a** Merchant, **I want** to send material straight to recovery when it is not fit for human consumption, **so that** it still avoids landfill.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Listing | S | 3 | MER-07 | Planned |

**Acceptance criteria**
- **Given** I mark an item `processingOnly = true`, **when** it is created, **then** it never appears in Consumer discovery queries.
- **Given** a processing-only item is created, **when** the mutation commits, **then** it enters `recovery_pending` directly and a recovery batch is queued for **Circular Routing**.
- **Given** a Consumer attempts to reserve it by crafting a direct call, **when** the mutation runs, **then** the server rejects it.

**INVEST check** — **I:** a flag plus a routing entry point. **N:** free. **V:** captures material that would otherwise be uncounted. **E:** reuses routing. **S:** small. **T:** exclusion from discovery is directly assertable.

**Notes**
Processing-only material produces `RECOVERED` weight, never `RESCUED` weight.

---

#### US-M-10 — Verify pickup with a code
> **As a** Merchant, **I want** to confirm collection by checking the Consumer's code, **so that** the handover is recorded accurately.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Fulfilment | M | 5 | MER-05 | Planned |

**Acceptance criteria**
- **Given** a `paid` order, **when** I enter the matching `pickupCode` inside the pickup window, **then** the order becomes `picked_up`, `rescuedWeightGrams` is written, and a `RESCUED` ledger event is recorded.
- **Given** the code does not match, **when** I submit, **then** the mutation is rejected and the order state is unchanged.
- **Given** the current time is outside the pickup window, **when** I submit a correct code, **then** the mutation is rejected and the UI explains that an Admin override is required.
- **Given** all units of the item have been collected, **when** the last confirmation commits, **then** the item reaches a terminal `closed` state.

**INVEST check** — **I:** requires paid orders, otherwise standalone. **N:** manual entry vs scan not dictated. **V:** the moment food is actually saved. **E:** guard-heavy but mechanical. **S:** one mutation with three guards. **T:** each rejection path is a test.

**Notes**
`RESCUED` is terminal for that order's material. `rescuedWeightGrams = quantity × weightPerItemGrams`.

---

#### US-M-11 — Report a consumer no-show
> **As a** Merchant, **I want** to report that nobody collected, **so that** the food moves on to recovery rather than sitting in my fridge.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Fulfilment | S | 3 | MER-06 | Planned |

**Acceptance criteria**
- **Given** a `paid` order whose window has closed, **when** I report a no-show, **then** the order is marked appropriately and the material is queued for **Circular Routing**.
- **Given** a no-show is reported, **when** the mutation commits, **then** **no residual is created** — the weight re-enters routing at full offered weight.
- **Given** the window has not closed, **when** I attempt to report, **then** the server rejects the action.

**INVEST check** — **I:** independent of processor work. **N:** free. **V:** closes the loop on the most common failure. **E:** a status change plus a routing enqueue. **S:** small. **T:** the "no residual" rule is exactly assertable in the ledger.

**Notes**
This is the rule people get wrong most often. A no-show is a **routing** event, not a loss event.

---

#### US-M-12 — See my merchant dashboard
> **As a** Merchant, **I want** a dashboard of today's activity and my impact, **so that** I can justify the time I spend listing.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Impact | M | 3 | IMP-02 | Planned |

**Acceptance criteria**
- **Given** I open `/merchant`, **when** it renders, **then** summary cards show active listings, pending pickups today, weight rescued, weight recovered, and revenue recovered.
- **Given** every figure shown, **when** it is computed, **then** it derives from Material Flow Ledger events scoped to my merchant id.
- **Given** activity occurs, **when** ledger events commit, **then** the cards update reactively.

**INVEST check** — **I:** read-only aggregation. **N:** card set negotiable. **V:** merchant retention. **E:** aggregation queries. **S:** one route. **T:** figures recomputable from ledger rows.

**Notes**
Route exists with placeholder `SummaryCard` components; this story supplies real data.

---

#### US-M-13 — Watch my item enter Circular Routing
> **As a** Merchant, **I want** visibility when unsold material is routed to a processor, **so that** I know it was recovered rather than discarded.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Routing | S | 3 | MER-03, ADM-06 | Planned |

**Acceptance criteria**
- **Given** my item expires unsold, **when** routing begins, **then** the item status shows `recovery_pending` and the batch state is visible to me.
- **Given** a processor accepts, **when** the batch becomes `accepted`, **then** I see the processor name, facility type, and expected collection time.
- **Given** the batch becomes `unroutable`, **when** it commits, **then** I am notified and told an Admin will attempt a manual re-route.

**INVEST check** — **I:** read-only view of routing state. **N:** free. **V:** closes the merchant's loop of trust. **E:** one scoped query. **S:** a panel. **T:** each state renders distinctly.

**Notes**
The Merchant is a spectator to routing. They never choose the processor.

---

#### US-M-14 — Maintain my business profile
> **As a** Merchant, **I want** to update my address, hours, and contact details, **so that** Consumers arrive at the right place.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | S | 2 | MER-01 | Planned |

**Acceptance criteria**
- **Given** I edit my profile, **when** I save, **then** the `merchants` record updates and the map position of my future listings reflects the new coordinates.
- **Given** I change the address, **when** I save, **then** `verificationStatus` returns to `pending` and listing is locked until re-approval.
- **Given** I attempt to edit another merchant's profile by id, **when** the mutation runs, **then** the server rejects on ownership.

**INVEST check** — **I:** standalone CRUD. **N:** free. **V:** accuracy of the physical handover. **E:** trivial. **S:** tiny. **T:** re-verification trigger is assertable.

**Notes**
Address changes reset verification deliberately — a verified address is the thing being trusted.

---

#### US-M-15 — Receive merchant notifications
> **As a** Merchant, **I want** alerts when something needs my attention, **so that** I do not miss a collection or a routing decision.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Platform | S | 2 | NOT-03 | Planned |

**Acceptance criteria**
- **Given** an order becomes `paid`, **when** it commits, **then** I receive a notification naming the item and quantity.
- **Given** a pickup window is closing within 30 minutes with uncollected paid orders, **when** the scheduler runs, **then** I receive a reminder.
- **Given** my verification status changes, **when** it commits, **then** I receive a notification with the outcome.

**INVEST check** — **I:** trigger additions on existing tables. **N:** free. **V:** operational responsiveness. **E:** small. **S:** tiny. **T:** one row per trigger.

**Notes**
Shares the `notifications` table and centre with US-C-14.

---

## 7. Organic Processor stories (US-P-*)

#### US-P-01 — Register a processing facility
> **As an** Organic Processor, **I want** to register my facility, **so that** I can receive organic material that would otherwise be wasted.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | M | 3 | AUTH-01, PRC-05 | Planned |

**Acceptance criteria**
- **Given** I select the Processor role, **when** I complete the facility form with name, facility type, city, coordinates, and operating hours, **then** a `processors` record is created with `verificationStatus = "pending"`.
- **Given** my record is pending, **when** routing runs, **then** I am excluded from eligibility entirely.
- **Given** facility type is required, **when** I submit without one, **then** validation fails.

**INVEST check** — **I:** parallel to merchant onboarding. **N:** free. **V:** without processors there is no circular loop. **E:** known form. **S:** one form. **T:** eligibility exclusion is assertable.

**Notes**
Facility types cover BSF larvae cultivation, composting, biogas digestion, and animal feed production.

---

#### US-P-02 — Declare accepted material types and capacity
> **As an** Organic Processor, **I want** to declare what I accept and how much, **so that** I am only offered material I can actually process.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 3 | PRC-05 | Planned |

**Acceptance criteria**
- **Given** my profile, **when** I set `acceptedMaterialTypes`, `dailyCapacityGrams`, `maxPickupRadiusMeters`, and `outputTypes`, **then** the values persist and immediately affect routing eligibility.
- **Given** a batch whose `materialType` is not in my list, **when** routing evaluates me, **then** I am not offered it.
- **Given** my accepted intake today already meets `dailyCapacityGrams`, **when** routing evaluates me, **then** I am skipped for lack of headroom.
- **Given** a merchant is farther than `maxPickupRadiusMeters`, **when** routing evaluates me, **then** I am skipped.

**INVEST check** — **I:** a profile form feeding a separate engine. **N:** free. **V:** prevents useless offers. **E:** form plus predicate wiring. **S:** small. **T:** each predicate is a discrete test.

**Notes**
These four fields are the entire eligibility contract. They are also the demo's most persuasive detail.

---

#### US-P-03 — Wait behind the processor verification gate
> **As an** Organic Processor, **I want** to know when I am verified, **so that** I understand why my queue is empty.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Verification | M | 2 | AUTH-04 | Planned |

**Acceptance criteria**
- **Given** `verificationStatus != "verified"`, **when** I open my queue, **then** an explanatory state is shown instead of an empty list.
- **Given** I am approved, **when** the status commits, **then** the gate lifts reactively and offers can arrive.
- **Given** I am rejected, **when** the status commits, **then** the reason is shown and no offers are ever routed to me.

**INVEST check** — **I:** mirrors US-M-02. **N:** free. **V:** avoids a confusing dead screen. **E:** trivial. **S:** tiny. **T:** binary.

**Notes**
An unverified processor is invisible to the routing engine, not merely blocked in the UI.

---

#### US-P-04 — See my recovery queue
> **As an** Organic Processor, **I want** a queue of pending offers, **so that** I can plan collection runs.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 3 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** offers exist for me, **when** I open `/processor/recovery`, **then** each shows merchant name, distance, material type, offered weight, and a countdown to `offerExpiresAt`.
- **Given** an offer's TTL passes, **when** the sweeper runs, **then** it leaves my queue reactively.
- **Given** another processor is offered the same batch after I decline, **when** the batch is re-routed, **then** it never reappears in my queue.

**INVEST check** — **I:** read-only over batches. **N:** free. **V:** the processor's daily working screen. **E:** one scoped query. **S:** one route. **T:** scoping and TTL are assertable.

**Notes**
Route exists with mock data today. Scoping filters on `processorId` and excludes any batch listing me in `declinedByProcessorIds`.

---

#### US-P-05 — Accept a recovery offer
> **As an** Organic Processor, **I want** to accept an offer, **so that** the material is reserved for my facility.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 3 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** an `offered` batch assigned to me within TTL, **when** I accept, **then** the batch becomes `accepted` and an `INTAKE_ACCEPTED` ledger event is recorded.
- **Given** the TTL has already expired, **when** I accept, **then** the server rejects the mutation.
- **Given** the batch is offered to a different processor, **when** I attempt to accept, **then** the server rejects on ownership.
- **Given** I accept, **when** it commits, **then** the Merchant is notified with my facility details.

**INVEST check** — **I:** one mutation. **N:** free. **V:** the moment the loop closes. **E:** mechanical. **S:** small. **T:** every guard is testable.

**Notes**
Acceptance does not yet write a weight. Offered weight is an estimate; only measured intake is authoritative.

---

#### US-P-06 — Decline a recovery offer
> **As an** Organic Processor, **I want** to decline material I cannot take, **so that** it reaches another facility quickly instead of expiring.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 3 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** an `offered` batch, **when** I decline with a reason, **then** my id is appended to `declinedByProcessorIds` and an `INTAKE_DECLINED` ledger event is recorded.
- **Given** I have declined, **when** routing retries, **then** I am permanently excluded from that batch.
- **Given** `routingAttempts` has reached 3, **when** I decline, **then** the batch becomes `unroutable` and an Admin is notified.

**INVEST check** — **I:** counterpart to accept. **N:** free. **V:** speed matters more than politeness for perishable material. **E:** mechanical. **S:** small. **T:** exclusion and attempt counting are assertable.

**Notes**
Declining is a first-class, blameless action. It is what makes the retry logic converge.

---

#### US-P-07 — Log measured intake
> **As an** Organic Processor, **I want** to record the actual weight I received, **so that** impact figures reflect reality rather than an estimate.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 5 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** an `accepted` batch, **when** I enter `acceptedWeightGrams` from my scale, **then** the batch becomes `collected` and the measured weight is stored as authoritative.
- **Given** the measured weight differs from `offeredWeightGrams`, **when** it is saved, **then** the difference is recorded in ledger metadata without blocking the transition.
- **Given** any actor other than the assigned Processor attempts to set `acceptedWeightGrams`, **when** the mutation runs, **then** it is rejected.
- **Given** a non-positive integer is submitted, **when** validation runs, **then** it is rejected.

**INVEST check** — **I:** one mutation on an accepted batch. **N:** free. **V:** measurement integrity is the platform's credibility. **E:** guarded write. **S:** moderate. **T:** the authority rule is a direct permission test.

**Notes**
Only the Processor writes `acceptedWeightGrams`. Not the Merchant, not the Admin, not an estimate. This rule is non-negotiable.

---

#### US-P-08 — Log the processing outcome
> **As an** Organic Processor, **I want** to record what the material became, **so that** the loop is provably closed.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Recovery | M | 5 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** a `collected` batch, **when** I submit `outputType`, `outputWeightGrams`, and `residualWeightGrams`, **then** the batch becomes `processed` and a `PROCESSED` ledger event is recorded.
- **Given** `residualWeightGrams > acceptedWeightGrams`, **when** I submit, **then** the server rejects the invalid mass balance.
- **Given** the batch is processed, **when** the event commits, **then** recovered weight counts toward the circularity rate and residual weight counts against it.
- **Given** the batch is already `processed`, **when** I submit again, **then** the mutation is rejected because `PROCESSED` is terminal.

**INVEST check** — **I:** follows intake. **N:** free. **V:** produces the recovery half of every impact number. **E:** guarded write plus arithmetic. **S:** moderate. **T:** mass balance is a precise inequality test.

**Notes**
Residual is honest. A processor that reports zero residual on every batch is a data-quality flag, not a success story. Realistic circularity lands at 85–95%.

---

#### US-P-09 — See my processor dashboard
> **As an** Organic Processor, **I want** a dashboard of throughput and outputs, **so that** I can report my facility's contribution.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Impact | M | 3 | IMP-03 | Planned |

**Acceptance criteria**
- **Given** I open `/processor`, **when** it renders, **then** cards show pending offers, weight collected this week, weight processed, output by type, and capacity utilisation against `dailyCapacityGrams`.
- **Given** every figure, **when** computed, **then** it derives from ledger events scoped to my processor id.
- **Given** I log an outcome, **when** it commits, **then** the dashboard updates reactively.

**INVEST check** — **I:** read-only. **N:** card set negotiable. **V:** justifies participation. **E:** aggregation. **S:** one route. **T:** recomputable by hand.

**Notes**
Route exists with mock data; this story supplies live aggregates.

---

#### US-P-10 — Receive processor notifications
> **As an** Organic Processor, **I want** to be told when an offer arrives or is about to expire, **so that** I do not lose material to a countdown.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Platform | S | 2 | NOT-04 | Planned |

**Acceptance criteria**
- **Given** a batch is routed to me, **when** the `ROUTED` event commits, **then** I receive a notification with weight, material type, and TTL.
- **Given** an offer has one hour of TTL left, **when** the scheduler runs, **then** I receive a reminder.
- **Given** an offer expires unanswered, **when** the sweeper runs, **then** I receive a closing notice so my queue count makes sense.

**INVEST check** — **I:** triggers on existing events. **N:** free. **V:** the 6-hour TTL only works if I know about it. **E:** small. **S:** tiny. **T:** one row per trigger.

**Notes**
Six hours is deliberately generous for perishable material because processors operate on shift schedules.

---

## 8. Admin stories (US-A-*)

#### US-A-01 — Sign in as a provisioned Admin
> **As an** Admin, **I want** an account that cannot be self-registered, **so that** nobody can grant themselves platform-wide power.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Identity | M | 2 | AUTH-02 | Planned |

**Acceptance criteria**
- **Given** the public registration form, **when** it renders, **then** no Admin role option exists.
- **Given** a crafted registration request containing `role = "admin"`, **when** the mutation runs, **then** the server ignores or rejects the field and never creates an admin.
- **Given** an admin account provisioned by seed or internal mutation, **when** it logs in, **then** it reaches the admin console.

**INVEST check** — **I:** a guard plus a seed path. **N:** provisioning mechanism negotiable. **V:** the platform's most important security boundary. **E:** trivial to implement, essential to test. **S:** tiny. **T:** the crafted-request test is definitive.

**Notes**
Mass assignment of `role` is the single highest-severity risk in the system. See [../security/PERMISSIONS.md](../security/PERMISSIONS.md).

---

#### US-A-02 — Verify merchants and processors
> **As an** Admin, **I want** to review and decide on verification requests, **so that** only real businesses and facilities participate.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Verification | M | 3 | ADM-01, AUTH-04 | Planned |

**Acceptance criteria**
- **Given** pending applicants exist, **when** I open the verification queue, **then** both merchants and processors are listed with submitted details and coordinates.
- **Given** I approve, **when** the mutation commits, **then** `verificationStatus = "verified"`, capability unlocks, and the applicant is notified.
- **Given** I reject, **when** the mutation commits, **then** the status is `rejected` with a stored reason, and the applicant is notified.
- **Given** any decision, **when** it commits, **then** the admin action is itself recorded for audit with my user id and timestamp.

**INVEST check** — **I:** one queue over two tables. **N:** free. **V:** unblocks every supply-side story. **E:** simple CRUD with a gate. **S:** one route. **T:** capability unlock is directly assertable.

**Notes**
This is the first Admin capability to build because M2 supply work is blocked without it.

---

#### US-A-03 — Moderate a listing
> **As an** Admin, **I want** to remove listings that break the rules, **so that** the marketplace stays trustworthy.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Governance | M | 3 | ADM-02 | Planned |

**Acceptance criteria**
- **Given** a live listing, **when** I moderate it with a reason, **then** its status becomes `moderated`, it disappears from discovery, and a `MODERATED` ledger event is recorded.
- **Given** the item has paid orders, **when** I moderate it, **then** those orders are flagged for refund rather than silently voided.
- **Given** a moderated item, **when** any actor attempts a state transition, **then** the server rejects it because `MODERATED` is terminal.

**INVEST check** — **I:** one mutation. **N:** free. **V:** platform safety. **E:** status change plus cascade. **S:** small. **T:** terminality is a direct test.

**Notes**
`MODERATED` is a terminal ledger event. Moderated weight is excluded from rescued and recovered totals.

---

#### US-A-04 — Inspect the Material Flow Ledger
> **As an** Admin, **I want** to read the full ledger with filters, **so that** I can audit any claim the platform makes.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Governance | M | 5 | ADM-03, IMP-04 | Planned |

**Acceptance criteria**
- **Given** the ledger view, **when** it renders, **then** events are shown newest first with event type, weight delta, actor, actor role, methodology version, and timestamp.
- **Given** I filter by surplus item id, **when** the filter applies, **then** I see the complete lifecycle of that item in order.
- **Given** I filter by event type or date range, **when** the filter applies, **then** results narrow accordingly.
- **Given** any UI affordance in the console, **when** I look for an edit or delete control on a ledger row, **then** none exists, because the ledger is append-only.

**INVEST check** — **I:** read-only over one table. **N:** free. **V:** auditability is the platform's core claim. **E:** paginated query with filters. **S:** one route with several filters. **T:** the item-timeline reconstruction is a strong end-to-end test.

**Notes**
This screen is the demo's credibility proof. It shows judges that the numbers are not decorative.

---

#### US-A-05 — Monitor the platform dashboard
> **As an** Admin, **I want** platform-wide metrics including the circularity rate, **so that** I can report performance accurately.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Impact | M | 5 | ADM-04, IMP-04 | Planned |

**Acceptance criteria**
- **Given** the dashboard, **when** it renders, **then** it shows total listed weight, rescued weight, recovered weight, residual weight, and the derived **circularity rate**.
- **Given** the circularity rate, **when** computed, **then** it equals `(rescued + recovered) / (rescued + recovered + residual)` expressed as a percentage.
- **Given** live data, **when** ledger events commit, **then** the figures update reactively.
- **Given** any figure, **when** questioned, **then** it can be traced to ledger rows through the ledger view.

**INVEST check** — **I:** aggregation over the ledger. **N:** chart choices free. **V:** the headline number. **E:** the formula is fixed in [../impact/ALGORITHM.md](../impact/ALGORITHM.md). **S:** one route with several aggregates. **T:** the formula is exactly checkable.

**Notes**
Target for the demo dataset is **93%**. The system must never display 100%, and copy must never claim zero waste.

---

#### US-A-06 — Resolve a dispute
> **As an** Admin, **I want** to resolve disputes between Consumers and Merchants, **so that** genuine problems get a fair outcome.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Governance | S | 5 | ADM-05 | Planned |

**Acceptance criteria**
- **Given** open disputes, **when** I open the queue, **then** each shows the order, both parties, the claim, and the full ledger timeline for that item.
- **Given** I resolve in favour of the Consumer, **when** it commits, **then** the order becomes `refunded` and both parties are notified.
- **Given** I resolve in favour of the Merchant, **when** it commits, **then** the dispute closes with a stored rationale and no financial change.
- **Given** any resolution, **when** it commits, **then** the admin action is recorded for audit.

**INVEST check** — **I:** needs the `disputes` table only. **N:** free. **V:** trust under failure. **E:** moderate branching. **S:** one route with two outcomes. **T:** each branch is assertable.

**Notes**
Refunds are recorded as order state. Money movement in Midtrans Sandbox is not simulated beyond status.

---

#### US-A-07 — Manually re-route an unroutable batch
> **As an** Admin, **I want** to assign a processor by hand when automatic routing fails, **so that** material is not wasted by an algorithm's limits.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Routing | M | 5 | ADM-06 | Planned |

**Acceptance criteria**
- **Given** an `unroutable` batch, **when** I open it, **then** I see why routing failed — attempts used, decliners, and which eligibility rules excluded each processor.
- **Given** I select any verified processor, **when** I assign, **then** the batch returns to `offered` with a fresh TTL and a `ROUTED` event recording that it was an admin action.
- **Given** I override a normal eligibility rule such as radius, **when** I assign, **then** the override reason is stored in ledger metadata.
- **Given** no verified processor exists at all, **when** I open the batch, **then** the UI says so plainly rather than offering an empty picker.

**INVEST check** — **I:** builds on routing but is a separate screen. **N:** free. **V:** the human safety valve. **E:** requires exposing routing diagnostics. **S:** at the upper edge. **T:** the re-offer transition is assertable.

**Notes**
Admin may override radius and capacity, but never a processor's `acceptedMaterialTypes`. Sending unsuitable material to a facility is a physical safety issue.

---

#### US-A-08 — Manage user accounts
> **As an** Admin, **I want** to suspend or reactivate accounts, **so that** abuse can be stopped quickly.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Governance | S | 3 | ADM-01 | Planned |

**Acceptance criteria**
- **Given** the user list, **when** it renders, **then** users are searchable by email and filterable by role and status.
- **Given** I suspend a user, **when** it commits, **then** `status = "suspended"`, their sessions are invalidated, and their mutations are rejected.
- **Given** a suspended Merchant, **when** the suspension commits, **then** their active listings are hidden from discovery.
- **Given** I reactivate a user, **when** it commits, **then** normal capability returns and the action is audited.

**INVEST check** — **I:** standalone. **N:** free. **V:** incident response. **E:** status change plus session invalidation. **S:** small. **T:** rejection after suspension is testable.

**Notes**
Suspension never deletes ledger history. Past events remain and continue to count.

---

#### US-A-09 — Override a pickup outside the window
> **As an** Admin, **I want** to confirm a legitimate late pickup, **so that** a small timing failure does not destroy an otherwise successful rescue.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Fulfilment | S | 3 | MER-05, ADM-05 | Planned |

**Acceptance criteria**
- **Given** a `paid` order whose window has closed, **when** I confirm pickup with an override reason, **then** the order becomes `picked_up` and a `RESCUED` event is recorded with the override flagged in metadata.
- **Given** an override, **when** it commits, **then** the admin action is audited with my user id.
- **Given** a Merchant attempts the same action, **when** the mutation runs, **then** it is rejected — override is admin-only.

**INVEST check** — **I:** extends the pickup mutation with an admin path. **N:** free. **V:** prevents lost material from a clock edge. **E:** a branch on an existing mutation. **S:** small. **T:** role restriction is directly testable.

**Notes**
Overrides are visible in the ledger. They are exceptions, and exceptions must be countable.

---

#### US-A-10 — Review platform health signals
> **As an** Admin, **I want** to see anomalies and scheduler health, **so that** silent failures do not corrupt the impact numbers.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Governance | C | 3 | ADM-04 | Planned |

**Acceptance criteria**
- **Given** the health panel, **when** it renders, **then** it shows last run time and outcome for each scheduled job.
- **Given** the integrity check finds an anomaly such as negative remaining quantity or residual exceeding accepted weight, **when** the check runs, **then** the anomaly is listed with the affected document id.
- **Given** no anomalies, **when** the panel renders, **then** it states that clearly rather than showing an ambiguous blank.

**INVEST check** — **I:** read-only over job metadata. **N:** free. **V:** protects the numbers that carry the whole pitch. **E:** small once US-S-06 exists. **S:** one panel. **T:** anomalies are seedable.

**Notes**
Priority C, but cheap once the integrity check exists. Worth building if M7 has room.

---

## 9. System and Scheduler stories (US-S-*)

These stories have no human actor. They are written from the platform's perspective because Convex cron functions carry real, testable business rules that would otherwise hide inside implementation notes.

#### US-S-01 — Dynamic Rescue Pricing tick
> **As the** System, **I want** to recalculate `currentPrice` for active items on a schedule, **so that** ageing stock becomes progressively more attractive without merchant intervention.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Pricing | S | 3 | PRC-04 | Planned |

**Acceptance criteria**
- **Given** the cron fires, **when** it runs, **then** every `active` and `reserved_partial` item inside its pickup window is evaluated.
- **Given** the computed price is lower than the current price and at or above the floor, **when** it commits, **then** `currentPrice` updates and a `PRICE_ADJUSTED` event is recorded.
- **Given** the computed price equals the current price, **when** it is evaluated, **then** nothing is written.
- **Given** an item is in any recovery state, **when** the tick runs, **then** it is skipped.

**INVEST check** — **I:** one job over existing data. **N:** interval negotiable. **V:** conversion without labour. **E:** deterministic. **S:** one function. **T:** fixed-clock tests are exact.

**Notes**
No-op suppression keeps the ledger readable. A ledger full of identical price events is a ledger nobody audits.

---

#### US-S-02 — Payment hold sweeper
> **As the** System, **I want** to expire unpaid reservations after 15 minutes, **so that** held stock returns to the marketplace.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Transaction | M | 3 | PAY-03 | Planned |

**Acceptance criteria**
- **Given** an order is `reserved` with `paymentHoldExpiresAt` in the past, **when** the sweeper runs, **then** the order becomes `expired`, quantity is returned, and an `EXPIRED` event is recorded.
- **Given** the item was `sold_out` due to that hold, **when** quantity returns, **then** the item becomes `active` again if its window is still open.
- **Given** an order settled moments before the sweep, **when** the sweeper evaluates it, **then** the `paid` order is left untouched.
- **Given** the sweeper runs twice on the same order, **when** the second run executes, **then** no duplicate `EXPIRED` event is written.

**INVEST check** — **I:** one job. **N:** interval negotiable. **V:** without it, abandoned carts permanently destroy supply. **E:** small. **S:** one function. **T:** the race with settlement is testable.

**Notes**
This job is what makes decrement-at-reservation safe. Without it the anti-overselling rule becomes an availability bug.

---

#### US-S-03 — Pickup window expiry sweeper
> **As the** System, **I want** to close pickup windows that have ended, **so that** uncollected material enters Circular Routing promptly.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Routing | M | 5 | CON-06, PRC-06 | Planned |

**Acceptance criteria**
- **Given** an item whose `pickupEndAt` has passed with `remainingQuantity > 0`, **when** the sweeper runs, **then** the item becomes `recovery_pending`, an `EXPIRED` event is recorded, and a recovery batch is created with `offeredWeightGrams = remainingQuantity × weightPerItemGrams`.
- **Given** paid but uncollected orders exist on that item, **when** the sweeper runs, **then** their weight is included in the offered weight because the material is still physically present.
- **Given** an item is fully collected, **when** the sweeper runs, **then** it is closed with no recovery batch.
- **Given** the sweeper runs repeatedly, **when** an item already has a batch, **then** no duplicate batch is created.

**INVEST check** — **I:** one job that hands off to the routing engine. **N:** free. **V:** the entry point of the circular half of the platform. **E:** moderate branching. **S:** one function. **T:** offered-weight arithmetic is exact.

**Notes**
This job is the hinge between the marketplace and the circular loop. It must be correct before M5 has anything to work with.

---

#### US-S-04 — Circular Routing engine
> **As the** System, **I want** to rank and offer recovery batches to eligible processors, **so that** organic material finds a facility automatically.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Routing | M | 8 | PRC-06, ADM-06 | Planned |

**Acceptance criteria**
- **Given** a `pending` batch, **when** the engine runs, **then** it selects processors that are verified, accept the material type, are within `maxPickupRadiusMeters`, have capacity headroom today, are not in `declinedByProcessorIds`, and are open within the next 24 hours.
- **Given** eligible processors, **when** ranking is applied, **then** the top-ranked one is offered the batch, `routingAttempts` increments, `offerExpiresAt` is set to now + 6 hours, and a `ROUTED` event is recorded.
- **Given** no eligible processor exists, **when** the engine runs, **then** the batch becomes `unroutable`, a `ROUTING_FAILED` event is recorded, and an Admin is notified.
- **Given** `routingAttempts` has reached 3, **when** another attempt would occur, **then** the batch becomes `unroutable` instead.

**INVEST check** — **I:** depends on US-S-03 producing batches. **N:** ranking weights live in [../impact/ALGORITHM.md](../impact/ALGORITHM.md). **V:** the innovation the entire pitch rests on. **E:** rules are fully specified; risk is in integration. **S:** at the limit — splitting eligibility from offering would leave a half that closes no loop. **T:** each eligibility predicate is independently testable.

**Notes**
This is the single most important engineering story in the project. It is scheduled early in M4 with deliberate slack.

---

#### US-S-05 — Offer TTL sweeper
> **As the** System, **I want** to expire unanswered offers after 6 hours, **so that** batches keep moving instead of stalling in one processor's queue.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Routing | M | 3 | PRC-06 | Planned |

**Acceptance criteria**
- **Given** an `offered` batch with `offerExpiresAt` in the past, **when** the sweeper runs, **then** the offer is withdrawn and the batch returns to `pending` for another attempt.
- **Given** the silent processor, **when** the offer is withdrawn, **then** they are added to `declinedByProcessorIds` so the same offer is not repeated.
- **Given** `routingAttempts` has already reached 3, **when** the offer expires, **then** the batch becomes `unroutable`.
- **Given** the processor accepts one second before expiry, **when** the sweeper runs, **then** the `accepted` batch is untouched.

**INVEST check** — **I:** one job over batches. **N:** interval negotiable, TTL fixed at 6 h. **V:** prevents silent stalls. **E:** small. **S:** one function. **T:** the boundary race is testable.

**Notes**
Silence is treated as a decline. It is the only interpretation that keeps perishable material moving.

---

#### US-S-06 — Ledger integrity check
> **As the** System, **I want** to verify ledger consistency on a schedule, **so that** impact figures cannot drift from physical reality unnoticed.

| Epic | Priority | Points | PRD ref | Status |
|---|---|---|---|---|
| Impact | C | 3 | IMP-04 | Planned |

**Acceptance criteria**
- **Given** the check runs, **when** it evaluates each item, **then** it confirms that rescued plus recovered plus residual weight never exceeds total listed weight.
- **Given** any batch, **when** it is evaluated, **then** it confirms `residualWeightGrams <= acceptedWeightGrams`.
- **Given** any item, **when** it is evaluated, **then** it confirms `remainingQuantity` is between 0 and `initialQuantity` inclusive.
- **Given** any violation, **when** found, **then** it is surfaced to the Admin health panel with the offending document id and is never auto-corrected.

**INVEST check** — **I:** read-only verification. **N:** free. **V:** protects the platform's central claim. **E:** arithmetic over existing data. **S:** one function. **T:** violations are seedable.

**Notes**
The check reports; it never repairs. Silent auto-correction would defeat the purpose of an append-only ledger.

---

## 10. Story → milestone mapping

| Milestone | Theme | Stories | Points |
|---|---|---|---|
| **M1** | Ledger + Auth | US-C-01, US-C-02, US-M-01, US-P-01, US-A-01 | 14 |
| **M2** | Merchant listing + Pricing | US-M-02, US-M-03, US-M-04, US-M-05, US-M-07, US-M-08, US-M-14, US-A-02 | 25 |
| **M3** | Consumer discovery + Payment | US-C-03, US-C-04, US-C-05, US-C-06, US-C-07, US-C-08, US-C-09, US-C-12 | 33 |
| **M4** | Pickup + Scheduler + Routing | US-C-10, US-C-11, US-M-10, US-M-11, US-M-06, US-S-01, US-S-02, US-S-03, US-S-04, US-S-05 | 41 |
| **M5** | Processor intake + outcome | US-P-02, US-P-03, US-P-04, US-P-05, US-P-06, US-P-07, US-P-08, US-M-09, US-M-13 | 31 |
| **M6** | Impact dashboards | US-C-13, US-M-12, US-P-09, US-A-05, US-S-06 | 17 |
| **M7** | Admin + polish | US-A-03, US-A-04, US-A-06, US-A-07, US-A-08, US-A-09, US-A-10, US-C-14, US-C-15, US-M-15, US-P-10 | 36 |
| **M8** | Mobile build + demo | Hardening, Capacitor Android build, seed data, demo rehearsal — no new stories | 0 |
| **Total** | | **56 stories** | **197** |

Milestone assignment follows dependency order, not priority order. US-A-02 sits in M2 despite being an Admin story because merchant listing is blocked without it. US-M-06 sits in M4 rather than M2 because it needs the scheduler infrastructure that M4 introduces.

---

## 11. Points per epic

| Epic | Stories | Points | Share |
|---|---|---|---|
| Identity | 5 | 13 | 6.6% |
| Verification | 3 | 7 | 3.6% |
| Listing | 4 | 14 | 7.1% |
| Pricing | 4 | 13 | 6.6% |
| Discovery | 6 | 22 | 11.2% |
| Transaction | 4 | 19 | 9.6% |
| Fulfilment | 6 | 20 | 10.2% |
| Routing | 5 | 24 | 12.2% |
| Recovery | 6 | 22 | 11.2% |
| Impact | 5 | 17 | 8.6% |
| Governance | 5 | 19 | 9.6% |
| Platform | 3 | 7 | 3.6% |
| **Total** | **56** | **197** | **100%** |

**Reading the distribution.** Routing plus Recovery is 46 points, 23.4% of the total — the largest combined investment, which is correct because **Material Flow Orchestration** is the differentiator. Discovery, Transaction, and Fulfilment together account for 61 points, 31.0%, covering the marketplace half. Identity, Verification, and Platform total 27 points, 13.7%, which is appropriately lean for supporting infrastructure. If the Routing share ever drops below 20% during replanning, the project has quietly turned into an ordinary discount-food marketplace and the differentiator is gone.

---

## 12. Velocity sanity check

**Constraints**

| Parameter | Value |
|---|---|
| Team size | 2–3 developers |
| Deadline | 31 August 2026, fixed and non-negotiable |
| Planning date | 8 August 2026 |
| Calendar remaining | 23 days |
| Code freeze | 29 August — 21 days of build time |
| Effective working days | 18 (allowing 3 for illness/hardware/life) |
| Total committed points | 197 |
| Required velocity | ~11 points per day |

**Is 11 points per day realistic?**

At the scale's indicative band, one point is roughly 1.5–2 hours of focused work for this team. Eleven points per day is therefore 16–22 person-hours daily.

| Scenario | Daily capacity | Points/day | Days needed | Verdict |
|---|---|---|---|---|
| 2 developers, 7 focused h/day | 14 h | ~8 | 25 | Not implemented **Misses the deadline by 2 days before any blocker.** Descoping is mandatory, not contingent |
| 3 developers, 7 focused h/day | 21 h | ~12 | 17 | Fits with 1 day of slack. Any external blocker consumes it |
| 2 developers, 9 h/day sustained | 18 h | ~10 | 20 | Fits only if sustained for 18 straight days. Not a plan, a hope |

**Verdict:** the committed 197 points do **not** fit a 2-developer team in the remaining time. With three developers it fits with roughly one day of slack.

**This changes the descoping ladder from contingency to schedule.** Do not wait for velocity data to start cutting. A 2-developer team should apply cuts 1–4 (13 points, taking the commitment to 184) at the outset and treat cuts 5–7 as the actual contingency reserve. The plan that assumes everything ships is the plan that ships nothing on time.

The immovable floor beneath every cut: the ledger (M1), Circular Routing (M4), and ledger-derived dashboards (M6). Those three are the Originality and Impact Projection marks — 35% of the preliminary score. Everything else is negotiable.

**Descoping ladder — cut in this order if velocity falls behind**

| Order | Cut | Points recovered | Cumulative | Consequence |
|---|---|---|---|---|
| 1 | US-C-15 rating (C) | 2 | 2 | Trust signal lost; nothing else breaks |
| 2 | US-A-10 health panel (C) | 3 | 5 | Integrity check runs but has no UI |
| 3 | US-S-06 integrity check (C) | 3 | 8 | No automated consistency verification |
| 4 | US-A-06 dispute resolution (S) | 5 | 13 | Disputes recorded but resolved manually |
| 5 | US-C-06 advanced filters (S) | 3 | 16 | Dietary filtering remains; distance/price cut |
| 6 | US-M-06 + US-S-01 auto markdown (S) | 6 | 22 | Merchants set price once; suggestion still shown |
| 7 | US-A-08 user management (S) | 3 | 25 | Suspension handled directly in the Convex dashboard |

Cutting the full ladder recovers 25 points, bringing the total to 172 and the two-developer timeline to roughly 22 days — inside the deadline with a small margin.

**What must never be cut.** The Material Flow Ledger, the Circular Routing engine, processor intake and outcome logging, and the payment hold sweeper. Remove any one of these and Cirquo stops being a circular food recovery platform and becomes a discount food listing app. Every other line item is negotiable; these four are the product.

**Risk flags carried into planning**

| Risk | Story | Mitigation |
|---|---|---|
| Midtrans Sandbox callback behaviour is external and undebuggable from our code | US-C-09 | Start in M3 day 1; build an internal manual-settle path so the demo never depends on a live callback |
| Capacitor session persistence differs from browser behaviour | US-C-02 | Test on a physical Android device in M1, not in M8 |
| Routing engine complexity is the largest single story | US-S-04 | Implement eligibility predicates as pure, individually unit-tested functions before wiring the cron |
| Mapbox permission handling on Android | US-C-03 | Build the Semarang city-centre fallback first so the screen is never blocked by a permission denial |

---

## 13. Related Documents

| Document | Relationship |
|---|---|
| [../product/PRD.md](../product/PRD.md) | Source of every PRD identifier referenced above |
| [FEATURES.md](FEATURES.md) | Feature-level breakdown these stories implement |
| [USER_FLOW.md](USER_FLOW.md) | End-to-end journeys these stories compose into |
| [ROLES.md](ROLES.md) | Permission rules enforced by the acceptance criteria |
| [../domain/STATE_MACHINE.md](../domain/STATE_MACHINE.md) | Authoritative status transitions referenced throughout |
| [../impact/ALGORITHM.md](../impact/ALGORITHM.md) | Dynamic Rescue Pricing and routing ranking formulas |
| [../impact/MATERIAL_LEDGER.md](../impact/MATERIAL_LEDGER.md) | Ledger event semantics and methodology versioning |
| [../security/PERMISSIONS.md](../security/PERMISSIONS.md) | Server-side guards backing every rejection criterion |
| [../business/ROADMAP.md](../business/ROADMAP.md) | Milestone definitions M1–M8 used in the mapping table |
| [../api/API_CONSUMER.md](../api/API_CONSUMER.md) | Query and mutation contracts for Consumer stories |
| [../api/API_MERCHANT.md](../api/API_MERCHANT.md) | Query and mutation contracts for Merchant stories |
| [../api/API_PROCESSOR.md](../api/API_PROCESSOR.md) | Query and mutation contracts for Processor stories |
| [../api/API_ADMIN.md](../api/API_ADMIN.md) | Query and mutation contracts for Admin stories |
| [../architecture/SCHEDULER.md](../architecture/SCHEDULER.md) | Cron definitions implementing the US-S-* stories |

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
