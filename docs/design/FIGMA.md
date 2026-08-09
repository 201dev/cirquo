# Cirquo Figma Workspace Specification

| Field | Value |
| --- | --- |
| **Document type** | Figma workspace & handoff specification |
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-06 |
| **Audience** | Designers new to the Cirquo codebase |
| **Figma file** | `Cirquo — Design System & Screens` |
| **Source of truth** | `src/index.css` (see §12) |

---

## 0. Read This First

You do not need to read the codebase to work in this file, but you do need five facts about the product, because they change design decisions constantly.

1. **Cirquo is not a food delivery app.** There is no courier, no delivery fee, no ETA, no driver tracking. A consumer reserves surplus food, pays, and **physically walks to the shop** to collect it during a stated **pickup window**. Never draw a delivery map, a vehicle pin, or a "your order is on the way" state.

2. **The core innovation is Material Flow Orchestration.** When food is *not* collected, it does not vanish. **Circular Routing** matches it to an **Organic Processor** (BSF larvae, compost, biogas, animal feed) who logs a measured intake weight and then a processing outcome. Whatever is left is **Residual**. Every state change writes an immutable **Material Flow Ledger** event. This loop must be visible in the UI, not buried.

3. **Four actors, two registers.** Consumers get a warm marketplace with photography and generous spacing. Merchants, Organic Processors and Admins get a dense operational dashboard with tables and forms. **One design system, different density.** Do not invent a second colour palette or a second type scale for operators.

4. **Honesty is a design constraint.** Circularity sits at 85–95%; the demo target is **93%** and the UI must never show 100%. CO2e is **estimated**, never measured, and always carries an "Estimasi" badge. Residual is coloured **amber, never red** — it is truthfully reported, not a failure.

5. **UI language is Bahasa Indonesia.** Currency IDR (`Rp22.000`), timezone WIB, decimal comma (`2,4 kg`, `93,4%`). All labels in this document are the real production strings — use them verbatim, never English placeholders.

### 0.1 Forbidden Words in Any Frame

| Never write | Write instead |
| --- | --- |
| Zero waste / Nol sampah | `Sirkularitas 93,4%` |
| 100% closed-loop / 100% tertutup | `Sebagian besar material terolah` |
| AI pricing / Harga bertenaga AI | `Harga Penyelamatan Dinamis` |
| Guaranteed safe / Dijamin aman | `Ambil sebelum batas waktu` |
| Delivery / Diantar / Kurir | `Ambil di lokasi` |
| Allergy matching / Cocok untuk alergi | `Sesuai preferensi diet` |
| CirQuo (wrong casing) | **Cirquo** |

---

## 1. File & Page Structure

One Figma file. Nine pages, numbered so they sort correctly.

| Page | Name | Contents | Primary audience |
| --- | --- | --- | --- |
| 00 | `00 Cover` | Cover art, version, changelog, contributor list, link to `docs/design/` | Everyone |
| 01 | `01 Foundations` | Colour ramps, variables, type styles, spacing, radius, elevation, iconography, grids | Designers |
| 02 | `02 Components` | The component library: every published component with all variants | Designers + engineers |
| 03 | `03 Consumer` | All consumer frames, mobile-first | Design + demo |
| 04 | `04 Merchant` | All merchant frames | Design + demo |
| 05 | `05 Processor` | All Organic Processor frames | Design + demo |
| 06 | `06 Admin` | All admin frames | Design |
| 07 | `07 Flows` | Prototype wiring, user journey maps, state diagrams | Demo rehearsal |
| 08 | `08 Handoff` | Redlines, spec annotations, asset exports, open questions | Engineers |

### 1.1 Page Section Structure

Each role page uses Figma Sections (not frames) as top-level dividers:

```
04 Merchant
├── ▸ SECTION: Onboarding          (register, profile, verification pending)
├── ▸ SECTION: Dashboard
├── ▸ SECTION: Listing Management  (list, create, detail)
├── ▸ SECTION: Pickup Verification
├── ▸ SECTION: Impact
└── ▸ SECTION: States              (empty, loading, error variants)
```

Sections are collapsible and named in `Title Case`. They carry a `Ready` / `In review` / `Blocked` status badge as a small text layer in the section header.

### 1.2 Cover Page Requirements

| Element | Content |
| --- | --- |
| Title | `Cirquo — Closing the Loop, Saving Every Meal` |
| Subtitle | `Circular Food Recovery Platform · DSDC ANFORCOM 2026` |
| Version | `Design v1.0 · Draft` |
| Last updated | `2026-08-06` |
| Status legend | Colour key for Ready / In review / Blocked |
| Doc links | Links to `DESIGN.md`, `UI_GUIDE.md`, `COMPONENTS.md` in the repo |
| Warning block | `Figma is a communication artefact. src/index.css is the source of truth. See §12.` |

---

## 2. Naming Conventions

Consistent naming is what makes a file searchable and a handoff unambiguous.

### 2.1 Rules by Object Type

| Object | Convention | Example |
| --- | --- | --- |
| Page | `NN Name` (two digits, space, Title Case) | `03 Consumer` |
| Section | `Title Case` | `Listing Management` |
| Frame (screen) | `Role / Screen Name` | `Consumer / Explore — Map` |
| Frame (state) | `Role / Screen Name — State` | `Consumer / Explore — Empty` |
| Frame (breakpoint) | `Role / Screen Name @ Size` | `Merchant / Dashboard @ 1440` |
| Component | `Category/ComponentName` | `Display/StatusBadge` |
| Variant property | `Property=value` | `status=recovered` |
| Component set | `Category/ComponentName` | `Card/RescueItemCard` |
| Layer (structural) | `PascalCase` describing role | `HeaderRow`, `PriceBlock` |
| Layer (text) | The actual text content | `Roti Sourdough` |
| Layer (icon) | `icon/LucideName` | `icon/HandHeart` |
| Colour style / variable | `category/name` | `impact/rescued` |
| Text style | `Scale/Name` | `Metric/Large` |
| Effect style | `elevation/level` | `elevation/overlay` |

### 2.2 Component Categories

| Prefix | Meaning | Examples |
| --- | --- | --- |
| `Base/` | Direct shadcn primitive equivalents | `Base/Button`, `Base/Input`, `Base/Badge` |
| `Display/` | Read-only presentation | `Display/StatusBadge`, `Display/PriceDisplay` |
| `Card/` | Card-shaped composites | `Card/RescueItemCard`, `Card/SummaryCard` |
| `Input/` | Interactive data entry | `Input/QuantityStepper`, `Input/PickupCodeInput` |
| `Impact/` | Impact and ledger visualisation | `Impact/BreakdownBar`, `Impact/CircularityGauge` |
| `Nav/` | Navigation | `Nav/BottomBar`, `Nav/Sidebar`, `Nav/Header` |
| `Overlay/` | Sheets, dialogs, toasts | `Overlay/FilterSheet`, `Overlay/ConfirmDialog` |
| `State/` | Empty, error, loading | `State/Empty`, `State/Error`, `State/Skeleton` |
| `Map/` | Map-related | `Map/MerchantMarker`, `Map/Cluster` |

### 2.3 Naming Anti-Patterns

| Never | Implemented Instead |
| --- | --- |
| `Frame 247` | `Consumer / Listing Detail` |
| `Rectangle 12` | `ImageSlot` |
| `Group 3 copy 2` | Delete it or name it properly |
| `Button/Green` | `Base/Button` with `variant=primary` |
| `Card final FINAL v3` | Use Figma version history |
| `Status - Recovered` | `status=recovered` (variant property syntax) |

---

## 3. Variables & Tokens

Figma Variables mirror `src/index.css`. Four collections.

### 3.1 Collection: `Colour` (2 modes — Light, Dark)

Figma does not accept OKLCH input. **Enter the hex approximations below, and record the OKLCH value in each variable's description field.** The hex is a display convenience; the OKLCH in the description is what engineering implements.

#### Brand ramp (hue 162)

| Variable | Light hex | Dark hex | OKLCH (description field) |
| --- | --- | --- | --- |
| `brand/50` | `#eefbf5` | `#eefbf5` | `oklch(0.974 0.017 162)` |
| `brand/100` | `#d6f5e7` | `#d6f5e7` | `oklch(0.946 0.036 162)` |
| `brand/200` | `#aeead1` | `#aeead1` | `oklch(0.898 0.068 162)` |
| `brand/300` | `#7fdcb5` | `#7fdcb5` | `oklch(0.834 0.098 162)` |
| `brand/400` | `#4fc998` | `#4fc998` | `oklch(0.754 0.122 162)` |
| `brand/500` | `#1fb37c` | `#1fb37c` | `oklch(0.668 0.134 162)` |
| `brand/600` | `#0d9668` | `#0d9668` | `oklch(0.588 0.128 162)` |
| `brand/700` | `#047857` | `#047857` | `oklch(0.517 0.115 162)` |
| `brand/800` | `#065f46` | `#065f46` | `oklch(0.448 0.096 162)` |
| `brand/900` | `#064e3b` | `#064e3b` | `oklch(0.390 0.079 162)` |
| `brand/950` | `#022c22` | `#022c22` | `oklch(0.272 0.055 162)` |

