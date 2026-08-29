# Cirquo Documentation

**Cirquo** is a Circular Food Recovery Platform that connects food businesses, consumers, and organic processors into a single circular ecosystem. The primary objective is reducing food waste while maximizing resource recovery.

**Competition:** DSDC ANFORCOM 2026  
**Status:** MVP in development — source snapshot verified 2026-08-29
**Last updated:** 2026-08-29

---

## Quick Navigation

### Start Here

- **[AGENTS.md](project/AGENTS.md)** — AI agent guide for developing this project
- **[IMPLEMENTATION_STATUS.md](project/IMPLEMENTATION_STATUS.md)** — source-backed M1–M8 status and M4 handoff
- **[PRD.md](product/PRD.md)** — Product Requirements Document (source of truth)
- **[README.md](../README.md)** — Repository root README

---

## Documentation Structure

### 📦 Product

Defines what Cirquo is and why it exists.

- [PRODUCT.md](product/PRODUCT.md) — Problem, solution, value proposition, positioning
- [VISION.md](product/VISION.md) — Long-term vision and mission
- [PRD.md](product/PRD.md) — Complete Product Requirements Document

### 💼 Business

Business model, strategy, and risk management.

- [BUSINESS.md](business/BUSINESS.md) — Business model, revenue streams, growth strategy
- [ROADMAP.md](business/ROADMAP.md) — Competition MVP, post-competition roadmap
- [RISKS.md](business/RISKS.md) — Technical, business, operational risks + mitigation

### 📋 Specification

Detailed feature definitions and user journeys.

- [FEATURES.md](spec/FEATURES.md) — Feature breakdown with acceptance criteria
- [USER_STORIES.md](spec/USER_STORIES.md) — INVEST-format user stories per role
- [USER_FLOW.md](spec/USER_FLOW.md) — Complete user journey with Mermaid diagrams
- [ROLES.md](spec/ROLES.md) — RBAC, permissions, capabilities per role

### 🗄️ Domain & Data

Domain model, state machines, and database design.

- [DOMAIN.md](domain/DOMAIN.md) — Core domain concepts and terminology
- [STATE_MACHINE.md](domain/STATE_MACHINE.md) — Status transitions for Rescue Items, Orders, Recovery Batches
- [DATA_MODEL.md](domain/DATA_MODEL.md) — Entity relationships and data flow
- [DATABASE.md](domain/DATABASE.md) — Convex schema + future PostgreSQL migration

### 🔌 API

Backend function contracts per role.

- [API.md](api/API.md) — API overview, conventions, error handling
- [API_AUTH.md](api/API_AUTH.md) — Authentication endpoints
- [API_CONSUMER.md](api/API_CONSUMER.md) — Consumer-facing queries/mutations
- [API_MERCHANT.md](api/API_MERCHANT.md) — Merchant-facing queries/mutations
- [API_PROCESSOR.md](api/API_PROCESSOR.md) — Processor-facing queries/mutations
- [API_ADMIN.md](api/API_ADMIN.md) — Admin-facing queries/mutations
- [API_IMPACT.md](api/API_IMPACT.md) — M6-01 impact query and reconciliation contract

### 🏗️ Architecture

System design, frontend/backend structure, external integrations.

- [ARCHITECTURE.md](architecture/ARCHITECTURE.md) — Complete system architecture
- [FRONTEND.md](architecture/FRONTEND.md) — React + Vite + Capacitor structure
- [BACKEND.md](architecture/BACKEND.md) — Convex functions, data layer, business logic
- [REALTIME.md](architecture/REALTIME.md) — Realtime subscriptions and reactive dashboards
- [SCHEDULER.md](architecture/SCHEDULER.md) — Scheduled jobs (pricing updates, routing, expiry)

### 📊 Impact & Algorithms

Material flow tracking and circular economy metrics.

- [ALGORITHM.md](impact/ALGORITHM.md) — Dynamic Rescue Pricing, Circular Routing, Ranking, Impact Calculation
- [IMPACT.md](impact/IMPACT.md) — CO2e estimation methodology, assumptions, limitations
- [MATERIAL_LEDGER.md](impact/MATERIAL_LEDGER.md) — Append-only event ledger design

