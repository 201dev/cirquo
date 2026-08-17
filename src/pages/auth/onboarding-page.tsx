import { MapPin, ShieldCheck } from "lucide-react";
import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage({
  role,
}: {
  role: "merchant" | "processor";
}) {
  const navigate = useNavigate();
  const merchant = role === "merchant";
  function submit(event: FormEvent) {
    event.preventDefault();
    toast.success(
      "Profil demo siap ditinjau admin. Penyimpanan akan aktif setelah M1.",
    );
    navigate(`/${role}`);
  }
  return (
    <>
      <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
        <ShieldCheck />
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
        Lengkapi profil {merchant ? "usaha" : "fasilitas"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Data ini menjadi dasar verifikasi sebelum akun operasional diaktifkan.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legal-name">Nama legal</Label>
            <Input id="legal-name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration-number">Nomor izin usaha</Label>
            <Input id="registration-number" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Alamat lengkap</Label>
          <Textarea id="address" rows={3} required />
        </div>
        <div className="rounded-xl bg-secondary p-4">
          <p className="flex gap-3 text-sm">
            <MapPin className="size-5 shrink-0 text-primary" />
            <span>
              <strong className="block">Pin lokasi</strong>
              <span className="text-muted-foreground">
                Pemilih lokasi Mapbox akan tersedia saat integrasi M3.
              </span>
            </span>
          </p>
        </div>
        {!merchant ? (
          <div className="space-y-2">
            <Label htmlFor="capacity">Kapasitas pengolahan harian (kg)</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              inputMode="numeric"
              required
            />
            <p className="text-xs text-muted-foreground">
              Kapabilitas outcome akan diverifikasi admin sebelum routing aktif.
            </p>
          </div>
        ) : null}
        <Button type="submit" size="lg" className="w-full">
          Kirim untuk verifikasi demo
        </Button>
      </form>
    </>
  );
}
