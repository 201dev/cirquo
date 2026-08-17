import { Eye, EyeOff, LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  function submit(event: FormEvent) {
    event.preventDefault();
    toast.success("Login demo berhasil. Autentikasi asli akan aktif pada M1.");
    navigate(pathname === "/admin/login" ? "/admin" : "/");
  }
  return (
    <>
      <p className="text-sm font-semibold text-primary">
        Selamat datang kembali
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
        Masuk ke Cirquo
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Gunakan akunmu untuk melanjutkan pickup atau pekerjaan operasional.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="login-password">Kata sandi</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={() =>
                toast.info(
                  "Pemulihan kata sandi akan tersedia setelah autentikasi terhubung.",
                )
              }
            >
              Lupa kata sandi?
            </button>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-12"
              required
              minLength={8}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-0 top-0"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full">
          <LogIn />
          Masuk dalam mode demo
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          to="/register"
          className="font-semibold text-primary hover:underline"
        >
          Pilih peran dan daftar
        </Link>
      </p>
    </>
  );
}