### 🔒 Security

Authentication, authorization, threat model.

- [SECURITY.md](security/SECURITY.md) — Threat model, OWASP, GDPR, Indonesian regulations
- [AUTH.md](security/AUTH.md) — Session-based authentication design
- [PERMISSIONS.md](security/PERMISSIONS.md) — Server-side RBAC enforcement

### 🎨 Design

UI/UX principles, design system, Figma workflow.

- [DESIGN.md](design/DESIGN.md) — Design principles, accessibility, responsive behavior
- [UI_GUIDE.md](design/UI_GUIDE.md) — Color palette, typography, spacing, components
- [COMPONENTS.md](design/COMPONENTS.md) — shadcn/ui usage and custom component catalog
- [FIGMA.md](design/FIGMA.md) — Figma page structure, frames, components, tokens

### 🛠️ Engineering

Development workflow, testing, deployment.

- [STYLE_GUIDE.md](engineering/STYLE_GUIDE.md) — Code style, naming conventions, commit messages
- [DEVELOPMENT.md](engineering/DEVELOPMENT.md) — Local setup, env vars, running the app
- [TESTING.md](engineering/TESTING.md) — Testing strategy (unit, integration, E2E, UAT)
- [DEPLOYMENT.md](engineering/DEPLOYMENT.md) — Hosting, CI/CD, monitoring

### 📁 Project

Version history, contribution workflow.

- [AGENTS.md](project/AGENTS.md) — AI agent guide for working on this project
- [IMPLEMENTATION_STATUS.md](project/IMPLEMENTATION_STATUS.md) — verified source snapshot and planned milestone boundaries
- [CHANGELOG.md](project/CHANGELOG.md) — Semantic versioning + release notes
- [CONTRIBUTING.md](project/CONTRIBUTING.md) — Branch strategy, PR checklist, development workflow

---

## Key Terminology

| Term | Meaning |
|---|---|
| **Rescue Item** | A unit of surplus food listed by a Merchant, available for a Consumer to reserve or eligible to be routed to a Processor |
| **Rescue** | A completed transaction where a Consumer reserves and picks up a Rescue Item |
| **Routing** / **Circular Routing** | The act of directing an unclaimed/unsellable Rescue Item to an Organic Processor instead of general waste |
| **Material Flow Ledger** | The append-only log of every lifecycle event of every Rescue Item, used to compute impact metrics and provide auditability |
| **Dynamic Rescue Pricing** | The algorithm that suggests/adjusts a Rescue Item's discounted price based on time-to-expiry and other risk factors |
| **Impact Tracking** | The set of computed, displayed metrics (kg rescued, kg diverted, CO2e avoided) derived from the Material Flow Ledger |

---

## For Developers

**Current implementation status (2026-08-29):** source includes M1–M5 and
M6-01: authentication, Rescue Item lifecycle, discovery/reservation/payment
holds, pickup/recovery/routing, Processor outcome, serta agregasi impact murni
dan scoped. Midtrans, browser, dan mobile end-to-end UAT tetap diperlukan;
rendering dashboard M6-02/M6-03 serta M7 Admin operations masih target work.
See [IMPLEMENTATION_STATUS.md](project/IMPLEMENTATION_STATUS.md) before
representing a feature as complete.

**Next priorities:**
1. Jalankan UAT deployment untuk M3–M5
2. Replace remaining dashboard placeholders with ledger-derived impact
3. Complete Admin operations and notifications
4. Verify end-to-end web and Android UAT

**For judges/stakeholders:** Start with [PRODUCT.md](product/PRODUCT.md) → [PRD.md](product/PRD.md) → [IMPACT.md](impact/IMPACT.md) → [ARCHITECTURE.md](architecture/ARCHITECTURE.md).

---

## Document Quality Standards

Every document in this system:
- Is self-contained and can be read independently
- Cross-references related documents explicitly
- Uses consistent terminology (always "Rescue Item," "Material Flow Ledger," "Circular Routing," "Cirquo")
- Distinguishes clearly between **implemented** ✅, **in progress** 🚧, and **planned** 📋 features
- Assumes a real startup context with real technical decisions and trade-offs
- Uses Mermaid diagrams for flows and architecture where appropriate

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
