import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/validations";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";

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

export default function RegisterFormPage({ role }: { role: RegistrationRole }) {
  const navigate = useNavigate();
  const page = copy[role];
  const [isPending, setIsPending] = useState(false);
  const registerMutation = useMutation(api.auth.register);
  const { setSession } = useAuth();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsPending(true);
    try {
      const result = await registerMutation({
        name: data.name,
        email: data.email,
        password: data.password,
        role: role,
      });
      await setSession(result.sessionToken);

      if (result.needsProfile) {
        navigate(`/${result.role}/onboarding`);
      } else {
        navigate("/");
      }
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Pendaftaran gagal. Silakan periksa kembali input Anda."),
      );
    } finally {
      setIsPending(false);
    }
  };

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
        Isi data dasar untuk membuat akunmu.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="register-name">{page.name}</Label>
          <Input
            id="register-name"
            autoComplete="name"
            {...registerField("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            {...registerField("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Kata sandi</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            {...registerField("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Minimal 8 karakter, mengandung huruf dan angka.
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Mendaftar..." : "Lanjutkan"}
        </Button>
      </form>
    </>
  );
}
