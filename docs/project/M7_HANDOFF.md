# Handoff M7 — Admin, Ledger, dan Operasional

**Status:** source M7 selesai; deployment UAT masih wajib · 2026-08-30

**Status M7-03:** selesai di source dan test otomatis: moderasi, handoff refund
M4, serta inbox notifikasi reaktif dimasukkan dalam M7. Tidak ada fitur M7-03
yang diklaim ditunda.

## Permukaan yang tersedia

- `/admin/verifications`: approve/reject Merchant dan Processor, suspend,
  reinstate, serta moderasi Rescue Item dengan alasan wajib.
- `/admin/ledger`: pencarian server-side terpaginasikan, timeline read-only,
  rekonsiliasi `summariseLedger()`, dan warning conservation/completeness.
- `/{role}/notifications`: inbox reactive milik user sendiri; lifecycle
  reservation, reminder, expiry, routing, recovery, moderasi, dan akun.
- Merchant melihat alasan moderasi pada detail Rescue Item. Rescue Item
  moderated tidak lagi memenuhi query discovery `active`.

`MODERATED` hanya menyelesaikan material yang masih unresolved. Outcome
`RESCUED`/`PROCESSED` yang sudah ada tidak dihapus atau dihitung dua kali.
Order paid yang belum fulfilled memakai antrean refund M4, bukan panggilan
payment baru dari browser. `adminActions` mencatat keputusan akun tanpa menulis
event material.

## Privasi dan batas operasi

- Semua query/mutation Admin memakai guard role server-side sebagai langkah
  pertama; non-Admin ditolak.
- Pickup code, token sesi, password hash, dan raw payment payload tidak masuk
  proyeksi Admin/notifikasi. Metadata ledger disensor sebelum mencapai UI.
- Ledger inspector tidak memiliki edit, delete, retry, correction, dispute,
  atau manual re-route control.
- Dispute resolution dan manual re-route sengaja dipotong sesuai roadmap.

## Demo sequence M8

1. Merchant menerbitkan Rescue Item.
2. Consumer menemukan, mereservasi, membayar, dan mengambil.
3. Merchant mengonfirmasi pickup.
4. Material yang tidak diambil masuk Circular Routing.
5. Processor mencatat intake dan outcome.
6. Admin membuka timeline item, warning integrity, dan dashboard impact.

Seed M8 harus deterministik, memakai identitas sintetis, dan memperlihatkan
Rescued, Recovered, Residual, in-progress, serta minimal satu failure yang
jujur. Circularity tidak boleh di-hardcode dan tidak boleh dipaksa 100%.
Gunakan wording final: **"Estimated CO2e avoided — estimasi berdasarkan
metodologi `impact-v1`, bukan hasil pengukuran langsung."** Jangan menyebut
CO2e "saved" atau carbon offset.

## Akun demo dan reset aman

Gunakan empat akun sintetis terpisah: `Demo Admin`, `Demo Merchant`,
`Demo Consumer`, dan `Demo Processor`. Simpan kredensial hanya pada password
manager tim, bukan di repository, screenshot, atau dokumen UAT. Catat ID
Rescue Item/order/Recovery Batch yang dipakai sebagai ID Convex non-rahasia.

Reset demo harus memakai preview deployment baru lalu menjalankan seed
idempotent M8 satu kali. Jangan hapus data deployment bersama atau menjalankan
reset massal. Seed tersebut perlu mengeluarkan ID fixture dan membentuk jalur
demo enam langkah di atas; sebelum seed tersedia, reset aman belum ada dan
`M8-SEED` tetap merupakan blocker rekaman demo.

Bukti runnable dan sisa walkthrough ada di [M7_UAT.md](M7_UAT.md).
