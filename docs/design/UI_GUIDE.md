# Cirquo UI Guide

| Field | Value |
| --- | --- |
| **Document type** | Design system reference |
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-06 |
| **Owner** | Design & Frontend |
| **Source of truth** | `src/index.css` |
| **Framework** | Tailwind CSS v4 (CSS-first) + shadcn/ui new-york + base-ui/radix |

---

## 1. How Styling Works Here

### 1.1 Tailwind v4 Is CSS-First

**There is no `tailwind.config.js` and there will not be one.** Tailwind v4 is configured entirely inside `src/index.css` via the `@tailwindcss/vite` plugin.

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";
@custom-variant dark (&:is(.dark *));

:root { /* raw token definitions */ }
.dark  { /* dark overrides */ }

@theme inline {
  /* maps CSS custom properties into Tailwind's utility namespace */
}
```

| Concept | Tailwind v3 (old) | Tailwind v4 (here) |
| --- | --- | --- |
| Config location | `tailwind.config.js` | `src/index.css` |
| Adding a colour | `theme.extend.colors` | `--color-x` inside `@theme inline` |
| Content scanning | `content: [...]` glob | Automatic |
| Plugin registration | `plugins: []` | `@plugin "..."` |
| Custom variant | `plugin(({addVariant}) => …)` | `@custom-variant dark (&:is(.dark *))` |
| Colour space | hex/hsl | **OKLCH** |

### 1.2 Why `@theme inline`

`@theme inline` maps a CSS custom property to a Tailwind utility **by reference**, not by value. Writing:

```css
@theme inline {
  --color-primary: var(--primary);
}
```

means `bg-primary` compiles to `background-color: var(--primary)`. The `.dark` class can then reassign `--primary` and every `bg-primary` in the app follows automatically — no dark-mode variant needed per utility. Without `inline`, Tailwind would bake the light value into the utility and dark mode would break.

**This is the mechanism that makes the whole token system work.** Do not add colours outside `@theme inline`.

### 1.3 The Semantic Token Rule

> **Components consume semantic tokens. Components never consume raw palette utilities.**

| Implemented Correct | Not implemented Incorrect | Why |
| --- | --- | --- |
| `bg-primary text-primary-foreground` | `bg-emerald-700 text-white` | Emerald is not themeable and breaks in dark mode |
| `text-muted-foreground` | `text-neutral-500` | Muted foreground is contrast-tuned per theme |
| `border-border` | `border-neutral-200` | Border token differs light/dark |
| `bg-card` | `bg-white` | White is wrong in dark mode |
| `text-destructive` | `text-red-600` | Destructive is a semantic role, not a hue |
| `bg-brand-600` (from our ramp) | `bg-emerald-600` | Ramp is ours and theme-aware |

**The one legitimate exception** is a raw ramp step used *inside a token definition* in `index.css`. Application code never reaches past the semantic layer.

**Current violation (DD-01):** `RoleShell`, `ConsumerLayout`, `SummaryCard` and `HomePage` hardcode `emerald-700`, `emerald-800` and `emerald-50`. §3 defines the ramp that replaces them.

### 1.4 The `cn()` Utility

All conditional class composition goes through `cn()` (`clsx` + `tailwind-merge`) from `@/lib/utils`. Never build class strings with template literals — `tailwind-merge` is what allows a `className` prop to override a component default.

```tsx
<div className={cn("rounded-lg border p-4", isActive && "border-primary", className)} />
```

---

## 2. The Brand Problem

`src/index.css` today defines a **fully achromatic** palette. Every single colour token is `oklch(L 0 0)` — zero chroma, zero hue. The only chromatic token is `--destructive`.

```css
--primary: oklch(0.205 0 0);        /* near-black */
--secondary: oklch(0.97 0 0);       /* near-white grey */
--accent: oklch(0.97 0 0);          /* same grey */
--chart-1: oklch(0.646 0 0);        /* greyscale */
```

Meanwhile components paint brand green by hand with Tailwind's `emerald-*`. Consequences:

1. **No dark-mode story for brand.** `bg-emerald-700` is identical in both themes; it sits at ~4.9:1 on white and only ~3.1:1 on `oklch(0.145 0 0)`.
2. **No single source of truth.** Changing the brand green means grepping four files.
3. **Charts are unreadable.** Five greyscale chart tokens cannot distinguish Rescued / Recovered / Residual / In-progress.
4. **PWA drift.** `manifest.webmanifest` hardcodes `#047857` with nothing linking it to the CSS.
5. **Semantics are unexpressible.** There is no token for "Recovered" or "Residual" at all.

§3 fixes all five.

---

## 3. Proposed Brand Ramp (OKLCH)

### 3.1 Hue Selection

Hue **162°** in OKLCH — a green with a slight cyan lean. Chosen because:

- It sits close to `emerald-700` (`#047857` ≈ `oklch(0.517 0.115 162.5)`), so the visual identity is continuous with what is already built and with the PWA `theme_color`.
- Cool greens read as ecological without the yellow-green cast that photographs of food clash with.
- It leaves clean separation for the Recovered accent at hue 195 (cyan-teal) and Residual at hue 75 (amber) — three semantics distinguishable by hue alone at 33° and 87° separation.
- OKLCH keeps perceptual lightness constant across the ramp, so `--brand-600` on white and `--brand-600` on `--brand-50` behave predictably.

### 3.2 The Ramp

Chroma peaks in the mid-range (500–600) and tapers at both ends — the standard perceptual shape, since near-white and near-black cannot carry high chroma without looking dirty.

| Step | OKLCH | L | C | H | Approx hex | Intended use |
| --- | --- | --- | --- | --- | --- | --- |
| `--brand-50` | `oklch(0.974 0.017 162)` | 0.974 | 0.017 | 162 | `#eefbf5` | Subtlest tint: icon chips, hover on light |
| `--brand-100` | `oklch(0.946 0.036 162)` | 0.946 | 0.036 | 162 | `#d6f5e7` | Selected row, soft badge background |
| `--brand-200` | `oklch(0.898 0.068 162)` | 0.898 | 0.068 | 162 | `#aeead1` | Badge background, dark-theme text |
| `--brand-300` | `oklch(0.834 0.098 162)` | 0.834 | 0.098 | 162 | `#7fdcb5` | Dark-theme primary foreground accents |
| `--brand-400` | `oklch(0.754 0.122 162)` | 0.754 | 0.122 | 162 | `#4fc998` | **Dark-theme primary** |
| `--brand-500` | `oklch(0.668 0.134 162)` | 0.668 | 0.134 | 162 | `#1fb37c` | Chart fill, map marker |
| `--brand-600` | `oklch(0.588 0.128 162)` | 0.588 | 0.128 | 162 | `#0d9668` | Hover state of primary (light) |
| `--brand-700` | `oklch(0.517 0.115 162)` | 0.517 | 0.115 | 162 | `#047857` | **Light-theme primary** (matches emerald-700) |
| `--brand-800` | `oklch(0.448 0.096 162)` | 0.448 | 0.096 | 162 | `#065f46` | Active/pressed state (light) |
| `--brand-900` | `oklch(0.390 0.079 162)` | 0.390 | 0.079 | 162 | `#064e3b` | Dense text on brand tints |
| `--brand-950` | `oklch(0.272 0.055 162)` | 0.272 | 0.055 | 162 | `#022c22` | Dark-theme brand surface |

**Contrast checkpoints** (design targets; formal measurement is Planned pending):

| Pair | Ratio target | Use |
| --- | --- | --- |
| `--brand-700` on `oklch(1 0 0)` | ≥ 4.5:1 | Link text, brand text on white |
| `oklch(0.985 0 0)` on `--brand-700` | ≥ 4.5:1 | Primary button label |
| `--brand-400` on `oklch(0.145 0 0)` | ≥ 4.5:1 | Dark-theme primary text |
| `oklch(0.145 0 0)` on `--brand-400` | ≥ 4.5:1 | Dark-theme primary button label |
| `--brand-900` on `--brand-50` | ≥ 7:1 | Text inside brand-tinted chips |

