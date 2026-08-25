import { Bell, ChevronRight, LogOut, MapPin, Salad, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

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
        {user ? (
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <h2 className="font-semibold">Belum masuk</h2>
            <p className="text-sm text-muted-foreground">
              Masuk untuk memulihkan sesi dan melihat akunmu.
            </p>
          </div>
        )}
      </section>
      {!user ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild>
            <Link to="/login">Masuk</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register">Buat akun</Link>
          </Button>
        </div>
      ) : null}
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
      {user ? (
        <Button
          variant="ghost"
          className="mt-5 w-full text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut aria-hidden="true" />
          {isLoggingOut ? "Keluar..." : "Keluar dari akun"}
        </Button>
      ) : null}
    </div>
  );
}
