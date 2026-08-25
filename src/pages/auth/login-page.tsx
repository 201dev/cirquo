import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BackendRequiredNotice } from "@/components/common/backend-required-notice";
import { FieldError } from "@/components/common/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { getAppError } from "@/lib/errors";
import { isConvexConfigured } from "@/lib/convex";
import { loginSchema } from "@/lib/validations";

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useAction(api.auth.login);
  const { setSession } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const result = await login(data);
      await setSession(result.sessionToken);
      navigate("/auth/continue", { replace: true });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        "Gagal masuk. Periksa koneksi lalu coba kembali.",
      );
      setError("root.server", {
        type: "server",
        message:
          appError.code === "INVALID_CREDENTIALS"
            ? "Email atau kata sandi tidak sesuai."
            : appError.message,
      });
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        aria-busy={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="login-email-error" message={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between gap-3">
            <Label htmlFor="login-password">Kata sandi</Label>
            <button
              type="button"
              className="min-h-11 -my-3 text-xs font-medium text-primary"
              onClick={() =>
                setError("root.server", {
                  type: "manual",
                  message:
                    "Pemulihan kata sandi belum tersedia. Hubungi tim Cirquo jika kamu tidak dapat masuk.",
                })
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
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
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
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
          <FieldError
            id="login-password-error"
            message={errors.password?.message}
          />
        </div>
        <FieldError id="login-server-error" message={errors.root?.server?.message} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          <LogIn className="mr-2" aria-hidden="true" />
          {isSubmitting ? "Masuk..." : "Masuk"}
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

export default function LoginPage() {
  return isConvexConfigured ? <LoginForm /> : <BackendRequiredNotice />;
}
