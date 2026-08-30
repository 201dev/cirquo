# Bukti M7 UAT

**Tanggal:** 2026-08-30  
**Status:** verifikasi source dan otomatis selesai; walkthrough deployment/browser belum dijalankan  
**Environment otomatis:** Bun 1.3.14, `convex-test` in-memory, repository lokal  
**Environment deployment:** belum diperbarui dengan source M7

Semua akun dan ID di bawah adalah fixture sintetis. Dokumen ini tidak memuat
password, session token, pickup code, payload pembayaran, atau data kontak
pribadi.

## Identitas fixture aman

`convex-test` membuat Convex ID saat test berjalan, sehingga ID tersebut tidak
stabil dan tidak dapat dipakai untuk demo. Referensi fixture yang dapat diulang
adalah sebagai berikut; saat walkthrough Sandbox, salin ID Rescue Item/order/
Recovery Batch yang muncul ke bukti tiap skenario.

| Bukti | Identitas aman | Referensi material |
| --- | --- | --- |
| M7-UAT-01/02 | `Admin`, `Merchant`, `Processor`, `Merchant Ditolak` | Tidak ada Rescue Item/order/batch. |
| M7-UAT-03 | `Roti Moderasi` | Satu Rescue Item, order `picked_up`, order `paid`; tidak ada Recovery Batch. |
| M7-UAT-04 | `Consumer`, `Merchant` | Notifikasi milik Consumer; tidak ada material. |
| M7-UAT-05 | fixture ledger Admin | Rescue Item terminal, item dengan failure, dan referensi order/batch sintetis di `convex/admin.test.ts`. |

## Hasil terverifikasi

| ID | Peran / fixture | Skenario | Expected dan actual | Status | Bukti |
| --- | --- | --- | --- | --- | --- |
| M7-UAT-01 | Admin + Merchant/Processor pending | Admin menyetujui Merchant dan Processor serta menolak Merchant lain dengan alasan. Non-Admin memanggil seluruh query/mutasi Admin dalam scope M7-01/M7-03. | Profil berubah sesuai keputusan, owner menerima notifikasi, tiga tindakan tercatat di `adminActions`, dan semua caller non-Admin menerima `FORBIDDEN`. | Pass | `convex/m7.test.ts` |
| M7-UAT-02 | Admin + Processor verified | Admin menangguhkan Processor lalu mengaktifkannya kembali. | Semua sesi Processor dicabut, sesi lama menerima `AUTH_REQUIRED`, user kembali aktif, dan profil kembali `pending` untuk verifikasi ulang. | Pass | `convex/m7.test.ts` |
| M7-UAT-03 | Admin + Merchant + Consumer | Admin memoderasi satu Rescue Item yang memiliki satu order `picked_up` dan satu order `paid`. | Outcome Rescued tetap utuh, order paid menjadi `expired` dan memakai antrean refund M4, tepat satu `MODERATED` ditulis, saldo ledger `0 g`, dan Merchant menerima alasan serta tautan yang aman. Non-Admin ditolak. | Pass | `convex/m7.test.ts`, `tests/impact.test.ts` |
| M7-UAT-04 | Consumer + Merchant | Consumer membaca notifikasi miliknya lalu Merchant mencoba menandai notifikasi itu. | Nilai sensitif tidak muncul, notifikasi yang belum `visibleAt` tidak muncul, owner dapat menandai dibaca, dan akun lain menerima `NOT_FOUND`. | Pass | `convex/m7.test.ts` |
| M7-UAT-05 | Admin ledger fixture | Timeline lengkap dan timeline dengan conservation/order/metadata/terminal failure. | Query hanya Admin, metadata sensitif disensor server-side, total memakai `summariseLedger()`, dan semua masalah tampil sebagai warning. | Pass | `convex/admin.test.ts`, `tests/ledger-integrity.test.ts` |
| M7-UAT-06 | Repository lokal | Lint, build, seluruh test, dan pemeriksaan append-only ledger. | Lint/build/check-ledger/diff-check exit `0`; test aplikasi: 41 pass/43 assertion; test Convex: 19 pass. | Pass | perintah di bawah |

## Quality gate

```bash
bun run lint
bun run build
bun run test
bun scripts/check-ledger.ts
git diff --check
```

Hasil 2026-08-30: semua command lulus. `bun run test` menghasilkan 41 test
aplikasi/43 assertion dan 19 test Convex. Build melaporkan warning ukuran
chunk Mapbox yang sudah ada; warning tersebut bukan error build.

## Walkthrough yang belum dapat ditandatangani

Browser lokal tidak tersedia pada environment agent, dan deployment Convex
tidak diperbarui karena proses tersebut mengirim source ke deployment eksternal.
Karena itu, bukti otomatis di atas belum dianggap sebagai screenshot/mobile
UAT end-to-end. Setelah deployment Sandbox diizinkan:

1. siapkan akun sintetis Admin, Merchant, Consumer, dan Processor;
2. jalankan approve, reject, suspend, reinstate, moderasi, dan inbox notifikasi;
3. buka `/admin/ledger` pada lebar 375px dan desktop, lalu rekam success,
   residual/failure, malformed metadata, empty, loading, error, dan not-found;
4. pastikan sesi yang sudah dicabut tidak dapat memakai fungsi Admin/owned query;
5. catat hanya ID non-rahasia serta screenshot yang sudah disanitasi.

Tidak ada kegagalan P0 source yang terbuka. Blocker release evidence adalah
`M7-UAT-DEPLOY`: deployment Sandbox dan browser walkthrough belum diotorisasi/
tersedia. Baris ini bukan pass: bukti screenshot/rekaman dan verifikasi 375px
harus ditambahkan setelah walkthrough sungguhan.
