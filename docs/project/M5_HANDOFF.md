# Handoff M5 — Kontrak Recovery Batch untuk M6

**Status:** kontrak source M5 selesai · 2026-08-29

## Kontrak stabil

- `offeredWeightGrams` tetap immutable sebagai berat routing yang dinyatakan Merchant.
- `acceptedWeightGrams` adalah berat aktual dari timbangan Processor dan menjadi sumber kebenaran untuk intake serta outcome.
- Acceptance offer tidak menulis `INTAKE_ACCEPTED`; event itu hanya ditulis saat intake fisik dicatat.
- `PROCESSED` adalah satu-satunya event yang membagi material menjadi Recovered dan Residual.
- M6 wajib membaca `outputWeightGrams` dan `residualWeightGrams` dari metadata `PROCESSED`; delta penuh event bukan berat Recovered.
- `processLossGrams = acceptedWeightGrams - outputWeightGrams - residualWeightGrams` hanya untuk rekonsiliasi, bukan Recovered atau Residual.
- `ROUTING_FAILED` menyumbang Residual hanya ketika M4 tidak dapat merutekan batch.
- Semua metrik M6 berasal dari Material Flow Ledger, bukan counter tersimpan atau mock data.

## Urutan ledger

Untuk berat deklarasi `D` dan berat terukur `M`:

```text
LISTED(+D) → EXPIRED(-D) → ROUTED(0) → INTAKE_ACCEPTED(+M) → PROCESSED(-M)
```

Penolakan menambahkan satu `INTAKE_DECLINED(0)` lalu menggunakan kembali retry M4. Outcome Recovered, Residual, dan process loss berada sebagai nilai terpisah di metadata `PROCESSED`.

## Bukti otomatis

`convex/recoveryBatches.test.ts` memverifikasi ownership, offer kedaluwarsa, material yang tidak didukung, kapasitas, accept bersamaan, decline dan retry, validasi intake, validasi outcome, idempotensi transisi, serta jumlah/delta ledger.

UAT deployment dan bukti visual dicatat terpisah di `docs/project/M5_UAT.md`; hasil otomatis tidak dianggap sebagai pengganti walkthrough browser.
