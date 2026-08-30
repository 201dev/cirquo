import { MapPin, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BackendRequiredNotice } from "@/components/common/backend-required-notice";
import { FieldError } from "@/components/common/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { getAppError } from "@/lib/errors";
import { isConvexConfigured } from "@/lib/convex";
import {
  merchantOnboardingSchema,
  processorOnboardingSchema,
  timeToMinutes,
  type MerchantOnboardingValues,
  type ProcessorOnboardingValues,
} from "@/lib/validations";

const businessTypeOptions = [
  ["bakery", "Toko roti"],
  ["restaurant", "Restoran"],
  ["cafe", "Kafe"],
  ["grocery", "Toko bahan pangan"],
  ["catering", "Katering"],
  ["warung", "Warung"],
  ["other", "Lainnya"],
] as const;

const facilityTypeOptions = [
  ["bsf_farm", "Peternakan BSF"],
  ["composting", "Pengomposan"],
  ["biogas", "Biogas"],
  ["animal_feed", "Pakan ternak"],
] as const;

const materialTypeOptions = [
  ["prepared_food", "Makanan siap santap"],
  ["bakery", "Roti dan pastry"],
  ["produce", "Buah dan sayur"],
  ["dairy", "Produk susu"],
  ["protein", "Protein"],
  ["dry_goods", "Bahan kering"],
  ["mixed", "Campuran"],
] as const;

const outputTypeOptions: ReadonlyArray<
  [ProcessorOnboardingValues["outputTypes"][number], string]
> = [
  ["compost", "Kompos"],
  ["bsf_larvae", "Larva BSF"],
  ["animal_feed", "Pakan ternak"],
  ["biogas", "Biogas"],
];

