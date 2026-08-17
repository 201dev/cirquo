import { ArrowLeft } from "lucide-react";
import { type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegistrationRole = "consumer" | "merchant" | "processor";
const copy = {
  consumer: { title: "Daftar sebagai Consumer", name: "Nama lengkap" },
  merchant: { title: "Daftar sebagai Merchant", name: "Nama penanggung jawab" },
  processor: {
    title: "Daftar sebagai Organic Processor",
    name: "Nama penanggung jawab",
  },
};

export default function RegisterFormPage({ role }: { role: RegistrationRole }) {
  const navigate = useNavigate();
  const page = copy[role];
  function submit(event: FormEvent) {
    event.preventDefault();
    toast.success(
      "Akun demo tervalidasi. Verifikasi email akan aktif pada M1.",
    );
    navigate(role === "consumer" ? "/" : `/${role}/onboarding`);
  }
  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/register">
          <ArrowLeft />
          Pilih peran lain
        </Link>
      </Button>
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">
        {page.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Isi data dasar untuk membuat pratinjau akunmu.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="register-name">{page.name}</Label>
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            required
            minLength={3}
          />
        </div>
        {role !== "consumer" ? (
          <div className="space-y-2">
            <Label htmlFor="business-name">
              Nama {role === "merchant" ? "usaha" : "fasilitas"}
            </Label>
            <Input
              id="business-name"
              name="businessName"
              required
              minLength={3}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Kata sandi</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
        </div>
        <Button type="submit" size="lg" className="w-full">
          Lanjutkan
        </Button>
      </form>
    </>
  );
}
