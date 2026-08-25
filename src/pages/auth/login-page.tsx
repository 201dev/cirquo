import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const loginMutation = useMutation(api.auth.login);
  const { setSession } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsPending(true);
    try {
      const result = await loginMutation({
        email: data.email,
        password: data.password,
      });
      await setSession(result.sessionToken);

      const isDemoAdminLogin = pathname === "/admin/login";
      if (isDemoAdminLogin && result.role === "admin") {
        navigate("/admin");
        return;
      }

      if (result.needsProfile) {
        navigate(`/${result.role}/onboarding`);
      } else {
        const homeRoutes: Record<string, string> = {
          consumer: "/",
          merchant: "/merchant",
          processor: "/processor",
          admin: "/admin",
        };
        navigate(homeRoutes[result.role] || "/");
      }
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Gagal masuk. Periksa kembali email dan kata sandi Anda."),
      );
    } finally {
      setIsPending(false);
    }
  };

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
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="login-password">Kata sandi</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={() =>
                toast.info(
                  "Pemulihan kata sandi akan tersedia di tahap selanjutnya.",
                )
              }
            >
              Lupa kata sandi?
            </button>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-12"
              {...register("password")}
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
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          <LogIn className="mr-2" />
          {isPending ? "Masuk..." : "Masuk"}
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
