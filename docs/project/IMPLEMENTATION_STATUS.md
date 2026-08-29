# Status Implementasi — Cirquo

**Jenis dokumen:** Snapshot implementasi dan rencana pengiriman
**Sumber kebenaran:** source saat ini (`convex/`, `src/`, dan konfigurasi proyek)
**Verifikasi source:** 2026-08-29
**Bukan:** bukti UAT, catatan rilis, atau pengganti PRD

---

## Cara membaca status

Dokumen produk, domain, API, dan arsitektur menjelaskan **kontrak target MVP**.
Dokumen ini membedakan kontrak tersebut dari yang benar-benar ada di source.
Jangan menyatakan alur selesai hanya karena sebuah route atau tabel sudah ada.

| Status | Arti |
|---|---|
| ✅ Source tersedia | Implementasi ada di source dan dapat diaudit. UAT tetap diperlukan untuk klaim end-to-end. |
| 🧪 UAT diperlukan | Source tersedia, tetapi harus diverifikasi pada deployment Sandbox/perangkat nyata. |
| 📋 Target | Kontrak telah direncanakan, tetapi surface produksi belum ada. |

Semua status di bawah adalah **source-level** kecuali dinyatakan lain.

---

## Snapshot saat ini

### Fondasi data dan identitas — M1

| Surface | Status | Bukti source |
|---|---|---|
| Skema Convex | ✅ Source tersedia | 10 tabel: `users`, `sessions`, `authEvents`, `merchants`, `processors`, `surplusItems`, `materialFlowLedger`, `orders`, `recoveryBatches`, `payments`. |
| Sesi dan autentikasi | ✅ Source tersedia | `auth.register`, `auth.login`, `auth.logout`, `auth.getCurrentUser`; token sesi disimpan sebagai hash. |
| Guard peran | ✅ Source tersedia | `resolveAuth`, `requireRole`, dan guard route React. |
| Onboarding profil | ✅ Source tersedia | `merchants.createProfile` dan `processors.createProfile`; Merchant/Processor perlu verifikasi sebelum surface transaksi terproteksi. |
| Material Flow Ledger | ✅ Source tersedia | `recordLedgerEvent()` menulis append-only dalam mutasi yang sama dengan perubahan state pada alur yang telah diimplementasikan. |

### Merchant dan Dynamic Rescue Pricing — M2

| Surface | Status | Bukti source |
|---|---|---|
| Rescue Item draft/publish/edit/cancel/list | ✅ Source tersedia | `surplusItems.create`, `publish`, `update`, `cancel`, dan `listMine`. |
| Dynamic Rescue Pricing | ✅ Source tersedia | Fungsi murni `src/lib/pricing.ts`; server tetap menegakkan harga dan validasi listing. |
| Ledger listing dan perubahan harga | ✅ Source tersedia | `LISTED`, `PRICE_ADJUSTED`, dan `CANCELLED` ditulis oleh mutasi Merchant yang relevan. |

### Consumer discovery, reservasi, dan pembayaran — M3

| Surface | Status | Bukti source |
|---|---|---|
| Discovery dan Mapbox | ✅ Source tersedia | `discovery.listNearby`, `discovery.getListing`, filter/ranking murni, dan halaman Consumer Mapbox. |
| Reservasi atomik | ✅ Source tersedia | `orders.reserve` mengurangi stok, menyimpan `totalPrice` dan `rescuedWeightGrams`, serta menulis `RESERVED` bernilai 0 gram dalam satu mutasi. |
| Payment hold | ✅ Source tersedia | `orders.reserve` menjadwalkan `orders.expireHold`; hold kedaluwarsa mengembalikan stok satu kali dan menulis `CANCELLED` bernilai 0 gram. |
| Midtrans Sandbox | 🧪 UAT diperlukan | `payments.createTransaction` membuat Snap transaction; `/midtrans/webhook` memverifikasi signature dan jumlah sebelum mengubah order menjadi `paid` serta menulis `PAID`. |
| Riwayat dan detail pesanan | ✅ Source tersedia | `orders.listMine` consumer-scoped tanpa pickup code; `orders.get` mengembalikan code hanya untuk pemilik dengan status `paid`; halaman memakai query reaktif. |
| M3-07 | 🧪 UAT diperlukan | Rekam bukti discovery → reserve → webhook Sandbox → paid → expiry, lalu periksa ledger dan handoff M4. |

### Batas implementasi saat ini

| Milestone | Status | Yang masih harus dibangun |
|---|---|---|
| M4 | 🧪 UAT deployment diperlukan | Konfirmasi pickup, expiry/recovery batch, refund Sandbox no-show, Circular Routing, dan UI status reaktif Merchant/Consumer tersedia di source. Kontrak M5 ada di `M5_HANDOFF.md`; UAT browser/Midtrans masih diperlukan. |
| M5 | 🧪 UAT deployment diperlukan | Queue dan detail batch Processor, accept/decline, intake terukur, outcome, dashboard operasional, serta edit profil kapasitas tersedia di source. UAT browser pada deployment masih diperlukan. |
| M6 | 📋 Target | Agregasi impact dari ledger dan semua dashboard tanpa angka mock. `impact.getPlaceholderSummary` bukan kontrak dashboard produksi. |
| M7 | 📋 Target | Operasi Admin, ledger inspector, moderasi, dan notifikasi. Route halaman bukan bukti mutasi/query Admin telah tersedia. |
| M8 | 📋 Target | Validasi Android, seed demo, video, dan aset submission. Konfigurasi Capacitor sudah ada. |

