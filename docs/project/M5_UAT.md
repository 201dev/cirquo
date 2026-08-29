# Bukti M5 UAT

**Tanggal:** 2026-08-29  
**Environment otomatis:** `convex-test` in-memory  
**Environment deployment:** belum dijalankan

## Bukti otomatis

Test batch memakai ID ephemeral dari `convex-test` dan tidak menyimpan kredensial. Suite `convex/recoveryBatches.test.ts` mencakup:

- Processor hanya melihat dan bertindak pada batch miliknya;
- offer kedaluwarsa, material tidak didukung, dan kapasitas berlebih ditolak;
- dua accept bersamaan hanya menghasilkan satu commitment ketika kapasitas tidak cukup untuk keduanya;
- decline menulis tepat satu `INTAKE_DECLINED(0)`, mengecualikan Processor, lalu masuk retry M4;
- intake invalid dan duplikat ditolak, intake valid menulis satu `INTAKE_ACCEPTED(+M)`;
- outcome invalid dan duplikat ditolak, outcome valid menulis satu `PROCESSED(-M)` dengan output, residual, process loss, dan conversion rate;
- dashboard hanya menjumlahkan antrean/komitmen batch serta event ledger milik Processor; intake harian, output per jenis, residual, dan recovery rate dapat direkonsiliasi dari event tersebut;
- profil kapasitas dapat diperbarui, menerima kapasitas `0` untuk jeda intake, dan perubahan output tidak membatalkan batch yang telah diterima;
- residual `0 g` memerlukan konfirmasi server-side dan variance intake di atas 30% diberi flag review.

## UAT deployment yang masih wajib

Isi tanggal, deployment, batch ID non-rahasia, hasil, dan tautan screenshot/rekaman setelah menjalankan:

1. `/processor/recovery` pada 375px: offer baru muncul tanpa refresh dan countdown urgent di bawah satu jam.
2. Processor lain membuka URL detail yang sama: akses ditolak.
3. Jalankan `offered → accepted → collected → processed`; cek Merchant berubah reaktif tanpa refresh.
4. Decline satu offer; cek Processor yang menolak tidak menerima batch itu lagi dan retry tidak menduplikasi event routing.
5. Periksa ledger batch untuk `EXPIRED(-D)`, `ROUTED(0)`, opsional `INTAKE_DECLINED(0)`, `INTAKE_ACCEPTED(+M)`, dan `PROCESSED(-M)`.
6. `/processor` pada 375px: ubah outcome dan pastikan intake, kapasitas, output per jenis, residual, serta recovery rate berubah tanpa refresh.
7. `/processor/profile`: simpan kapasitas `0`, lalu simpan kembali kapasitas normal; pastikan routing berikutnya memakai konfigurasi baru dan batch yang sudah diterima tetap dapat mencatat outcome.

Jangan mencatat session token, pickup code, payload pembayaran, atau data pribadi pada bukti.
