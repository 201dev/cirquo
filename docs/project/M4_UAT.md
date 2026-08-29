# Bukti M4 UAT

**Status:** verifikasi otomatis source selesai · UAT browser dan Midtrans Sandbox masih diperlukan.

## Bukti otomatis

Perintah yang dijalankan dari root proyek:

```bash
bun run test
bun run lint
bun run build
bun scripts/check-ledger.ts
```

Suite Convex mencakup pickup valid dan duplikat, Consumer `picked_up`, batch
expiry dengan snapshot gram, refund gagal tanpa perubahan ledger, retry offer,
`unroutable`, dan hold expiry M3. `convex/recoveryBatches.test.ts` juga
memverifikasi proyeksi Merchant hanya memuat batch miliknya dan tidak memiliki
`pickupCode`, identitas Consumer, atau status refund.

ID test in-memory bersifat ephemeral dan tidak memuat rahasia; assertion
menautkan `orderId`, `surplusItemId`, dan `recoveryBatchId` dalam suite tersebut.
Tidak ada payload pembayaran Midtrans atau pickup code yang dicetak.

## UAT deployment yang masih wajib

Jalankan pada akun demo dan catat ID non-rahasia di issue/PR, bukan di dokumen
ini:

1. Bayar satu order Sandbox, konfirmasi pickup sebagai Merchant, lalu pastikan
   Consumer pada `/orders/:id` berubah ke “Sudah diambil” tanpa refresh dan
   ledger memiliki satu `RESCUED` dengan snapshot negatif.
2. Trigger expiry Admin pada Rescue Item lain; pastikan satu batch dan satu
   `EXPIRED` negatif, kemudian cek offer dan retry TTL.
3. Pastikan batch tanpa kandidat atau setelah tiga offer tampil “Routing gagal”
   pada `/merchant/surplus/:id` dan memiliki satu `ROUTING_FAILED` 0 g.
4. Uji lebar 375px pada `/merchant/surplus/:id` dan `/orders/:id`.

UAT ini tidak boleh mengubah status order langsung dari dashboard Convex atau
menyalin pickup code ke catatan bukti.
