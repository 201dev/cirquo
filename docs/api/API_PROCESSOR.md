# API Organic Processor — Cirquo

**Status:** Kontrak source M5 · 2026-08-29
**PRD:** PRC-01 sampai PRC-06

Semua fungsi memakai `sessionToken` opsional pada argumen, tetapi token valid
tetap wajib. Guard peran dan verifikasi dijalankan di server. Berat disimpan
dalam gram utuh; semua waktu adalah epoch-ms UTC.

## Function index

| Fungsi | Jenis | Akses | PRD | Status |
| --- | --- | --- | --- | --- |
| `recoveryBatches.listQueue` | query | Processor terverifikasi | PRC-01 | ✅ |
| `recoveryBatches.get` | query | Processor yang ditugaskan | PRC-01 | ✅ |
| `recoveryBatches.getDashboard` | query | Processor terverifikasi | PRC-05 | ✅ |
| `recoveryBatches.accept` | mutation | Processor terverifikasi yang ditugaskan | PRC-02 | ✅ |
| `recoveryBatches.decline` | mutation | Processor terverifikasi yang ditugaskan | PRC-02 | ✅ |
| `recoveryBatches.logIntake` | mutation | Processor terverifikasi yang ditugaskan | PRC-03 | ✅ |
| `recoveryBatches.logOutcome` | mutation | Processor terverifikasi yang ditugaskan | PRC-04 | ✅ |
| `impact.getProcessorSummary` | query | Processor dengan profil | PRC-05 | ✅ |
| `processors.getMine` | query | Processor pemilik | PRC-06 | ✅ |
| `processors.updateProfile` | mutation | Processor pemilik | PRC-06 | ✅ |

## Antrean dan dashboard

`listQueue({ tab, limit? })` menerima `tab` `offered`, `accepted`, atau
`collected`. Tab terakhir juga memuat batch `processed` untuk riwayat outcome.
Hasil hanya memuat batch yang `processorId`-nya milik pemanggil, beserta
Merchant, alamat pickup, berat, status, TTL offer, dan kapabilitas output yang
di-snapshot saat batch diterima.

`get({ batchId })` memiliki proyeksi yang sama untuk satu batch. Batch dari
Processor lain ditolak `FORBIDDEN`.

`getDashboard({ now })` memakai waktu klien yang tervalidasi supaya batas hari
WIB tidak tersangkut cache query. Ia mengembalikan:

```ts
{
  offeredCount, acceptedCount, collectedCount, processedCount,
  dailyCapacityGrams, capacityCommittedGrams, capacityUsagePercent,
  todayIntakeGrams,
  processedIntakeGrams, outputWeightGrams, residualWeightGrams,
  outputByType: { compost, bsf_larvae, animal_feed, biogas },
  recoveryRatePercent, // null ketika belum ada outcome
}
```

Metrik output, residual, intake, dan recovery rate diturunkan dari Material
Flow Ledger milik Processor. Status antrean dan komitmen kapasitas berasal dari
batch yang ditugaskan kepadanya. Offer yang belum diterima tidak mengunci
kapasitas.

`impact.getProcessorSummary()` adalah ringkasan impact M6-01 untuk recovery
batch yang ditugaskan ke Processor. Lihat [API_IMPACT.md](API_IMPACT.md) untuk
kontrak ringkasan bersama dan penanganan integritas metadata.

## Mutasi recovery

| Fungsi | Transisi | Event ledger atomik |
| --- | --- | --- |
| `accept` | `offered → accepted` | Tidak ada; belum ada berat fisik yang diterima. |
| `decline` | `offered → pending → routing` | `INTAKE_DECLINED` dengan `0 g`. |
| `logIntake` | `accepted → collected` | `INTAKE_ACCEPTED` dengan `+acceptedWeightGrams`. |
| `logOutcome` | `collected → processed` | `PROCESSED` dengan `-acceptedWeightGrams`. |

