# Handoff M5 — Kontrak Recovery Batch

**Status:** kontrak source M4-04 · 2026-08-29

M5 melanjutkan `recoveryBatches` yang sudah dibuat M4; jangan membuat batch atau
event M4 kedua untuk material yang sama.

## Data yang sudah dimiliki M4

- `offeredWeightGrams` adalah gram integer immutable: sisa Rescue Item ditambah
  snapshot `orders.rescuedWeightGrams` milik no-show. Jangan menghitung ulang
  dari Rescue Item yang mungkin telah diedit.
- Status M4 yang aktif adalah `pending`, `offered`, dan terminal `unroutable`.
  `processorId` hanya diisi saat `offered`; `offerExpiresAt` adalah batas offer.
- `routingAttempts`, `attemptedProcessorIds`, dan `declinedByProcessorIds`
  menyimpan riwayat offer. Maksimum M4 adalah tiga percobaan.
- Batch selalu terikat ke `merchantId` dan `surplusItemId`. Merchant hanya dapat
  membaca batch miliknya melalui `recoveryBatches.listForMerchant`.

## Ledger yang sudah dimiliki M4

| Kejadian | Event | Delta gram |
| --- | --- | ---: |
| Pickup Consumer berhasil | `RESCUED` | `-order.rescuedWeightGrams` |
| Paid no-show | `CANCELLED` | 0 |
| Material masuk recovery | `EXPIRED` | `-offeredWeightGrams` |
| Offer Processor | `ROUTED` | 0 |
| Tiga offer habis/tidak ada kandidat | `ROUTING_FAILED` | 0 |

`EXPIRED` sudah mengeluarkan berat material dari alur Rescue Item. Karena itu
M5 tidak boleh menulis ulang `EXPIRED` atau `ROUTING_FAILED` negatif untuk
batch tersebut.

## Batas M5

M4 **belum** mengimplementasikan penerimaan/penolakan Processor, intake
terukur, atau outcome pengolahan. M5 harus menambahkan guard Processor terhadap
`processorId`, status `offered`, dan `offerExpiresAt` sebelum menulis transisi
serta ledger M5 yang relevan. Jangan mengubah event append-only milik M4.