function OnboardingHeader({ role }: { role: "merchant" | "processor" }) {
  return (
    <>
      <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
        <ShieldCheck aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
        Lengkapi profil {role === "merchant" ? "usaha" : "fasilitas"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Data ini menjadi dasar verifikasi dan Circular Routing. Pastikan lokasi
        serta kemampuan operasional sesuai kondisi sebenarnya.
      </p>
    </>
  );
}

function LocationHint() {
  return (
    <div className="rounded-xl bg-secondary p-4">
      <p className="flex gap-3 text-sm">
        <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong className="block">Koordinat lokasi</strong>
          {/*
            The coordinates are typed in, not picked on a map. Saying so plainly
            beats the old copy, which explained the gap by naming an internal
            milestone — a roadmap label means nothing to the merchant reading it.
          */}
          <span className="text-muted-foreground">
            Salin latitude dan longitude lokasi usaha dari aplikasi peta, lalu
            tempel di kolom di bawah. Koordinat ini dipakai untuk menghitung
            jarak pickup dan Circular Routing.
          </span>
        </span>
      </p>
    </div>
  );
}

function MerchantForm() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const createProfile = useMutation(api.merchants.createProfile);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MerchantOnboardingValues>({
    resolver: zodResolver(merchantOnboardingSchema),
    defaultValues: {
      name: "",
      city: "Semarang",
      address: "",
      phone: "",
    },
  });

  const onSubmit = async (data: MerchantOnboardingValues) => {
    if (!sessionToken) {
      setError("root.server", {
        type: "server",
        message: "Sesi tidak tersedia. Silakan masuk kembali.",
      });
      return;
    }

    try {
      await createProfile({
        sessionToken,
        ...data,
        phone: data.phone || undefined,
      });
      navigate("/pending-verification", {
        replace: true,
        state: { profileSubmitted: true },
      });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        "Profil gagal disimpan. Periksa koneksi lalu coba kembali.",
      );
      const field = appError.field;
      const fields: ReadonlyArray<keyof MerchantOnboardingValues> = [
        "name",
        "businessType",
        "address",
        "city",
        "latitude",
        "longitude",
        "phone",
      ];

      if (field && fields.includes(field as keyof MerchantOnboardingValues)) {
        setError(field as keyof MerchantOnboardingValues, {
          type: "server",
          message: appError.message,
        });
      } else {
        setError("root.server", { type: "server", message: appError.message });
      }
    }
  };

  return (
    <>
      <OnboardingHeader role="merchant" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        aria-busy={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="merchant-name">Nama usaha</Label>
          <Input
            id="merchant-name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "merchant-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="merchant-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="merchant-business-type">Jenis usaha</Label>
          <Controller
            name="businessType"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger
                  id="merchant-business-type"
                  aria-invalid={Boolean(errors.businessType)}
                  aria-describedby={
                    errors.businessType ? "merchant-business-type-error" : undefined
                  }
                >
                  <SelectValue placeholder="Pilih jenis usaha" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            id="merchant-business-type-error"
            message={errors.businessType?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="merchant-address">Alamat lengkap</Label>
          <Textarea
            id="merchant-address"
            rows={3}
            maxLength={250}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={
              errors.address ? "merchant-address-error" : undefined
            }
            {...register("address")}
          />
          <FieldError
            id="merchant-address-error"
            message={errors.address?.message}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="merchant-city">Kota</Label>
            <Input
              id="merchant-city"
              maxLength={100}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? "merchant-city-error" : undefined}
              {...register("city")}
            />
            <FieldError id="merchant-city-error" message={errors.city?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-phone">Nomor telepon (opsional)</Label>
            <Input
              id="merchant-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "merchant-phone-error" : undefined}
              {...register("phone")}
            />
            <FieldError id="merchant-phone-error" message={errors.phone?.message} />
          </div>
        </div>

        <LocationHint />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="merchant-latitude">Latitude</Label>
            <Input
              id="merchant-latitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="-6.9667"
              aria-invalid={Boolean(errors.latitude)}
              aria-describedby={
                errors.latitude ? "merchant-latitude-error" : undefined
              }
              {...register("latitude", { valueAsNumber: true })}
            />
            <FieldError
              id="merchant-latitude-error"
              message={errors.latitude?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-longitude">Longitude</Label>
            <Input
              id="merchant-longitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="110.4167"
              aria-invalid={Boolean(errors.longitude)}
              aria-describedby={
                errors.longitude ? "merchant-longitude-error" : undefined
              }
              {...register("longitude", { valueAsNumber: true })}
            />
            <FieldError
              id="merchant-longitude-error"
              message={errors.longitude?.message}
            />
          </div>
        </div>

        <FieldError
          id="merchant-server-error"
          message={errors.root?.server?.message}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Kirim untuk verifikasi"}
        </Button>
      </form>
    </>
  );
}

function ProcessorForm() {
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const createProfile = useMutation(api.processors.createProfile);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProcessorOnboardingValues>({
    resolver: zodResolver(processorOnboardingSchema),
    defaultValues: {
      name: "",
      city: "Semarang",
      acceptedMaterialTypes: [],
      dailyCapacityGrams: 100_000,
      maxPickupRadiusMeters: 15_000,
      outputTypes: [],
      operatingHoursStart: "08:00",
      operatingHoursEnd: "17:00",
    },
  });

  const onSubmit = async (data: ProcessorOnboardingValues) => {
    if (!sessionToken) {
      setError("root.server", {
        type: "server",
        message: "Sesi tidak tersedia. Silakan masuk kembali.",
      });
      return;
    }

    try {
      await createProfile({
        sessionToken,
        name: data.name,
        facilityType: data.facilityType,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        acceptedMaterialTypes: data.acceptedMaterialTypes,
        dailyCapacityGrams: data.dailyCapacityGrams,
        maxPickupRadiusMeters: data.maxPickupRadiusMeters,
        outputTypes: data.outputTypes,
        operatingHoursStart: timeToMinutes(data.operatingHoursStart),
        operatingHoursEnd: timeToMinutes(data.operatingHoursEnd),
      });
      navigate("/pending-verification", {
        replace: true,
        state: { profileSubmitted: true },
      });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        "Profil gagal disimpan. Periksa koneksi lalu coba kembali.",
      );
      const field = appError.field;
      const fields: ReadonlyArray<keyof ProcessorOnboardingValues> = [
        "name",
        "facilityType",
        "city",
        "latitude",
        "longitude",
        "acceptedMaterialTypes",
        "dailyCapacityGrams",
        "maxPickupRadiusMeters",
        "outputTypes",
        "operatingHoursStart",
        "operatingHoursEnd",
      ];

      if (field && fields.includes(field as keyof ProcessorOnboardingValues)) {
        setError(field as keyof ProcessorOnboardingValues, {
          type: "server",
          message: appError.message,
        });
      } else {
        setError("root.server", { type: "server", message: appError.message });
      }
    }
  };

  return (
    <>
      <OnboardingHeader role="processor" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        aria-busy={isSubmitting}
      >
        <div className="space-y-2">
          <Label htmlFor="processor-name">Nama fasilitas</Label>
          <Input
            id="processor-name"
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "processor-name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="processor-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="processor-facility-type">Jenis fasilitas</Label>
          <Controller
            name="facilityType"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger
                  id="processor-facility-type"
                  aria-invalid={Boolean(errors.facilityType)}
                  aria-describedby={
                    errors.facilityType ? "processor-facility-type-error" : undefined
                  }
                >
                  <SelectValue placeholder="Pilih jenis fasilitas" />
                </SelectTrigger>
                <SelectContent>
                  {facilityTypeOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError
            id="processor-facility-type-error"
            message={errors.facilityType?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="processor-city">Kota</Label>
          <Input
            id="processor-city"
            maxLength={100}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "processor-city-error" : undefined}
            {...register("city")}
          />
          <FieldError id="processor-city-error" message={errors.city?.message} />
        </div>

        <LocationHint />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="processor-latitude">Latitude</Label>
            <Input
              id="processor-latitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="-6.9667"
              aria-invalid={Boolean(errors.latitude)}
              aria-describedby={
                errors.latitude ? "processor-latitude-error" : undefined
              }
              {...register("latitude", { valueAsNumber: true })}
            />
            <FieldError
              id="processor-latitude-error"
              message={errors.latitude?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processor-longitude">Longitude</Label>
            <Input
              id="processor-longitude"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="110.4167"
              aria-invalid={Boolean(errors.longitude)}
              aria-describedby={
                errors.longitude ? "processor-longitude-error" : undefined
              }
              {...register("longitude", { valueAsNumber: true })}
            />
            <FieldError
              id="processor-longitude-error"
              message={errors.longitude?.message}
            />
          </div>
        </div>

        <fieldset
          className="space-y-3"
          aria-describedby={
            errors.acceptedMaterialTypes ? "processor-materials-error" : undefined
          }
        >
          <legend className="text-sm font-medium">Material yang diterima</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {materialTypeOptions.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={value}
                  className="size-4 accent-primary"
                  {...register("acceptedMaterialTypes")}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError
            id="processor-materials-error"
            message={errors.acceptedMaterialTypes?.message}
          />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="processor-capacity">Kapasitas harian (gram)</Label>
            <Input
              id="processor-capacity"
              type="number"
              inputMode="numeric"
              min="0"
              max="100000000"
              step="1"
              aria-invalid={Boolean(errors.dailyCapacityGrams)}
              aria-describedby={
                errors.dailyCapacityGrams ? "processor-capacity-error" : undefined
              }
              {...register("dailyCapacityGrams", { valueAsNumber: true })}
            />
            <FieldError
              id="processor-capacity-error"
              message={errors.dailyCapacityGrams?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processor-radius">Radius pickup (meter)</Label>
            <Input
              id="processor-radius"
              type="number"
              inputMode="numeric"
              min="1000"
              max="50000"
              step="1"
              aria-invalid={Boolean(errors.maxPickupRadiusMeters)}
              aria-describedby={
                errors.maxPickupRadiusMeters ? "processor-radius-error" : undefined
              }
              {...register("maxPickupRadiusMeters", { valueAsNumber: true })}
            />
            <FieldError
              id="processor-radius-error"
              message={errors.maxPickupRadiusMeters?.message}
            />
          </div>
        </div>

        <fieldset
          className="space-y-3"
          aria-describedby={
            errors.outputTypes ? "processor-outputs-error" : undefined
          }
        >
          <legend className="text-sm font-medium">Hasil pengolahan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {outputTypeOptions.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  value={value}
                  className="size-4 accent-primary"
                  {...register("outputTypes")}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError
            id="processor-outputs-error"
            message={errors.outputTypes?.message}
          />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="processor-hours-start">Mulai operasional</Label>
            <Input
              id="processor-hours-start"
              type="time"
              aria-invalid={Boolean(errors.operatingHoursStart)}
              aria-describedby={
                errors.operatingHoursStart ? "processor-hours-start-error" : undefined
              }
              {...register("operatingHoursStart")}
            />
            <FieldError
              id="processor-hours-start-error"
              message={errors.operatingHoursStart?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processor-hours-end">Selesai operasional</Label>
            <Input
              id="processor-hours-end"
              type="time"
              aria-invalid={Boolean(errors.operatingHoursEnd)}
              aria-describedby={
                errors.operatingHoursEnd ? "processor-hours-end-error" : undefined
              }
              {...register("operatingHoursEnd")}
            />
            <FieldError
              id="processor-hours-end-error"
              message={errors.operatingHoursEnd?.message}
            />
          </div>
        </div>

        <FieldError
          id="processor-server-error"
          message={errors.root?.server?.message}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Kirim untuk verifikasi"}
        </Button>
      </form>
    </>
  );
}

function ConnectedOnboardingPage({
  role,
}: {
  role: "merchant" | "processor";
}) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to="/auth/continue" replace />;
  }
  if (user.profile) {
    return <Navigate to="/pending-verification" replace />;
  }

  return role === "merchant" ? <MerchantForm /> : <ProcessorForm />;
}

export default function OnboardingPage({
  role,
}: {
  role: "merchant" | "processor";
}) {
  if (!isConvexConfigured) return <BackendRequiredNotice />;
  return <ConnectedOnboardingPage role={role} />;
}