---

## Kontrak source M4

1. Order `paid` menyimpan snapshot `totalPrice`, `quantity`, dan
   `rescuedWeightGrams`; M4 wajib memakai `-order.rescuedWeightGrams`, bukan
   menghitung ulang dari Rescue Item saat menulis `RESCUED`.
2. Pickup code dibuat server-side pada reservasi. `orders.listMine` tidak boleh
   memproyeksikannya; `orders.get` hanya mengungkapkannya kepada Consumer
   pemilik ketika `status === 'paid'`.
3. Merchant harus memverifikasi code yang diberikan Consumer. Jangan membuat
   query Merchant yang mengirimkan expected pickup code sebelum verifikasi.
4. `orders.confirmPickup` adalah mutasi terjaga yang mengubah order ke
   `picked_up` dan menulis `RESCUED` dengan delta gram negatif dalam transaksi
   Convex yang sama.
5. Expiry payment hold tetap dimiliki M3: order menjadi `expired`, stok kembali,
   dan eventnya `CANCELLED` dengan `weightDeltaGrams: 0`. M4 tidak menduplikasi
   scheduler atau event ini.
6. Expiry pickup M4 membuat satu recovery batch dan satu `EXPIRED` dengan delta
   negatif; `ROUTED` dan `ROUTING_FAILED` berikutnya adalah audit state batch
   bernilai 0 g agar berat immutable tidak terdebit dua kali.
7. Circular Routing hanya menawarkan satu Processor terverifikasi pada satu waktu.
   Kandidat diurutkan secara deterministik: jarak, kapasitas tersisa, lalu ID.
   Tiga offer yang kedaluwarsa menjadikan batch `unroutable`.

## Kontrak source M5

1. Processor terverifikasi hanya dapat membaca dan mengubah recovery batch yang
   ditugaskan kepadanya. Queue, detail, dashboard, dan riwayat memakai query
   Convex reaktif.
2. `accept` tidak menulis `INTAKE_ACCEPTED`: berat fisik belum diterima. Offer
   yang ditolak menulis `INTAKE_DECLINED (0 g)`, sedangkan intake terukur menulis
   satu `INTAKE_ACCEPTED (+M)` dan outcome final menulis satu `PROCESSED (-M)`.
3. Berat intake dan outcome adalah integer gram. `output + residual` tidak dapat
   melampaui intake; residual nol memerlukan konfirmasi server-side.
4. Dashboard Processor menjumlahkan output, residual, intake, dan recovery rate
   dari event ledger miliknya. Komitmen kapasitas memakai batch yang telah
   diterima hari ini; offer aktif belum mengunci kapasitas.
5. Profil Processor dapat mengubah material, kapasitas, radius, output, dan jam
   operasional untuk routing berikutnya. `acceptedOutputTypes` pada batch menjaga
   agar perubahan profil tidak membatalkan batch yang telah diterima.

---

## Kontrak dan dokumentasi target

| Area dokumen | Cara membacanya sekarang |
|---|---|
| PRD, user stories, user flows, dan state machine | Requirement dan state target MVP. Bandingkan dengan snapshot ini sebelum menyebutnya tersedia. |
| API dan architecture | Kontrak perencanaan; hanya entry bertanda ✅ dan export yang benar-benar ada di `convex/` yang callable saat ini. |
| Domain, schema, ledger, dan algoritma | Prinsip serta bentuk target. `convex/schema.ts` dan `convex/lib/ledger.ts` adalah bentuk data yang hidup. |
| Design, business, dan engineering | Panduan UX, rencana, dan operasi. Placeholder atau route yang ada harus tetap ditandai sebagai belum tersambung jika tidak memakai data nyata. |

### Koreksi terminologi hold expiry

Kontrak yang berlaku adalah:

```text
order.status             = expired
ledger.eventType         = CANCELLED
ledger.weightDeltaGrams  = 0
metadata.reason          = PAYMENT_HOLD_EXPIRED
```

Ini sesuai dengan `orders.expireHold`, `MATERIAL_LEDGER.md`, dan
`STATE_MACHINE.md`. Referensi yang menyebut event `EXPIRED` untuk **payment
hold** harus dibaca sebagai usang; `EXPIRED` tetap event yang tepat untuk expiry
pickup window atau material yang memasuki alur routing pada M4.

---

## Verifikasi sebelum mengubah status

| Klaim | Verifikasi minimum |
|---|---|
| Source aman | `bun run lint`, `bun run build`, dan test yang relevan. |
| Ledger tidak korup | `bun scripts/check-ledger.ts` pada data uji. |
| M3 selesai end-to-end | UAT Midtrans Sandbox dengan webhook terverifikasi; jangan mengubah order langsung dari browser atau dashboard Convex. |
| Mobile siap | Uji alur nyata pada lebar 375px dan perangkat Android sebelum M8. |

Lihat [ROADMAP.md](../business/ROADMAP.md) untuk urutan pengerjaan dan
[USER_STORIES.md](../spec/USER_STORIES.md) untuk acceptance criteria. Bukti UAT
dan blocker dilampirkan pada issue M3-07, bukan disimpulkan dari source saja.