The brand ramp is **mode-independent** — the same eleven steps exist in both themes. Only the *semantic* variables below switch which step they point at.

#### Semantic surfaces & text

| Variable | Light | Dark | Aliases to |
| --- | --- | --- | --- |
| `semantic/background` | `#ffffff` | `#252525` | `oklch(1 0 0)` / `oklch(0.145 0 0)` |
| `semantic/foreground` | `#252525` | `#fafafa` | `oklch(0.145 0 0)` / `oklch(0.985 0 0)` |
| `semantic/card` | `#ffffff` | `#333333` | `oklch(1 0 0)` / `oklch(0.205 0 0)` |
| `semantic/card-foreground` | `#252525` | `#fafafa` | — |
| `semantic/popover` | `#ffffff` | `#333333` | — |
| `semantic/popover-foreground` | `#252525` | `#fafafa` | — |
| `semantic/primary` | `#047857` | `#4fc998` | `brand/700` / `brand/400` |
| `semantic/primary-foreground` | `#fafafa` | `#252525` | — |
| `semantic/secondary` | `#f7f7f7` | `#444444` | `oklch(0.97 0 0)` / `oklch(0.269 0 0)` |
| `semantic/secondary-foreground` | `#333333` | `#fafafa` | — |
| `semantic/muted` | `#f7f7f7` | `#444444` | — |
| `semantic/muted-foreground` | `#8e8e8e` | `#b5b5b5` | `oklch(0.556 0 0)` / `oklch(0.708 0 0)` |
| `semantic/accent` | `#eefbf5` | `#022c22` | `brand/50` / `brand/950` |
| `semantic/accent-foreground` | `#064e3b` | `#aeead1` | `brand/900` / `brand/200` |
| `semantic/destructive` | `#dc2626` | `#f87171` | `oklch(0.577 0.245 27.325)` / `oklch(0.704 0.191 22.216)` |
| `semantic/border` | `#ebebeb` | `#ffffff1a` | `oklch(0.922 0 0)` / `oklch(1 0 0 / 10%)` |
| `semantic/input` | `#ebebeb` | `#ffffff26` | `oklch(0.922 0 0)` / `oklch(1 0 0 / 15%)` |
| `semantic/ring` | `#0d9668` | `#1fb37c` | `brand/600` / `brand/500` |

#### Impact outcomes — the most important variables in the file

| Variable | Light | Dark | OKLCH | Meaning |
| --- | --- | --- | --- | --- |
| `impact/rescued` | `#0d9668` | `#4fc998` | `oklch(0.588 0.128 162)` / `oklch(0.754 0.122 162)` | Collected by a consumer |
| `impact/rescued-muted` | `#d6f5e7` | `#022c22` | — | Badge background |
| `impact/rescued-muted-fg` | `#064e3b` | `#aeead1` | — | Badge text |
| `impact/recovered` | `#12a3b8` | `#3cc0d4` | `oklch(0.660 0.108 195)` / `oklch(0.720 0.098 195)` | Processed by a processor |
| `impact/recovered-muted` | `#dff5f9` | `#0d4550` | — | Badge background |
| `impact/recovered-muted-fg` | `#0a4653` | `#c9edf5` | — | Badge text |
| `impact/residual` | `#d99a1f` | `#eaad38` | `oklch(0.740 0.135 75)` / `oklch(0.790 0.125 75)` | Honest remainder |
| `impact/residual-muted` | `#fdf3dc` | `#4a3410` | — | Badge background |
| `impact/residual-muted-fg` | `#5c4210` | `#fae8c0` | — | Badge text |
| `impact/in-progress` | `#a3a8b4` | `#95999f` | `oklch(0.700 0.032 250)` / `oklch(0.660 0.030 250)` | Unresolved material |
| `impact/in-progress-muted` | `#f4f5f7` | `#3a3d42` | — | Badge background |
| `impact/in-progress-muted-fg` | `#5b5f68` | `#dcdee1` | — | Badge text |

**Residual is amber. Never red.** If you find yourself reaching for `semantic/destructive` on a residual segment, stop — see §0 point 4 and `UI_GUIDE.md` §5.4.

#### Sidebar

| Variable | Light | Dark |
| --- | --- | --- |
| `sidebar/background` | `#fafafa` | `#333333` |
| `sidebar/foreground` | `#252525` | `#fafafa` |
| `sidebar/primary` | `#047857` | `#4fc998` |
| `sidebar/accent` | `#eefbf5` | `#022c22` |
| `sidebar/accent-foreground` | `#064e3b` | `#aeead1` |
| `sidebar/border` | `#ebebeb` | `#ffffff1a` |

#### Charts

| Variable | Aliases to | Semantic |
| --- | --- | --- |
| `chart/1` | `impact/rescued` | Rescued |
| `chart/2` | `impact/recovered` | Recovered |
| `chart/3` | `impact/residual` | Residual |
| `chart/4` | `impact/in-progress` | In progress |
| `chart/5` | `brand/300` | Secondary series |

### 3.2 Collection: `Radius` (number variables)

Base `radius/base = 10`. All others are literal computed values — Figma variables cannot express `calc()`, so record the multiplier in the description.

| Variable | Value | Multiplier | Applied to |
| --- | --- | --- | --- |
| `radius/sm` | 6 | 0.6× | Badges, small chips |
| `radius/md` | 8 | 0.8× | Buttons, inputs, selects |
| `radius/base` | 10 | 1.0× | Cards, panels, tables |
| `radius/lg` | 14 | 1.4× | Sheets, dialogs, PickupCodeCard |
| `radius/xl` | 18 | 1.8× | Hero surfaces, map overlay panels |
| `radius/2xl` | 22 | 2.2× | Reserved, unused |
| `radius/3xl` | 26 | 2.6× | Reserved, unused |

Note the naming offset: the CSS token `--radius-lg` equals the base value, so Figma `radius/base` = CSS `--radius-lg` = 10px. This mapping is recorded in each variable description to prevent handoff confusion.

### 3.3 Collection: `Spacing` (number variables)

4px rhythm. Only these steps exist — if a layout needs 20px, the layout is wrong.

| Variable | Value |
| --- | --- |
| `space/0.5` | 2 |
| `space/1` | 4 |
| `space/2` | 8 |
| `space/3` | 12 |
| `space/4` | 16 |
| `space/6` | 24 |
| `space/8` | 32 |
| `space/12` | 48 |
| `space/16` | 64 |

Fixed dimensions as separate number variables:

| Variable | Value | Meaning |
| --- | --- | --- |
| `size/header` | 64 | Header height |
| `size/bottom-nav` | 56 | Consumer bottom nav height |
| `size/sidebar` | 256 | Operator sidebar width |
| `size/tap-min` | 44 | Minimum tap target |
| `size/container-consumer` | 1024 | `max-w-5xl` |
| `size/container-operator` | 1152 | `max-w-6xl` |
| `size/impact-bar` | 32 | `ImpactBreakdownBar` default height |

### 3.4 Collection: `Copy` (string variables, mode: `id`)

Every domain label as a string variable. One mode now (`id`); an `en` mode is added at M7 when English localisation begins. Binding text layers to these variables means a terminology change propagates through the file in one edit.

#### Domain terms

| Variable | Value (id) |
| --- | --- |
| `term/rescue-item` | `Item Penyelamatan` |
| `term/rescued` | `Terselamatkan` |
| `term/recovered` | `Terolah` |
| `term/residual` | `Residu` |
| `term/in-progress` | `Dalam Proses` |
| `term/circular-routing` | `Perutean Sirkular` |
| `term/ledger` | `Catatan Aliran Material` |
| `term/dynamic-pricing` | `Harga Penyelamatan Dinamis` |
| `term/impact-tracking` | `Pelacakan Dampak` |
| `term/circularity-rate` | `Tingkat Sirkularitas` |
| `term/pickup-window` | `Jendela Pengambilan` |
| `term/pickup-code` | `Kode Pengambilan` |
| `term/dietary-filter` | `Filter Preferensi Diet` |
| `term/processor` | `Pengolah Organik` |
| `term/merchant` | `Mitra Usaha` |
| `term/estimated` | `Estimasi` |

#### Rescue Item statuses