### 3.3 Semantic Accent Ramps

Three additional ramps, defined only at the steps we actually use.

**Recovered** — teal-cyan, hue 195. Visually adjacent to brand (they are both "good outcomes") but clearly distinct in a stacked bar.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--recovered-100` | `oklch(0.940 0.038 195)` | `oklch(0.300 0.050 195)` | Badge background (both themes) |
| `--recovered-500` | `oklch(0.660 0.108 195)` | `oklch(0.720 0.098 195)` | Chart/bar segment |
| `--recovered-700` | `oklch(0.520 0.092 195)` | `oklch(0.640 0.090 195)` | Badge text (light) / bar (dark) |
| `--recovered-900` | `oklch(0.380 0.062 195)` | `oklch(0.300 0.050 195)` | Text on tint |

**Residual** — amber, hue 75. **Deliberately not red.** Residual is the honestly reported remainder of a real physical process, not a failure or an error. Colouring it red would (a) contradict Measured Honesty by framing truthful reporting as a fault, and (b) collide with `--destructive`, which means "this action destroys data." Full argument in `DESIGN.md` §2.1 and `UI_GUIDE.md` §5.4.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--residual-100` | `oklch(0.950 0.048 75)` | `oklch(0.320 0.060 75)` | Badge background (both themes) |
| `--residual-500` | `oklch(0.740 0.135 75)` | `oklch(0.790 0.125 75)` | Chart/bar segment |
| `--residual-700` | `oklch(0.590 0.118 75)` | `oklch(0.720 0.120 75)` | Badge text (light) / bar (dark) |
| `--residual-900` | `oklch(0.420 0.082 75)` | `oklch(0.320 0.060 75)` | Text on tint |

**In progress** — neutral slate, hue 250, low chroma. Deliberately quiet: material in flight is not yet an achievement.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--progress-100` | `oklch(0.955 0.010 250)` | `oklch(0.300 0.028 250)` | Badge background (both themes) |
| `--progress-500` | `oklch(0.700 0.032 250)` | `oklch(0.660 0.030 250)` | Chart/bar segment |
| `--progress-700` | `oklch(0.545 0.034 250)` | `oklch(0.740 0.030 250)` | Badge text / bar (dark) |
| `--progress-900` | `oklch(0.395 0.030 250)` | `oklch(0.300 0.028 250)` | Text on tint |

### 3.4 The Change to `src/index.css`

Add the ramps to `:root`, repoint the semantic tokens, and expose everything through `@theme inline`.

```css
:root {
  /* ── Brand ramp (hue 162) ─────────────────────────────── */
  --brand-50:  oklch(0.974 0.017 162);
  --brand-100: oklch(0.946 0.036 162);
  --brand-200: oklch(0.898 0.068 162);
  --brand-300: oklch(0.834 0.098 162);
  --brand-400: oklch(0.754 0.122 162);
  --brand-500: oklch(0.668 0.134 162);
  --brand-600: oklch(0.588 0.128 162);
  --brand-700: oklch(0.517 0.115 162);
  --brand-800: oklch(0.448 0.096 162);
  --brand-900: oklch(0.390 0.079 162);
  --brand-950: oklch(0.272 0.055 162);

  /* ── Semantic reassignment ────────────────────────────── */
  --primary: var(--brand-700);
  --primary-foreground: oklch(0.985 0 0);
  --ring: var(--brand-600);
  --accent: var(--brand-50);
  --accent-foreground: var(--brand-900);

  --sidebar-primary: var(--brand-700);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: var(--brand-50);
  --sidebar-accent-foreground: var(--brand-900);
  --sidebar-ring: var(--brand-600);

  /* ── Impact outcome semantics ─────────────────────────── */
  --rescued:   var(--brand-600);
  --rescued-foreground: oklch(0.985 0 0);
  --rescued-muted: var(--brand-100);
  --rescued-muted-foreground: var(--brand-900);

  --recovered: oklch(0.660 0.108 195);
  --recovered-foreground: oklch(0.985 0 0);
  --recovered-muted: oklch(0.940 0.038 195);
  --recovered-muted-foreground: oklch(0.380 0.062 195);

  --residual:  oklch(0.740 0.135 75);
  --residual-foreground: oklch(0.205 0 0);
  --residual-muted: oklch(0.950 0.048 75);
  --residual-muted-foreground: oklch(0.420 0.082 75);

  --in-progress: oklch(0.700 0.032 250);
  --in-progress-foreground: oklch(0.205 0 0);
  --in-progress-muted: oklch(0.955 0.010 250);
  --in-progress-muted-foreground: oklch(0.395 0.030 250);

  /* ── Charts, remapped to impact semantics ─────────────── */
  --chart-1: var(--rescued);
  --chart-2: var(--recovered);
  --chart-3: var(--residual);
  --chart-4: var(--in-progress);
  --chart-5: var(--brand-300);
}

.dark {
  --primary: var(--brand-400);
  --primary-foreground: oklch(0.145 0 0);
  --ring: var(--brand-500);
  --accent: var(--brand-950);
  --accent-foreground: var(--brand-200);

  --sidebar-primary: var(--brand-400);
  --sidebar-primary-foreground: oklch(0.145 0 0);
  --sidebar-accent: var(--brand-950);
  --sidebar-accent-foreground: var(--brand-200);
  --sidebar-ring: var(--brand-500);

  --rescued: var(--brand-400);
  --rescued-foreground: oklch(0.145 0 0);
  --rescued-muted: var(--brand-950);
  --rescued-muted-foreground: var(--brand-200);

  --recovered: oklch(0.720 0.098 195);
  --recovered-foreground: oklch(0.145 0 0);
  --recovered-muted: oklch(0.300 0.050 195);
  --recovered-muted-foreground: oklch(0.880 0.055 195);

  --residual: oklch(0.790 0.125 75);
  --residual-foreground: oklch(0.145 0 0);
  --residual-muted: oklch(0.320 0.060 75);
  --residual-muted-foreground: oklch(0.900 0.070 75);

  --in-progress: oklch(0.660 0.030 250);
  --in-progress-foreground: oklch(0.145 0 0);
  --in-progress-muted: oklch(0.300 0.028 250);
  --in-progress-muted-foreground: oklch(0.880 0.020 250);
}

