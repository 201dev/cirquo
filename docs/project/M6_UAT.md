# Bukti M6 UAT

**Tanggal:** 2026-08-29  
**Status:** verifikasi source dan otomatis selesai; walkthrough browser/deployment masih wajib sebelum sign-off end-to-end  
**Environment otomatis:** Bun 1.3.14, `convex-test` in-memory, repository lokal  
**Environment deployment:** belum dijalankan

Fixture di bawah memakai alias test, bukan ID deployment. Dokumen ini tidak
mencatat kredensial, session token, pickup code, payload pembayaran, atau data
pribadi.

## Bukti otomatis

| ID | Fixture / skenario | Hasil yang diverifikasi | Bukti runnable |
| --- | --- | --- | --- |
| M6-UAT-01 | `item-a`: `LISTED → RESCUED → EXPIRED → INTAKE_ACCEPTED → PROCESSED` | Consumer hanya melihat pickup miliknya; Merchant, Processor, dan Admin menerima angka ledger sesuai scope. Output `600 g`, Residual `100 g`, dan process loss `100 g` tetap terpisah. | `convex/impact.test.ts` |
| M6-UAT-02 | `other-item`: Consumer, Merchant, dan Processor kedua | Event milik akun kedua tidak bocor ke akun pertama; Admin melihat gabungan platform. Query lintas peran ditolak `FORBIDDEN`. | `convex/impact.test.ts` |
| M6-UAT-03 | `item-a`, `item-b`: partial outcome dan material baru | `PROCESSED` dipisah ke output/residual/process loss; sisa `300 g` tampil sebagai dalam proses, bukan Residual. | `tests/impact.test.ts` |
| M6-UAT-04 | `routing-failed-a` | `ROUTING_FAILED(0)` dengan `residualWeightGrams: 250` menambah Residual `250 g` dan menyisakan `0 g` dalam proses. | `tests/impact.test.ts` |
| M6-UAT-05 | proyeksi kosong, metadata rusak, dan circularity penuh | Akun/data kosong menghasilkan zero-state; metadata metrik rusak menghasilkan masalah integritas, bukan nol yang menyanjung; circularity di atas 99% memicu flag review. | `tests/impact.test.ts` |
| M6-UAT-06 | halaman `/impact`, `/merchant`, `/merchant/impact`, `/processor`, `/admin` | Semua halaman memakai `useQuery` ke satu query impact sesuai peran, memiliki status live/loading/error, dan tidak mengimpor mock impact. | pencarian source di §3 |

Setiap query dijalankan kembali setelah fixture ledger ditulis; Convex akan
mendorong hasil query yang berubah ke pemanggil `useQuery`. Tes otomatis
membuktikan proyeksi yang berubah, sedangkan render reaktif di browser tetap
divalidasi pada UAT deployment berikut.

## Rekonsiliasi yang disetujui

```text
listed + measurementAdjustment
  = rescued + recovered + residual + processLoss + inProgress
```

- `INTAKE_ACCEPTED` adalah `+acceptedWeightGrams` dari timbangan Processor;
  metadata menyimpan `declaredWeightGrams`.
- `PROCESSED` adalah `-acceptedWeightGrams`; metadata memisahkan output
  Recovered, Residual, dan `processLossGrams`.
- `ROUTING_FAILED` tetap `0 g`; hanya `metadata.residualWeightGrams` yang
  mengatribusikan batch gagal sebagai Residual.
- Consumer ditentukan dari order miliknya, bukan `ledger.actorId`, karena
  event `RESCUED` ditulis oleh Merchant.
- Tabungan Consumer memakai `originalPriceSnapshot` yang ditulis saat
  reservasi lalu disalin ke metadata `RESCUED`.

Kontrak lengkap beserta nilai nullable ketika metadata rusak ada di
[API_IMPACT.md](../api/API_IMPACT.md) dan [IMPACT.md](../impact/IMPACT.md).

## Pemeriksaan source

Perintah berikut tidak menemukan import `mock-data.ts`, `demoImpact`, atau
`getPlaceholderSummary` pada lima halaman impact yang selesai:

```bash
rg -n 'mock-data|demoImpact|getPlaceholderSummary' \
  src/pages/consumer/impact-page.tsx \
  src/pages/merchant/dashboard-page.tsx \
  src/pages/merchant/impact-page.tsx \
  src/pages/processor/dashboard-page.tsx \
  src/pages/admin/dashboard-page.tsx
```

`/admin/ledger` masih merupakan placeholder M7 dan berada di luar surface
impact M6; ia tidak dipresentasikan sebagai inspector ledger yang selesai.

## UAT deployment/browser yang masih wajib

Jalankan setelah deployment Sandbox tersedia dan catat ID non-rahasia,
tanggal, hasil, serta tautan screenshot/rekaman pada issue M6-04:

1. Buka keempat scope pada lebar 375px dan pastikan loading, zero-state,
   error, fokus, dan label `Estimated CO2e avoided — impact-v1` terbaca.
2. Konfirmasi pickup Merchant lalu amati `/impact` Consumer dan `/merchant`
   berubah tanpa refresh.
3. Catat intake dan outcome partial Processor lalu amati Merchant, Processor,
   serta Admin berubah tanpa refresh dan pecahan output/residual tetap benar.
4. Jalankan expiry offer sampai `unroutable`; pastikan Residual bertambah tanpa
   melipat material ke dalam proses atau menduplikasi ledger event.
5. Uji akun baru untuk tiap peran dan request lintas peran/pemilik; akses harus
   gagal atau menampilkan zero-state yang sesuai.

Hasil otomatis bukan pengganti walkthrough browser, screenshot, atau rekaman
deployment tersebut.