| Variable | Value |
| --- | --- |
| `status/item/draft` | `Draf` |
| `status/item/active` | `Tersedia` |
| `status/item/reserved-partial` | `Sebagian Dipesan` |
| `status/item/sold-out` | `Habis Dipesan` |
| `status/item/expired` | `Kedaluwarsa` |
| `status/item/recovery-pending` | `Menunggu Perutean` |
| `status/item/recovered` | `Terolah` |
| `status/item/residual` | `Residu` |
| `status/item/closed` | `Selesai` |
| `status/item/moderated` | `Dimoderasi` |

#### Order statuses

| Variable | Value |
| --- | --- |
| `status/order/reserved` | `Dipesan` |
| `status/order/paid` | `Dibayar` |
| `status/order/picked-up` | `Terselamatkan` |
| `status/order/cancelled` | `Dibatalkan` |
| `status/order/expired` | `Kedaluwarsa` |
| `status/order/disputed` | `Sengketa` |
| `status/order/refunded` | `Dana Dikembalikan` |

#### Recovery Batch statuses

| Variable | Value |
| --- | --- |
| `status/batch/pending` | `Menunggu` |
| `status/batch/offered` | `Ditawarkan` |
| `status/batch/accepted` | `Diterima` |
| `status/batch/collected` | `Diambil` |
| `status/batch/processed` | `Terolah` |
| `status/batch/unroutable` | `Tidak Dapat Dirutekan` |

#### Navigation

| Variable | Value |
| --- | --- |
| `nav/consumer/home` | `Beranda` |
| `nav/consumer/explore` | `Jelajahi` |
| `nav/consumer/orders` | `Pesanan` |
| `nav/merchant/dashboard` | `Dasbor` |
| `nav/merchant/surplus` | `Daftar Surplus` |
| `nav/merchant/pickup` | `Verifikasi Kode` |
| `nav/processor/dashboard` | `Dasbor` |
| `nav/processor/recovery` | `Permintaan Pemulihan` |
| `nav/admin/dashboard` | `Dasbor` |
| `nav/admin/verifications` | `Verifikasi` |
| `nav/admin/moderation` | `Moderasi` |
| `nav/admin/ledger` | `Catatan Aliran Material` |
| `nav/admin/disputes` | `Sengketa` |

#### Disclaimers — always bound, never typed by hand

| Variable | Value |
| --- | --- |
| `disclaimer/estimated-co2e` | `Estimasi berdasarkan metodologi impact-v1. Bukan hasil pengukuran langsung.` |
| `disclaimer/dietary` | `Preferensi diet berdasarkan informasi dari mitra. Bukan jaminan bebas alergen.` |
| `disclaimer/verification` | `Terverifikasi berarti dokumen usaha telah diperiksa admin Cirquo. Bukan sertifikasi keamanan pangan.` |
| `disclaimer/circularity` | `Tingkat sirkularitas = (kg terselamatkan + kg terolah) ÷ total kg terdaftar.` |
| `disclaimer/no-delivery` | `Ambil langsung di lokasi mitra. Tidak ada layanan antar.` |

---

## 4. Typography Styles

