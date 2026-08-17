import { Bell, ChevronRight, MapPin, Salad, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Profil"
        description="Atur preferensi untuk membuat pengalaman menjelajah lebih relevan."
      />
      <section className="flex items-center gap-4 rounded-xl bg-secondary p-5">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <UserRound />
        </span>
        <div>
          <h2 className="font-semibold">Alya Putri</h2>
          <p className="text-sm text-muted-foreground">
            alya@example.com · akun demo
          </p>
        </div>
      </section>
      <div className="mt-6 divide-y rounded-xl bg-card px-4 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)]">
        {[
          { icon: MapPin, title: "Lokasi utama", value: "Tembalang, Semarang" },
          { icon: Salad, title: "Preferensi pangan", value: "Vegetarian" },
          {
            icon: Bell,
            title: "Notifikasi",
            value: "Pickup & Rescue Item baru",
          },
        ].map(({ icon: Icon, title, value }) => (
          <button
            key={title}
            className="flex min-h-20 w-full items-center gap-3 text-left"
            onClick={() =>
              toast.info(`${title} masih berupa pratinjau frontend.`)
            }
          >
            <Icon className="size-5 text-primary" />
            <span className="flex-1">
              <strong className="block text-sm">{title}</strong>
              <span className="text-xs text-muted-foreground">{value}</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
        <div className="flex min-h-20 items-center gap-3">
          <span className="flex-1">
            <strong className="block text-sm">Tampilan</strong>
            <span className="text-xs text-muted-foreground">
              Tema awal terang; tema gelap tetap tersedia
            </span>
          </span>
          <ThemeToggle />
        </div>
      </div>
      <div className="mt-6 rounded-xl border p-5">
        <div>
          <p className="font-semibold">Peran demo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jelajahi layar operasional yang tersedia.
          </p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline">
            <Link to="/merchant">Merchant</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/processor">Processor</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Admin</Link>
          </Button>
        </div>
      </div>
      <Button asChild variant="ghost" className="mt-5 w-full">
        <Link to="/login">Keluar dari mode demo</Link>
      </Button>
    </div>
  );
}
