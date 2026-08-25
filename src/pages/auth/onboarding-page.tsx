import { MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  merchantOnboardingSchema,
  processorOnboardingSchema,
} from "@/lib/validations";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";
import { getErrorMessage } from "@/lib/errors";

type OnboardingFormValues = {
  legalName: string;
  registrationNumber: string;
  address: string;
  capacityGrams?: number;
};

export default function OnboardingPage({
  role,
}: {
  role: "merchant" | "processor";
}) {
  const navigate = useNavigate();
  const merchant = role === "merchant";
  const { sessionToken } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const createMerchantMutation = useMutation(
    api.profiles.createMerchantProfile,
  );
  const createProcessorMutation = useMutation(
    api.profiles.createProcessorProfile,
  );

  const schema = merchant ? merchantOnboardingSchema : processorOnboardingSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      legalName: "",
      registrationNumber: "",
      address: "",
      ...(merchant ? {} : { capacityGrams: 0 }),
    },
  });

  const onSubmit = async (data: OnboardingFormValues) => {
    if (!sessionToken) return;
    setIsPending(true);
    try {
      if (merchant) {
        await createMerchantMutation({
          sessionToken: sessionToken,
          legalName: data.legalName,
          registrationNumber: data.registrationNumber,
          address: data.address,
        });
      } else {
        await createProcessorMutation({
          sessionToken: sessionToken,
          legalName: data.legalName,
          registrationNumber: data.registrationNumber,
          address: data.address,
          capacityGrams: data.capacityGrams ?? 0,
        });
      }
      toast.success("Profil berhasil dibuat dan menunggu verifikasi admin.");
      navigate("/pending-verification");
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Gagal menyimpan profil. Silakan coba lagi."),
      );
    } finally {
      setIsPending(false);
    }
  };

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
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legal-name">Nama legal</Label>
            <Input id="legal-name" {...register("legalName")} />
            {errors.legalName && (
              <p className="text-sm text-destructive">
                {errors.legalName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration-number">Nomor izin usaha</Label>
            <Input
              id="registration-number"
              {...register("registrationNumber")}
            />
            {errors.registrationNumber && (
              <p className="text-sm text-destructive">
                {errors.registrationNumber.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Alamat lengkap</Label>
          <Textarea id="address" rows={3} {...register("address")} />
          {errors.address && (
            <p className="text-sm text-destructive">
              {errors.address.message}
            </p>
          )}
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
            <Label htmlFor="capacity">Kapasitas pengolahan harian (gram)</Label>
            <Input
              id="capacity"
              type="number"
              min="1000"
              inputMode="numeric"
              {...register("capacityGrams", { valueAsNumber: true })}
            />
            {errors.capacityGrams && (
              <p className="text-sm text-destructive">
                {errors.capacityGrams.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Kapabilitas outcome akan diverifikasi admin sebelum routing aktif.
            </p>
          </div>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending || !sessionToken}
        >
          {isPending ? "Menyimpan..." : "Kirim untuk verifikasi"}
        </Button>
      </form>
    </>
  );
}
