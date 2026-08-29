# API Impact — Cirquo

**Status:** Kontrak M6-01 dan dashboard Consumer/Merchant M6-02 tersedia di source · 2026-08-29

Empat query impact bersifat reaktif, hanya-baca, dan seluruh angka berasal dari
Material Flow Ledger. Tidak ada counter, snapshot agregasi, atau aritmetika
dashboard di browser.

| Fungsi | Akses | Scope bukti ledger |
| --- | --- | --- |
| `impact.getConsumerSummary` | Consumer terautentikasi | `RESCUED` yang `orderId`-nya milik Consumer. |
| `impact.getMerchantSummary` | Merchant terautentikasi dengan profil | Semua entry untuk Rescue Item milik Merchant. |
| `impact.getProcessorSummary` | Processor terautentikasi dengan profil | Semua entry untuk recovery batch yang ditugaskan kepadanya. |
| `impact.getPlatformSummary` | Admin | Seluruh Material Flow Ledger. |

Tidak satu pun menerima ID user, Merchant, atau Processor dari klien. Orders,
Rescue Items, dan recovery batches hanya digunakan untuk menetapkan scope;
nilai metrik sendiri selalu direduksi dari event ledger.

## Ringkasan bersama

Semua query mengembalikan bentuk berikut. Nilai nullable berarti metadata
pendukung rusak atau tidak lengkap; klien wajib menampilkan masalah integritas,
bukan menggantinya dengan nol.

```ts
{
  listedItemCount, listedGrams, rescuedQuantity, rescuedGrams,
  recoveredGrams, residualGrams, processLossGrams,
  measurementAdjustmentGrams, inProgressGrams,
  circularityRatePercent, diversionRatePercent,
  revenueRecoveredIdr, consumerSavingsIdr,
  estimatedCo2eGrams,
  methodologyVersion: 'impact-v1',
  integrity: { isValid, issues },
  conservation: { itemBalances, identityDeltaGrams },
}
```

Consumer tidak mempunyai proyeksi `LISTED` lengkap. Processor menghitung sisa
batch dari event `EXPIRED`, tetapi keduanya memiliki
`circularityRatePercent`/`diversionRatePercent` `null` tanpa bukti `LISTED`
lengkap. Metrik personal tetap tersedia, misalnya `rescuedGrams`, tabungan
Consumer, output Processor, dan material batch yang masih diproses.

## Reconciliation M5

`INTAKE_ACCEPTED` membawa `+acceptedWeightGrams` yang diukur dan metadata
`declaredWeightGrams`. `PROCESSED` membawa `-acceptedWeightGrams`; metadata-nya
memisahkan `outputWeightGrams` (Recovered) dan `residualWeightGrams`
(Residual). Selisihnya adalah `processLossGrams`, bukan Recovered, Residual,
atau material yang masih diproses.

Karena intake dapat berbeda dari deklarasi Merchant, identitas untuk scope
Rescue Item lengkap adalah:

```
listed + measurementAdjustment
  = rescued + recovered + residual + processLoss + inProgress
```

`measurementAdjustment = acceptedWeightGrams - declaredWeightGrams` adalah
penyesuaian rekonsiliasi bertanda, bukan klaim dampak. `inProgress` hanya sisa
yang belum memiliki outcome. `conservation.itemBalances` tetap mengembalikan
jumlah delta ledger mentah per Rescue Item untuk pemeriksaan audit.

## Harga dan metadata

Reservasi baru menyimpan `orders.originalPriceSnapshot`. Konfirmasi pickup
menyalinnya bersama `quantity` dan `totalPrice` ke metadata `RESCUED`; tabungan
Consumer dihitung hanya dari snapshot ini. Metadata `PROCESSED`,
`ROUTING_FAILED`, `INTAKE_ACCEPTED`, atau `RESCUED` yang diperlukan tetapi
malformed menghasilkan `integrity.issues` dan metrik dependen bernilai `null`.

M6-02 merender kontrak ini secara reaktif di `/impact`, `/merchant`, dan
`/merchant/impact`. Dashboard Processor/Admin, chart, export, dan UI Admin
inspector tetap milik M6-03/M7.