@theme inline {
  --color-brand-50:  var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-200: var(--brand-200);
  --color-brand-300: var(--brand-300);
  --color-brand-400: var(--brand-400);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-700: var(--brand-700);
  --color-brand-800: var(--brand-800);
  --color-brand-900: var(--brand-900);
  --color-brand-950: var(--brand-950);

  --color-rescued: var(--rescued);
  --color-rescued-foreground: var(--rescued-foreground);
  --color-rescued-muted: var(--rescued-muted);
  --color-rescued-muted-foreground: var(--rescued-muted-foreground);

  --color-recovered: var(--recovered);
  --color-recovered-foreground: var(--recovered-foreground);
  --color-recovered-muted: var(--recovered-muted);
  --color-recovered-muted-foreground: var(--recovered-muted-foreground);

  --color-residual: var(--residual);
  --color-residual-foreground: var(--residual-foreground);
  --color-residual-muted: var(--residual-muted);
  --color-residual-muted-foreground: var(--residual-muted-foreground);

  --color-in-progress: var(--in-progress);
  --color-in-progress-foreground: var(--in-progress-foreground);
  --color-in-progress-muted: var(--in-progress-muted);
  --color-in-progress-muted-foreground: var(--in-progress-muted-foreground);
}
```

### 3.5 Migration of Hardcoded Emerald

| File | Current | Replace with |
| --- | --- | --- |
| `RoleShell` | `bg-emerald-700` on the logo mark | `bg-primary` |
| `RoleShell` | `text-emerald-800` on the active nav item | `text-sidebar-accent-foreground` |
| `RoleShell` | `bg-emerald-50` on the active nav background | `bg-sidebar-accent` |
| `ConsumerLayout` | `text-emerald-700` on the logo wordmark | `text-primary` |
| `ConsumerLayout` | `text-emerald-700` on the active bottom-nav item | `text-primary` |
| `SummaryCard` | `bg-emerald-50 text-emerald-700` icon chip | `bg-accent text-accent-foreground`, overridable by a `variant` prop |
| `HomePage` | `bg-emerald-50` on the impact banner | `bg-accent` |
| `manifest.webmanifest` | `"theme_color": "#047857"` | Keep the hex (manifests cannot read CSS vars) but tie it to `--brand-700` in the build notes |

After migration, `rg 'emerald-' src/` must return zero results. This is a merge gate.

---

## 4. Semantic Token Reference

### 4.1 Core Tokens

| Token | Light | Dark | Tailwind utility | Usage |
| --- | --- | --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | `bg-background` | Page canvas. Never on a card. |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `text-foreground` | Default body text, headings |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | `bg-card` | Card, table, panel surfaces |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `text-card-foreground` | Text on cards |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | `bg-popover` | Dropdown, select, tooltip surfaces |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `text-popover-foreground` | Text in popovers |
| `--primary` | `var(--brand-700)` | `var(--brand-400)` | `bg-primary` | Primary buttons, active nav, brand marks |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | `text-primary-foreground` | Text on primary |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-secondary` | Secondary buttons, neutral chips |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | `text-secondary-foreground` | Text on secondary |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-muted` | Skeletons, image fallbacks, inert fills |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | `text-muted-foreground` | Captions, helper text, units, timestamps |
| `--accent` | `var(--brand-50)` | `var(--brand-950)` | `bg-accent` | Brand-tinted surfaces, hover, icon chips |
| `--accent-foreground` | `var(--brand-900)` | `var(--brand-200)` | `text-accent-foreground` | Text/icons on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | `bg-destructive` | Destructive actions only |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | `border-border` | All borders and dividers |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | `border-input` | Form control borders |
| `--ring` | `var(--brand-600)` | `var(--brand-500)` | `ring-ring` | Focus ring |

**Destructive discipline.** `--destructive` means "this action removes or invalidates data": cancel an order, delete a listing, reject a verification. It does **not** mean "bad number", "expired", or "residual". Misusing it collapses the user's ability to recognise genuinely dangerous actions.

### 4.2 Impact Outcome Tokens

| Token | Light | Dark | Utility | Meaning |
| --- | --- | --- | --- | --- |
| `--rescued` | `var(--brand-600)` | `var(--brand-400)` | `bg-rescued` | Collected by a consumer |
| `--recovered` | `oklch(0.660 0.108 195)` | `oklch(0.720 0.098 195)` | `bg-recovered` | Processed by an Organic Processor |
| `--residual` | `oklch(0.740 0.135 75)` | `oklch(0.790 0.125 75)` | `bg-residual` | Honest remainder |
| `--in-progress` | `oklch(0.700 0.032 250)` | `oklch(0.660 0.030 250)` | `bg-in-progress` | Listed/reserved/routed, unresolved |

Each has `-foreground`, `-muted` and `-muted-foreground` companions. Use the solid token for bar segments and chart fills; use the `-muted` pair for badge backgrounds.

**Never invert.** Rescued is always green, Recovered always teal, Residual always amber, In progress always slate — in every chart, badge, legend and role. This consistency is what lets a judge read the `ImpactBreakdownBar` on the admin screen after seeing it once on the consumer screen.

### 4.3 Chart Tokens

| Token | Bound to | Semantic |
| --- | --- | --- |
| `--chart-1` | `var(--rescued)` | Rescued |
| `--chart-2` | `var(--recovered)` | Recovered |
| `--chart-3` | `var(--residual)` | Residual |
| `--chart-4` | `var(--in-progress)` | In progress |
| `--chart-5` | `var(--brand-300)` | Secondary brand series (e.g. prior period) |

The current greyscale chart tokens are replaced. Charts in Cirquo are almost always about material flow, so binding chart slots to flow semantics is more useful than a generic categorical palette. If a genuinely categorical chart appears later, add `--chart-6…10` rather than repurposing 1–4.

### 4.4 Sidebar Tokens

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | `RoleShell` sidebar background |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Sidebar text |
| `--sidebar-primary` | `var(--brand-700)` | `var(--brand-400)` | Logo mark, active indicator bar |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | Text on the mark |
| `--sidebar-accent` | `var(--brand-50)` | `var(--brand-950)` | Active nav item background |
| `--sidebar-accent-foreground` | `var(--brand-900)` | `var(--brand-200)` | Active nav item text |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Sidebar right edge |
| `--sidebar-ring` | `var(--brand-600)` | `var(--brand-500)` | Focus in sidebar |

The sidebar sits at `oklch(0.985 0 0)` in light — very slightly off-white against a pure-white page — giving separation without a heavy shadow.

---

## 5. Status Colour Mapping

Every status renders as a `StatusBadge` with **both** a colour and a Bahasa Indonesia label. Colour is never the sole carrier of meaning.

### 5.1 Rescue Item Status (10 values)

| Status | Badge variant | Background token | Text token | Label (ID) | Meaning |
| --- | --- | --- | --- | --- | --- |
| `draft` | `outline` | transparent + `border-border` | `text-muted-foreground` | `Draf` | Created, not published |
| `active` | `default` | `bg-rescued-muted` | `text-rescued-muted-foreground` | `Tersedia` | Live and reservable |
| `reserved_partial` | `secondary` | `bg-in-progress-muted` | `text-in-progress-muted-foreground` | `Sebagian Dipesan` | Some quantity reserved, some left |
| `sold_out` | `secondary` | `bg-secondary` | `text-secondary-foreground` | `Habis Dipesan` | Fully reserved, awaiting pickup |
| `expired` | `outline` | `bg-muted` | `text-muted-foreground` | `Kedaluwarsa` | Pickup window closed unclaimed |
| `recovery_pending` | `secondary` | `bg-in-progress-muted` | `text-in-progress-muted-foreground` | `Menunggu Perutean` | In Circular Routing |
| `recovered` | `default` | `bg-recovered-muted` | `text-recovered-muted-foreground` | `Terolah` | Processor logged an outcome |
| `residual` | `secondary` | `bg-residual-muted` | `text-residual-muted-foreground` | `Residu` | Remainder recorded |
| `closed` | `outline` | `bg-muted` | `text-muted-foreground` | `Selesai` | Terminal; ledger sealed |
| `moderated` | `destructive` | `bg-destructive/10` | `text-destructive` | `Dimoderasi` | Removed by Admin |

**Note on `expired`:** it is *not* destructive. An expired item is the normal entry point into Circular Routing, which is the whole point of the platform. Rendering it red would teach users that the circular path is a failure path.

### 5.2 Order Status (7 values)

| Status | Badge variant | Background token | Text token | Label (ID) | Meaning |
| --- | --- | --- | --- | --- | --- |
| `reserved` | `secondary` | `bg-in-progress-muted` | `text-in-progress-muted-foreground` | `Dipesan` | Held, awaiting payment |
| `paid` | `default` | `bg-rescued-muted` | `text-rescued-muted-foreground` | `Dibayar` | Midtrans settled; pickup code issued |
| `picked_up` | `default` | `bg-rescued-muted` | `text-rescued-muted-foreground` | `Terselamatkan` | Collected — writes RESCUED to the ledger |
| `cancelled` | `outline` | `bg-muted` | `text-muted-foreground` | `Dibatalkan` | Cancelled before pickup |
| `expired` | `outline` | `bg-muted` | `text-muted-foreground` | `Kedaluwarsa` | Window passed without collection |
| `disputed` | `secondary` | `bg-residual-muted` | `text-residual-muted-foreground` | `Sengketa` | Under Admin review |
| `refunded` | `outline` | `bg-secondary` | `text-secondary-foreground` | `Dana Dikembalikan` | Refund settled |

**Note:** `picked_up` deliberately reads `Terselamatkan`, not `Diambil`. The consumer-facing word is the impact word — it connects the mundane act of collection to the mission, at the exact moment it happens.

### 5.3 Recovery Batch Status (6 values)

| Status | Badge variant | Background token | Text token | Label (ID) | Meaning |
| --- | --- | --- | --- | --- | --- |
| `pending` | `secondary` | `bg-in-progress-muted` | `text-in-progress-muted-foreground` | `Menunggu` | Created, not yet routed |
| `offered` | `secondary` | `bg-in-progress-muted` | `text-in-progress-muted-foreground` | `Ditawarkan` | Routed to a processor, awaiting response |
| `accepted` | `default` | `bg-recovered-muted` | `text-recovered-muted-foreground` | `Diterima` | Processor committed |
| `collected` | `default` | `bg-recovered-muted` | `text-recovered-muted-foreground` | `Diambil` | Intake weight logged |
| `processed` | `default` | `bg-recovered-muted` | `text-recovered-muted-foreground` | `Terolah` | Outcome logged — writes RECOVERED |
| `unroutable` | `secondary` | `bg-residual-muted` | `text-residual-muted-foreground` | `Tidak Dapat Dirutekan` | No processor matched |

`unroutable` is amber, not red: it is a real, expected operational outcome that feeds Residual. Flagging it as an error would misrepresent the model.

### 5.4 The Three Impact Outcomes

The most important colour decision in the product.

| Outcome | Token | Light | Dark | Icon | Label (ID) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| **Rescued** | `--rescued` | `oklch(0.588 0.128 162)` | `oklch(0.754 0.122 162)` | `HandHeart` | `Terselamatkan` | Brand green — the best outcome, food eaten by a person |
| **Recovered** | `--recovered` | `oklch(0.660 0.108 195)` | `oklch(0.720 0.098 195)` | `Recycle` | `Terolah` | Teal-cyan: adjacent to brand (still good) but unmistakably a different path |
| **Residual** | `--residual` | `oklch(0.740 0.135 75)` | `oklch(0.790 0.125 75)` | `Trash2` | `Residu` | Amber. **Explicitly not red.** |
| **In progress** | `--in-progress` | `oklch(0.700 0.032 250)` | `oklch(0.660 0.030 250)` | `Waypoints` | `Dalam Proses` | Low-chroma slate — unresolved material has not earned prominence |

**Why Residual is amber and not red — the full argument.**

Red in this system means `--destructive`: an action that removes or invalidates data. Residual is neither an action nor a defect. It is the honest, physically inevitable remainder of a real material process — bones, packaging contamination, spoilage past the processing threshold. Every credible circular-economy account reports a residual fraction; a system claiming zero residual is not doing better accounting, it is doing worse accounting.

Colouring residual red would produce three specific harms:

1. **It contradicts Measured Honesty.** We would be visually punishing ourselves for reporting truthfully, which creates pressure to under-report.
2. **It devalues the destructive signal.** If amber-tier information wears the red reserved for "cancel this order permanently", users stop trusting red.
3. **It misleads judges.** A red segment in the `ImpactBreakdownBar` reads as an error condition rather than an expected 5–15% of throughput.

Amber says "attention, this is the fraction we could not close" without saying "something broke." That is exactly the right register.

---

## 6. Typography

### 6.1 The Font Fix (DD-02)

`src/index.css` imports `@fontsource-variable/geist` and defines:

```css
--font-sans: 'Geist Variable', sans-serif;
--font-heading: var(--font-sans);
```

But `body` still declares an Inter-first fallback stack. Inter is never loaded, so the browser falls through to a system font — meaning **the app does not currently render in Geist**, and every spacing and line-height decision was made against metrics that are not in use.

```css
/* Not implemented current */
body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