Font: **Geist Variable**. Install from [vercel/geist-font](https://github.com/vercel/geist-font) before opening the file. If Geist is missing, Figma substitutes and every measurement in this document becomes wrong.

Only one family. There is no display font, no serif, no secondary sans.

| Style name | Size | Line height | Weight | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- |
| `Display/XL` | 48 | 48 | 700 | −3% | Cover page only, never in-app |
| `Heading/H1` | 30 | 36 | 700 | −2% | Page title at ≥1024 |
| `Heading/H2` | 24 | 30 | 600 | −1.5% | Page title on mobile, section title |
| `Heading/H3` | 20 | 28 | 600 | −1% | Subsection, detail title |
| `Heading/H4` | 18 | 26 | 600 | 0 | Card title, sheet title |
| `Body/Large` | 16 | 24 | 400 | 0 | Card title, form input text |
| `Body/Default` | 14 | 20 | 400 | 0 | Body, table cells |
| `Body/Medium` | 14 | 20 | 500 | 0 | Labels, active nav, emphasis |
| `Caption/Default` | 12 | 16 | 400 | +1% | Timestamps, units, helper text |
| `Caption/Medium` | 12 | 16 | 500 | +1% | Badge labels |
| `Metric/XL` | 36 | 40 | 700 | −2% | Hero measured metric |
| `Metric/Large` | 30 | 36 | 700 | −2% | ImpactStatCard measured value |
| `Metric/Medium` | 24 | 30 | 600 | −1.5% | SummaryCard value, derived metric |
| `Metric/Small` | 20 | 28 | 600 | −1% | **Estimated metric — hard ceiling** |
| `Mono/Default` | 14 | 20 | 500 | +2% | Ledger IDs, methodology version |
| `Mono/PickupCode` | 36 | 40 | 700 | +15% | PickupCodeCard only |

**Tier ceiling rule.** An estimated figure (CO2e) may never use a style larger than `Metric/Small`. A derived figure (circularity, residual kg) may never exceed `Metric/Medium` unless it is the only figure on the screen. Only measured figures may use `Metric/Large` or `Metric/XL`. This is a visual encoding of the honesty principle — see `DESIGN.md` §8.

**Numerals.** Enable `tabular-nums` (OpenType `tnum`) on every text style. All numeric columns must align, and a per-second countdown must not jitter.

---

## 5. Grids & Layout

### 5.1 Frame Sizes

| Device | Frame size | Figma preset | Represents |
| --- | --- | --- | --- |
| Mobile | **390 × 844** | iPhone 14 | Primary target. Design here first, always. |
| Mobile (small) | 360 × 800 | Android Small | Stress-test only — long Indonesian labels are checked here |
| Tablet | **768 × 1024** | iPad Mini | `md` breakpoint |
| Desktop | **1440 × 900** | Desktop | `lg`/`xl` breakpoint |

**390 × 844 is the canonical frame.** Every screen exists at 390. Tablet and desktop frames exist only where the layout genuinely changes — do not produce three frames per screen out of habit. Target hardware is a mid-range Android on 4G.

### 5.2 Layout Grids

| Frame | Columns | Margin | Gutter | Notes |
| --- | --- | --- | --- | --- |
| 390 mobile | 4 | 16 | 16 | Single-column content; grid guides alignment only |
| 768 tablet | 8 | 24 | 24 | Consumer cards 2-up; operator tables full width |
| 1440 consumer | 12 | auto (centred, `max-width: 1024`) | 24 | Cards 3-up |
| 1440 operator | 12 | auto (centred, `max-width: 1152`) | 24 | Sidebar 256 sits **outside** the container |

Row grids: 8px baseline grid at 10% opacity on all frames, for vertical rhythm checking.

### 5.3 What Changes at Each Breakpoint

| Breakpoint | Consumer | Operator |
| --- | --- | --- |
| base (390) | Bottom nav visible (56px). Cards 1-up. Filters in a bottom Sheet. Sticky bottom action bar on detail. Map fills viewport minus header and nav. | Sidebar hidden; hamburger opens a Sheet. Tables become stacked label:value rows. SummaryCards 1-up. |
| sm (640) | Bottom nav hidden; horizontal header nav appears. Cards 2-up. | SummaryCards 2-up. Table shows 3 priority columns. |
| md (768) | Cards 2-up, larger imagery. Explore gains a persistent list/map toggle. | Full table with all columns. Forms may pair fields 2-up. |
| lg (1024) | Cards 3-up. Explore becomes split view: 384px list left, map fills right. | Fixed 256px sidebar appears. SummaryCards 4-up. ConfirmDialog becomes a centred Dialog rather than a Sheet. |
| xl (1280) | Container caps at 1024 and centres — no 4-up grid. | Container caps at 1152. Detail screens gain a right context rail. |

### 5.4 Auto Layout Conventions

Auto Layout on **everything**. A screen with absolutely positioned content is a screen engineering cannot build from.

| Context | Direction | Gap | Padding | Sizing |
| --- | --- | --- | --- | --- |
| Screen root | Vertical | 0 | 0 | Fixed W, Hug H (or fixed for scroll frames) |
| Header | Horizontal | 12 | 16 H, 0 V (fixed 64 H) | Fill W, Fixed H |
| Main content | Vertical | 24 | 16 H, 24 V | Fill W, Hug H |
| Card grid | Wrap | 16 (24 at md+) | 0 | Fill W, Hug H |
| Card | Vertical | 12 | 16 | Fill W, Hug H |
| Card image slot | — | — | 0 | Fill W, ratio-locked 4:3 |
| Card meta row | Horizontal | 8 | 0 | Fill W, Hug H, space-between |
| Table row | Horizontal | 8 | 12 H, 10 V | Fill W, Hug H |
| Form section | Vertical | 24 | 0 | Fill W, Hug H |
| Form field | Vertical | 8 | 0 | Fill W, Hug H |
| Button | Horizontal | 8 | 16 H (24 at lg) | Hug W (Fill on mobile primary), Fixed H |
| Badge | Horizontal | 4 | 8 H, 2 V | Hug, Hug |
| Bottom nav | Horizontal | 0 | 0 (fixed 56 H) | Fill W, Fixed H, space-around |
| Sidebar | Vertical | 4 | 16 | Fixed 256 W, Fill H |
| Sheet content | Vertical | 16 | 16 | Fill W, Hug H (max 85% viewport) |
| Empty state | Vertical | 12 | 16 H, 64 V | Fill W, Hug H, centred |

**Absolute positioning is permitted in exactly three places:**

1. **Map overlay controls** — recenter/zoom buttons pinned bottom-right above the bottom nav.
2. **Fixed bottom navigation** — pinned to the frame bottom.
3. **Card image overlay badges** — discount top-left, quantity top-right, over the photo.

Everywhere else, absolute positioning is a bug.

**Constraints.** Fixed elements (header, bottom nav, sticky action bar) use `Left & Right` + `Top`/`Bottom` constraints. Content uses `Scale` horizontally and `Top` vertically.

---

## 6. Elevation & Effects

The product uses **borders, not shadows**, on almost every surface. This is a deliberate decision, not an oversight — shadows are invisible in dark mode, cost paint time on mid-range Android, and turn into visual mud in dense operator tables.

| Effect style | Definition | Used by |
| --- | --- | --- |
| `elevation/none` | No effect; 1px `semantic/border` stroke | Cards, tables, panels, SummaryCard — **the default** |
| `elevation/raised` | Y 1, blur 2, `#000` 5% | Sticky header on scroll, floating map controls |
| `elevation/overlay` | Y 4, blur 6, `#000` 8% | Dropdown, Select content, Tooltip |
| `elevation/modal` | Y 10, blur 15, `#000` 10% | Dialog, Sheet |
| `elevation/backdrop` | Fill `#000` 50% | Modal scrim |

Nothing above `elevation/modal`. If a design needs a fifth level, the layout has too many stacked surfaces.

**Strokes:** always 1px, always `semantic/border` (or `semantic/input` on form controls), always inside. The only 2px stroke in the entire system is `PickupCodeCard`, which uses `semantic/foreground` at 2px because it must be legible across a dim shop counter to both a human and a camera.

---

## 7. Component Library Specification

Page `02 Components`. Every component below is published. Frames are arranged in a variant matrix with all states visible simultaneously so a reviewer can scan for inconsistency.

### 7.1 `Display/StatusBadge`

One component set covering **all 23 status values across three enums**. This is what guarantees a status looks identical everywhere in the product.

| Property | Type | Values |
| --- | --- | --- |
| `kind` | Variant | `item`, `order`, `batch` |
| `status` | Variant | (dependent on `kind` — see below) |
| `size` | Variant | `sm`, `md` |

Because Figma variants cannot express dependent enums, build **three component sets** under one frame group:

**`Display/StatusBadge/Item`** — 10 variants

| `status=` | Fill | Text | Label |
| --- | --- | --- | --- |
| `draft` | transparent + `semantic/border` stroke | `semantic/muted-foreground` | `Draf` |
| `active` | `impact/rescued-muted` | `impact/rescued-muted-fg` | `Tersedia` |
| `reserved-partial` | `impact/in-progress-muted` | `impact/in-progress-muted-fg` | `Sebagian Dipesan` |
| `sold-out` | `semantic/secondary` | `semantic/secondary-foreground` | `Habis Dipesan` |
| `expired` | `semantic/muted` | `semantic/muted-foreground` | `Kedaluwarsa` |
| `recovery-pending` | `impact/in-progress-muted` | `impact/in-progress-muted-fg` | `Menunggu Perutean` |
| `recovered` | `impact/recovered-muted` | `impact/recovered-muted-fg` | `Terolah` |
| `residual` | `impact/residual-muted` | `impact/residual-muted-fg` | `Residu` |
| `closed` | `semantic/muted` | `semantic/muted-foreground` | `Selesai` |
| `moderated` | `semantic/destructive` 10% | `semantic/destructive` | `Dimoderasi` |

**`Display/StatusBadge/Order`** — 7 variants

| `status=` | Fill | Text | Label |
| --- | --- | --- | --- |
| `reserved` | `impact/in-progress-muted` | `impact/in-progress-muted-fg` | `Dipesan` |
| `paid` | `impact/rescued-muted` | `impact/rescued-muted-fg` | `Dibayar` |
| `picked-up` | `impact/rescued-muted` | `impact/rescued-muted-fg` | `Terselamatkan` |
| `cancelled` | `semantic/muted` | `semantic/muted-foreground` | `Dibatalkan` |
| `expired` | `semantic/muted` | `semantic/muted-foreground` | `Kedaluwarsa` |
| `disputed` | `impact/residual-muted` | `impact/residual-muted-fg` | `Sengketa` |
| `refunded` | `semantic/secondary` | `semantic/secondary-foreground` | `Dana Dikembalikan` |

**`Display/StatusBadge/Batch`** — 6 variants

| `status=` | Fill | Text | Label |
| --- | --- | --- | --- |
| `pending` | `impact/in-progress-muted` | `impact/in-progress-muted-fg` | `Menunggu` |
| `offered` | `impact/in-progress-muted` | `impact/in-progress-muted-fg` | `Ditawarkan` |
| `accepted` | `impact/recovered-muted` | `impact/recovered-muted-fg` | `Diterima` |
| `collected` | `impact/recovered-muted` | `impact/recovered-muted-fg` | `Diambil` |
| `processed` | `impact/recovered-muted` | `impact/recovered-muted-fg` | `Terolah` |
| `unroutable` | `impact/residual-muted` | `impact/residual-muted-fg` | `Tidak Dapat Dirutekan` |

Geometry for all: `radius/sm` (6), padding 8H × 2V, `Caption/Medium`, text bound to the matching `status/*` string variable.

Note that `expired` appears in both Item and Order sets with the same label but different semantic weight — this is exactly why the sets are separate rather than one flat list.

### 7.2 `Card/RescueItemCard`

| Property | Type | Values | Effect |
| --- | --- | --- | --- |
| `state` | Variant | `available`, `low-stock`, `expiring`, `sold-out`, `expired` | Badges, opacity, urgency colour |
| `layout` | Variant | `default`, `compact` | Vertical 4:3 hero vs. horizontal 96px thumb |
| `hasImage` | Boolean | true / false | Photo vs. category-glyph fallback |
| `title` | Text | — | Item name |
| `merchant` | Text | — | Merchant name |
| `distance` | Text | — | e.g. `450 m` |
| `priceOriginal` | Text | — | e.g. `Rp22.000` |
| `priceCurrent` | Text | — | e.g. `Rp12.000` |
| `quantity` | Text | — | e.g. `3 tersisa` |
| `pickupWindow` | Text | — | e.g. `17.00–21.00` |
| `image` | Instance swap | — | Photo placeholder |

| `state=` | Discount badge | Quantity badge | Pickup badge | Image | Interactive |
| --- | --- | --- | --- | --- | --- |
| `available` | `−45%` on brand | `3 tersisa` neutral | `open` (green) | 100% | Yes |
| `low-stock` | `−45%` | `Tinggal 1` amber | `open` | 100% | Yes |
| `expiring` | `−45%` | `2 tersisa` | `soon` (amber) or `closing` (red) | 100% | Yes |
| `sold-out` | hidden | `Habis` grey | hidden | 60% opacity | No |
| `expired` | hidden | hidden | `Kedaluwarsa` | 60% + grayscale | No |

Geometry: `radius/base` (10), `elevation/none` + 1px `semantic/border`, padding 16, gap 12. Image slot ratio-locked 4:3, `radius/base` top corners only.

### 7.3 `Impact/BreakdownBar`

**The signature visual of the product.** Do not redesign it per screen.

| Property | Type | Values |
| --- | --- | --- |
| `size` | Variant | `sm` (8px), `md` (32px), `lg` (48px) |
| `legend` | Boolean | true / false |
| `labels` | Boolean | Inline % on segments ≥12% |
| `state` | Variant | `data`, `empty` |

Four segments, **fixed left-to-right order** tracing the material's journey:

| Order | Segment | Fill | Legend label | Icon |
| --- | --- | --- | --- | --- |
| 1 | Rescued | `impact/rescued` | `Terselamatkan` | `HandHeart` |
| 2 | Recovered | `impact/recovered` | `Terolah` | `Recycle` |
| 3 | In progress | `impact/in-progress` | `Dalam Proses` | `Waypoints` |
| 4 | Residual | `impact/residual` | `Residu` | `Trash2` |

**Never reorder by magnitude.** The order is the narrative: best outcome → second-best → unresolved → unclosed. Reordering makes two dashboards incomparable.

Rules: container `radius/base` with clipping, segments square. Non-zero segments never render below 2px. Zero segments are omitted entirely. Percentages carry one decimal with an Indonesian comma (`62,4%`). Empty state fills the bar with `semantic/muted` and reads `Belum ada data aliran material`.

Reference proportions for the demo (93% circularity): Rescued 62,4% · Recovered 30,6% · In progress 1,0% · Residual 6,0%.

### 7.4 `Display/PickupCodeCard`

| Property | Type | Values |
| --- | --- | --- |
| `variant` | Variant | `code-only`, `with-qr` |
| `size` | Variant | `full`, `compact` |
| `code` | Text | e.g. `K7M 2X9` |
| `merchant` | Text | Merchant name |
| `countdown` | Text | e.g. `2 j 15 mnt` |

| Element | Spec |
| --- | --- |
| Code text | `Mono/PickupCode` — 36/40, weight 700, +15% tracking |
| Visual grouping | `K7M 2X9` with a space; the copied string has no space |
| Stroke | **2px `semantic/foreground`** — the only 2px stroke in the system |
| Fill | `semantic/background` — maximum contrast in both themes |
| Radius | `radius/lg` (14) |
| QR | 160×160, quiet zone 16, encodes `cirquo:pickup:{orderId}:{code}` |
| Brightness hint | `Naikkan kecerahan layar untuk memudahkan pemindaian` |
| Countdown | Below the code, `Caption/Default` |

This card is read across a counter in a dim shop by a tired merchant. Legibility beats elegance at every decision point.

### 7.5 `Impact/CircularityGauge`

| Property | Type | Values |
| --- | --- | --- |
| `size` | Variant | `sm`, `md`, `lg` |
| `showTarget` | Boolean | Tick at 93% |
| `state` | Variant | `data`, `empty` |
| `rate` | Text | e.g. `93,4%` |

Rules: **240° arc, never a closed circle** — a closed ring visually claims a closed loop, which is exactly the overclaim the product forbids. Track `semantic/muted`, fill `impact/rescued`. The 85–95% band is shaded as the realistic operating range. Target tick at 93% labelled `Target 93%`. **The gauge must never be drawn at 100%.** Maximum permissible value in any mockup is `99,9%`, and even that only in an edge-case frame. Never a red-to-green gradient — that would frame 85% as failure.

### 7.6 `Display/EstimatedBadge`

| Property | Type | Values |
| --- | --- | --- |
| `size` | Variant | `sm`, `md` |

Outline badge, `Info` icon 12px + label `Estimasi`. Stroke `semantic/border`, text `semantic/muted-foreground`. Always interactive — tapping opens `Overlay/EstimatedInfoSheet` containing the `disclaimer/estimated-co2e` variable plus the formula and the `impact-v1` methodology version. Never draw an estimated CO2e number without this badge attached.

### 7.7 `Impact/LedgerTimeline` & `Impact/LedgerEventRow`

`LedgerEventRow` properties:

| Property | Type | Values |
| --- | --- | --- |
| `eventType` | Variant | 17 values (see `COMPONENTS.md` §8.5) |
| `isFirst` / `isLast` | Boolean | Connector rendering |
| `hasDelta` | Boolean | Weight change shown |
| `hasDiscrepancy` | Boolean | Listed vs. measured variance |

Row anatomy: connector line + icon chip (32px circle) + label + actor + WIB timestamp, with weight delta and running total right-aligned.

The discrepancy line uses `impact/residual-muted-fg` — noteworthy, not alarming. A 4% variance between a merchant's estimate and a processor's scale is normal, and showing it is a credibility asset.

**The ledger is read-only in every role, including Admin.** Never draw an edit or delete affordance on a ledger row in any frame.

### 7.8 `Card/SummaryCard`

| Property | Type | Values |
| --- | --- | --- |
| `variant` | Variant | `brand`, `rescued`, `recovered`, `residual`, `in-progress`, `neutral` |
| `hasDetail` | Boolean | Third line |
| `estimated` | Boolean | EstimatedBadge + caps value to `Metric/Small` |
| `label` / `value` / `detail` | Text | — |
| `icon` | Instance swap | Lucide icon |

Icon chip 36×36, `radius/md`, fill = the variant's `-muted` token, icon = the variant's `-muted-fg`. **Never `emerald-50`/`emerald-700`** — that is the legacy hardcode being removed (DD-01/DD-07).

### 7.9 Remaining Component Inventory

| Component | Key variants | Notes |
| --- | --- | --- |
| `Base/Button` | `variant` = default/secondary/outline/ghost/link/destructive; `size` = sm/default/lg/icon; `state` = default/hover/pressed/disabled/loading | `lg` = 44px height, mandatory for mobile primaries |
| `Base/Input` | `state` = default/focus/error/disabled; `hasIcon` | 16px text prevents iOS zoom |
| `Base/Select` | `state`, `open` | — |
| `Base/Textarea` | `state`, `rows` = 3 | — |
| `Base/Badge` | `variant` = default/secondary/destructive/outline | Base for StatusBadge |
| `Base/Tabs` | `count` = 2/3/4; `active` index | Max 4 on mobile |
| `Base/Table` | `columns` = 3–7; `density` = compact/default | Collapses to stacked rows below `md` |
| `Base/Skeleton` | `variant` = card/list-row/table-row/stat/map/bar/timeline/form | Must match real content dimensions |
| `Display/PriceDisplay` | `size` = sm/md/lg; `hasDiscount` | Current price first, original struck through |
| `Display/PickupWindowBadge` | `urgency` = upcoming/open/soon/closing/closed | `closing` is the sole non-action use of destructive |
| `Display/CountdownTimer` | `format` = long/short; `state` = running/expired | Never animated |
| `Display/DietaryTagList` | `count` = 1–6; `editable`; `overflow` | Disclaimer always adjacent |
| `Display/DistanceLabel` | `unit` = m/km; `approximate` | `±` prefix when from fallback centre |
| `Display/VerificationBadge` | `status` = unverified/pending/verified/rejected/suspended | Tooltip carries `disclaimer/verification` |
| `Impact/StatCard` | `variant`; `estimated`; `size` = md/lg; `drillDown` | Estimated caps at `Metric/Small` |
| `Impact/CapacityMeter` | `utilisation` = low/medium/high/over | Over-capacity is genuinely destructive |
| `Input/QuantityStepper` | `state` = default/min/max/disabled | 44px buttons |
| `Input/PickupCodeInput` | `state` = empty/partial/complete/error; `boxes` = 6 | Auto-advance, auto-submit |
| `Nav/BottomBar` | `active` = home/explore/orders | 56px, consumer only |
| `Nav/Sidebar` | `role` = merchant/processor/admin; `active` index | 256px, `lg`+ only |
| `Nav/Header` | `role` = consumer/operator; `scrolled` | 64px |
| `Card/OrderCard` | `status` (7); `showCode` | Active orders surface the code inline |
| `Card/RecoveryBatchCard` | `status` (6) | Affordances change per status |
| `Overlay/FilterSheet` | `state` = default/applied | Live result count on the apply button |
| `Overlay/ConfirmDialog` | `variant` = default/destructive; `presentation` = sheet/dialog | Sheet below `lg`, Dialog at `lg`+ |
| `Overlay/Toast` | `type` = success/error/info/warning/loading | Top-centre mobile, bottom-right desktop |
| `State/Empty` | `context` = no-data/no-results/no-nearby/cleared | Icon + title + one sentence + ≤1 action |
| `State/Error` | `variant` = inline/page; `hasRetry` | Names what failed |
| `Map/MerchantMarker` | `state` = default/selected/urgent/cluster; `count` | 44px hit area, 32px artwork |
| `Display/OrderTimeline` | `currentStep`; `branch` = none/cancelled/expired/disputed/refunded | Vertical stepper |

---

## 8. Frame Inventory

Every screen that must exist. `Implemented` = a codebase placeholder already exists; `Planned` = to be designed from scratch.

### 8.1 Consumer — `03 Consumer`

| # | Frame name | Route | Status | Purpose | Composed of |
| --- | --- | --- | --- | --- | --- |
| C-01 | `Consumer / Splash` | — | Planned | Brand moment while auth resolves | Logo, `Impact/BreakdownBar` teaser |
| C-02 | `Consumer / Onboarding — Value` | — | Planned | Explain the circular loop in 3 slides | Illustration-free, `Impact/BreakdownBar` |
| C-03 | `Consumer / Role Select` | `/register` | Planned | Choose Consumer / Mitra Usaha / Pengolah Organik | 3 `Card` options |
| C-04 | `Consumer / Register` | `/register/consumer` | Planned | Email, password, name, city | `Base/Input`, `Base/Button` |
| C-05 | `Consumer / Login` | `/login` | Planned | Sign in | `Base/Input`, `Base/Button` |
| C-06 | `Consumer / Home` | `/` | Implemented | Nearby items + personal impact snapshot | `Nav/Header`, `Impact/StatCard`, `Card/RescueItemCard` ×3, `Nav/BottomBar` |
| C-07 | `Consumer / Home — Empty` | `/` | Planned | No items nearby | `State/Empty` |
| C-08 | `Consumer / Home — Loading` | `/` | Planned | Skeletons | `Base/Skeleton` stat + card |
| C-09 | `Consumer / Explore — Map` | `/explore` | Implemented | Map-first discovery | `Map/MerchantMarker`, map controls, filter FAB |
| C-10 | `Consumer / Explore — List` | `/explore` | Planned | List view of the same results | `Card/RescueItemCard` compact ×6 |
| C-11 | `Consumer / Explore — Split @ 1440` | `/explore` | Planned | 384px list + map | Split layout |
| C-12 | `Consumer / Explore — Location Denied` | `/explore` | Planned | Semarang fallback + banner | `LocationPermissionPrompt` |
| C-13 | `Consumer / Filter Sheet` | `/explore` | Planned | Category, dietary, distance, price, sort | `Overlay/FilterSheet` |
| C-14 | `Consumer / Listing Detail` | `/item/:id` | Planned | Full item view | Hero image, `PriceDisplay lg`, `PickupWindowBadge`, `DietaryTagList`, sticky action bar |
| C-15 | `Consumer / Listing Detail — Sold Out` | `/item/:id` | Planned | Disabled reserve + reason | `StatusBadge item=sold-out` |
| C-16 | `Consumer / Reservation Sheet` | `/item/:id` | Planned | Quantity + total + terms | `Input/QuantityStepper`, `PriceDisplay` |
| C-17 | `Consumer / Checkout` | `/checkout/:orderId` | Planned | Midtrans handoff | Order summary, payment method |
| C-18 | `Consumer / Payment — Pending` | `/checkout/:orderId` | Planned | Awaiting settlement | `PaymentStatusPanel`, `CountdownTimer` |
| C-19 | `Consumer / Payment — Success` | `/checkout/:orderId` | Planned | Settled | `PaymentStatusPanel`, CTA to code |
| C-20 | `Consumer / Payment — Failed` | `/checkout/:orderId` | Planned | Failure + retry within grace | `PaymentStatusPanel`, retry/cancel |
| C-21 | `Consumer / Pickup Code` | `/orders/:id/code` | Planned | **Demo-critical.** Large code + QR | `Display/PickupCodeCard` |
| C-22 | `Consumer / Order History` | `/orders` | Implemented | Active + past | `Base/Tabs`, `Card/OrderCard` ×5 |
| C-23 | `Consumer / Order History — Empty` | `/orders` | Planned | No orders yet | `State/Empty` |
| C-24 | `Consumer / Order Detail` | `/orders/:id` | Planned | Timeline + code + ledger link | `OrderTimeline`, `PickupCodeCard compact` |
| C-25 | `Consumer / Impact Dashboard` | `/impact` | Planned | Personal impact | `Impact/BreakdownBar`, `Impact/StatCard` ×4, `EstimatedBadge` |
| C-26 | `Consumer / Impact — Estimate Info Sheet` | `/impact` | Planned | CO2e methodology disclosure | Formula + `impact-v1` |
| C-27 | `Consumer / Profile` | `/profile` | Planned | Dietary prefs, location, theme, language | Toggle chips, `Base/Select` |
| C-28 | `Consumer / Not Found` | `*` | Implemented | 404 | `State/Error page` |

### 8.2 Merchant — `04 Merchant`

| # | Frame name | Route | Status | Purpose | Composed of |
| --- | --- | --- | --- | --- | --- |
| M-01 | `Merchant / Register` | `/register/merchant` | Planned | Business account creation | `Base/Input` |
| M-02 | `Merchant / Business Profile` | `/merchant/profile` | Planned | Name, address, category, hours, map pin | Form + mini-map |
| M-03 | `Merchant / Verification Pending` | `/merchant/pending` | Planned | Awaiting admin approval | `VerificationBadge pending`, `disclaimer/verification` |
| M-04 | `Merchant / Dashboard` | `/merchant` | Implemented | Today's operations | `Card/SummaryCard` ×4, today's pickups, `Impact/BreakdownBar` |
| M-05 | `Merchant / Dashboard — Empty` | `/merchant` | Planned | New merchant, zero data | `State/Empty` with CTA to create a listing |
| M-06 | `Merchant / Listing List` | `/merchant/surplus` | Implemented | All Rescue Items | `Base/Table` (7 cols), `StatusBadge item` |
| M-07 | `Merchant / Listing List @ 390` | `/merchant/surplus` | Planned | Stacked rows | Collapsed table |
| M-08 | `Merchant / Create Listing` | `/merchant/surplus/new` | Implemented | **The 120-second form** | Photo, title, category, qty, weight (g), price, window, dietary |
| M-09 | `Merchant / Create Listing — Price Suggestion` | `/merchant/surplus/new` | Planned | Dynamic Rescue Pricing chip | Tappable suggestion, labelled `Harga Penyelamatan Dinamis` |
| M-10 | `Merchant / Create Listing — Validation` | `/merchant/surplus/new` | Planned | Zod errors shown | `FormMessage` states |
| M-11 | `Merchant / Listing Detail` | `/merchant/surplus/:id` | Planned | Item + orders + ledger | `StatusBadge`, `LedgerTimeline` |
| M-12 | `Merchant / Pending Pickups` | `/merchant/pickup` | Planned | Today's expected collections | `Card/OrderCard` ×4 with countdowns |
| M-13 | `Merchant / Verify Pickup Code` | `/merchant/pickup` | Planned | **Demo-critical.** 6-box entry | `Input/PickupCodeInput`, scan button |
| M-14 | `Merchant / Verify — Error` | `/merchant/pickup` | Planned | 4 failure reasons | Error copy per reason |
| M-15 | `Merchant / Pickup Success` | `/merchant/pickup` | Planned | Confirm before writing RESCUED | Order summary + `Selesaikan pengambilan` |
| M-16 | `Merchant / No-Show Report` | `/merchant/pickup/:id/noshow` | Planned | Report uncollected → routes to recovery | Neutral copy: `Tidak Diambil` |
| M-17 | `Merchant / Impact Dashboard` | `/merchant/impact` | Planned | Business circularity + revenue recovered | `Impact/BreakdownBar`, `CircularityGauge`, `Impact/StatCard` |

### 8.3 Organic Processor — `05 Processor`

| # | Frame name | Route | Status | Purpose | Composed of |
| --- | --- | --- | --- | --- | --- |
| P-01 | `Processor / Register` | `/register/processor` | Planned | Facility account | `Base/Input` |
| P-02 | `Processor / Facility Profile` | `/processor/profile` | Planned | Capacity (kg/week), material types, service radius, location | Form + `CapacityMeter` preview |
| P-03 | `Processor / Verification Pending` | `/processor/pending` | Planned | Awaiting approval | `VerificationBadge pending` |
| P-04 | `Processor / Dashboard` | `/processor` | Implemented | Capacity + intake + outcome mix | `Impact/CapacityMeter`, `Card/SummaryCard` ×4, outcome breakdown |
| P-05 | `Processor / Dashboard — Over Capacity` | `/processor` | Planned | >100% utilisation | `CapacityMeter over`, warning banner |
| P-06 | `Processor / Routed Queue` | `/processor/recovery` | Implemented | Offered / accepted / collected batches | `Base/Tabs`, `Card/RecoveryBatchCard` ×4 |
| P-07 | `Processor / Routed Queue — Empty` | `/processor/recovery` | Planned | No batches routed | `State/Empty` |
| P-08 | `Processor / Batch Detail` | `/processor/recovery/:id` | Planned | Items, weights, merchants, ledger | `SummaryCard` ×4, `LedgerTimeline` |
| P-09 | `Processor / Batch — Accept / Decline` | `/processor/recovery/:id` | Planned | Respond to an offer | Response countdown, `ConfirmDialog` on decline |
| P-10 | `Processor / Intake Form` | `/processor/recovery/:id/intake` | Planned | **Demo-critical.** Measured weight | Weight (g), contamination note, photo, collected-at |
| P-11 | `Processor / Intake — Variance Warning` | `/processor/recovery/:id/intake` | Planned | >25% deviation from estimate | Warning, **not** a block |
| P-12 | `Processor / Outcome Form` | `/processor/recovery/:id/outcome` | Planned | **Demo-critical.** Output + residual | Output type (4), output weight, residual weight, live summary strip |
| P-13 | `Processor / Outcome — Validation Error` | `/processor/recovery/:id/outcome` | Planned | `residual ≤ accepted` violated | `Residu tidak boleh melebihi berat yang diterima` |
| P-14 | `Processor / History` | `/processor/history` | Planned | Processed batches | `Base/Table`, `StatusBadge batch` |
| P-15 | `Processor / Impact Dashboard` | `/processor/impact` | Planned | Facility conversion performance | `Impact/BreakdownBar` (no Rescued segment), output-type mix |

### 8.4 Admin — `06 Admin`

| # | Frame name | Route | Status | Purpose | Composed of |
| --- | --- | --- | --- | --- | --- |
| A-01 | `Admin / Login` | `/admin/login` | Planned | Restricted sign-in | `Base/Input` |
| A-02 | `Admin / Dashboard` | `/admin` | Implemented | Platform health | `CircularityGauge`, `Impact/BreakdownBar`, `SummaryCard` ×4, queue depths |
| A-03 | `Admin / Pending Verifications` | `/admin/verifications` | Planned | Merchant + processor queue | `Base/Table`, `VerificationBadge` |
| A-04 | `Admin / Verification Detail` | `/admin/verifications/:id` | Planned | Documents + approve/reject | Doc viewer, `ConfirmDialog destructive` |
| A-05 | `Admin / Listing Moderation` | `/admin/moderation` | Planned | Reported / suspect items | `Base/Table`, `StatusBadge item=moderated` |
| A-06 | `Admin / Ledger Search` | `/admin/ledger` | Planned | Query by item, merchant, date, event type | Filters + results table |
| A-07 | `Admin / Item Ledger Audit` | `/admin/ledger/:itemId` | Planned | **Demo-critical.** Full audit trail | `LedgerTimeline` with all 17 event types |
| A-08 | `Admin / Disputes List` | `/admin/disputes` | Planned | Open disputes | `Base/Table`, `StatusBadge order=disputed` |
| A-09 | `Admin / Dispute Detail` | `/admin/disputes/:id` | Planned | Evidence + resolve/refund | Order timeline, refund action |
| A-10 | `Admin / Integrity Checks` | `/admin/integrity` | Planned | Ledger anomalies | Circularity ≥99.95% flags, residual>intake, orphaned batches |
| A-11 | `Admin / Platform Impact` | `/admin/impact` | Planned | Aggregate reporting | `CircularityGauge`, `BreakdownBar`, `EstimatedBadge` on CO2e |

### 8.5 Cross-Cutting State Frames

Each role's `States` section must contain, at minimum:

| Frame | Purpose |
| --- | --- |
| `{Role} / States — Loading` | Skeleton variants for that role's primary screen |
| `{Role} / States — Empty` | No-data and no-results variants |
| `{Role} / States — Error` | Inline and page variants |
| `{Role} / States — Dark` | Primary screen in dark mode |
| `{Role} / States — Long Content` | Longest realistic Indonesian strings, worst-case truncation |

The long-content frame matters more than it sounds: `Tidak Dapat Dirutekan` and `Permintaan Pemulihan` are considerably longer than their English equivalents and break naively sized components.

---

## 9. Icon Inventory

**Lucide only.** Import the Lucide Figma plugin. No second icon set, no custom glyphs, no icon font.

Sizes: **16** (inline with 14px text), **20** (buttons, nav, list rows), **24** (empty states, section headers). No other sizes exist.

Colour: always `currentColor` equivalent — bind icon fill to the parent text colour variable, never hardcode.

### 9.1 Universal

| Icon | Meaning |
| --- | --- |
| `Menu` | Hamburger (needs `aria-label` = `Buka menu navigasi`) |
| `X` | Close, dismiss |
| `ChevronLeft` / `ChevronRight` | Back, forward |
| `ChevronDown` | Expand, select |
| `Search` | Search |
| `Filter` | Filter |
| `ArrowUpDown` | Sort |
| `Info` | Estimated / explanation affordance |
| `AlertTriangle` | Error |
| `Check` / `CheckCircle2` | Success |
| `Loader2` | Loading spinner |
| `MoreVertical` | Row actions |
| `Sun` / `Moon` | Theme toggle |

### 9.2 Impact & Domain — semantically fixed

| Icon | Meaning | Never used for |
| --- | --- | --- |
| `HandHeart` | **Rescued** | Anything else |
| `Recycle` | **Recovered** / processing | Anything else |
| `Trash2` | **Residual** (neutral colour) | Delete actions |
| `Waypoints` | **Circular Routing** / in progress | — |
| `ScrollText` | **Material Flow Ledger** | — |
| `Leaf` | Impact, CO2e | — |
| `Package` | Rescue Item / listing | — |
| `Scale` | Weight measurement | — |
| `Gauge` | Capacity, circularity | — |

### 9.3 Consumer

`Home` · `Map` · `MapPin` · `Compass` · `ShoppingBag` · `Clock` · `TimerOff` · `KeyRound` · `QrCode` · `CreditCard` · `Store` · `Salad` · `Sprout` · `Ban` · `BadgeCheck` · `Wheat` · `User` · `Navigation` · `Minus` · `Plus` · `Copy` · `Share2`

### 9.4 Merchant

`LayoutDashboard` · `Package` · `PackagePlus` · `Pencil` · `Trash2` · `Camera` · `Tag` · `Percent` · `Calendar` · `Clock` · `KeyRound` · `ScanLine` · `UserX` (no-show) · `TrendingUp` · `Wallet` · `Store` · `BadgeCheck`

### 9.5 Processor

`LayoutDashboard` · `Recycle` · `Factory` · `Truck` · `Scale` · `Gauge` · `Bug` (BSF larvae) · `Sprout` (compost) · `Flame` (biogas) · `Beef` (animal feed) · `ClipboardCheck` · `Waypoints` · `Send` · `AlertCircle` · `History`

### 9.6 Admin

`LayoutDashboard` · `ShieldCheck` · `ShieldAlert` · `BadgeCheck` · `FileSearch` · `ScrollText` · `MessageSquareWarning` · `MessageSquare` · `Users` · `Building2` · `Flag` · `Lock` · `Database` · `Activity`

---

## 10. Imagery & Placeholders

| Rule | Detail |
| --- | --- |
| Count | Exactly **one** photo per Rescue Item. The merchant's time budget does not permit more. |
| Aspect ratio | 4:3, always. Forgiving for phone photography and prevents layout shift. |
| Source for mockups | Real Indonesian food photography — nasi, roti, gorengan, kue, buah. **Not** Western café stock imagery. Cirquo operates in Semarang. |
| Quality | Deliberately imperfect. Real merchant photos are shot on a phone under fluorescent shop lighting. Polished studio photography sets a false expectation. |
| Prohibited | Filters, saturation boosts, artistic vignetting |
| Fallback | Category glyph on `semantic/muted` + category name. **Never** a broken-image icon, **never** substitute stock imagery. |
| Overlay legibility | Discount and quantity badges sit on a translucent scrim so they remain readable over any photo |
| Alt text (recorded in the handoff annotation) | `Foto {nama item} dari {nama mitra}` |
| Operator surfaces | Photos appear only in item detail, never in tables — a 40px thumbnail communicates nothing at queue-scanning speed and costs a request |
| Illustrations | **None.** No spot illustrations, no empty-state characters, no hero graphics. They cost bytes against a 2s FCP budget on 4G and rarely survive dark mode. |

**Realistic placeholder content.** Use plausible Indonesian data throughout, never lorem ipsum:

| Field | Example values |
| --- | --- |
| Item titles | `Roti Sourdough`, `Nasi Kotak Ayam Bakar`, `Kue Lapis Legit`, `Gorengan Campur`, `Salad Buah` |
| Merchants | `Toko Roti Semarang`, `Warung Bu Tini`, `Kedai Kopi Simpang Lima`, `Bakery Pandanaran` |
| Processors | `Pengolah Maggot Semarang`, `Kompos Tembalang`, `Biogas Mijen` |
| Prices | `Rp8.000`, `Rp12.000`, `Rp22.000`, `Rp35.000` |
| Weights | `450 g`, `1,2 kg`, `2,4 kg`, `12,0 kg` |
| Distances | `450 m`, `1,2 km`, `3,8 km` |
| Times | `17.00–21.00`, `6 Agu 2026, 14.32 WIB` |
| Pickup codes | `K7M 2X9`, `B3P 8Q4` |
| Circularity | `93,4%` — never `100%` |

---

## 11. Prototyping

Page `07 Flows`. Three prototypes, matching the demo script. Keep them clickable end-to-end — a prototype that dead-ends mid-demo is worse than no prototype.

### 11.1 Flow 1 — Consumer Rescue (the RESCUED path)

```
C-06 Home
  → tap card → C-14 Listing Detail
    → tap Reservasi → C-16 Reservation Sheet
      → tap Lanjut ke pembayaran → C-17 Checkout
        → tap Bayar → C-18 Payment Pending
          → (delay 1500ms) → C-19 Payment Success
            → tap Lihat kode → C-21 Pickup Code
```

Transitions: `Smart Animate`, 200ms, `Ease Out`. Sheets slide from the bottom. **No page-transition animation between routes** — instant navigation is what makes the product feel fast, and the prototype should reflect that.

### 11.2 Flow 2 — Merchant Verify (closing the RESCUED loop)

```
M-04 Dashboard
  → tap Verifikasi Kode → M-13 Verify Pickup Code
    → enter K7M2X9 → M-15 Pickup Success
      → tap Selesaikan pengambilan → M-04 Dashboard (updated counters)
```

The return to M-04 must show **changed numbers** — this is what visually demonstrates that a pickup writes to the ledger and impact figures derive from it.

### 11.3 Flow 3 — Circular Routing (the RECOVERED path — the core innovation)

```
M-06 Listing List (item shows status=expired)
  → (system) → P-06 Routed Queue (batch appears, status=offered)
    → tap batch → P-08 Batch Detail
      → tap Terima batch → P-10 Intake Form
        → enter 2400 g → P-12 Outcome Form
          → select Maggot BSF, output 1850 g, residual 400 g
            → submit → A-07 Item Ledger Audit (full trail visible)
```

**This is the demo's closing move.** The final frame must show the complete `LedgerTimeline` from `item_listed` through `residual_logged`, proving every kilogram was accounted for. Rehearse it — it is the argument the whole product makes.

### 11.4 Prototype Settings

| Setting | Value |
| --- | --- |
| Device | iPhone 14 (390×844) |
| Background | `semantic/background` (light) |
| Starting frame | C-06 for Flow 1, M-04 for Flow 2, M-06 for Flow 3 |
| Overflow | Vertical scrolling on all content frames |
| Fixed elements | Header, bottom nav, sticky action bars set to `Fix position when scrolling` |
| Hotspot size | Minimum 44×44 — matching the real tap-target rule |

---

## 12. Handoff

### 12.1 Source of Truth

> **Figma is a communication artefact. `src/index.css` is the source of truth.**
>
> Where Figma and the codebase disagree on a token value, spacing step, radius, or type size, **the codebase wins** and the Figma file is corrected. Design does not file a bug against the code for a colour mismatch; design updates the variable.
>
> This is deliberate. The codebase is the artefact that ships, gets tested, and is judged. A design file that drifts from it produces handoff arguments no one has time for during a hackathon build.
>
> **Exception:** a *proposed* change is drawn in Figma first, discussed, and then implemented in `src/index.css`. The moment it lands in code, code is authoritative again. Proposals live in a clearly marked `PROPOSAL —` prefixed frame so they are never mistaken for the current system.

### 12.2 Redlining Convention

Annotations live on page `08 Handoff`, never on the design frames themselves.

| Annotation type | Colour | Format |
| --- | --- | --- |
| Spacing | Magenta `#e91e63` | Arrow + `space/4 (16)` |
| Token reference | Blue `#2196f3` | `→ semantic/primary` |
| Type style | Purple `#9c27b0` | `Body/Default 14/20 400` |
| Behaviour note | Orange `#ff9800` | Prose describing interaction |
| Accessibility note | Green `#4caf50` | `aria-label: "Buka menu navigasi"` |
| Open question | Red `#f44336` | `? Does the grace period after payment failure last 10 minutes?` |

Every annotation cites the token name, not the raw value: write `semantic/primary`, not `#047857`. The hex changes; the token name does not.

### 12.3 Handoff Checklist

Before a frame is marked `Ready`:

| # | Check |
| --- | --- |
| 1 | Frame named per §2 convention |
| 2 | Every colour bound to a variable — **zero raw hex fills** |
| 3 | Every text layer uses a published text style |
| 4 | Every spacing value from the `Spacing` collection |
| 5 | Every radius from the `Radius` collection |
| 6 | Auto Layout on every container; absolute positioning only in the three permitted cases |
| 7 | All components are instances, no detached copies |
| 8 | Light **and** dark mode both verified |
| 9 | Mobile (390) frame exists; tablet/desktop only where the layout genuinely changes |
| 10 | Loading, empty and error states designed |
| 11 | All copy in Bahasa Indonesia, bound to `Copy` variables where a variable exists |
| 12 | Terminology matches the glossary exactly — no synonyms |
| 13 | No forbidden words (§0.1) anywhere in the frame |
| 14 | Estimated figures carry `Display/EstimatedBadge` |
| 15 | Circularity never shown at 100% |
| 16 | Residual is amber, never red |
| 17 | Tap targets ≥ 44×44 |
| 18 | Icon-only controls annotated with their `aria-label` |
| 19 | Text contrast checked against WCAG AA (4.5:1 body, 3:1 large/UI) |
| 20 | Long-content variant checked for truncation |
| 21 | No delivery, courier or ETA imagery |
| 22 | Numbers formatted `id-ID`: `Rp22.000`, `2,4 kg`, `93,4%` |
| 23 | Times in WIB with dot separators: `17.00–21.00` |
| 24 | Annotated on `08 Handoff` with token references |

### 12.4 Asset Export

| Asset | Format | Sizes | Destination |
| --- | --- | --- | --- |
| App icon | PNG | 192, 512 + 512 maskable | `public/` — resolves DD-03 |
| Logo mark | SVG | — | `src/assets/` |
| Wordmark | SVG | — | `src/assets/` |
| Favicon | SVG + ICO | 32 | `public/` |
| Map marker | SVG | 32, 40 | `src/assets/` |
| Category fallback glyphs | SVG | 48 | `src/assets/` |

**Do not export icons.** Lucide is a code dependency (`lucide-react`); exporting SVGs from Figma would duplicate and desynchronise them. Reference the Lucide name in the annotation instead.

**PWA colour note.** `public/manifest.webmanifest` must carry `theme_color: "#047857"` — the hex of `brand/700`. Manifests cannot read CSS variables, so this hex is duplicated by necessity. Any change to `brand/700` requires updating the manifest in the same commit.

### 12.5 Open Questions

Tracked on `08 Handoff` in red annotations. Current list:

| # | Question | Blocks |
| --- | --- | --- |
| Q-01 | How long is the reservation grace period after a payment failure? | C-20 |
| Q-02 | Can a merchant edit a Rescue Item that already has paid orders? | M-11 |
| Q-03 | What is the response deadline for a processor batch offer? | P-09 |
| Q-04 | Does the consumer see which processor received their uncollected item? | C-24 |
| Q-05 | Is the pickup code 6 alphanumeric characters or 6 digits? | C-21, M-13 |
| Q-06 | What triggers `unroutable` — a fixed number of declines or a time limit? | P-06, A-10 |

---

## 13. Related Documents

| Document | Path | Relationship |
| --- | --- | --- |
| Design Principles | [`DESIGN.md`](DESIGN.md) | Strategy behind every decision here |
| UI Guide | [`UI_GUIDE.md`](UI_GUIDE.md) | Authoritative token values mirrored by the Figma variables |
| Component Catalogue | [`COMPONENTS.md`](COMPONENTS.md) | TypeScript props matching the Figma variants |
| Product Requirements | [`../product/PRD.md`](../product/PRD.md) | What the screens must accomplish |
| Product Overview | [`../product/PRODUCT.md`](../product/PRODUCT.md) | Positioning and value proposition |
| User Flows | [`../spec/USER_FLOW.md`](../spec/USER_FLOW.md) | Flows the prototypes reproduce |
| Feature Specification | [`../spec/FEATURES.md`](../spec/FEATURES.md) | Feature behaviour behind each frame |
| Roles & Permissions | [`../spec/ROLES.md`](../spec/ROLES.md) | Role boundaries driving page separation |
| Frontend Architecture | [`../architecture/FRONTEND.md`](../architecture/FRONTEND.md) | Routes referenced in the frame inventory |
| Realtime Architecture | [`../architecture/REALTIME.md`](../architecture/REALTIME.md) | Why loading states are per-section |
| State Machine | [`../domain/STATE_MACHINE.md`](../domain/STATE_MACHINE.md) | Authoritative status enums behind every StatusBadge variant |
| Impact Model | [`../impact/IMPACT.md`](../impact/IMPACT.md) | CO2e formula shown in the estimate sheet |
| Material Flow Ledger | [`../impact/MATERIAL_LEDGER.md`](../impact/MATERIAL_LEDGER.md) | Event types in `LedgerEventRow` |
| Style Guide | [`../engineering/STYLE_GUIDE.md`](../engineering/STYLE_GUIDE.md) | Code conventions |
| Testing Strategy | [`../engineering/TESTING.md`](../engineering/TESTING.md) | What gets verified after handoff |
| Roadmap | [`../business/ROADMAP.md`](../business/ROADMAP.md) | Milestones gating frame delivery |

---

**Built for DSDC ANFORCOM 2026**  
**Platform:** Cirquo — Closing the Loop, Saving Every Meal
