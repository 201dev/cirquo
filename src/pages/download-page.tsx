import { Check, Download } from "lucide-react";
import { useEffect, useState } from "react";
import cirquoMark from "@/assets/brand/cirquo-mark.svg";
import { Button } from "@/components/ui/button";

/**
 * `beforeinstallprompt` is Chromium-only and still missing from lib.dom, so the
 * shape we actually use is declared here rather than cast to `any`.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  // Opened from the installed icon, so there is nothing left to install.
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches,
  );
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    function handlePrompt(event: Event) {
      // Suppresses Chrome's own mini-infobar so the button below owns the flow.
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    }
    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  /**
   * One button in every browser. Chrome hands us a real install prompt; Safari
   * never fires `beforeinstallprompt` and the service worker only registers in a
   * production build (`src/main.tsx`), so there the button reveals the two taps
   * that do the same thing instead of sitting greyed out.
   */
  async function handleInstall() {
    if (installEvent === null) {
      setShowSteps(true);
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The event is single-use whatever the answer, so drop it either way.
    setInstallEvent(null);
    if (outcome === "accepted") setInstalled(true);
  }

  return (
    <section
      aria-labelledby="download-title"
      className="mx-auto max-w-md py-6 text-center sm:py-10"
    >
      <img
        src={cirquoMark}
        alt=""
        width="38"
        height="42"
        className="mx-auto h-16 w-auto"
      />
      <h1
        id="download-title"
        className="mt-5 text-2xl font-bold tracking-[-0.025em] sm:text-3xl"
      >
        Download Cirquo
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Pasang Cirquo ke layar utama, lalu buka layar penuh dari ikonnya seperti
        aplikasi biasa. Tidak ada berkas besar yang perlu diunduh.
      </p>

      <div className="mt-7">
        {installed ? (
          <p className="inline-flex items-center gap-2 rounded-lg bg-leaf-50 px-4 py-3 text-sm font-semibold text-leaf-700">
            <Check className="size-5 shrink-0" aria-hidden="true" />
            Sudah terpasang di perangkat ini
          </p>
        ) : (
          <>
            <Button onClick={handleInstall} className="h-12 px-6 text-base">
              <Download aria-hidden="true" /> Pasang Cirquo
            </Button>
            {showSteps ? (
              <p aria-live="polite" className="mt-4 text-sm leading-relaxed">
                Buka menu browser, lalu pilih <b>Tambahkan ke layar utama</b>.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/*
        Paket Android memang ada di rencana (Capacitor, milestone M8) dan
        proyeknya sudah ada di `android/`, tapi belum ada rilis yang bisa
        diunduh. Halaman ini tidak menautkan berkas yang belum ada.
      */}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Paket Android belum dirilis, jadi belum ada berkas .apk di halaman ini.
      </p>
    </section>
  );
}
