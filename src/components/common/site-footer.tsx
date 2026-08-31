import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import logoMarkWhite from "@/assets/landing/logo-mark-white.svg";
import mascotWave from "@/assets/mascot/mascot-wave.webp";

/**
 * Shared landing-style closing CTA for consumer-facing pages.
 *
 * This used to be three absolutely-positioned blocks inside a fixed-height box
 * with a hand-tuned sprite crop per breakpoint, so nothing reflowed when the
 * copy or the viewport changed. It is normal flow now: the heading wraps, the
 * mascot scales, and the height follows the content.
 *
 * Clearance for the mobile tab bar belongs to whoever renders that bar — see
 * `ConsumerLayout`. The landing route has no tab bar and used to inherit that
 * clearance here as a strip of dead green space at the bottom of every phone.
 */
export function SiteFooter() {
  return (
    <footer
      id="download"
      className="mt-16 scroll-mt-[var(--site-header-h)] bg-[#1bac4b] text-white"
    >
      <div className="site-container">
        <div className="grid items-center gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 lg:py-14">
          <div>
            <h2 className="max-w-md text-balance text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              Yuk, mulai selamatkan makanan baik hari ini!
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/90 sm:text-base">
              Download aplikasi Cirquo dan temukan Rescue Item terdekat darimu.
            </p>
            {/*
              The copy has always said "download"; until now there was nothing to
              press. `id="download"` stays on the footer so older `/#download`
              links keep landing somewhere sensible.
            */}
            <Link
              to="/download"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#107333] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download className="size-4" aria-hidden="true" />
              Pasang aplikasinya
            </Link>
          </div>
          {/*
            A square box with `object-contain` keeps the aspect ratio without
            hardcoding the asset's intrinsic pixels, and reserves its space
            before the image decodes.
          */}
          <div className="mx-auto aspect-square w-40 shrink-0 sm:w-48 lg:mx-0 lg:w-64">
            <img
              src={mascotWave}
              alt=""
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/40">
        <div className="site-container flex min-h-[3.75rem] items-center">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Cirquo, ke halaman utama"
          >
            <img
              src={logoMarkWhite}
              alt=""
              width="29"
              height="33"
              className="h-[33px] w-[29px]"
            />
            <span className="text-base font-bold tracking-[-0.025em]">Cirquo</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
