import { RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function RouteErrorPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-secondary p-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-primary">Terjadi kendala</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
          Halaman belum dapat dimuat
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Periksa koneksi internet, lalu coba lagi. Jika masalah tetap terjadi,
          silakan kembali beberapa saat lagi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw />
            Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
