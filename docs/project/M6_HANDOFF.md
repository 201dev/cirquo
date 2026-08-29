# Handoff M6 — Kontrak Impact untuk M7

**Status:** source dan verifikasi otomatis M6 tersedia · 2026-08-29

## Kontrak yang harus dipertahankan

- Empat query `impact.getConsumerSummary`, `getMerchantSummary`,
  `getProcessorSummary`, dan `getPlatformSummary` hanya-baca, reactive, dan
  menetapkan scope dari sesi server. Tidak ada ID pemilik dari klien.
- `src/lib/impact.ts:summariseLedger()` adalah satu-satunya implementasi
  aritmetika metrik. Dashboard atau query M7 tidak boleh membuat penghitungan
  versi sendiri atau menyimpan counter/snapshot pada skala pilot.
- Nilai ringkasan bersama adalah `listed`, `rescued`, `recovered`, `residual`,
  `processLoss`, `measurementAdjustment`, `inProgress`, rate, revenue,
  savings, estimated CO2e, `integrity`, dan `conservation`. Bentuk tepatnya
  ada di [API_IMPACT.md](../api/API_IMPACT.md).
- Nilai nullable dan `integrity.issues` berarti metadata pembawa metrik tidak
  dapat dipercaya. M7 harus menampilkan peringatan, bukan menggantikannya
  dengan nol.

## Semantik ledger yang telah dimiliki M4–M6

```text
LISTED(+D) → RESCUED(-R)
LISTED(+D) → EXPIRED(-U) → ROUTED(0) → INTAKE_ACCEPTED(+M) → PROCESSED(-M)
                                     └→ ROUTING_FAILED(0)
```

- `RESCUED` memakai snapshot berat order dan metadata harga asli immutable.
- `INTAKE_ACCEPTED(+M)` adalah intake fisik terukur, bukan accept offer.
- `PROCESSED(-M)` membagi `outputWeightGrams` (Recovered),
  `residualWeightGrams` (Residual), dan `processLossGrams`.
- `ROUTING_FAILED(0)` menyumbang Residual dari metadata batch immutable.
- `processLoss` dan `measurementAdjustment` adalah nilai rekonsiliasi, bukan
  outcome dan bukan `inProgress`.

Identitas yang dipakai M6 adalah:

```text
listed + measurementAdjustment
  = rescued + recovered + residual + processLoss + inProgress
```

Consumer scope harus selalu berawal dari order milik Consumer, karena actor
`RESCUED` adalah Merchant. Savings selalu berawal dari
`orders.originalPriceSnapshot`, bukan harga Rescue Item yang dapat berubah.

## Batas M7

- Admin ledger inspector harus membaca event dan semantik yang sama; ia tidak
  boleh mengubah row `materialFlowLedger`.
- Moderasi dan manual re-route M7 dapat menambah event baru hanya dengan
  kontrak metadata/delta terdokumentasi, test agregasi, dan pembaruan
  `summariseLedger()` secara eksplisit.
- Peringatan kualitas data harus menampilkan metadata malformed, mismatch
  rekonsiliasi, dan circularity di atas 99% sebagai hal yang perlu diperiksa,
  bukan klaim keberhasilan.
- Processor acceptance, intake, dan outcome sudah dimiliki M5; M7 tidak
  mengimplementasikannya kembali.
- Snapshot impact masih tidak diperlukan pada pilot. Jika volume terukur
  membutuhkannya nanti, snapshot adalah cache yang dapat dihitung ulang dari
  ledger, bukan source of truth.

Bukti source M6 dicatat di [M6_UAT.md](M6_UAT.md). Walkthrough browser dan
deployment Sandbox masih dicatat terpisah sebelum release end-to-end.
