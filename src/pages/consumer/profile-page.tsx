import { Bell, ChevronRight, LogOut, MapPin, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocale, setLocale, t, type Locale } from "@/lib/i18n";

export default function ProfilePage() {
  const { user, logout, sessionToken } = useAuth();
  const updateLocation = useMutation(api.users.updateConsumerLocation);
  const [city, setCity] = useState("");
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [locale, setCurrentLocale] = useState<Locale>(() => getLocale());

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t(locale, "profile")}
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
      {user ? <section id="consumer-location" className="mt-6 scroll-mt-24 rounded-xl border bg-card p-4"><h2 className="font-semibold">Lokasi notifikasi</h2><p className="mt-1 text-xs text-muted-foreground">Dipakai hanya untuk notifikasi Rescue Item dalam radius 5 km.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input id="consumer-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Kota" /><Button type="button" onClick={() => navigator.geolocation.getCurrentPosition((position) => { void updateLocation({ sessionToken: sessionToken ?? undefined, city, latitude: position.coords.latitude, longitude: position.coords.longitude, notificationRadiusMeters: 5_000 }).then(() => toast.success("Lokasi notifikasi diperbarui.")).catch(() => toast.error("Lokasi gagal disimpan.")); }, () => toast.error("Izin lokasi tidak diberikan."))}><MapPin /> Gunakan lokasi saya</Button></div></section> : null}
      <div className="mt-6 divide-y rounded-xl bg-card px-4 shadow-[0_10px_30px_-25px_color-mix(in_oklab,var(--foreground)_50%,transparent)]">
        <div className="flex min-h-16 items-center justify-between gap-3">
          <span id="profile-language-label" className="text-sm font-semibold">{t(locale, "language")}</span>
          <Select value={locale} onValueChange={(value) => { const next = value as Locale; setCurrentLocale(next); setLocale(next); }}>
            <SelectTrigger className="w-36" aria-labelledby="profile-language-label"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="id">Indonesia</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
          </Select>
        </div>
        {user ? <a href="#consumer-location" className="flex min-h-20 w-full items-center gap-3 text-left"><MapPin className="size-5 text-primary" /><span className="flex-1"><strong className="block text-sm">Lokasi utama</strong><span className="text-xs text-muted-foreground">Atur lokasi notifikasi Rescue Item</span></span><ChevronRight className="size-4 text-muted-foreground" /></a> : null}
        {user ? (
          <Link to="/notifications" className="flex min-h-20 w-full items-center gap-3 text-left">
            <Bell className="size-5 text-primary" />
            <span className="flex-1">
              <strong className="block text-sm">Notifikasi</strong>
              <span className="text-xs text-muted-foreground">Pickup & Rescue Item baru</span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ) : null}
        <div className="flex min-h-20 items-center gap-3">
          <span className="flex-1">
            <strong className="block text-sm">Tampilan</strong>
            <span className="text-xs text-muted-foreground">
              Ikuti tema perangkat atau pilih terang dan gelap
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
          {isLoggingOut ? "Keluar..." : t(locale, "logout")}
        </Button>
      ) : null}
    </div>
  );
}
