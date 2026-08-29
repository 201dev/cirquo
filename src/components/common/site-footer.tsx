import { Link } from "react-router-dom";
import { AppLogo } from "@/components/common/app-logo";

// Slugs are the raw materialType values — see `categories` in category-page.tsx.
const CATEGORY_LINKS = [
  { label: "Siap santap", to: "/category/prepared_food" },
  { label: "Roti & pastry", to: "/category/bakery" },
  { label: "Sayur & buah", to: "/category/produce" },
  { label: "Protein", to: "/category/protein" },
  { label: "Susu & olahan", to: "/category/dairy" },
  { label: "Bahan kering", to: "/category/dry_goods" },
];

const PARTNER_LINKS = [
  { label: "Daftar sebagai Mitra Usaha", to: "/register/merchant" },
  { label: "Daftar sebagai Mitra Pengolah", to: "/register/processor" },
  { label: "Masuk ke dashboard", to: "/login" },
];

const CONSUMER_LINKS = [
  { label: "Jelajah Rescue Item", to: "/explore" },
  { label: "Pesanan saya", to: "/orders" },
  { label: "Dampak material", to: "/impact" },
];

/** Pilot coverage today, not an aspiration. */
const AREAS = [
  "Tembalang",
  "Banyumanik",
  "Semarang Tengah",
  "Semarang Selatan",
  "Pedurungan",
  "Gunungpati",
  "Ngaliyan",
  "Candisari",
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-leaf-50">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="rounded text-sm text-leaf-200 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-leaf-900 text-leaf-100">
      {/* Extra bottom room so the mobile tab bar never covers the last row. */}
      <div className="mx-auto max-w-7xl px-4 py-12 pb-32 sm:px-6 sm:py-14 sm:pb-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <AppLogo className="text-leaf-50" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-leaf-200">
              Cirquo menyalurkan surplus pangan yang masih layak konsumsi ke
              orang di sekitarnya, dan mengarahkan sisanya ke Mitra Pengolah.
              Setiap kilogram dicatat di Material Flow Ledger.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-leaf-300">
              Pengambilan dilakukan langsung di lokasi merchant dengan kode
              pickup enam digit. Cirquo tidak melakukan pengantaran.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <FooterColumn title="Kategori" links={CATEGORY_LINKS} />
            <FooterColumn title="Untuk kamu" links={CONSUMER_LINKS} />
            <FooterColumn title="Untuk mitra" links={PARTNER_LINKS} />
          </div>
        </div>

        <div className="mt-12 border-t border-leaf-700/60 pt-8">
          <h3 className="text-sm font-semibold text-leaf-50">
            Area uji coba saat ini
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <li
                key={area}
                className="rounded-full border border-leaf-700 px-3 py-1 text-xs text-leaf-200"
              >
                {area}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-leaf-300">
            Radius pencarian dibatasi 30 km dari Tembalang, Semarang. Merchant
            di luar radius belum tampil di pencarian.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-leaf-700/60 pt-6 text-xs text-leaf-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Cirquo · Semarang, Indonesia</p>
          <p>Prototipe DSDC ANFORCOM 2026. Angka dampak dihitung dari Material Flow Ledger.</p>
        </div>
      </div>
    </footer>
  );
}
