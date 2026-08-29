import { z } from "zod";

const latitudeSchema = z
  .number({ error: "Latitude harus berupa angka" })
  .min(-11, "Latitude harus berada di wilayah Indonesia")
  .max(6, "Latitude harus berada di wilayah Indonesia");

const longitudeSchema = z
  .number({ error: "Longitude harus berupa angka" })
  .min(95, "Longitude harus berada di wilayah Indonesia")
  .max(141, "Longitude harus berada di wilayah Indonesia");

const businessProfileBase = {
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  city: z
    .string()
    .trim()
    .min(2, "Nama kota minimal 2 karakter")
    .max(100, "Nama kota maksimal 100 karakter"),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
};

export const businessTypes = [
  "bakery",
  "restaurant",
  "cafe",
  "grocery",
  "catering",
  "warung",
  "other",
] as const;

export const facilityTypes = [
  "bsf_farm",
  "composting",
  "biogas",
  "animal_feed",
] as const;

export const materialTypes = [
  "prepared_food",
  "bakery",
  "produce",
  "dairy",
  "protein",
  "dry_goods",
  "mixed",
] as const;

export const outputTypes = [
  "compost",
  "bsf_larvae",
  "animal_feed",
  "biogas",
] as const;

export const recoveryNoteSchema = z
  .string()
  .trim()
  .max(500, "Catatan maksimal 500 karakter");

export const intakeSchema = z.object({
  acceptedWeightGrams: z
    .number({ error: "Berat harus berupa angka" })
    .int("Berat harus berupa gram utuh")
    .positive("Berat harus lebih dari 0 gram"),
  note: recoveryNoteSchema,
});

export const outcomeSchema = z.object({
  outputType: z.enum(outputTypes),
  outputWeightGrams: z
    .number({ error: "Berat output harus berupa angka" })
    .int("Berat output harus berupa gram utuh")
    .nonnegative("Berat output tidak boleh negatif"),
  residualWeightGrams: z
    .number({ error: "Berat residual harus berupa angka" })
    .int("Berat residual harus berupa gram utuh")
    .nonnegative("Berat residual tidak boleh negatif"),
  note: recoveryNoteSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Kata sandi harus diisi" }),
});

export const pickupCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Kode pickup harus terdiri dari 6 digit");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(80, { message: "Nama maksimal 80 karakter" }),
  email: z.string().trim().email({ message: "Format email tidak valid" }),
  password: z
    .string()
    .min(10, { message: "Kata sandi minimal 10 karakter" })
    .max(128, { message: "Kata sandi maksimal 128 karakter" })
    .regex(/[A-Za-z]/, { message: "Kata sandi harus mengandung huruf" })
    .regex(/[0-9]/, { message: "Kata sandi harus mengandung angka" }),
});

export const merchantOnboardingSchema = z.object({
  ...businessProfileBase,
  businessType: z.enum(businessTypes, {
    error: "Pilih jenis usaha",
  }),
  address: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter")
    .max(250, "Alamat maksimal 250 karakter"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || (value.length >= 5 && value.length <= 30),
      "Nomor telepon harus terdiri dari 5–30 karakter",
    ),
});

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam tidak valid");

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const processorRoutingProfileFields = {
  facilityType: z.enum(facilityTypes, {
      error: "Pilih jenis fasilitas",
    }),
  acceptedMaterialTypes: z
    .array(z.enum(materialTypes))
    .min(1, "Pilih minimal satu jenis material"),
  dailyCapacityGrams: z
    .number({ error: "Kapasitas harian harus berupa angka" })
    .int("Kapasitas harian harus berupa gram utuh")
    .min(0, "Kapasitas harian tidak boleh negatif")
    .max(100_000_000, "Kapasitas harian maksimal 100.000.000 gram"),
  maxPickupRadiusMeters: z
    .number({ error: "Radius pickup harus berupa angka" })
    .int("Radius pickup harus berupa meter utuh")
    .min(1_000, "Radius pickup minimal 1.000 meter")
    .max(50_000, "Radius pickup maksimal 50.000 meter"),
  outputTypes: z
    .array(z.enum(outputTypes))
    .min(1, "Pilih minimal satu hasil pengolahan"),
  operatingHoursStart: timeSchema,
  operatingHoursEnd: timeSchema,
};

export const processorRoutingProfileSchema = z
  .object(processorRoutingProfileFields)
  .refine(
    (data) => timeToMinutes(data.operatingHoursEnd) > timeToMinutes(data.operatingHoursStart),
    {
      path: ["operatingHoursEnd"],
      message: "Jam selesai harus setelah jam mulai pada hari yang sama",
    },
  );

export const processorOnboardingSchema = z
  .object({ ...businessProfileBase, ...processorRoutingProfileFields })
  .refine(
    (data) => timeToMinutes(data.operatingHoursEnd) > timeToMinutes(data.operatingHoursStart),
    {
      path: ["operatingHoursEnd"],
      message: "Jam selesai harus setelah jam mulai pada hari yang sama",
    },
  );

export type MerchantOnboardingValues = z.infer<
  typeof merchantOnboardingSchema
>;
export type ProcessorOnboardingValues = z.infer<
  typeof processorOnboardingSchema
>;
export type ProcessorRoutingProfileValues = z.infer<
  typeof processorRoutingProfileSchema
>;
