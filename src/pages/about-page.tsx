import { ArrowRight, Download } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import mascotLedger from "@/assets/mascot/mascot-ledger.webp";
import { Button } from "@/components/ui/button";

/**
 * Empat langkah, bukan tiga. Langkah terakhir yang membedakan Cirquo dari
 * marketplace surplus biasa justru yang paling mudah dilupakan.
 */
const FLOW = [
  {
    title: "Mitra Usaha mendaftarkan Rescue Item",
    body: "Surplus yang masih layak konsumsi dipasang dengan window pickup dan harga yang menurun.",
  },
  {
    title: "Konsumen reservasi, lalu ambil sendiri",
    body: "Bayar di aplikasi, tunjukkan kode pickup enam digit di lokasi. Tidak ada pengantaran.",
  },
  {
    title: "Sisanya masuk Circular Routing",
    body: "Yang tidak terambil dialihkan ke Mitra Pengolah terdekat, bukan hilang tanpa catatan.",
  },
  {
    title: "Mitra Pengolah mencatat hasil akhirnya",
    body: "Intake dan outcome dicatat, jadi perjalanan tiap kilogram berhenti pada angka.",
  },
] as const;

/**
 * Residual sengaja ikut ditulis. Klaim "tanpa sisa" tidak bisa dipertahankan
 * begitu ada satu pertanyaan lanjutan, dan ledger memang mencatatnya.
 */
const OUTCOMES = [
  { label: "Rescued", body: "Diambil konsumen dan dikonsumsi manusia." },
  { label: "Recovered", body: "Terlambat untuk dikonsumsi, tapi masih bisa diolah." },
  { label: "Residual", body: "Tidak bisa diselamatkan maupun diolah. Tetap dicatat." },
] as const;

const GLOSSARY = [
  { term: "Rescue Item", body: "Satu batch surplus dengan berat, harga, dan window pickup sendiri." },
  { term: "Mitra Usaha", body: "Restoran, bakery, katering, atau toko yang menjadi titik pickup." },
  { term: "Mitra Pengolah", body: "Pengolah organik yang menerima material saat jalur konsumsi tertutup." },
  { term: "Material Flow Ledger", body: "Catatan append-only tiap perpindahan material." },
] as const;

/**
 * Satu pola tipografi untuk seluruh halaman, mengikuti gaya penutup di
 * `site-footer.tsx`: judul tebal, lalu satu baris keterangan abu. Tidak ada
 * kartu berbingkai, jadi yang membentuk struktur adalah jarak antarbagian.
 */
function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h2>
      {lead ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {lead}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <h1 className="text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
        Tentang Kami
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Cirquo mengarahkan surplus pangan ke penggunaan terbaik berikutnya, dan
        mencatat setiap perpindahannya.
      </p>

      <Section
        title="Bukan aplikasi pengantaran"
        lead="Tidak ada kurir. Konsumen mengambil sendiri di lokasi Mitra Usaha. Yang kami bangun adalah orkestrasi aliran material, dengan marketplace sebagai pintu masuknya."
      />

      <Section
        title="Bagaimana loopnya ditutup"
        lead="Empat langkah, dari surplus yang baru didaftarkan sampai hasil akhirnya tercatat."
      >
        <ol className="mt-6 space-y-5">
          {FLOW.map(({ title, body }, index) => (
            <li key={title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-lg font-bold text-leaf-500"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="Tiga kemungkinan akhir"
        lead="Setiap Rescue Item berhenti di salah satu status ini. Kami menampilkan ketiganya, termasuk yang gagal."
      >
        <dl className="mt-6 space-y-4">
          {OUTCOMES.map(({ label, body }) => (
            <div key={label} className="sm:flex sm:gap-4">
              <dt className="font-semibold sm:w-40 sm:shrink-0">{label}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground sm:pt-0.5">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Kenapa angkanya bisa dipercaya">
        <div className="mt-3 grid max-w-3xl gap-6 sm:grid-cols-[1fr_150px] sm:items-center">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Semua angka dampak dihitung dari Material Flow Ledger, dan tidak
              dari sumber lain. Ledger bersifat append-only, jadi koreksi ditulis
              sebagai entri baru tanpa mengubah riwayat.
            </p>
            <p>
              Estimated CO2e memakai faktor emisi rata-rata per jenis material.
              Angkanya perkiraan yang bisa ditelusuri, bukan hasil pengukuran
              langsung, dan bukan klaim offset.
            </p>
          </div>
          <img
            src={mascotLedger}
            alt=""
            loading="lazy"
            className="order-first mx-auto w-32 sm:order-none sm:w-full"
          />
        </div>
      </Section>

      <Section title="Istilah yang kami pakai">
        <dl className="mt-6 space-y-4">
          {GLOSSARY.map(({ term, body }) => (
            <div key={term} className="sm:flex sm:gap-4">
              <dt className="font-semibold sm:w-56 sm:shrink-0">{term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground sm:pt-0.5">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/explore">
            Jelajahi Rescue Item <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/download">
            <Download aria-hidden="true" /> Pasang aplikasinya
          </Link>
        </Button>
      </div>
    </>
  );
}