/* Implemented fix */
body {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

`font-variant-numeric: tabular-nums` at the body level is deliberate: this product is full of aligned numeric columns (kg, IDR, percentages, countdowns) and proportional digits cause visible jitter in a per-second countdown.

**One family only.** `--font-heading` intentionally aliases `--font-sans`. Geist's variable weight axis gives sufficient hierarchy, and a second family costs a font request against the 2s FCP budget for no comprehension gain in a dense operational UI.

### 6.2 Scale

| Name | Tailwind | Size | Line height | Weight | Tracking | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| Display | `text-5xl` | 48px | 1.0 (48px) | 700 | `-0.03em` | Marketing/cover only. Never in-app. |
| H1 | `text-3xl` | 30px | 1.2 (36px) | 700 | `-0.02em` | `PageHeader` title on `lg`+ |
| H2 | `text-2xl` | 24px | 1.25 (30px) | 600 | `-0.015em` | `PageHeader` title on mobile; `SummaryCard` value |
| H3 | `text-xl` | 20px | 1.4 (28px) | 600 | `-0.01em` | Section headings, `RescueItemDetail` title |
| H4 | `text-lg` | 18px | 1.44 (26px) | 600 | `0` | Card titles, `Sheet` titles |
| Body L | `text-base` | 16px | 1.5 (24px) | 400 | `0` | `RescueItemCard` title, form inputs (prevents iOS zoom) |
| Body | `text-sm` | 14px | 1.43 (20px) | 400 | `0` | Default body, table cells, labels |
| Caption | `text-xs` | 12px | 1.33 (16px) | 400/500 | `0.01em` | Timestamps, units, helper text, badges |
| Metric XL | `text-4xl` | 36px | 1.1 (40px) | 700 | `-0.02em` | Hero impact figure (tier 1 measured only) |
| Metric L | `text-3xl` | 30px | 1.2 (36px) | 700 | `-0.02em` | `ImpactStatCard` measured value |
| Metric M | `text-2xl` | 24px | 1.25 (30px) | 600 | `-0.015em` | `SummaryCard` value, derived metrics |
| Metric S | `text-xl` | 20px | 1.4 (28px) | 600 | `-0.01em` | Estimated metrics (tier 3 ceiling) |
| Code | `text-sm font-mono` | 14px | 1.43 | 500 | `0.02em` | Ledger event IDs, methodology version |
| Pickup code | `text-4xl font-mono` | 36px | 1.1 | 700 | `0.15em` | `PickupCodeCard` — wide tracking aids character-by-character reading aloud |

**Tier ceiling enforcement:** estimated figures (CO2e) may never exceed `text-xl`. Derived figures may not exceed `text-2xl` unless no measured figure is present on the screen. See `DESIGN.md` §8.

### 6.3 Weights

Geist Variable supports the full 100–900 axis. We use four:

| Weight | Class | Use |
| --- | --- | --- |
| 400 | `font-normal` | Body text, table cells |
| 500 | `font-medium` | Labels, active nav, badges, emphasised inline values |
| 600 | `font-semibold` | Card titles, section headings, metric values |
| 700 | `font-bold` | Page titles, hero metrics, pickup codes |

No 300 (fails perceived contrast at `text-xs` on mobile in daylight) and no 800/900 (indistinguishable from 700 at our sizes while costing variable-axis interpolation).

### 6.4 Text Colour

| Class | Use |
| --- | --- |
| `text-foreground` | Primary content, all metric values |
| `text-muted-foreground` | Labels, units, timestamps, helper text, inactive nav |
| `text-primary` | Links, active nav, brand emphasis |
| `text-destructive` | Validation errors, destructive action labels |
| `text-*-muted-foreground` | Text inside a matching status/impact tint |

Never `text-black`, `text-white`, or any `text-neutral-*`.

---

## 7. Spacing

4px base rhythm. Tailwind's default scale is used unmodified; the discipline is in *which* steps we allow.

### 7.1 Allowed Steps

| Token | px | Use |
| --- | --- | --- |
| `0.5` | 2 | Icon optical nudges only |
| `1` | 4 | Badge internal padding-y, tight icon-to-text |
| `2` | 8 | Icon-to-text, chip gaps, table cell padding-x |
| `3` | 12 | Card internal gap, form field internal spacing |
| `4` | 16 | Card padding, list item gap, grid gap (mobile) |
| `6` | 24 | Section gap, form section spacing, grid gap (`md`+) |
| `8` | 32 | Major section separation |
| `12` | 48 | Page top/bottom rhythm on `lg`+ |
| `16` | 64 | Empty state vertical padding |

Steps `5`, `7`, `9`, `10`, `11`, `14` are not used. Constraining the scale is what makes layouts feel systematic without a designer reviewing every screen.

### 7.2 Contextual Defaults

| Context | Padding | Gap |
| --- | --- | --- |
| Page container (mobile) | `px-4 py-6` | — |
| Page container (`md`+) | `px-6 py-8` | — |
| Card | `p-4` | `gap-3` |
| Card (`md`+, operator) | `p-4` | `gap-2` |
| Card header / content / footer | `px-4 py-3` / `px-4 pb-4` / `px-4 pb-4` | — |
| Table cell | `px-3 py-2.5` | — |
| Form field | — | `space-y-2` |
| Form section | — | `space-y-6` |
| Button (default) | `px-4` (`h-9`) | `gap-2` |
| Button (`lg`) | `px-6` (`h-11`) | `gap-2` |
| Badge | `px-2 py-0.5` | `gap-1` |
| Sheet content | `p-4` | `gap-4` |
| Bottom nav item | `py-2` | `gap-1` (icon over label) |
| Sidebar nav item | `px-3 py-2` | `gap-3` |
| Card grid (mobile) | — | `gap-4` |
| Card grid (`md`+) | — | `gap-6` |
| `SummaryCard` grid | — | `gap-4` |

### 7.3 Fixed Dimensions

| Element | Value | Class |
| --- | --- | --- |
| Header height | 64px | `h-16` |
| Bottom nav height | 56px | `h-14` |
| Bottom nav clearance on main | 80px | `pb-20` |
| Sidebar width (`lg`+) | 256px | `w-64` |
| Consumer container | 1024px | `max-w-5xl` |
| Operator container | 1152px | `max-w-6xl` |
| Explore split list (`lg`+) | 384px | `w-96` |
| Minimum tap target | 44px | `min-h-11 min-w-11` |
| `ImpactBreakdownBar` height | 32px | `h-8` |
| Sheet max height (mobile) | 85vh | `max-h-[85vh]` |

---

## 8. Radius

`--radius: 0.625rem` (10px) is the base. Derived values use `calc()` multipliers already present in `src/index.css`.

| Token | Multiplier | Computed | Tailwind | Use |
| --- | --- | --- | --- | --- |
| `--radius-sm` | 0.6× | 6px | `rounded-sm` | Badges, small chips, checkbox |
| `--radius-md` | 0.8× | 8px | `rounded-md` | Buttons, inputs, select triggers |
| `--radius-lg` | 1.0× | 10px | `rounded-lg` | Cards, panels, table container |
| `--radius-xl` | 1.4× | 14px | `rounded-xl` | Sheets, dialogs, `PickupCodeCard` |
| `--radius-2xl` | 1.8× | 18px | `rounded-2xl` | Hero/feature surfaces, map overlay panels |
| `--radius-3xl` | 2.2× | 22px | `rounded-3xl` | Reserved — not currently used |
| `--radius-4xl` | 2.6× | 26px | `rounded-4xl` | Reserved — not currently used |

**Rules:**

- Nested radii step down one level. A `rounded-lg` card containing a full-bleed image uses `rounded-t-lg` on the image, not `rounded-t-xl`.
- `rounded-full` is allowed only for avatars, map markers, dots and pill badges.
- Never a bare pixel value. Always a token.
- Consumer surfaces lean `rounded-lg`/`rounded-xl`; operator tables lean `rounded-md`/`rounded-lg`. Slightly softer consumer geometry is one of the few levers that separates the two registers without changing hue.

---

## 9. Elevation & Borders

**The codebase prefers `shadow-none` with a `border` on nearly every surface. This is deliberate.**

| Reason | Detail |
| --- | --- |
| Dark-mode integrity | Shadows are essentially invisible on `oklch(0.145 0 0)`. A border-based system reads identically in both themes; a shadow-based one silently loses all separation in dark. |
| Contrast, not depth | `--border` at `oklch(0.922 0 0)` gives a crisp, measurable edge. A soft shadow gives an unmeasurable one that fails on low-quality Android panels in daylight. |
| Performance | Large blur radii on many simultaneously composited cards cost paint time on mid-range Android — directly against the 2s FCP and scroll-smoothness budget. |
| Density | Operator tables put many surfaces adjacent. Shadows bleed into each other and create visual mud; 1px borders stay legible at any density. |
| Honesty of hierarchy | Real elevation should mean "this floats above and traps focus". Reserving shadow for overlays makes elevation informative rather than decorative. |

### 9.1 Elevation Levels

| Level | Treatment | Used by |
| --- | --- | --- |
| 0 — flat | `bg-background`, no border | Page canvas |
| 1 — surface | `bg-card border border-border shadow-none` | Card, table container, panel, `SummaryCard` |
| 2 — raised | `bg-card border border-border shadow-sm` | Sticky header on scroll, floating map controls |
| 3 — overlay | `bg-popover border border-border shadow-md` | Dropdown, Select content, Tooltip |
| 4 — modal | `bg-background border border-border shadow-lg` + backdrop | Dialog, Sheet |

Nothing above level 4. `shadow-xl` and `shadow-2xl` are not used.

### 9.2 Border Rules

| Rule | Detail |
| --- | --- |
| One weight | 1px (`border`). No 2px borders except the focus ring. |
| One colour | `border-border` for structure, `border-input` for form controls. |
| Emphasis by tint | To emphasise a row, change the background (`bg-accent`), not the border weight. |
| Dividers | `Separator` primitive, never a manually styled `<hr>` or a `border-b` on the last child. |
| Selection | `border-primary` plus `bg-accent`. Never a thicker border — it shifts layout by 1px. |

---

## 10. Layout Containers

| Container | Width | Padding | Used by |
| --- | --- | --- | --- |
| Consumer main | `max-w-5xl` (1024px) | `px-4 md:px-6 py-6 pb-20 sm:pb-6` | `ConsumerLayout` |
| Operator main | `max-w-6xl` (1152px) | `px-4 md:px-6 py-6` | `RoleShell` via Merchant/Processor/Admin layouts |
| Header | full-bleed, inner `max-w-*` | `h-16 px-4 md:px-6` | Both |
| Sidebar | `w-64`, fixed, `lg:block hidden` | `p-4` | `RoleShell` |
| Bottom nav | full-bleed fixed | `h-14`, `sm:hidden` | `ConsumerLayout` |

**Why consumer is narrower.** `max-w-5xl` gives a 3-column card grid at `lg` with cards around 320px — wide enough for a legible 4:3 photo and a price row. `max-w-6xl` gives operator tables room for 6–7 columns before truncation. Widening the consumer container to `6xl` would either stretch cards to an awkward 380px or force a 4th column that reduces photo size below usefulness.

**Full-bleed exceptions:** the Mapbox canvas on `/explore` and the sticky bottom action bar on detail screens escape the container and span the viewport. Everything else stays inside.

---

## 11. Form Patterns

The canonical idiom is established in `CreateSurplusPage`: React Hook Form 7 + Zod 4 + `@hookform/resolvers`.

### 11.1 The Exact Idiom

```tsx
const surplusSchema = z
  .object({
    title: z.string().min(3, "Nama item minimal 3 karakter").max(80),
    category: z.enum(["bakery", "produce", "prepared", "dairy", "other"], {
      message: "Pilih kategori",
    }),
    quantity: z.coerce.number().int().min(1, "Minimal 1 porsi"),
    weightGrams: z.coerce.number().int().min(50, "Minimal 50 gram"),
    originalPriceIdr: z.coerce.number().int().min(1000, "Minimal Rp1.000"),
    currentPriceIdr: z.coerce.number().int().min(0),
    pickupStart: z.coerce.number().int(),
    pickupEnd: z.coerce.number().int(),
    dietaryTags: z.array(z.string()).default([]),
  })
  .refine((v) => v.currentPriceIdr <= v.originalPriceIdr, {
    message: "Harga penyelamatan tidak boleh melebihi harga asli",
    path: ["currentPriceIdr"],
  })
  .refine((v) => v.pickupEnd > v.pickupStart, {
    message: "Waktu selesai harus setelah waktu mulai",
    path: ["pickupEnd"],
  });

type SurplusFormValues = z.infer<typeof surplusSchema>;

const form = useForm<SurplusFormValues>({
  resolver: zodResolver(surplusSchema),
  defaultValues: { quantity: 1, dietaryTags: [] },
  mode: "onBlur",
});
```

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
    <FormField
      control={form.control}
      name="weightGrams"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Berat total (gram)</FormLabel>
          <FormControl>
            <Input type="number" inputMode="numeric" min={50} step={10} {...field} />
          </FormControl>
          <FormDescription>
            Disimpan dalam gram, ditampilkan dalam kg.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
      Publikasikan
    </Button>
  </form>
</Form>
```

### 11.2 Non-Negotiable Rules

| Rule | Why |
| --- | --- |
| `noValidate` on every `<form>` | Native browser validation bubbles are unstyleable, English-only, and duplicate Zod messages |
| `z.coerce.number()` for numeric inputs | HTML inputs yield strings; without coercion every numeric rule fails silently |
| Cross-field rules via `.refine()` with an explicit `path` | Without `path`, the error attaches to the form root and no field is highlighted |
| One `FormField` per input | `FormItem`/`FormLabel`/`FormControl`/`FormMessage` generate the `id`/`aria-describedby`/`aria-invalid` wiring |
| `FormMessage` always present | Even when currently empty — otherwise error text causes a layout shift when it appears |
| `mode: "onBlur"` | Validating on every keystroke punishes users mid-typing; on-submit-only hides errors too long |
| `inputMode` set correctly | `numeric` for weights/prices, `tel` for phone, `email` for email — changes the Android keyboard |
| `text-base` (16px) on inputs | Prevents iOS Safari auto-zoom on focus |
| Submit disabled only while submitting | Never disabled for invalid state — that hides *why* it cannot be submitted |
| Errors never clear input | A failed mutation preserves all values |
| All messages in Bahasa Indonesia | Zod defaults are English; every rule carries an explicit message |

### 11.3 Field Types

| Data | Control | Notes |
| --- | --- | --- |
| Short text | `Input` | `maxLength` mirrored in Zod |
| Long text | `Textarea` | `rows={3}`, auto-grow not used |
| Enum, ≤ 4 options | Segmented `Button` group | Faster than a select on mobile |
| Enum, 5+ options | `Select` | Native-feeling on Android |
| Weight (grams) | `Input type="number" inputMode="numeric" step={10}` | Suffix "gram" in `FormDescription` |
| Money (IDR) | `Input type="number" inputMode="numeric" step={500}` | `Rp` prefix as an adornment |
| Quantity | `QuantityStepper` | Stepper beats keyboard for small integers |
| Date + time | Two `Input type="datetime-local"` | Native pickers; converted to epoch ms on submit |
| Multi-select tags | `DietaryTagList` in editable mode | Toggle chips, not a multi-select |
| Boolean | `Switch` | Immediate-effect settings only, never inside a submit form |

---

## 12. Number & Unit Formatting

Storage and display differ deliberately. Formatting helpers live in `@/lib/format` and are the only place these rules exist.

| Quantity | Stored as | Displayed as | Locale/Impl | Example |
| --- | --- | --- | --- | --- |
| Weight | integer grams | kilograms, 1 decimal, `kg` suffix | `(g/1000).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})` | `2400` → `2,4 kg` |
| Weight, sub-kg | integer grams | grams below 1000 g | — | `450` → `450 g` |
| Weight, aggregate | integer grams | 1 decimal always, even at `.0` | — | `12000` → `12,0 kg` |
| Money | integer IDR | `Rp` + `.` thousands, no decimals | `new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0})` | `22000` → `Rp22.000` |
| Money, large | integer IDR | full digits, never abbreviated | — | `1250000` → `Rp1.250.000` |
| Percentage | float 0–1 | 1 decimal + `%`, `,` separator | `(v*100).toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})` | `0.934` → `93,4%` |
| Discount | derived int | integer + `%`, no decimal | `Math.round(...)` | `0.45` → `45%` |
| Timestamp | epoch ms UTC | WIB date-time | `date-fns` + `Asia/Jakarta`, pattern `d MMM yyyy, HH.mm` | `1754438400000` → `6 Agu 2026, 14.00` |
| Time only | epoch ms UTC | `HH.mm` WIB | pattern `HH.mm` | → `14.00` |
| Pickup window | two epoch ms | `HH.mm–HH.mm` en-dash | — | `17.00–21.00` |
| Relative time | epoch ms | `date-fns` `formatDistanceToNow` with `id` locale | — | `3 menit lalu` |
| Countdown | ms remaining | `H j M mnt` above 1 h, `M:SS` below | — | `2 j 15 mnt` / `4:32` |
| Distance | metres | `m` below 1000, then `km` 1 decimal | — | `450` → `450 m`; `1250` → `1,2 km` |
| Count | integer | `.` thousands, no decimals | `id-ID` | `1250` → `1.250` |
| CO2e | float kg | 1 decimal + `kg CO2e` + `EstimatedBadge` | — | `12,4 kg CO2e` |

### 12.1 Indonesian Numeric Conventions

Non-negotiable: `id-ID` uses `.` for thousands and `,` for decimals — the inverse of English.

| Value | Implemented Correct (`id-ID`) | Not implemented Wrong (`en-US`) |
| --- | --- | --- |
| 22000 IDR | `Rp22.000` | `Rp22,000` |
| 2.4 kg | `2,4 kg` | `2.4 kg` |
| 93.4% | `93,4%` | `93.4%` |
| 1250000 IDR | `Rp1.250.000` | `Rp1,250,000` |

**Never hand-roll these with `replace()`.** Always `Intl.NumberFormat('id-ID', ...)`. The `Rp` prefix has no space in Indonesian currency style: `Rp22.000`, not `Rp 22.000`.

### 12.2 Time

All timestamps are epoch milliseconds UTC in storage and always displayed in **WIB (UTC+7, `Asia/Jakarta`)**. Semarang is WIB.

| Rule | Detail |
| --- | --- |
| Never render a raw UTC time | Always convert |
| Never rely on the device timezone | A merchant travelling would otherwise see shifted pickup windows |
| Use dot separators for time | Indonesian convention: `14.00`, not `14:00` |
| Show `WIB` when ambiguous | Detail views and ledger rows carry the suffix; card-level time chips omit it |
| Month names abbreviated Indonesian | `Agu` not `Aug`; via `date-fns` `id` locale |

### 12.3 Weight Precision

Storage in grams avoids float accumulation error across ledger events — a critical property when circularity is a ratio of summed weights. Display in kg because kg is how food-recovery volume is discussed.

| Rule | Detail |
| --- | --- |
| Sum in grams, convert once at the display boundary | Prevents rounding drift across thousands of events |
| Always exactly one decimal in kg | `12,0 kg` — trailing zero preserved for column alignment |
| Below 1000 g, show grams | `450 g` is more precise and more natural than `0,5 kg` |
| Never show more than one decimal | Scale precision does not justify `2,437 kg` |
| Form inputs accept grams | Label says "gram"; no unit conversion in the input |

---

## 13. Estimated CO2e Presentation

The single highest-risk number in the product. Presented wrongly it is greenwashing; presented rightly it is a credibility asset.

### 13.1 The Formula

```
estimatedCo2eKg = (rescuedKg × 2.5) + (recoveredKg × 0.9)
methodology     = "impact-v1"
```

Rescued food avoids both production emissions and landfill methane, so it carries the higher factor. Recovered material avoids landfill emissions but the food was already produced, so the factor is lower. Residual contributes zero avoided emissions.

### 13.2 Mandatory Presentation Rules

| Rule | Implementation |
| --- | --- |
| Never the largest number on screen | Capped at `text-xl` (Metric S) |
| Always accompanied by `EstimatedBadge` | Non-optional; the component requires it |
| Always exposes methodology | `impact-v1` reachable in one tap |
| Never verbs of certainty | `Estimasi X kg CO2e` — never `Mengurangi X kg CO2e` |
| Never a standalone hero | Always beside at least one measured figure |
| Never trended without a range | No sparkline implying measurement precision |
| Unit in muted foreground | `text-muted-foreground` on `kg CO2e`, value in `text-foreground` |

### 13.3 Exact Bahasa Indonesia Copy

**Badge label:** `Estimasi`

**Inline caption below the figure:**

> `Estimasi berdasarkan metodologi impact-v1. Bukan hasil pengukuran langsung.`

**Info sheet — title:**

> `Bagaimana estimasi CO2e dihitung`

**Info sheet — body:**

> `Angka ini adalah estimasi, bukan pengukuran langsung. Kami menghitungnya dari berat material yang tercatat di Catatan Aliran Material.`
>
> `Rumus (metodologi impact-v1):`
> `• Setiap 1 kg makanan yang terselamatkan dihitung 2,5 kg CO2e yang dihindari.`
> `• Setiap 1 kg material yang terolah dihitung 0,9 kg CO2e yang dihindari.`
> `• Residu tidak dihitung sebagai penghindaran emisi.`
>
> `Faktor emisi diambil dari rata-rata literatur dan tidak disesuaikan per jenis makanan, jarak, atau metode pengolahan. Emisi sebenarnya dapat berbeda.`
>
> `Metodologi: impact-v1`

**Circularity caption:**

> `Tingkat sirkularitas = (kg terselamatkan + kg terolah) ÷ total kg terdaftar.`

### 13.4 Circularity Guard Rails

| Rule | Detail |
| --- | --- |
| Expected range | 85–95%. Demo target **93%**. |
| Display precision | One decimal, `id-ID` comma: `93,4%` |
| Hard clamp | If computed ≥ 99.95%, display `99,9%` and raise a data-integrity flag for Admin — a true 100% means residual events are missing |
| Never render 100.0% | Under any circumstance |
| Zero state | `Belum ada data` — never `0,0%`, which reads as failure rather than absence |
| Never a "goal" ring toward 100% | Progress-to-100 framing implies zero residual is achievable |

---

## 14. Button Hierarchy

| Variant | Appearance | Use | Per screen |
| --- | --- | --- | --- |
| `default` | `bg-primary text-primary-foreground` | The single most important action | Max 1 |
| `secondary` | `bg-secondary text-secondary-foreground` | Important but not primary | 0–2 |
| `outline` | `border bg-background` | Tertiary; toolbar and filter actions | Unlimited |
| `ghost` | transparent, hover `bg-accent` | Icon buttons, table row actions, nav | Unlimited |
| `link` | underlined `text-primary` | Inline navigation inside prose | Unlimited |
| `destructive` | `bg-destructive` | Irreversible removal only | Max 1, behind `ConfirmDialog` |

### 14.1 Sizes

| Size | Height | Use |
| --- | --- | --- |
| `sm` | `h-8` | Table row actions, dense toolbars (desktop only — below the 44px mobile target) |
| `default` | `h-9` | Standard desktop actions |
| `lg` | `h-11` | **All mobile primary actions** — meets the 44px target |
| `icon` | `size-9`, `min-h-11 min-w-11` on mobile | Icon-only; `aria-label` mandatory |

### 14.2 Placement by Role

| Context | Placement |
| --- | --- |
| Consumer detail | Sticky bottom bar, full-width `size="lg"` |
| Consumer card | Full card is the link; explicit button only for `Reservasi` |
| Operator form | Bottom-left of the form, inline, `size="lg"` on mobile |
| Operator table row | Right-aligned `ghost` icon buttons or a `DropdownMenu` |
| `PageHeader` | Primary action in the `action` slot, top-right |
| Sheet/Dialog | Footer; primary right, cancel left |

### 14.3 States

| State | Treatment |
| --- | --- |
| Loading | Spinner replaces the leading icon; label persists; `disabled` |
| Disabled | `opacity-50 pointer-events-none`; always paired with a visible reason |
| Success | Never a persistent green button — use a Sonner toast and revert |
| Destructive confirm | `ConfirmDialog` (`Sheet` below `lg`, `Dialog` above) |

---

## 15. Sonner Toast Conventions

Toasts confirm asynchronous outcomes. They never carry information the user must read to proceed.

| Outcome | Method | Duration | Example (ID) |
| --- | --- | --- | --- |
| Success | `toast.success()` | 4000ms | `Item berhasil dipublikasikan` |
| Error | `toast.error()` | 6000ms | `Gagal menyimpan item. Coba lagi.` |
| Info | `toast()` | 4000ms | `Perutean sirkular dimulai` |
| Warning | `toast.warning()` | 5000ms | `Jendela pengambilan berakhir 15 menit lagi` |
| Loading → resolve | `toast.promise()` | until settled | `Memproses pembayaran…` → `Pembayaran berhasil` |
| Undoable | `toast()` + action | 8000ms | `Item diarsipkan` + `Urungkan` |

**Configuration:**

| Setting | Value | Why |
| --- | --- | --- |
| Position (mobile) | `top-center` | Bottom is occupied by nav and sticky actions |
| Position (`lg`+) | `bottom-right` | Away from the primary work area |
| Max visible | 3 | Beyond that they become noise |
| `richColors` | `true` | Uses semantic tokens rather than a single neutral |
| `closeButton` | `true` | Required for keyboard dismissal |

**Rules:**

- One toast per user action. Never a toast per mutation in a batch — summarise.
- Never for validation errors; those belong in `FormMessage`.
- Never for navigation confirmations; the new screen is the confirmation.
- Payment outcomes get both a toast **and** a persistent `PaymentStatusPanel` — a toast alone is insufficient for a money event.
- Copy is a complete sentence in Bahasa Indonesia, no trailing exclamation marks in operator contexts.

---

## 16. Loading & Skeletons

| Rule | Detail |
| --- | --- |
| Skeleton, not spinner | Spinners only inside buttons and for indeterminate background work |
| Match final dimensions | `Skeleton` blocks use the exact height of the content they replace |
| Delay threshold | Suppress below ~200ms to avoid a flash |
| Per-section | Convex data arrives progressively; each section skeletons independently |
| Shell renders immediately | Header, nav and sidebar never skeleton |
| Count matches expectation | 3 card skeletons for a 3-column grid, 5 rows for a table |
| No shimmer on operator tables | Static `bg-muted` — repeated shimmer across 20 rows is visually noisy |

### 16.1 Skeleton Variants

| Variant | Composition | Used for |
| --- | --- | --- |
| `card` | `aspect-[4/3]` block + 2 text lines + a price row | `RescueItemCard` |
| `list-row` | Avatar circle + 2 text lines | Order and batch lists |
| `table-row` | N cells at column widths | Any `Table` |
| `stat` | Label line + `text-3xl`-height block | `SummaryCard`, `ImpactStatCard` |
| `map` | Full-height `bg-muted` block | Mapbox canvas |
| `bar` | `h-8 rounded-lg` full-width block | `ImpactBreakdownBar` |
| `timeline` | 3 dot+line+text groups | `LedgerTimeline`, `OrderTimeline` |

---

## 17. Copy-Paste Token Block

The complete recommended replacement for the colour section of `src/index.css`. Non-colour tokens (`--radius`, `--font-sans`) are unchanged from the current file except for the `body` font fix in §6.1.

```css
:root {
  --radius: 0.625rem;

  --font-sans: 'Geist Variable', sans-serif;
  --font-heading: var(--font-sans);

  /* Brand ramp — hue 162 */
  --brand-50:  oklch(0.974 0.017 162);
  --brand-100: oklch(0.946 0.036 162);
  --brand-200: oklch(0.898 0.068 162);
  --brand-300: oklch(0.834 0.098 162);
  --brand-400: oklch(0.754 0.122 162);
  --brand-500: oklch(0.668 0.134 162);
  --brand-600: oklch(0.588 0.128 162);
  --brand-700: oklch(0.517 0.115 162);
  --brand-800: oklch(0.448 0.096 162);
  --brand-900: oklch(0.390 0.079 162);
  --brand-950: oklch(0.272 0.055 162);

  /* Core surfaces */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Brand-driven semantics */
  --primary: var(--brand-700);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: var(--brand-50);
  --accent-foreground: var(--brand-900);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: var(--brand-600);

  /* Impact outcomes */
  --rescued: var(--brand-600);
  --rescued-foreground: oklch(0.985 0 0);
  --rescued-muted: var(--brand-100);
  --rescued-muted-foreground: var(--brand-900);
  --recovered: oklch(0.660 0.108 195);
  --recovered-foreground: oklch(0.985 0 0);
  --recovered-muted: oklch(0.940 0.038 195);
  --recovered-muted-foreground: oklch(0.380 0.062 195);
  --residual: oklch(0.740 0.135 75);
  --residual-foreground: oklch(0.205 0 0);
  --residual-muted: oklch(0.950 0.048 75);
  --residual-muted-foreground: oklch(0.420 0.082 75);
  --in-progress: oklch(0.700 0.032 250);
  --in-progress-foreground: oklch(0.205 0 0);
  --in-progress-muted: oklch(0.955 0.010 250);
  --in-progress-muted-foreground: oklch(0.395 0.030 250);

  /* Charts */
  --chart-1: var(--rescued);
  --chart-2: var(--recovered);
  --chart-3: var(--residual);
  --chart-4: var(--in-progress);
  --chart-5: var(--brand-300);

  /* Sidebar */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: var(--brand-700);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: var(--brand-50);
  --sidebar-accent-foreground: var(--brand-900);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: var(--brand-600);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);

  --primary: var(--brand-400);
  --primary-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: var(--brand-950);
  --accent-foreground: var(--brand-200);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: var(--brand-500);

  --rescued: var(--brand-400);
  --rescued-foreground: oklch(0.145 0 0);
  --rescued-muted: var(--brand-950);
  --rescued-muted-foreground: var(--brand-200);
  --recovered: oklch(0.720 0.098 195);
  --recovered-foreground: oklch(0.145 0 0);
  --recovered-muted: oklch(0.300 0.050 195);
  --recovered-muted-foreground: oklch(0.880 0.055 195);
  --residual: oklch(0.790 0.125 75);
  --residual-foreground: oklch(0.145 0 0);
  --residual-muted: oklch(0.320 0.060 75);
  --residual-muted-foreground: oklch(0.900 0.070 75);
  --in-progress: oklch(0.660 0.030 250);
  --in-progress-foreground: oklch(0.145 0 0);
  --in-progress-muted: oklch(0.300 0.028 250);
  --in-progress-muted-foreground: oklch(0.880 0.020 250);

  --chart-1: var(--rescued);
  --chart-2: var(--recovered);
  --chart-3: var(--residual);
  --chart-4: var(--in-progress);
  --chart-5: var(--brand-300);

  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: var(--brand-400);
  --sidebar-primary-foreground: oklch(0.145 0 0);
  --sidebar-accent: var(--brand-950);
  --sidebar-accent-foreground: var(--brand-200);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: var(--brand-500);
}

