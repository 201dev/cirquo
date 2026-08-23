import { ArrowLeft, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-secondary p-6 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Leaf />
        </span>
        <p className="mt-6 text-sm font-semibold text-primary">
          404 · Rute berakhir di sini
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Halaman ini belum tersedia atau alamatnya sudah berubah. Kembali ke
          beranda untuk melanjutkan alur Cirquo.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <ArrowLeft />
            Kembali ke beranda
          </Link>
        </Button>
      </div>
    </main>
  );
}
