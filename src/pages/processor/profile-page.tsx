import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { FieldError } from "@/components/common/field-error";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorBoundary } from "@/components/common/query-error-boundary";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { getAppError } from "@/lib/errors";
import { processorRoutingProfileSchema, timeToMinutes, type ProcessorRoutingProfileValues } from "@/lib/validations";

const facilityLabels = { bsf_farm: "Budidaya BSF", composting: "Pengomposan", biogas: "Biogas", animal_feed: "Pakan ternak" };
const materialLabels = { prepared_food: "Makanan siap saji", bakery: "Roti & bakery", produce: "Buah & sayur", dairy: "Produk susu", protein: "Protein", dry_goods: "Bahan kering", mixed: "Campuran" };
const outputLabels = { compost: "Kompos", bsf_larvae: "Larva BSF", animal_feed: "Pakan ternak", biogas: "Biogas" };

function minutesToTime(minutes?: number) {
  const value = minutes ?? 0;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function ProfileSkeleton() {
  return <div role="status" className="space-y-5"><span className="sr-only">Memuat profil fasilitas...</span><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
}

function ProfileContent() {
  const { sessionToken } = useAuth();
  const profile = useQuery(api.processors.getMine, sessionToken ? { sessionToken } : "skip");
  const updateProfile = useMutation(api.processors.updateProfile);
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ProcessorRoutingProfileValues>({
    resolver: zodResolver(processorRoutingProfileSchema),
    defaultValues: { facilityType: "composting", acceptedMaterialTypes: [], dailyCapacityGrams: 0, maxPickupRadiusMeters: 15_000, outputTypes: [], operatingHoursStart: "08:00", operatingHoursEnd: "17:00" },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      facilityType: profile.facilityType ?? "composting",
      acceptedMaterialTypes: profile.acceptedMaterialTypes ?? [],
      dailyCapacityGrams: profile.dailyCapacityGrams ?? 0,
      maxPickupRadiusMeters: profile.maxPickupRadiusMeters ?? 15_000,
      outputTypes: profile.outputTypes ?? [],
      operatingHoursStart: minutesToTime(profile.operatingHoursStart),
      operatingHoursEnd: minutesToTime(profile.operatingHoursEnd ?? 1_020),
    });
  }, [profile, reset]);

  if (profile === undefined) return <ProfileSkeleton />;
  if (!profile) return <div role="alert" className="rounded-xl border border-dashed p-8 text-center"><p className="font-semibold">Profil fasilitas belum tersedia</p><p className="mt-1 text-sm text-muted-foreground">Lengkapi onboarding sebelum mengatur kapasitas Circular Routing.</p></div>;

  const submit = async (data: ProcessorRoutingProfileValues) => {
    if (!sessionToken) return;
    try {
      await updateProfile({
        sessionToken, facilityType: data.facilityType, acceptedMaterialTypes: data.acceptedMaterialTypes,
        dailyCapacityGrams: data.dailyCapacityGrams, maxPickupRadiusMeters: data.maxPickupRadiusMeters,
        outputTypes: data.outputTypes, operatingHoursStart: timeToMinutes(data.operatingHoursStart), operatingHoursEnd: timeToMinutes(data.operatingHoursEnd),
      });
      reset(data);
      toast.success("Profil kapasitas diperbarui. Routing berikutnya memakai pengaturan baru.");
    } catch (error) {
      const appError = getAppError(error, "Profil gagal diperbarui. Coba lagi.");
      const field = appError.field as keyof ProcessorRoutingProfileValues | undefined;
      if (field && ["acceptedMaterialTypes", "dailyCapacityGrams", "maxPickupRadiusMeters", "outputTypes", "operatingHoursStart", "operatingHoursEnd"].includes(field)) setError(field, { type: "server", message: appError.message });
      else setError("root.server", { type: "server", message: appError.message });
      toast.error(appError.message);
    }
  };

  return (
    <>
      <PageHeader title="Profil kapasitas" description="Pengaturan ini berlaku untuk offer Circular Routing berikutnya; batch yang sudah diterima tidak berubah." action={<StatusBadge status={profile.verificationStatus} />} />
      <form onSubmit={handleSubmit(submit)} className="max-w-3xl space-y-6" aria-busy={isSubmitting}>
        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6"><div className="flex gap-3"><Settings2 className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold">{profile.name}</h2><p className="mt-1 text-sm text-muted-foreground">Jenis fasilitas, material, kapasitas, radius, dan hasil pengolahan menentukan eligibility.</p></div></div>
          <div className="mt-6 space-y-2"><Label htmlFor="facility-type">Jenis fasilitas</Label><Controller name="facilityType" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="facility-type" aria-invalid={Boolean(errors.facilityType)}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(facilityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>} /><FieldError id="facility-type-error" message={errors.facilityType?.message} /></div>
        </section>

        <fieldset className="rounded-xl bg-card p-5 shadow-sm sm:p-6" aria-describedby={errors.acceptedMaterialTypes ? "materials-error" : undefined}><legend className="font-semibold">Material yang diterima</legend><p className="mt-1 text-sm text-muted-foreground">Pilih material yang benar-benar dapat ditangani fasilitasmu.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(materialLabels).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"><input type="checkbox" value={value} className="size-4 accent-primary" {...register("acceptedMaterialTypes")} />{label}</label>)}</div><FieldError id="materials-error" message={errors.acceptedMaterialTypes?.message} /></fieldset>

        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6"><h2 className="font-semibold">Kapasitas dan jangkauan</h2><p className="mt-1 text-sm text-muted-foreground">Atur kapasitas 0 gram untuk menjeda intake tanpa membatalkan batch yang sudah diterima.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="daily-capacity">Kapasitas harian (gram)</Label><Input id="daily-capacity" type="number" min="0" max="100000000" step="1" inputMode="numeric" aria-invalid={Boolean(errors.dailyCapacityGrams)} aria-describedby={errors.dailyCapacityGrams ? "daily-capacity-error" : undefined} {...register("dailyCapacityGrams", { valueAsNumber: true })} /><FieldError id="daily-capacity-error" message={errors.dailyCapacityGrams?.message} /></div><div className="space-y-2"><Label htmlFor="pickup-radius">Radius pickup (meter)</Label><Input id="pickup-radius" type="number" min="1000" max="50000" step="1" inputMode="numeric" aria-invalid={Boolean(errors.maxPickupRadiusMeters)} aria-describedby={errors.maxPickupRadiusMeters ? "pickup-radius-error" : undefined} {...register("maxPickupRadiusMeters", { valueAsNumber: true })} /><FieldError id="pickup-radius-error" message={errors.maxPickupRadiusMeters?.message} /></div></div></section>

        <fieldset className="rounded-xl bg-card p-5 shadow-sm sm:p-6" aria-describedby={errors.outputTypes ? "outputs-error" : undefined}><legend className="font-semibold">Hasil pengolahan</legend><p className="mt-1 text-sm text-muted-foreground">Batch yang sudah diterima tetap memakai kapabilitas saat offer disetujui.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(outputLabels).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"><input type="checkbox" value={value} className="size-4 accent-primary" {...register("outputTypes")} />{label}</label>)}</div><FieldError id="outputs-error" message={errors.outputTypes?.message} /></fieldset>

        <section className="rounded-xl bg-card p-5 shadow-sm sm:p-6"><h2 className="font-semibold">Jam operasional harian</h2><p className="mt-1 text-sm text-muted-foreground">Gunakan waktu WIB. Jam selesai harus setelah jam mulai di hari yang sama.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="hours-start">Mulai</Label><Input id="hours-start" type="time" aria-invalid={Boolean(errors.operatingHoursStart)} aria-describedby={errors.operatingHoursStart ? "hours-start-error" : undefined} {...register("operatingHoursStart")} /><FieldError id="hours-start-error" message={errors.operatingHoursStart?.message} /></div><div className="space-y-2"><Label htmlFor="hours-end">Selesai</Label><Input id="hours-end" type="time" aria-invalid={Boolean(errors.operatingHoursEnd)} aria-describedby={errors.operatingHoursEnd ? "hours-end-error" : undefined} {...register("operatingHoursEnd")} /><FieldError id="hours-end-error" message={errors.operatingHoursEnd?.message} /></div></div></section>
        <FieldError id="profile-server-error" message={errors.root?.server?.message} />
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isSubmitting}><Save />{isSubmitting ? "Menyimpan..." : "Simpan pengaturan"}</Button>
      </form>
    </>
  );
}

export default function ProcessorProfilePage() {
  return <QueryErrorBoundary title="Profil fasilitas tidak dapat dimuat"><ProfileContent /></QueryErrorBoundary>;
}