@theme inline {
  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-brand-50:  var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-200: var(--brand-200);
  --color-brand-300: var(--brand-300);
  --color-brand-400: var(--brand-400);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-700: var(--brand-700);
  --color-brand-800: var(--brand-800);
  --color-brand-900: var(--brand-900);
  --color-brand-950: var(--brand-950);

  --color-rescued: var(--rescued);
  --color-rescued-foreground: var(--rescued-foreground);
  --color-rescued-muted: var(--rescued-muted);
  --color-rescued-muted-foreground: var(--rescued-muted-foreground);
  --color-recovered: var(--recovered);
  --color-recovered-foreground: var(--recovered-foreground);
  --color-recovered-muted: var(--recovered-muted);
  --color-recovered-muted-foreground: var(--recovered-muted-foreground);
  --color-residual: var(--residual);
  --color-residual-foreground: var(--residual-foreground);
  --color-residual-muted: var(--residual-muted);
  --color-residual-muted-foreground: var(--residual-muted-foreground);
  --color-in-progress: var(--in-progress);
  --color-in-progress-foreground: var(--in-progress-foreground);
  --color-in-progress-muted: var(--in-progress-muted);
  --color-in-progress-muted-foreground: var(--in-progress-muted-foreground);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    @apply bg-background text-foreground;
  }
}
```

---

## 18. Related Documents

| Document | Path | Relationship |
| --- | --- | --- |
| Design Principles | [`DESIGN.md`](DESIGN.md) | Strategy these tokens implement |
| Component Catalogue | [`COMPONENTS.md`](COMPONENTS.md) | Components that consume these tokens |
| Figma Specification | [`FIGMA.md`](FIGMA.md) | Figma variable mapping of this token set |
| Frontend Architecture | [`../architecture/FRONTEND.md`](../architecture/FRONTEND.md) | Build pipeline, Vite, Tailwind plugin |
| Style Guide | [`../engineering/STYLE_GUIDE.md`](../engineering/STYLE_GUIDE.md) | Code conventions, `cn()` usage |
| State Machine | [`../domain/STATE_MACHINE.md`](../domain/STATE_MACHINE.md) | Authoritative status enums behind §5 |
| Impact Model | [`../impact/IMPACT.md`](../impact/IMPACT.md) | CO2e formula and `impact-v1` methodology |
| Material Flow Ledger | [`../impact/MATERIAL_LEDGER.md`](../impact/MATERIAL_LEDGER.md) | Event data behind impact figures |
| Feature Specification | [`../spec/FEATURES.md`](../spec/FEATURES.md) | Feature behaviour |
| Testing Strategy | [`../engineering/TESTING.md`](../engineering/TESTING.md) | Formatting-helper unit tests |
| Roadmap | [`../business/ROADMAP.md`](../business/ROADMAP.md) | Milestones for the token migration |

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
