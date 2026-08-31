import { ArrowLeft, Check, Circle, Eye, EyeOff } from "lucide-react";
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
import { isConvexConfigured } from "@/lib/convex";
import { getAppError } from "@/lib/errors";
import { registerSchema } from "@/lib/validations";

type RegistrationRole = "consumer" | "merchant" | "processor";
type RegisterFormValues = z.infer<typeof registerSchema>;

const copy = {
  consumer: { title: "Daftar sebagai Consumer", name: "Nama lengkap" },
  merchant: { title: "Daftar sebagai Merchant", name: "Nama penanggung jawab" },
  processor: {
    title: "Daftar sebagai Organic Processor",
    name: "Nama penanggung jawab",
  },
};

function RegisterForm({ role }: { role: RegistrationRole }) {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const page = copy[role];
  const registerAccount = useAction(api.auth.register);
  const { setSession } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const password = watch("password");
  const passwordRequirements = [
    { label: "10–128 karakter", met: password.length >= 10 && password.length <= 128 },
    { label: "Mengandung huruf", met: /[A-Za-z]/.test(password) },
    { label: "Mengandung angka", met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const result = await registerAccount({ ...data, role });
      await setSession(result.sessionToken);
      navigate("/auth/continue", { replace: true });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        "Pendaftaran gagal. Periksa koneksi lalu coba kembali.",
      );
      const field = appError.field;

      if (field === "name" || field === "email" || field === "password") {
        setError(field, { type: "server", message: appError.message });
      } else {
        setError("root.server", {
          type: "server",
          message: appError.message,
        });
      }
    }
  };

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-4">
        <Link to="/register">
          <ArrowLeft aria-hidden="true" />
          Pilih peran lain
        </Link>
      </Button>
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">
        {page.title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Isi data dasar untuk membuat akunmu.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        aria-busy={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="register-name">{page.name}</Label>
          <Input
            id="register-name"
            autoComplete="name"
            maxLength={80}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="register-name-error" message={errors.name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="register-email-error" message={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Kata sandi</Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              maxLength={128}
              className="pr-12"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="register-password-requirements register-password-error"
              {...register("password")}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-0 top-0"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
          </div>
          <FieldError
            id="register-password-error"
            message={errors.password?.message}
          />
          <ul id="register-password-requirements" className="grid gap-1 text-xs" aria-label="Ketentuan kata sandi">
            {passwordRequirements.map((requirement) => (
              <li key={requirement.label} className={requirement.met ? "flex items-center gap-1.5 text-primary" : "flex items-center gap-1.5 text-muted-foreground"}>
                {requirement.met ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
                {requirement.label}
              </li>
            ))}
          </ul>
        </div>
        <FieldError
          id="register-server-error"
          message={errors.root?.server?.message}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mendaftar..." : "Lanjutkan"}
        </Button>
      </form>
    </>
  );
}

export default function RegisterFormPage({
  role,
}: {
  role: RegistrationRole;
}) {
  return isConvexConfigured ? (
    <RegisterForm role={role} />
  ) : (
    <BackendRequiredNotice />
  );
}