### `accept`

Menerima `batchId`, dengan `estimatedCollectionAt` dan `note` opsional. Server
memeriksa kepemilikan, status `offered`, TTL, material, dan kapasitas pada
transaksi yang sama. Kapabilitas `outputTypes` disalin ke batch saat ini agar
perubahan profil nanti tidak membatalkan batch yang telah diterima.

### `decline`

Menerima `batchId`, alasan wajib (`capacity`, `material_mismatch`, `distance`,
`schedule`, atau `other`), dan `note` opsional. Processor dicatat sebagai
penolak permanen untuk batch tersebut, lalu routing berikutnya dipilih dalam
transaksi yang sama. Batch dapat berakhir `unroutable` setelah batas routing.

### `logIntake`

Menerima `acceptedWeightGrams` positif, integer, maksimal 150% dari berat
offer, `collectedAt` tidak di masa depan, serta `note` opsional. Selisih lebih
dari 30% diberi `varianceRequiresReview` pada batch dan metadata ledger.

### `logOutcome`

Menerima `outputType`, `outputWeightGrams`, `residualWeightGrams`,
`zeroResidualConfirmed` bila residual `0`, `completedAt` tidak di masa depan,
dan `note` opsional. Output dan residual harus integer tidak-negatif dan
jumlahnya tidak boleh melampaui intake. `PROCESSED` menyimpan pemisahan output,
residual, process loss, dan conversion rate di metadata; tidak ada event ledger
yang pernah diubah.

## Profil kapasitas

`getMine()` mengembalikan profil pemanggil, termasuk status verifikasi, agar
fasilitas yang belum terverifikasi tetap dapat melihat dan memperbaiki
konfigurasinya. Hasil `null` berarti onboarding belum dibuat.

`updateProfile(...)` memperbarui `facilityType`, `acceptedMaterialTypes`,
`dailyCapacityGrams`, `maxPickupRadiusMeters`, `outputTypes`, serta jam operasi
harian. Sedikitnya satu material dan satu output harus dipilih. Kapasitas dapat
`0` untuk menjeda intake; radius harus 1.000–50.000 meter; jam selesai harus
setelah jam mulai. Mutasi menyimpan `updatedAt`, tidak menulis ledger, dan tidak
mengubah offer/batch yang telah diterima.

Profil yang `suspended` tidak dapat diubah. Perubahan berlaku pada evaluasi
Circular Routing berikutnya.

## Error yang diharapkan

| Kode | Arti |
| --- | --- |
| `AUTH_REQUIRED` | Sesi tidak ada atau kedaluwarsa. |
| `FORBIDDEN` | Bukan Processor pemilik/yang ditugaskan, atau profil ditangguhkan. |
| `NOT_VERIFIED` | Fungsi antrean, dashboard, atau mutasi recovery perlu verifikasi. |
| `NOT_FOUND` | Profil atau batch tidak ditemukan. |
| `OFFER_EXPIRED` | Offer tidak lagi berlaku. |
| `MATERIAL_TYPE_REJECTED` | Material tidak lagi didukung oleh profil. |
| `CAPACITY_EXCEEDED` | Komitmen hari ini melebihi kapasitas. |
| `INVALID_TRANSITION` | Status batch berubah atau sudah terminal. |
| `VALIDATION_FAILED` | Nilai berat, waktu, catatan, atau profil tidak valid. |

## UI terkait

- `/processor` — dashboard reaktif.
- `/processor/recovery` — antrean dan detail acceptance/intake/outcome.
- `/processor/history` — outcome `processed`.
- `/processor/profile` — konfigurasi routing operasional.

Lihat [M5_HANDOFF.md](../project/M5_HANDOFF.md) untuk kontrak yang diteruskan
ke M6 dan [M5_UAT.md](../project/M5_UAT.md) untuk bukti verifikasi source serta
walkthrough deployment yang masih diperlukan.
