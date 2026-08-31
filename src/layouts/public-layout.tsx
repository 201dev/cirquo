import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { PageLoader } from "@/components/common/page-loader";
import { RouteFocus } from "@/components/common/route-focus";
import { SiteFooter } from "@/components/common/site-footer";
import { SiteHeader } from "@/components/common/site-header";

/**
 * Chrome for public content pages that anyone can read without an account.
 *
 * `welcome-page.tsx` keeps rendering its own header and footer: its hero has to
 * sit flush under the bar, so it cannot use the padded `main` below. There is no
 * mobile tab bar here — same as the landing route — because these pages are read
 * once, not navigated between.
 */
export function PublicLayout() {
  return (
    <div className="min-h-svh bg-background">
      <RouteFocus />
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="site-container py-6 focus:outline-none sm:py-8"
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
