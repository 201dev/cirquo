# Cirquo Frontend Design Snapshot

This file records the visual world implemented on `feat/frontend-mvp`. Product rules remain in `docs/`; `src/index.css` remains the token source of truth.

## Direction

Cirquo should feel like a useful neighbourhood food marketplace whose operational backbone is visible. Consumer screens are warm, photographic, and pickup-first. Merchant, Organic Processor, and Admin screens reuse the same vocabulary with denser tables, queues, and forms.

The UI takes functional cues from GoFood's quick Indonesian food discovery and Surplus Indonesia's rescue context without copying their branding, layouts, or assets.

Design dials: variance 5/10, motion 3/10, density 6/10. Light is the first-run theme for outdoor/mobile legibility; dark mode remains fully supported.

## Visual System

- Geist Variable is the only type family. Display text uses tight tracking no lower than `-0.04em`.
- Forest green is the brand/action colour. Neutral surfaces carry a subtle green cast.
- Semantic material outcomes are fixed: green = Rescued, yellow-green = Recovered, brown = Residual, blue = in progress.
- Cards use one depth signal: either a border or a soft offset shadow. Radii stay between 12 and 16 pixels.
- Consumer content uses real food photography. Operator surfaces avoid decorative photography.
- The signature visual is `ImpactBreakdown`, which always exposes Residual and material still in progress.

## Interaction Rules

- Minimum interactive target is 44 by 44 pixels.
- Consumer mobile navigation stays fixed at the bottom; operator navigation becomes a drawer below `lg`.
- Pickup window and distance stay visible without opening a secondary panel; price remains the primary marketplace datum.
- Primary mobile detail actions remain thumb-reachable in a sticky action bar.
- Controls include focus-visible states, labels, disabled states, useful empty states, and reduced-motion handling.
- All actions that cannot persist yet explicitly say they are demonstration interactions.

## Generated Image Assets

The four WebP assets in `src/assets/` were generated specifically for Cirquo and compressed locally:

- `cirquo-hero.webp`: wide documentary-style Indonesian bakery scene, merchant arranging good surplus food, clear copy space on the left, natural daylight, no text or logos.
- `rescue-bakery.webp`: overhead editorial photograph of a bakery rescue box with bread and pastries, natural warm light, no branding.
- `rescue-meal.webp`: appetising Indonesian rice-and-side-dish rescue meal, clean editorial food photography, no branding.
- `rescue-produce.webp`: fresh imperfect vegetables and fruit arranged as a rescue box, natural market photography, no branding.

## Honesty Boundary

The current screens are a frontend demo. Mapbox, Midtrans, authentication, Convex mutations, and Material Flow Ledger writes are not represented as working integrations. Impact and queue values are visibly described as demonstration data where they could otherwise be mistaken for production facts.

## Route Inventory

The branch provides frontend-demo breadth across auth/onboarding, Consumer, Merchant, Organic Processor, and Admin surfaces. It covers 31 route patterns including the wildcard state. This means the intended navigation and interface states can be reviewed end to end; it does not mean persistence or backend feature milestones are complete.

- Auth/onboarding: 8 patterns
- Consumer: 7 patterns
- Merchant: 6 patterns
- Organic Processor: 4 patterns
- Admin: 5 patterns
- Not found: 1 wildcard
