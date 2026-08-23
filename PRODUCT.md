# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Consumers in Semarang who want affordable, still-edible surplus food and collect it directly from a nearby merchant.
- Food merchants who need a fast way to list surplus, recover revenue, and account for its next use.
- Organic Processors who receive routed material, record measured intake, and log processing outcomes.
- Administrators who verify businesses, moderate activity, and audit material-flow integrity.

## Product Purpose

Cirquo is a Circular Food Recovery Platform. It prioritises human consumption, routes unclaimed or processing-only material to an Organic Processor, and accounts for every kilogram as Rescued, Recovered, Residual, or still in progress.

## Positioning

The marketplace is the entry point. The differentiating mechanism is Material Flow Orchestration backed by an append-only Material Flow Ledger, so impact is derived from recorded physical outcomes rather than manually entered totals.

## Operating Context

Consumers browse nearby Rescue Items, reserve and pay, then collect in person using a pickup code. Merchants create Rescue Items and confirm collection. Unclaimed or processing-only material enters Circular Routing. Organic Processors log intake and outcomes. Admins verify participants and inspect the ledger.

The initial market is Indonesia, with Bahasa Indonesia UI, IDR currency, WIB rendering, mid-range Android devices, and mobile 4G as primary constraints.

## Capabilities and Constraints

- No delivery flow. Consumer pickup is the fulfilment model.
- Weight is stored as integer grams, money as integer IDR, and time as epoch milliseconds UTC.
- Every state-changing backend mutation must write its ledger event in the same Convex transaction.
- Authorization is enforced server-side. Frontend role guards are only a usability layer.
- Impact figures must come from the Material Flow Ledger.
- Dynamic Rescue Pricing is transparent and rule-based, and must respect the merchant floor price.
- The current frontend build uses clearly identified demonstration data until Convex mutations and authentication are connected.
- Never claim zero waste, 100 percent circularity, carbon offsets, or allergy safety.

## Brand Commitments

- Product name: Cirquo.
- Voice: direct, useful, optimistic, and honest about estimates and residual material.
- Primary visual identity: cool circular-economy green with clear semantic outcome colours.
- Product UI references confirmed by the user: GoFood for familiar Indonesian food discovery patterns and Surplus Indonesia for food-rescue context. Cirquo must remain visually distinct and must not copy their branding or assets.
- shadcn/ui and Tailwind CSS v4 are the implementation foundation.

## Evidence on Hand

- Product requirements and terminology: `docs/product/PRD.md` and `docs/domain/DOMAIN.md`.
- Ledger constraints: `docs/impact/MATERIAL_LEDGER.md`.
- Information architecture and interaction guidance: `docs/design/DESIGN.md`, `docs/design/UI_GUIDE.md`, and `docs/spec/USER_FLOW.md`.
- Current implementation is a Phase 0 scaffold with demonstration data. There are no real testimonials, production impact totals, or completed payment and routing integrations available to present as fact.

## Product Principles

1. Rescue edible food first, process it second.
2. Make the next useful action obvious on a phone.
3. Show physical outcomes honestly, including residual material.
4. Keep operational screens familiar, fast, and auditable.
5. Do not let visual polish imply backend functionality that is not yet connected.

## Accessibility & Inclusion

Design against WCAG 2.1 AA criteria with visible focus, keyboard access, semantic headings, non-colour status labels, at least 44 by 44 pixel touch targets, reduced-motion support, and readable Indonesian copy. Formal assistive-technology validation remains pending.
